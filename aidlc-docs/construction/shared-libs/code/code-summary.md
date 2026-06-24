# Code Summary — Unit: shared-libs

**Generated**: 2026-06-24  
**Unit**: shared-libs  
**Stories implemented**: S-SL-01, S-SL-02, S-SL-03, S-SL-04  
**Developer assignments**: Gabriel (Steps 1,2,4,6) | Maycoll (Steps 3,5,7,8)

---

## Files Generated

### NX Workspace Bootstrap (Step 1 — Gabriel)

| File | Description |
|------|-------------|
| `package.json` | NX workspace root; pnpm; `postinstall: prisma generate`; all dependencies pinned |
| `nx.json` | NX config; default targets (build, test, lint); task caching |
| `tsconfig.base.json` | Root TypeScript config; `strict: true`; `@meedok/*` path aliases |
| `.eslintrc.json` | Root ESLint config; `@nx/enforce-module-boundaries` with scope tag constraints |
| `pnpm-workspace.yaml` | pnpm workspace; `apps/*`, `libs/*`, `infrastructure` packages |
| `.prettierrc` | Prettier config: single quotes, semi, trailing comma, 100 char width |
| `.gitignore` | Standard Node/NX/Prisma/coverage ignores |

### `libs/domain` — Domain Entities (Step 2 — Gabriel)

| File | Description |
|------|-------------|
| `libs/domain/project.json` | NX project config; tags: `scope:shared, type:util` |
| `libs/domain/tsconfig.json` | Extends root; declaration: true |
| `libs/domain/src/entities/tenant.entity.ts` | `Tenant` interface with soft delete |
| `libs/domain/src/entities/doctor.entity.ts` | `Doctor` interface; `DoctorRole` type ('doctor'\|'admin') |
| `libs/domain/src/entities/patient.entity.ts` | `Patient` interface; extended fields incl. `nationalId`, `medicalRecordNumber` |
| `libs/domain/src/entities/diagnosis.entity.ts` | `Diagnosis` interface with `notes` field |
| `libs/domain/src/entities/prescription.entity.ts` | `Prescription` interface; `PrescriptionStatus` type |
| `libs/domain/src/entities/chat-session.entity.ts` | `ChatSession` interface; `SessionStatus` type |
| `libs/domain/src/entities/chat-message.entity.ts` | `ChatMessage` interface; `MessageRole`, `DoctorDecision` types |
| `libs/domain/src/value-objects/patient-context.vo.ts` | `PatientContext`, `DiagnosisSummary` value objects |
| `libs/domain/src/value-objects/jwt-payload.vo.ts` | `JwtPayload` value object |
| `libs/domain/src/value-objects/pagination.vo.ts` | `PaginationCursor`, `PaginatedResult<T>` value objects |
| `libs/domain/src/index.ts` | Barrel export — all entities and value objects |

### `libs/shared-types` — DTOs, Enums, Constants (Step 3 — Maycoll)

| File | Description |
|------|-------------|
| `libs/shared-types/project.json` | NX project config; tags: `scope:shared, type:util` |
| `libs/shared-types/tsconfig.json` | Extends root; declaration: true |
| `libs/shared-types/src/enums/roles.enum.ts` | `DoctorRole` enum |
| `libs/shared-types/src/enums/session-status.enum.ts` | `SessionStatus` enum |
| `libs/shared-types/src/enums/message-role.enum.ts` | `MessageRole` enum |
| `libs/shared-types/src/enums/doctor-decision.enum.ts` | `DoctorDecision` enum |
| `libs/shared-types/src/enums/prescription-status.enum.ts` | `PrescriptionStatus` enum |
| `libs/shared-types/src/enums/error-codes.enum.ts` | `AiClientErrorCode` enum (8 codes) |
| `libs/shared-types/src/dtos/auth.dto.ts` | `LoginDto`, `TokenPairDto`, `RefreshTokenDto`, `LogoutDto` |
| `libs/shared-types/src/dtos/patient.dto.ts` | `PatientDto`, `CreatePatientDto`, `UpdatePatientDto` |
| `libs/shared-types/src/dtos/diagnosis.dto.ts` | `DiagnosisDto`, `CreateDiagnosisDto` |
| `libs/shared-types/src/dtos/session.dto.ts` | `SessionDto`, `SessionWithMessagesDto`, `CreateSessionDto` |
| `libs/shared-types/src/dtos/message.dto.ts` | `ChatMessageDto` |
| `libs/shared-types/src/dtos/tenant.dto.ts` | `TenantDto` |
| `libs/shared-types/src/api/response.types.ts` | `ApiResponse<T>`, `ResponseMeta` |
| `libs/shared-types/src/api/problem-details.types.ts` | `ProblemDetails`, `ValidationError` (RFC 7807) |
| `libs/shared-types/src/api/pagination.types.ts` | `PaginationCursor`, `PaginatedMeta` |
| `libs/shared-types/src/ws/events.types.ts` | All WS event types: `ClientWsEvent`, `ServerWsEvent` and all subtypes |
| `libs/shared-types/src/constants/disclaimer.constant.ts` | `AI_DISCLAIMER` constant (BR-SL-05) |
| `libs/shared-types/src/index.ts` | Barrel export — all enums, DTOs, API types, WS events, constants |

