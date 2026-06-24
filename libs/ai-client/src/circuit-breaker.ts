import { AiClientError } from './errors';

export type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN';

export interface CircuitBreakerConfig {
  /** Number of fatal failures within windowMs that trips the circuit. Default: 3 */
  failureThreshold: number;
  /** Sliding window in ms for counting failures. Default: 60_000 */
  windowMs: number;
  /** Time in ms to wait before moving from OPEN to HALF_OPEN. Default: 30_000 */
  halfOpenAfterMs: number;
}

/**
 * Circuit breaker for AWS Bedrock calls (NFR-SL-R01).
 *
 * States:
 *   CLOSED    → normal operation, all calls pass through
 *   OPEN      → fail-fast, immediately throws CIRCUIT_OPEN error
 *   HALF_OPEN → one probe call allowed; success → CLOSED, failure → OPEN
 *
 * Only fatal errors increment the failure counter (Q2-A).
 * Module-level singleton exported as `bedrockCircuitBreaker` (Q1-A).
 */
export class CircuitBreaker {
  private state: CircuitState = 'CLOSED';
  private failureTimestamps: number[] = [];
  private openedAt: number | null = null;
  private probeInFlight = false;

  constructor(private readonly config: CircuitBreakerConfig) {}

  getState(): CircuitState {
    this.evaluateState();
    return this.state;
  }

  /**
   * Returns true if the call should be allowed through.
   * Throws AiClientError({ code: 'CIRCUIT_OPEN' }) if circuit is OPEN.
   */
  allowRequest(): boolean {
    this.evaluateState();

    if (this.state === 'CLOSED') {
      return true;
    }

    if (this.state === 'HALF_OPEN' && !this.probeInFlight) {
      this.probeInFlight = true;
      return true;
    }

    throw new AiClientError(
      'Circuit breaker is OPEN — Bedrock calls are temporarily suspended',
      'CIRCUIT_OPEN',
      false,
    );
  }

  /** Call when a fatal error occurs (INVALID_REQUEST, AUTH_ERROR, MODEL_ERROR). */
  recordFailure(): void {
    this.evaluateState();

    const now = Date.now();
    this.pruneOldFailures(now);
    this.failureTimestamps.push(now);

    if (this.state === 'HALF_OPEN') {
      // Probe failed — re-open circuit
      this.probeInFlight = false;
      this.openedAt = now;
      this.state = 'OPEN';
      return;
    }

    if (this.failureTimestamps.length >= this.config.failureThreshold) {
      this.openedAt = now;
      this.state = 'OPEN';
    }
  }

  /** Call when a call succeeds. */
  recordSuccess(): void {
    if (this.state === 'HALF_OPEN') {
      // Probe succeeded — close circuit
      this.probeInFlight = false;
      this.failureTimestamps = [];
      this.openedAt = null;
      this.state = 'CLOSED';
    }
    // In CLOSED state, successes don't change anything
  }

  private evaluateState(): void {
    if (this.state === 'OPEN' && this.openedAt !== null) {
      const elapsed = Date.now() - this.openedAt;
      if (elapsed >= this.config.halfOpenAfterMs) {
        this.state = 'HALF_OPEN';
      }
    }
  }

  private pruneOldFailures(now: number): void {
    const cutoff = now - this.config.windowMs;
    this.failureTimestamps = this.failureTimestamps.filter((ts) => ts > cutoff);
  }
}

/**
 * Module-level singleton shared across all AiClient calls in the process.
 * NFR-SL-R01: 3 failures / 60s window / 30s half-open.
 */
export const bedrockCircuitBreaker = new CircuitBreaker({
  failureThreshold: 3,
  windowMs: 60_000,
  halfOpenAfterMs: 30_000,
});
