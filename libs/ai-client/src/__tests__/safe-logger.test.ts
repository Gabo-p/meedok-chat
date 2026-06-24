import { createSafeLogger } from '../safe-logger';
import type { Logger } from '../types';

function makeMockLogger() {
  return {
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  } satisfies Logger;
}

describe('createSafeLogger', () => {
  it('passes through non-sensitive keys unchanged', () => {
    const mock = makeMockLogger();
    const safe = createSafeLogger(mock);
    safe.info({ modelId: 'claude-3', durationMs: 100 }, 'done');
    expect(mock.info).toHaveBeenCalledWith(
      { modelId: 'claude-3', durationMs: 100 },
      'done',
    );
  });

  it('redacts "prompt" key', () => {
    const mock = makeMockLogger();
    const safe = createSafeLogger(mock);
    safe.info({ prompt: 'Patient John has fever', modelId: 'claude-3' });
    expect(mock.info).toHaveBeenCalledWith(
      { prompt: '[REDACTED]', modelId: 'claude-3' },
      undefined,
    );
  });

  it('redacts "chunk" key', () => {
    const mock = makeMockLogger();
    const safe = createSafeLogger(mock);
    safe.debug({ chunk: 'partial response text', index: 5 });
    expect(mock.debug).toHaveBeenCalledWith(
      { chunk: '[REDACTED]', index: 5 },
      undefined,
    );
  });

  it('redacts "content" key', () => {
    const mock = makeMockLogger();
    const safe = createSafeLogger(mock);
    safe.warn({ content: 'sensitive', status: 200 });
    expect(mock.warn).toHaveBeenCalledWith(
      { content: '[REDACTED]', status: 200 },
      undefined,
    );
  });

  it('redacts sensitive keys in nested objects', () => {
    const mock = makeMockLogger();
    const safe = createSafeLogger(mock);
    safe.error({ outer: { prompt: 'nested prompt', safe: 'ok' }, topLevel: 1 });
    expect(mock.error).toHaveBeenCalledWith(
      { outer: { prompt: '[REDACTED]', safe: 'ok' }, topLevel: 1 },
      undefined,
    );
  });

  it('redacts all sensitive keys: prompt, chunk, content, inputText, outputText, messages, body', () => {
    const mock = makeMockLogger();
    const safe = createSafeLogger(mock);
    safe.info({
      prompt: 'p',
      chunk: 'c',
      content: 'co',
      inputText: 'i',
      outputText: 'o',
      messages: ['m'],
      body: 'b',
      safe: 'yes',
    });
    const logged = mock.info.mock.calls[0][0];
    expect(logged.prompt).toBe('[REDACTED]');
    expect(logged.chunk).toBe('[REDACTED]');
    expect(logged.content).toBe('[REDACTED]');
    expect(logged.inputText).toBe('[REDACTED]');
    expect(logged.outputText).toBe('[REDACTED]');
    expect(logged.messages).toBe('[REDACTED]');
    expect(logged.body).toBe('[REDACTED]');
    expect(logged.safe).toBe('yes');
  });

  it('forwards all log levels correctly', () => {
    const mock = makeMockLogger();
    const safe = createSafeLogger(mock);
    safe.info({ a: 1 });
    safe.warn({ b: 2 });
    safe.error({ c: 3 });
    safe.debug({ d: 4 });
    expect(mock.info).toHaveBeenCalledTimes(1);
    expect(mock.warn).toHaveBeenCalledTimes(1);
    expect(mock.error).toHaveBeenCalledTimes(1);
    expect(mock.debug).toHaveBeenCalledTimes(1);
  });
});
