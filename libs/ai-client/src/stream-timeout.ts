/**
 * Dual-timeout controller for Bedrock streaming (NFR-SL-P01, NFR-SL-P02).
 *
 * Two independent AbortController instances (Q3-A):
 *   - firstChunkController: aborted if no chunk arrives within firstChunkMs (5s)
 *   - totalStreamController: aborted if stream exceeds totalMs (120s)
 */
export interface StreamTimeoutHandles {
  firstChunkController: AbortController;
  totalStreamController: AbortController;
  /** Call when the first chunk arrives — cancels the first-chunk timer */
  clearFirstChunkTimer(): void;
  /** Call on stream completion or error — cancels all remaining timers */
  clearAll(): void;
}

export function createStreamTimeouts(
  firstChunkMs: number,
  totalMs: number,
): StreamTimeoutHandles {
  const firstChunkController = new AbortController();
  const totalStreamController = new AbortController();

  const firstChunkTimer = setTimeout(() => {
    if (!firstChunkController.signal.aborted) {
      firstChunkController.abort(new Error(`First chunk timeout after ${firstChunkMs}ms`));
    }
  }, firstChunkMs);

  const totalStreamTimer = setTimeout(() => {
    if (!totalStreamController.signal.aborted) {
      totalStreamController.abort(new Error(`Total stream timeout after ${totalMs}ms`));
    }
  }, totalMs);

  return {
    firstChunkController,
    totalStreamController,

    clearFirstChunkTimer() {
      clearTimeout(firstChunkTimer);
    },

    clearAll() {
      clearTimeout(firstChunkTimer);
      clearTimeout(totalStreamTimer);
    },
  };
}
