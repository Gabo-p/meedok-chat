import * as fc from 'fast-check';

/**
 * Cursor encode/decode round-trip PBT (NFR-SL-T01, NFR-SL-T02).
 *
 * The cursor is defined here inline since the actual implementation
 * will live in the pagination utility consumed by apps/api.
 * These tests validate the encoding contract before implementation.
 */

interface CursorPayload {
  id: string;
  ts: number;
}

function encodeCursor(payload: CursorPayload): string {
  return Buffer.from(JSON.stringify(payload)).toString('base64');
}

function decodeCursor(encoded: string): CursorPayload {
  const decoded = Buffer.from(encoded, 'base64').toString('utf-8');
  const parsed = JSON.parse(decoded) as unknown;
  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    typeof (parsed as Record<string, unknown>)['id'] !== 'string' ||
    typeof (parsed as Record<string, unknown>)['ts'] !== 'number'
  ) {
    throw new Error('Invalid cursor format');
  }
  return parsed as CursorPayload;
}

describe('Cursor encode/decode — Property-Based Tests', () => {
  // ─── Property 1: Round-trip — decode(encode(x)) deep-equals x ────────────

  it('decode(encode(cursor)) === cursor for any valid payload', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          ts: fc.integer({ min: 0, max: 2_000_000_000 }),
        }),
        (payload) => {
          const encoded = encodeCursor(payload);
          const decoded = decodeCursor(encoded);
          return decoded.id === payload.id && decoded.ts === payload.ts;
        },
      ),
      { numRuns: 100, seed: 42 },
    );
  });

  // ─── Property 2: Encoded cursor is always a non-empty string ─────────────

  it('encodeCursor always returns a non-empty string', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          ts: fc.integer({ min: 0, max: 2_000_000_000 }),
        }),
        (payload) => {
          const encoded = encodeCursor(payload);
          return typeof encoded === 'string' && encoded.length > 0;
        },
      ),
      { numRuns: 100, seed: 42 },
    );
  });

  // ─── Property 3: Decoded cursor always has correct field types ────────────

  it('decoded cursor always has id:string and ts:number', () => {
    fc.assert(
      fc.property(
        fc.record({
          id: fc.uuid(),
          ts: fc.integer({ min: 0, max: 2_000_000_000 }),
        }),
        (payload) => {
          const decoded = decodeCursor(encodeCursor(payload));
          return typeof decoded.id === 'string' && typeof decoded.ts === 'number';
        },
      ),
      { numRuns: 100, seed: 42 },
    );
  });

  // ─── Property 4: Two different payloads produce different cursors ─────────

  it('distinct payloads produce distinct encoded cursors', () => {
    fc.assert(
      fc.property(
        fc.record({ id: fc.uuid(), ts: fc.integer({ min: 0, max: 1_000_000_000 }) }),
        fc.record({ id: fc.uuid(), ts: fc.integer({ min: 0, max: 1_000_000_000 }) }),
        (a, b) => {
          // Only assert when payloads are actually different
          if (a.id === b.id && a.ts === b.ts) return true;
          return encodeCursor(a) !== encodeCursor(b);
        },
      ),
      { numRuns: 100, seed: 42 },
    );
  });

  // ─── Property 5: decodeCursor throws on invalid base64 input ─────────────

  it('decodeCursor throws on non-base64 or malformed input', () => {
    fc.assert(
      fc.property(
        fc.string({ minLength: 1, maxLength: 50 }).filter((s) => {
          // Filter out strings that happen to be valid base64 JSON with id+ts
          try {
            const p = JSON.parse(Buffer.from(s, 'base64').toString()) as Record<string, unknown>;
            return !(typeof p['id'] === 'string' && typeof p['ts'] === 'number');
          } catch {
            return true;
          }
        }),
        (badInput) => {
          let threw = false;
          try {
            decodeCursor(badInput);
          } catch {
            threw = true;
          }
          return threw;
        },
      ),
      { numRuns: 100, seed: 42 },
    );
  });
});
