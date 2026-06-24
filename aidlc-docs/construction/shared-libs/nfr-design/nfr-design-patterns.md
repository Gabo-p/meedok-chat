# NFR Design Patterns — Unit: shared-libs

**Generated**: 2026-06-24  
**Unit**: shared-libs

---

## Pattern 1: Circuit Breaker (Resiliency)

**Addresses**: NFR-SL-R01  
**Location**: `libs/ai-client/src/circuit-breaker.ts`  
**Scope**: Module-level singleton — one instance shared across all AiClient calls in the Node.js process

### State Machine

```
         3 fatal errors in 60s window
CLOSED ─────────────────────────────────► OPEN
  ▲                                         │
  │  probe succeeds                         │ 30s elapsed
  │                                         ▼
  └────────────────────────────────── HALF_OPEN
              probe fails → OPEN
```

### State Definitions

| State | Behaviour | Transition |
|-------|-----------|------------|
| `CLOSED` | Normal operation — all calls pass through | → `OPEN` when 3 fatal errors within 60s |
| `OPEN` | Fail-fast — throw `AiClientError({ code: 'CIRCUIT_OPEN', retryable: false })` immediately | → `HALF_OPEN` after 30s |
| `HALF_OPEN` | Allow exactly one probe call | → `CLOSED` if probe succeeds; → `OPEN` if probe fails |

### Implementation Sketch

```typescript
type CircuitState = 'CLOSED' | 'OPEN' | 'HALF_OPEN'

interface CircuitBreakerConfig {
  failureThreshold: number    // 3
  windowMs: number            // 60_000
  halfOpenAfterMs: number     // 30_000
}

class CircuitBreaker {
  private state: CircuitState = 'CLOSED'
  private failures: number[] = []   // timestamps of recent fatal failures
  private openedAt: number | null = null

  // Returns true if the call should be allowed through
  allowRequest(): boolean

  // Called when a fatal error occurs
  recordFailure(): void

  // Called when a call succeeds
  recordSuccess(): void

  // Returns current state (for logging/metrics)
  getState(): CircuitState
}

// Module-level singleton
export const bedrockCircuitBreaker = new CircuitBreaker({
  failureThreshold: 3,
  windowMs: 60_000,
  halfOpenAfterMs: 30_000,
})
```

### Failure Counting Rules
- **Only fatal errors** count (`INVALID_REQUEST`, `AUTH_ERROR`, `MODEL_ERROR`, `CIRCUIT_OPEN`)
- Retryable errors (THROTTLED, TIMEOUT, SERVICE_UNAVAILABLE) do NOT increment the counter
- Failures older than the 60s window are purged from the counter before each check

---

## Pattern 2: Dual Timeout (Performance)

**Addresses**: NFR-SL-P01, NFR-SL-P02  
**Location**: `libs/ai-client/src/stream-timeout.ts`  
**Implementation**: Two independent `AbortController` instances

### Design

```typescript
interface StreamTimeoutHandles {
  firstChunkController: AbortController  // aborted if no chunk within 5s
  totalStreamController: AbortController // aborted if stream exceeds 120s
  clearFirstChunkTimer(): void           // called when first chunk arrives
  clearAll(): void                       // called on stream completion or error
}

function createStreamTimeouts(
  firstChunkMs: number,   // 5_000
  totalMs: number         // 120_000
): StreamTimeoutHandles
```

### Lifecycle

```
Stream starts
  │
  ├── firstChunkTimer (5s) ──► if fires: abort firstChunkController
  │                             throw AiClientError({ code: 'TIMEOUT', retryable: true })
  │
  ├── totalStreamTimer (120s) ─► if fires: abort totalStreamController
  │                               throw AiClientError({ code: 'TIMEOUT', retryable: true })
  │
  First chunk received:
  │   clearFirstChunkTimer() ← cancels 5s timer
  │   continue streaming...
  │
  Stream complete or error:
      clearAll() ← cancels both remaining timers
```

### AWS SDK Integration
Both `AbortController` signals are passed to `InvokeModelWithResponseStreamCommand` via the SDK's `abortSignal` option. The AWS SDK respects the signal and terminates the HTTP connection when aborted.

---

## Pattern 3: Sensitive Key Logger Wrapper (Security)

**Addresses**: NFR-SL-S04, BR-SL-09  
**Location**: `libs/ai-client/src/safe-logger.ts`  
**Enforcement**: Internal to `libs/ai-client` — not caller-dependent

### Design

