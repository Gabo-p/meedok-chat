import { AiClient } from '../ai-client';
import { AiClientError } from '../errors';
import { bedrockCircuitBreaker } from '../circuit-breaker';

// Mock the AWS SDK
jest.mock('@aws-sdk/client-bedrock-runtime', () => {
  const mockSend = jest.fn();
  return {
    BedrockRuntimeClient: jest.fn().mockImplementation(() => ({ send: mockSend })),
    InvokeModelWithResponseStreamCommand: jest.fn().mockImplementation((args) => args),
    __mockSend: mockSend,
  };
});

const { __mockSend: mockSend } = jest.requireMock('@aws-sdk/client-bedrock-runtime') as {
  __mockSend: jest.Mock;
};

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

/** Build a mock Bedrock streaming response from an array of text deltas */
function mockStreamResponse(deltas: string[]) {
  const events = deltas.map((text) => ({
    chunk: {
      bytes: Buffer.from(
        JSON.stringify({
          type: 'content_block_delta',
          delta: { type: 'text_delta', text },
        }),
      ),
    },
  }));

  return {
    body: (async function* () {
      for (const event of events) {
        yield event;
      }
    })(),
  };
}

describe('AiClient', () => {
  let client: AiClient;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    // Reset circuit breaker state by reassigning internal state via recordSuccess
    // (reset approach: create a new client for each test)
    client = new AiClient(clientConfig, mockLogger);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('streamInvoke', () => {
    it('yields text chunks from a successful Bedrock stream', async () => {
      mockSend.mockResolvedValueOnce(mockStreamResponse(['Hello', ' world', '!']));

      const chunks: string[] = [];
      for await (const chunk of client.streamInvoke('What is the diagnosis?')) {
        chunks.push(chunk);
      }

      expect(chunks).toEqual(['Hello', ' world', '!']);
    });

    it('throws INVALID_REQUEST for empty prompt (BR-SL-07)', async () => {
      await expect(async () => {
        for await (const _ of client.streamInvoke('   ')) {
          // consume
        }
      }).rejects.toThrow(AiClientError);

      await expect(async () => {
        for await (const _ of client.streamInvoke('   ')) {
          // consume
        }
      }).rejects.toMatchObject({ code: 'INVALID_REQUEST', retryable: false });
    });

    it('retries once on THROTTLED error then succeeds', async () => {
      const throttleError = Object.assign(new Error('throttled'), {
        name: 'ThrottlingException',
      });
      mockSend
        .mockRejectedValueOnce(throttleError)
        .mockResolvedValueOnce(mockStreamResponse(['ok']));

      const chunks: string[] = [];
      for await (const chunk of client.streamInvoke('prompt')) {
        chunks.push(chunk);
      }

      jest.advanceTimersByTime(1_000);
      expect(chunks).toEqual(['ok']);
      expect(mockSend).toHaveBeenCalledTimes(2);
    });

    it('does not retry fatal errors', async () => {
      const authError = Object.assign(new Error('denied'), {
        name: 'AccessDeniedException',
      });
      mockSend.mockRejectedValueOnce(authError);

      await expect(async () => {
        for await (const _ of client.streamInvoke('prompt')) {
          // consume
        }
      }).rejects.toMatchObject({ code: 'AUTH_ERROR', retryable: false });

      expect(mockSend).toHaveBeenCalledTimes(1);
    });

    it('throws CIRCUIT_OPEN when circuit breaker is open', async () => {
      // Trip the circuit breaker
      const fatalError = Object.assign(new Error('model error'), {
        name: 'ModelErrorException',
      });
      mockSend.mockRejectedValue(fatalError);

      // Exhaust failure threshold (3 failures)
      for (let i = 0; i < 3; i++) {
        await expect(async () => {
          for await (const _ of client.streamInvoke('prompt')) { /* consume */ }
        }).rejects.toThrow(AiClientError);
      }

      // Circuit should now be OPEN
      await expect(async () => {
        for await (const _ of client.streamInvoke('prompt')) { /* consume */ }
      }).rejects.toMatchObject({ code: 'CIRCUIT_OPEN' });
    });
  });

  describe('invoke (non-streaming)', () => {
    it('concatenates all chunks into a single string', async () => {
      mockSend.mockResolvedValueOnce(mockStreamResponse(['The ', 'answer ', 'is 42.']));
      const result = await client.invoke('What is the answer?');
      expect(result).toBe('The answer is 42.');
    });
  });

  describe('parseChunk', () => {
    it('returns text delta from valid Anthropic chunk bytes', () => {
      const bytes = Buffer.from(
        JSON.stringify({
          type: 'content_block_delta',
          delta: { type: 'text_delta', text: 'hello' },
        }),
      );
      expect(client.parseChunk(bytes)).toBe('hello');
    });

    it('returns null for non-text-delta events', () => {
      const bytes = Buffer.from(JSON.stringify({ type: 'message_start' }));
      expect(client.parseChunk(bytes)).toBeNull();
    });

    it('returns null for malformed bytes', () => {
      expect(client.parseChunk(Buffer.from('not json'))).toBeNull();
    });
  });

  describe('classifyError', () => {
    it('classifies ThrottlingException as retryable THROTTLED', () => {
      const err = Object.assign(new Error(), { name: 'ThrottlingException' });
      const result = client.classifyError(err);
      expect(result.code).toBe('THROTTLED');
      expect(result.retryable).toBe(true);
    });

    it('classifies AccessDeniedException as fatal AUTH_ERROR', () => {
      const err = Object.assign(new Error(), { name: 'AccessDeniedException' });
      const result = client.classifyError(err);
      expect(result.code).toBe('AUTH_ERROR');
      expect(result.retryable).toBe(false);
    });

    it('passes through existing AiClientError unchanged', () => {
      const original = new AiClientError('test', 'TIMEOUT', true);
      expect(client.classifyError(original)).toBe(original);
    });
  });
});
