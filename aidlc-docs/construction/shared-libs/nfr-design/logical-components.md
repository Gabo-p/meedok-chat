# Logical Components — Unit: shared-libs

**Generated**: 2026-06-24  
**Unit**: shared-libs

---

## Component Map

```
libs/ai-client/
  src/
    ai-client.ts              ← Main public API (AiClient class)
    circuit-breaker.ts        ← CircuitBreaker class + bedrockCircuitBreaker singleton
    stream-timeout.ts         ← createStreamTimeouts() helper
    safe-logger.ts            ← createSafeLogger() wrapper
    errors.ts                 ← AiClientError class + AiClientErrorCode type
    types.ts                  ← ModelConfig, AiClientConfig, TokenUsage interfaces
    index.ts                  ← Barrel export
    __tests__/
      ai-client.test.ts       ← Standard Jest unit tests
      pbt/
        ai-client.pbt.test.ts ← PBT: error classification + chunk parsing
        cursor.pbt.test.ts    ← PBT: cursor encode/decode round-trip

libs/shared-types/
  src/
    dtos/
      auth.dto.ts             ← LoginDto, TokenPairDto, RefreshTokenDto
      patient.dto.ts          ← PatientDto, CreatePatientDto, UpdatePatientDto
      diagnosis.dto.ts        ← DiagnosisDto, CreateDiagnosisDto
      session.dto.ts          ← SessionDto, SessionWithMessagesDto, CreateSessionDto
      message.dto.ts          ← ChatMessageDto
      tenant.dto.ts           ← TenantDto
    enums/
      roles.enum.ts           ← DoctorRole
      session-status.enum.ts  ← SessionStatus
      message-role.enum.ts    ← MessageRole
      doctor-decision.enum.ts ← DoctorDecision
      prescription-status.enum.ts ← PrescriptionStatus
      error-codes.enum.ts     ← AiClientErrorCode
    api/
      response.types.ts       ← ApiResponse<T>, ResponseMeta, PaginatedResult<T>
      problem-details.types.ts ← ProblemDetails, ValidationError
      pagination.types.ts     ← PaginationCursor
    ws/
      events.types.ts         ← SendMessageEvent, ConfirmSuggestionEvent,
                                 DismissSuggestionEvent, StreamChunkEvent,
                                 StreamCompleteEvent, ErrorEvent (WS)
    constants/
      disclaimer.constant.ts  ← AI_DISCLAIMER string constant
    index.ts                  ← Barrel export

libs/domain/
  src/
    entities/
      tenant.entity.ts        ← Tenant interface
      doctor.entity.ts        ← Doctor interface
      patient.entity.ts       ← Patient interface
      diagnosis.entity.ts     ← Diagnosis interface
      prescription.entity.ts  ← Prescription interface
      chat-session.entity.ts  ← ChatSession interface
      chat-message.entity.ts  ← ChatMessage interface
    value-objects/
      patient-context.vo.ts   ← PatientContext, DiagnosisSummary
      jwt-payload.vo.ts       ← JwtPayload
      pagination.vo.ts        ← PaginationCursor, PaginatedResult<T>
    index.ts                  ← Barrel export

prisma/
  schema.prisma               ← Full Prisma schema (all 7 tables)
  migrations/                 ← Generated migration files
```

---

## Component Responsibilities

### `AiClient` (ai-client.ts)
- **Public API**: `streamInvoke()`, `invoke()`
- **Composes**: `CircuitBreaker`, `StreamTimeoutController`, `SafeLogger`
- **Injects**: AWS Bedrock Runtime client, Pino logger, `AiClientConfig`
- **Does not**: own the circuit breaker state (uses singleton); log sensitive data

### `CircuitBreaker` (circuit-breaker.ts)
- **State**: `CLOSED | OPEN | HALF_OPEN` — module-level singleton
- **Public API**: `allowRequest()`, `recordFailure()`, `recordSuccess()`, `getState()`
- **Counts**: Fatal errors only (within 60s sliding window)
- **Thresholds**: 3 failures → OPEN; 30s → HALF_OPEN; success → CLOSED

### `StreamTimeoutController` (stream-timeout.ts)
- **Two timers**: `firstChunkTimer` (5s) + `totalStreamTimer` (120s)
- **Both**: Independent `AbortController` instances
- **API**: `createStreamTimeouts(firstChunkMs, totalMs)` returns `StreamTimeoutHandles`
- **Cleanup**: `clearFirstChunkTimer()` on first chunk; `clearAll()` on completion/error

