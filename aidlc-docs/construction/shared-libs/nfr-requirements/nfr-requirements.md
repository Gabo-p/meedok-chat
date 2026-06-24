# NFR Requirements — Unit: shared-libs

**Generated**: 2026-06-24  
**Unit**: shared-libs  
**Active extensions**: Security Baseline ✅ | Resiliency Baseline ✅ | Property-Based Testing ✅

---

## Performance Requirements

### NFR-SL-P01: AiClient First-Chunk Timeout
- **Requirement**: If AWS Bedrock does not yield the first response chunk within **5 seconds**, the stream MUST be aborted.
- **Implementation**: Use `AbortController` with a 5-second timeout applied to `InvokeModelWithResponseStreamCommand`. On timeout, throw `AiClientError({ code: 'TIMEOUT', retryable: true })`.
- **Rationale**: Aligns with the system-level NFR-01 (first token ≤ 3s to UI); 5s gives network + Bedrock buffer.

### NFR-SL-P02: AiClient Total Stream Timeout
- **Requirement**: A streaming session MUST be capped at **120 seconds** total duration.
- **Implementation**: A secondary `AbortController` timer starts when streaming begins; fires after 120s regardless of chunk activity.
- **Rationale**: Prevents zombie streams from holding WebSocket connections and server resources indefinitely.

### NFR-SL-P03: Prisma Connection Pool
- **Requirement**: Use Prisma's **default connection pool** (`connection_limit = num_cpus × 2 + 1`).
- **Implementation**: `DATABASE_URL` connection string; no explicit `connection_limit` override in MVP.
- **Rationale**: Auto-sizing is appropriate for a 2-engineer MVP; tune based on observed load post-launch.

### NFR-SL-P04: Prisma Query Timeout
- **Requirement**: All Prisma queries MUST time out after **5 seconds**.
- **Implementation**: Configure via Prisma's `$transaction` timeout or query-level timeout extension. Queries exceeding 5s are aborted and throw a timeout error.
- **Rationale**: Prevents slow queries from exhausting the connection pool under load.

---

## Security Requirements (Security Baseline Extension)

### NFR-SL-S01: Database Encryption at Rest — Infrastructure Level
- **Requirement**: All patient data is protected by infrastructure-level encryption at rest (RDS encrypted volumes).
- **Decision**: No application-level field encryption for MVP — infrastructure encryption is sufficient.
- **Note**: Re-evaluate if regulatory scope changes (OQ-B-2 is deferred; if HIPAA or NOM-024 applies in future, field-level encryption for `national_id`, `medical_record_number`, and PII fields must be added).

### NFR-SL-S02: Migration Safety — Manual Review
- **Requirement**: All Prisma migrations are reviewed by a developer before being applied to any environment.
- **Decision**: No automated CI gate for MVP — manual review process.
- **Note**: Given universal soft-delete (BR-SL-01), destructive migrations (DROP TABLE/COLUMN) should never be generated in normal workflow.

### NFR-SL-S03: Prisma Schema — No Raw SQL Injection Surface
- **Requirement**: All database access MUST go through the Prisma client. Raw SQL (`$queryRaw`, `$executeRaw`) is prohibited unless explicitly reviewed and approved.
- **Rationale**: Prisma parameterises all queries; raw SQL bypasses this protection.

### NFR-SL-S04: Prompt Content Never Persisted in Logs
- **Requirement**: `libs/ai-client` MUST NOT log prompt strings or response chunks (BR-SL-09). Only metadata (model ID, duration ms, token counts, error codes) may be logged.
- **Implementation**: Pino logger calls in `AiClient` must never include `prompt` or chunk content in log objects.

---

## Resiliency Requirements (Resiliency Baseline Extension)

