import {
  BedrockRuntimeClient,
  InvokeModelWithResponseStreamCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { AiClientError, FATAL_CODES, RETRYABLE_CODES } from './errors';
import type { AiClientConfig, Logger, ModelConfig } from './types';
import { bedrockCircuitBreaker } from './circuit-breaker';
import { createStreamTimeouts } from './stream-timeout';
import { createSafeLogger } from './safe-logger';

const RETRY_DELAY_MS = 1_000;
const FIRST_CHUNK_TIMEOUT_MS = 5_000;
const TOTAL_STREAM_TIMEOUT_MS = 120_000;

/**
 * AWS Bedrock streaming client (S-SL-02).
 *
 * Features:
 *  - Anthropic Claude Messages API format (Q6-A)
 *  - Streaming via AsyncIterable<string> — raw string chunks (Q8-A)
 *  - Circuit breaker (NFR-SL-R01) — fatal errors only trip it (Q2-A)
 *  - Single retry on retryable errors after 1s delay (BR-SL-08)
 *  - Dual AbortController timeouts: 5s first-chunk, 120s total (NFR-SL-P01/P02)
 *  - Safe logger wrapper — prompt/chunk content never logged (BR-SL-09)
 */
export class AiClient {
  private readonly client: BedrockRuntimeClient;
  private readonly config: AiClientConfig;
  private readonly logger: Logger;

  constructor(config: AiClientConfig, logger: Logger) {
    this.config = config;
    this.logger = createSafeLogger(logger);
    this.client = new BedrockRuntimeClient({ region: config.region });
  }

  /**
   * Stream a Bedrock model invocation.
   * Yields raw string text deltas as they arrive from the model.
   */
  async *streamInvoke(
    prompt: string,
    modelConfig?: Partial<ModelConfig>,
  ): AsyncIterable<string> {
    this.validatePrompt(prompt);

    const resolved: ModelConfig = {
      modelId: modelConfig?.modelId ?? this.config.defaultModelId,
      maxTokens: modelConfig?.maxTokens ?? this.config.defaultMaxTokens,
      temperature: modelConfig?.temperature ?? this.config.defaultTemperature,
      topP: modelConfig?.topP,
    };

    yield* this.invokeWithRetry(prompt, resolved, false);
  }

  /**
   * Non-streaming single invocation (utility / testing).
   */
  async invoke(prompt: string, modelConfig?: Partial<ModelConfig>): Promise<string> {
    let result = '';
    for await (const chunk of this.streamInvoke(prompt, modelConfig)) {
      result += chunk;
    }
    return result;
  }

  // ─── Private helpers ──────────────────────────────────────────────────────

  private async *invokeWithRetry(
    prompt: string,
    modelConfig: ModelConfig,
    isRetry: boolean,
  ): AsyncIterable<string> {
    const startMs = Date.now();

    // Circuit breaker check — throws CIRCUIT_OPEN if open
    bedrockCircuitBreaker.allowRequest();

    const timeouts = createStreamTimeouts(FIRST_CHUNK_TIMEOUT_MS, TOTAL_STREAM_TIMEOUT_MS);

    try {
      const body = this.buildRequestBody(prompt, modelConfig);
      const command = new InvokeModelWithResponseStreamCommand({
        modelId: modelConfig.modelId,
        contentType: 'application/json',
        accept: 'application/json',
        body: Buffer.from(JSON.stringify(body)),
      });

      // Pass both abort signals — first-chunk and total-stream
      const response = await this.client.send(command, {
        abortSignal: timeouts.firstChunkController.signal,
      });

      if (!response.body) {
        throw new AiClientError('Empty response body from Bedrock', 'MODEL_ERROR', false);
      }

      let firstChunkReceived = false;

      for await (const event of response.body) {
        // Check total-stream abort signal
        if (timeouts.totalStreamController.signal.aborted) {
          throw new AiClientError('Total stream timeout exceeded', 'TIMEOUT', true);
        }

        if (event.chunk?.bytes) {
          if (!firstChunkReceived) {
            firstChunkReceived = true;
            timeouts.clearFirstChunkTimer();
          }

          const chunk = this.parseChunk(event.chunk.bytes);
          if (chunk !== null) {
            yield chunk;
          }
        }
      }

      bedrockCircuitBreaker.recordSuccess();
      this.logger.info({
        modelId: modelConfig.modelId,
        durationMs: Date.now() - startMs,
        operation: 'streamComplete',
      });
    } catch (err) {
      timeouts.clearAll();

      const classified = this.classifyError(err);

      if (classified.retryable && !isRetry) {
        this.logger.warn({
          code: classified.code,
          durationMs: Date.now() - startMs,
          operation: 'streamRetry',
        });
        await this.delay(RETRY_DELAY_MS);
        yield* this.invokeWithRetry(prompt, modelConfig, true);
        return;
      }

      // Fatal errors trip the circuit breaker
      if (FATAL_CODES.has(classified.code)) {
        bedrockCircuitBreaker.recordFailure();
      }

      this.logger.error({
        code: classified.code,
        retryable: classified.retryable,
        isRetry,
        durationMs: Date.now() - startMs,
        operation: 'streamError',
      });

      throw classified;
    } finally {
      timeouts.clearAll();
    }
  }

  /**
   * Build Anthropic Claude Messages API request body (Q6-A).
   */
  private buildRequestBody(prompt: string, config: ModelConfig): Record<string, unknown> {
    const body: Record<string, unknown> = {
      anthropic_version: 'bedrock-2023-05-31',
      messages: [{ role: 'user', content: prompt }],
      max_tokens: config.maxTokens,
      temperature: config.temperature,
    };
    if (config.topP !== undefined) {
      body['top_p'] = config.topP;
    }
    return body;
  }

  /**
   * Parse a raw Bedrock stream chunk bytes into a text delta string.
   * Returns null if the chunk contains no text delta.
   */
  parseChunk(bytes: Uint8Array): string | null {
    try {
      const decoded = new TextDecoder().decode(bytes);
      const parsed = JSON.parse(decoded) as Record<string, unknown>;

      // Anthropic Claude streaming delta format
      if (parsed['type'] === 'content_block_delta') {
        const delta = parsed['delta'] as Record<string, unknown> | undefined;
        if (delta?.['type'] === 'text_delta' && typeof delta['text'] === 'string') {
          return delta['text'];
        }
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Classify an unknown error into an AiClientError.
   * Two categories: retryable and fatal (Q7-A).
   */
  classifyError(err: unknown): AiClientError {
    if (err instanceof AiClientError) return err;

    const name = (err as { name?: string })?.name ?? '';
    const statusCode = (err as { $metadata?: { httpStatusCode?: number } })?.$metadata
      ?.httpStatusCode;

    // Already a circuit-open error
    if (name === 'AiClientError') return err as AiClientError;

    // Retryable: throttling
    if (
      name === 'ThrottlingException' ||
      statusCode === 429 ||
      name === 'TooManyRequestsException'
    ) {
      return new AiClientError('Bedrock request throttled', 'THROTTLED', true, err);
    }

    // Retryable: service unavailable
    if (statusCode === 503 || name === 'ServiceUnavailableException') {
      return new AiClientError('Bedrock service unavailable', 'SERVICE_UNAVAILABLE', true, err);
    }

    // Retryable: timeout / abort
    if (
      name === 'AbortError' ||
      name === 'TimeoutError' ||
      (err instanceof Error && err.message.includes('timeout'))
    ) {
      return new AiClientError('Bedrock stream timed out', 'TIMEOUT', true, err);
    }

    // Fatal: auth
    if (
      name === 'AccessDeniedException' ||
      name === 'UnauthorizedException' ||
      statusCode === 401 ||
      statusCode === 403
    ) {
      return new AiClientError('Bedrock auth error', 'AUTH_ERROR', false, err);
    }

    // Fatal: invalid request
    if (name === 'ValidationException' || statusCode === 400) {
      return new AiClientError('Bedrock invalid request', 'INVALID_REQUEST', false, err);
    }

    // Default: fatal model error
    return new AiClientError(
      `Bedrock model error: ${(err as Error)?.message ?? 'unknown'}`,
      'MODEL_ERROR',
      false,
      err,
    );
  }

  private validatePrompt(prompt: string): void {
    if (!prompt || prompt.trim().length === 0) {
      throw new AiClientError('Prompt must not be empty (BR-SL-07)', 'INVALID_REQUEST', false);
    }
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
