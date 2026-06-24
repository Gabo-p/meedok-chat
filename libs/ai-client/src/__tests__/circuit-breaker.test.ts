import { CircuitBreaker } from '../circuit-breaker';
import { AiClientError } from '../errors';

const makeBreaker = (overrides?: Partial<{ failureThreshold: number; windowMs: number; halfOpenAfterMs: number }>) =>
  new CircuitBreaker({
    failureThreshold: 3,
    windowMs: 60_000,
    halfOpenAfterMs: 30_000,
    ...overrides,
  });

describe('CircuitBreaker', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  describe('CLOSED state', () => {
    it('starts in CLOSED state', () => {
      const cb = makeBreaker();
      expect(cb.getState()).toBe('CLOSED');
    });

    it('allows requests when CLOSED', () => {
      const cb = makeBreaker();
      expect(cb.allowRequest()).toBe(true);
    });

    it('does not trip before reaching failure threshold', () => {
      const cb = makeBreaker();
      cb.recordFailure();
      cb.recordFailure();
      expect(cb.getState()).toBe('CLOSED');
    });

    it('trips to OPEN after reaching failure threshold', () => {
      const cb = makeBreaker();
      cb.recordFailure();
      cb.recordFailure();
      cb.recordFailure();
      expect(cb.getState()).toBe('OPEN');
    });

    it('ignores failures outside the sliding window', () => {
      const cb = makeBreaker({ windowMs: 1_000 });
      cb.recordFailure();
      cb.recordFailure();
      // Advance time past the window
      jest.advanceTimersByTime(2_000);
      cb.recordFailure();
      // Only 1 failure within the window — should stay CLOSED
      expect(cb.getState()).toBe('CLOSED');
    });

    it('resets failure count on success', () => {
      const cb = makeBreaker();
      cb.recordFailure();
      cb.recordFailure();
      cb.recordSuccess();
      cb.recordFailure();
      cb.recordFailure();
      expect(cb.getState()).toBe('CLOSED');
    });
  });

  describe('OPEN state', () => {
    it('throws CIRCUIT_OPEN when OPEN', () => {
      const cb = makeBreaker();
      cb.recordFailure();
      cb.recordFailure();
      cb.recordFailure();

      expect(() => cb.allowRequest()).toThrow(AiClientError);
      expect(() => cb.allowRequest()).toThrow('OPEN');
    });

    it('transitions to HALF_OPEN after halfOpenAfterMs', () => {
      const cb = makeBreaker({ halfOpenAfterMs: 30_000 });
      cb.recordFailure();
      cb.recordFailure();
      cb.recordFailure();
      expect(cb.getState()).toBe('OPEN');

      jest.advanceTimersByTime(30_001);
      expect(cb.getState()).toBe('HALF_OPEN');
    });
  });

  describe('HALF_OPEN state', () => {
    beforeEach(() => {
      jest.useFakeTimers();
    });

    function openThenHalfOpen() {
      const cb = makeBreaker({ halfOpenAfterMs: 1_000 });
      cb.recordFailure();
      cb.recordFailure();
      cb.recordFailure();
      jest.advanceTimersByTime(1_001);
      return cb;
    }

    it('allows exactly one probe request', () => {
      const cb = openThenHalfOpen();
      expect(cb.allowRequest()).toBe(true);
    });

    it('rejects second request while probe is in flight', () => {
      const cb = openThenHalfOpen();
      cb.allowRequest(); // first — probe
      expect(() => cb.allowRequest()).toThrow(AiClientError);
    });

    it('transitions to CLOSED on probe success', () => {
      const cb = openThenHalfOpen();
      cb.allowRequest();
      cb.recordSuccess();
      expect(cb.getState()).toBe('CLOSED');
    });

    it('transitions back to OPEN on probe failure', () => {
      const cb = openThenHalfOpen();
      cb.allowRequest();
      cb.recordFailure();
      expect(cb.getState()).toBe('OPEN');
    });
  });
});