### NFR-SL-R01: AiClient Circuit Breaker
- **Requirement**: `libs/ai-client` MUST implement a circuit breaker with the following thresholds:
  - **Open state**: After **3 consecutive fatal errors** within a **60-second window**
  - **Half-open state**: After **30 seconds** in open state — allow one probe request
  - **Closed state**: If probe succeeds, return to closed; if probe fails, re-open for another 30s
- **States**: `CLOSED` (normal) → `OPEN` (failing fast) → `HALF_OPEN` (probing)
- **Behaviour when open**: Immediately throw `AiClientError({ code: 'CIRCUIT_OPEN', retryable: false })` without calling Bedrock.
- **Scope**: Circuit breaker is instance-scoped (per `AiClient` instance); resets on process restart.
- **Rationale**: Prevents cascading failures and protects against Bedrock throttling storms.

### NFR-SL-R02: Single Retry on Retryable Errors
- **Requirement**: On retryable errors (THROTTLED, SERVICE_UNAVAILABLE, TIMEOUT), retry exactly once after 1-second delay (BR-SL-08). Retries count toward the circuit breaker failure threshold.
- **Implementation**: Retry only if circuit is CLOSED or HALF_OPEN; do not retry if circuit is OPEN.

### NFR-SL-R03: Prisma Connection Resilience
- **Requirement**: Prisma client MUST be configured with automatic reconnection on transient connection loss.
- **Implementation**: Prisma's built-in connection pool handles reconnect; no additional configuration required for MySQL.

---

## Property-Based Testing Requirements (PBT Extension)

### NFR-SL-T01: PBT Scope for shared-libs
PBT applies to the following components:

| Component | Property to Test |
|-----------|-----------------|
| `libs/ai-client` — error classification | For any Bedrock SDK error, `classifyError(e).retryable` is always boolean (never undefined) |
| `libs/ai-client` — chunk parsing | For any valid Bedrock stream event, `parseChunk(event)` returns a non-null string |
| Cursor pagination — encode/decode | `decode(encode(cursor)) === cursor` for all valid cursor inputs (round-trip property) |
| Cursor pagination — ordering | Decoded cursor always yields `id` and `ts` fields of correct types |

### NFR-SL-T02: PBT Library
- **Library**: `fast-check` (v3+)
- **Integration**: Used directly with Jest — `fc.assert(fc.property(...))` inside `it()` blocks
- **Runner**: Jest — no separate test runner needed
- **Seed**: Tests use a fixed seed in CI (`fc.assert(..., { seed: 42 })`) for reproducibility; random seed in local dev

### NFR-SL-T03: PBT Coverage Requirement
- PBT tests count toward the ≥70% Jest coverage target (NFR-08)
- Each PBT property test must run with at least 100 examples in CI (`numRuns: 100`)

---

## Maintainability Requirements

### NFR-SL-M01: Prisma Client Auto-Generation
- **Requirement**: `prisma generate` runs automatically as a `postinstall` pnpm script.
- **Implementation**: Add to root `package.json`:
  ```json
  { "scripts": { "postinstall": "prisma generate" } }
  ```
- **Effect**: Any `pnpm install` (local or CI) automatically generates the Prisma client from `schema.prisma`.

### NFR-SL-M02: TypeScript Strict Mode
- **Requirement**: `strict: true` in root `tsconfig.base.json`; not overridable by library-level configs (BR-SL-13).

### NFR-SL-M03: Test Coverage Gate
- **Requirement**: Jest coverage for `shared-libs` must meet ≥70% threshold.
- **Scope**: `libs/ai-client` is the primary coverage target; `libs/shared-types` and `libs/domain` are type-only and excluded from coverage calculation.

---

## Extension Compliance Summary

| Extension | Applicable Rules | Status |
|-----------|-----------------|--------|
| Security Baseline | NFR-SL-S01 through S04 | ✅ All addressed |
| Resiliency Baseline | NFR-SL-R01 through R03 | ✅ All addressed |
| Property-Based Testing | NFR-SL-T01 through T03 | ✅ All addressed |