### `SafeLogger` (safe-logger.ts)
- **Wraps**: Injected Pino logger
- **Strips**: `prompt`, `chunk`, `content`, `inputText`, `outputText` keys from all log objects
- **Replaces with**: `'[REDACTED]'`
- **Applies**: Deep redaction (recursive through nested objects)

### `AiClientError` (errors.ts)
- **Extends**: `Error`
- **Properties**: `code: AiClientErrorCode`, `retryable: boolean`, `cause?: unknown`
- **Codes**: `THROTTLED` | `SERVICE_UNAVAILABLE` | `INVALID_REQUEST` | `AUTH_ERROR` | `MODEL_ERROR` | `TIMEOUT` | `STREAM_INTERRUPTED` | `CIRCUIT_OPEN`

---

## Component Interaction — `streamInvoke()` Call Path

```
AiClient.streamInvoke(prompt, config)
  │
  ├─ [1] SafeLogger.info({ modelId, operation: 'streamInvoke' })
  │
  ├─ [2] Validate inputs (empty prompt → throw AiClientError INVALID_REQUEST)
  │
  ├─ [3] CircuitBreaker.allowRequest()
  │        OPEN → throw AiClientError({ code: 'CIRCUIT_OPEN', retryable: false })
  │        CLOSED/HALF_OPEN → continue
  │
  ├─ [4] createStreamTimeouts(5_000, 120_000)
  │        returns { firstChunkController, totalStreamController, clearFirstChunkTimer, clearAll }
  │
  ├─ [5] Build Bedrock request (Anthropic Claude Messages API format)
  │
  ├─ [6] InvokeModelWithResponseStreamCommand(request, {
  │         abortSignal: combineSignals(firstChunkController.signal, totalStreamController.signal)
  │       })
  │
  ├─ [7] For each chunk in response stream:
  │        ├─ clearFirstChunkTimer()  (on first chunk only)
  │        ├─ parse bytes → extract text delta
  │        └─ yield delta string to caller
  │
  ├─ [8] On success:
  │        CircuitBreaker.recordSuccess()
  │        clearAll()
  │        SafeLogger.info({ modelId, durationMs, operation: 'streamComplete' })
  │
  └─ [9] On error:
           classify error → AiClientErrorCode
           IF retryable AND not CIRCUIT_OPEN:
             wait 1000ms → retry once (return to step 5)
             IF retry fails:
               IF fatal: CircuitBreaker.recordFailure()
               clearAll()
               throw AiClientError
           IF fatal (no retry):
             CircuitBreaker.recordFailure()
             clearAll()
             throw AiClientError
           SafeLogger.error({ code, retryable, durationMs })
```

---

## Cross-Unit Visibility

| Component | Exported from | Consumed by |
|-----------|--------------|-------------|
| `AiClient` | `@meedok/ai-client` | `apps/api` (ChatModule — Unit 5) |
| `AiClientError` | `@meedok/ai-client` | `apps/api` (ChatService error handling) |
| All DTOs | `@meedok/shared-types` | `apps/api`, `apps/web` |
| `AI_DISCLAIMER` constant | `@meedok/shared-types` | `apps/api` (ChatService), `apps/web` (AiDisclaimer component) |
| All domain entities | `@meedok/domain` | `apps/api`, `apps/web` |
| `PrismaClient` (generated) | `@prisma/client` | `apps/api` (all model files, Units 2–5) |
| Prisma query timeout extension | `apps/api/src/db/prisma-client.ts` | All Prisma model files in `apps/api` |

---

## NFR Coverage by Component

| NFR | Component | Pattern |
|-----|-----------|---------|
| NFR-SL-R01 Circuit breaker | `CircuitBreaker` + `AiClient` | Circuit Breaker (Pattern 1) |
| NFR-SL-P01 First-chunk timeout | `StreamTimeoutController` + `AiClient` | Dual Timeout (Pattern 2) |
| NFR-SL-P02 Total stream timeout | `StreamTimeoutController` + `AiClient` | Dual Timeout (Pattern 2) |
| NFR-SL-S04 No prompt logging | `SafeLogger` + `AiClient` | Sensitive Key Redaction (Pattern 3) |
| NFR-SL-P04 Query timeout | Prisma extension (Unit 2+) | Query Timeout Extension (Pattern 4) |
| NFR-SL-T01/T02 PBT | `__tests__/pbt/` | PBT Harness (Pattern 5) |
| NFR-SL-P03 Connection pool | Prisma default | No implementation needed (Pattern 6) |
