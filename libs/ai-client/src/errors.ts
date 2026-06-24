export type AiClientErrorCode =
  | 'THROTTLED'
  | 'SERVICE_UNAVAILABLE'
  | 'INVALID_REQUEST'
  | 'AUTH_ERROR'
  | 'MODEL_ERROR'
  | 'TIMEOUT'
  | 'STREAM_INTERRUPTED'
  | 'CIRCUIT_OPEN';

export class AiClientError extends Error {
  constructor(
    message: string,
    public readonly code: AiClientErrorCode,
    public readonly retryable: boolean,
    public readonly cause?: unknown,
  ) {
    super(message);
    this.name = 'AiClientError';
    // Maintains proper stack trace in V8
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, AiClientError);
    }
  }
}

/** Retryable error codes — eligible for single retry (BR-SL-08) */
export const RETRYABLE_CODES: ReadonlySet<AiClientErrorCode> = new Set([
  'THROTTLED',
  'SERVICE_UNAVAILABLE',
  'TIMEOUT',
  'STREAM_INTERRUPTED',
]);

/** Fatal error codes — trip the circuit breaker (NFR-SL-R01, Q2-A) */
export const FATAL_CODES: ReadonlySet<AiClientErrorCode> = new Set([
  'INVALID_REQUEST',
  'AUTH_ERROR',
  'MODEL_ERROR',
]);