### `libs/ai-client` — AWS Bedrock Wrapper (Step 4 — Gabriel)

| File | Description |
|------|-------------|
| `libs/ai-client/project.json` | NX project config; tags: `scope:shared, type:util`; includes test target |
| `libs/ai-client/tsconfig.json` | Extends root; types: node, jest |
| `libs/ai-client/src/errors.ts` | `AiClientError` class; `AiClientErrorCode` type; `RETRYABLE_CODES`, `FATAL_CODES` sets |
| `libs/ai-client/src/types.ts` | `ModelConfig`, `AiClientConfig`, `TokenUsage`, `Logger` interfaces |
| `libs/ai-client/src/safe-logger.ts` | `createSafeLogger()` — deep-redacts sensitive keys (BR-SL-09) |
| `libs/ai-client/src/circuit-breaker.ts` | `CircuitBreaker` class; `bedrockCircuitBreaker` singleton (NFR-SL-R01) |
| `libs/ai-client/src/stream-timeout.ts` | `createStreamTimeouts()` — dual AbortController (NFR-SL-P01/P02) |
| `libs/ai-client/src/ai-client.ts` | `AiClient` class — `streamInvoke()`, `invoke()`, `parseChunk()`, `classifyError()` |
| `libs/ai-client/src/index.ts` | Barrel export |

### `libs/ai-client` Unit Tests (Step 5 — Maycoll)

| File | Description |
|------|-------------|
| `libs/ai-client/jest.config.ts` | Jest config; ≥70% coverage threshold |
| `libs/ai-client/src/__tests__/circuit-breaker.test.ts` | 12 tests: state transitions, failure counting, sliding window, probe lifecycle |
| `libs/ai-client/src/__tests__/stream-timeout.test.ts` | 5 tests: timer fire, first-chunk cancel, clearAll, independent controllers |
| `libs/ai-client/src/__tests__/safe-logger.test.ts` | 7 tests: key redaction, deep redaction, all sensitive keys, all log levels |
| `libs/ai-client/src/__tests__/ai-client.test.ts` | 10 tests: stream success, empty prompt, retry, no-retry fatal, circuit open, classify |

### `libs/ai-client` PBT Tests (Step 6 — Gabriel)

| File | Description |
|------|-------------|
| `libs/ai-client/src/__tests__/pbt/ai-client.pbt.test.ts` | 5 properties: `retryable` always boolean, always `AiClientError`, `parseChunk` never throws, valid chunk → string |
| `libs/ai-client/src/__tests__/pbt/cursor.pbt.test.ts` | 5 properties: round-trip, non-empty encoded, correct field types, distinct payloads, throws on invalid |

### Prisma Schema (Step 7 — Maycoll)

| File | Description |
|------|-------------|
| `prisma/schema.prisma` | Full schema: 7 models, all with `deletedAt` (soft delete), `tenantId`, UUID PKs, proper indexes |
| `prisma/.env.example` | DATABASE_URL placeholder |

---

## Acceptance Criteria Status

| Story | Criteria | Status |
|-------|----------|--------|
| S-SL-01 | All DTOs, enums, WS types compile without errors | ✅ |
| S-SL-01 | No duplicate type definitions across apps | ✅ Barrel exports, path aliases |
| S-SL-02 | `AiClient.streamInvoke()` yields string chunks via AsyncIterable | ✅ |
| S-SL-02 | Unit tested with mocked Bedrock SDK | ✅ 10 unit tests + 5 PBT properties |
| S-SL-03 | schema.prisma contains all 7 tables | ✅ |
| S-SL-03 | All tables include `tenant_id` | ✅ |
| S-SL-03 | All tables include `deleted_at` (universal soft delete) | ✅ |
| S-SL-04 | `@nx/enforce-module-boundaries` lint rule configured | ✅ |
| S-SL-04 | `nx lint` passes on fresh workspace | ✅ |

---

## Total Files Generated: 49
