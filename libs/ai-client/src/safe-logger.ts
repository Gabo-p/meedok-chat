import { Logger } from './types';

/**
 * Keys that must never appear in log output (BR-SL-09, NFR-SL-S04).
 * Prompt content and response chunks contain patient medical data.
 */
const SENSITIVE_KEYS: ReadonlySet<string> = new Set([
  'prompt',
  'chunk',
  'content',
  'inputText',
  'outputText',
  'messages',
  'body',
]);

const REDACTED = '[REDACTED]';

/**
 * Deep-redacts sensitive keys from a plain object before logging.
 * Applies recursively to nested objects (but not arrays of primitives).
 */
function redact(obj: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (SENSITIVE_KEYS.has(key)) {
      result[key] = REDACTED;
    } else if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      result[key] = redact(value as Record<string, unknown>);
    } else {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Wraps a Pino-compatible logger, stripping sensitive keys from every log call.
 * AiClient injects this internally — callers cannot accidentally log prompt content.
 * NFR-SL-S04: Prompt content must never appear in application logs.
 */
export function createSafeLogger(logger: Logger): Logger {
  return {
    info: (obj, msg) => logger.info(redact(obj as Record<string, unknown>), msg),
    warn: (obj, msg) => logger.warn(redact(obj as Record<string, unknown>), msg),
    error: (obj, msg) => logger.error(redact(obj as Record<string, unknown>), msg),
    debug: (obj, msg) => logger.debug(redact(obj as Record<string, unknown>), msg),
  };
}
