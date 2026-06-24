import * as fc from 'fast-check';
import { AiClient } from '../../ai-client';
import { AiClientError } from '../../errors';

/**
 * PBT: AiClient error classification and chunk parsing (NFR-SL-T01).
 * seed: 42, numRuns: 100 for CI reproducibility (NFR-SL-T03).
 */

const mockLogger = {
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
  debug: jest.fn(),
};

const clientConfig = {
  region: 'us-east-1',
  defaultModelId: 'anthropic.claude-3-sonnet-20240229-v1:0',
  defaultMaxTokens: 2048,
  defaultTemperature: 0.7,
};

describe('AiClient — Property-Based Tests', () => {
  let client: AiClient;

  beforeEach(() => {
    jest.clearAllMocks();
    client = new AiClient(clientConfig, mockLogger);
  });

  // ─── Property 1: classifyError always returns a boolean `retryable` ──────

  describe('classifyError — retryable is always boolean', () => {
    it('returns boolean retryable for any Error-like input', () => {
      fc.assert(
        fc.property(
          fc.record({
            name: fc.string(),
            message: fc.string(),
            statusCode: fc.option(fc.integer({ min: 100, max: 599 })),
          }),
          (fakeErr) => {
            const errObj = Object.assign(new Error(fakeErr.message), {
              name: fakeErr.name,
              $metadata: fakeErr.statusCode
                ? { httpStatusCode: fakeErr.statusCode }
                : undefined,
            });

            const result = client.classifyError(errObj);

            // Property: retryable is always a strict boolean
            return typeof result.retryable === 'boolean';
          },
        ),
        { numRuns: 100, seed: 42 },
      );
    });

    it('classifyError always returns an AiClientError instance', () => {
      fc.assert(
        fc.property(fc.anything(), (input) => {
          const result = client.classifyError(input);
          return result instanceof AiClientError;
        }),
        { numRuns: 100, seed: 42 },
      );
    });

    it('AiClientError code is always a non-empty string', () => {
      fc.assert(
        fc.property(
          fc.record({ name: fc.string(), message: fc.string() }),
          (fakeErr) => {
            const result = client.classifyError(Object.assign(new Error(fakeErr.message), { name: fakeErr.name }));
            return typeof result.code === 'string' && result.code.length > 0;
          },
        ),
        { numRuns: 100, seed: 42 },
      );
    });
  });

  // ─── Property 2: parseChunk never throws on any Uint8Array input ─────────

  describe('parseChunk — never throws on any byte input', () => {
    it('returns string or null for any Uint8Array', () => {
      fc.assert(
        fc.property(
          fc.uint8Array({ minLength: 0, maxLength: 512 }),
          (bytes) => {
            let result: string | null;
            let threw = false;
            try {
              result = client.parseChunk(bytes);
            } catch {
              threw = true;
              result = null;
            }
            // Property: never throws, always returns string | null
            return !threw && (result === null || typeof result === 'string');
          },
        ),
        { numRuns: 100, seed: 42 },
      );
    });

    it('returns a string for any valid Anthropic text_delta JSON bytes', () => {
      fc.assert(
        fc.property(
          fc.string({ minLength: 1, maxLength: 200 }),
          (text) => {
            const bytes = Buffer.from(
              JSON.stringify({
                type: 'content_block_delta',
                delta: { type: 'text_delta', text },
              }),
            );
            const result = client.parseChunk(bytes);
            return result === text;
          },
        ),
        { numRuns: 100, seed: 42 },
      );
    });
  });
});