```typescript
// Keys that must never appear in log output
const SENSITIVE_KEYS = ['prompt', 'chunk', 'content', 'inputText', 'outputText'] as const

interface SafeLogger {
  info(obj: object, msg?: string): void
  warn(obj: object, msg?: string): void
  error(obj: object, msg?: string): void
  debug(obj: object, msg?: string): void
}

// Wraps a Pino logger, stripping sensitive keys before every log call
function createSafeLogger(pinoLogger: Logger): SafeLogger

// Redaction: sensitive keys are replaced with '[REDACTED]'
// Deep redaction: applies recursively to nested objects
```

### Redaction Example
```typescript
// Input to safe logger:
{ modelId: 'claude-3', prompt: 'Patient John has...', durationMs: 342 }

// Output written to Pino:
{ modelId: 'claude-3', prompt: '[REDACTED]', durationMs: 342 }
```

### AiClient Constructor
```typescript
class AiClient {
  constructor(
    config: AiClientConfig,
    logger: Logger   // Pino logger injected by caller
  ) {
    // Internally wraps with SafeLogger — caller cannot accidentally log prompt content
    this.logger = createSafeLogger(logger)
  }
}
```

---

## Pattern 4: Prisma Query Timeout Extension (Performance + Resiliency)

**Addresses**: NFR-SL-P04  
**Location**: `apps/api/src/db/prisma-client.ts` (owned by Unit 2: tenant, but designed here as it flows from shared-libs Prisma schema)

### Design

```typescript
import { PrismaClient } from '@prisma/client'

const QUERY_TIMEOUT_MS = 5_000

export const prisma = new PrismaClient().$extends({
  query: {
    $allModels: {
      async $allOperations({ operation, model, args, query }) {
        const timeout = new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error(`Prisma query timeout: ${model}.${operation}`)),
            QUERY_TIMEOUT_MS
          )
        )
        return Promise.race([query(args), timeout])
      }
    }
  }
})
```

**Note**: This extension is instantiated in `apps/api` (Unit 2+), not in `libs/`. It is designed here because the timeout requirement originates from the shared-libs NFR phase and the pattern must be documented before Units 2–5 implement their models.

---

## Pattern 5: PBT Harness (Property-Based Testing)

**Addresses**: NFR-SL-T01, NFR-SL-T02, NFR-SL-T03  
**Location**: `libs/ai-client/src/__tests__/pbt/`

### Test Structure

```
libs/ai-client/src/__tests__/
  ai-client.test.ts          ← standard Jest unit tests
  pbt/
    ai-client.pbt.test.ts    ← PBT: error classification + chunk parsing
    cursor.pbt.test.ts       ← PBT: cursor encode/decode round-trip
```

### Property Definitions

#### Property 1: Error classification always returns boolean `retryable`
```typescript
fc.assert(
  fc.property(
    fc.record({ name: fc.string(), code: fc.string(), statusCode: fc.integer() }),
    (fakeError) => {
      const result = classifyError(fakeError)
      return typeof result.retryable === 'boolean'
    }
  ),
  { numRuns: 100, seed: 42 }
)
```

#### Property 2: Chunk parsing never throws on valid Bedrock stream events
```typescript
fc.assert(
  fc.property(
    arbitraryBedrockStreamEvent(),  // custom fast-check arbitrary
    (event) => {
      expect(() => parseChunk(event)).not.toThrow()
      const result = parseChunk(event)
      return result === null || typeof result === 'string'
    }
  ),
  { numRuns: 100, seed: 42 }
)
```

#### Property 3: Cursor encode/decode round-trip
```typescript
fc.assert(
  fc.property(
    fc.record({
      id: fc.uuid(),
      ts: fc.integer({ min: 0, max: Date.now() })
    }),
    (cursor) => {
      const encoded = encodeCursor(cursor)
      const decoded = decodeCursor(encoded)
      return decoded.id === cursor.id && decoded.ts === cursor.ts
    }
  ),
  { numRuns: 100, seed: 42 }
)
```

### CI Configuration
- All PBT tests run in CI with `seed: 42` for reproducibility
- Local dev runs with random seed (omit `seed` option)
- `numRuns: 100` minimum per property

---

## Pattern 6: Connection Pool (Performance)

**Addresses**: NFR-SL-P03  
**Implementation**: Prisma default pool — no explicit configuration needed

The default Prisma connection pool for MySQL uses `connection_limit = num_cpus * 2 + 1`. This is sufficient for MVP and auto-tunes to the EC2 instance size. No additional pattern implementation required.

**Monitoring**: Pool saturation metrics (rejected connections, wait time) should be monitored post-launch to inform any future tuning.
