# Code Generation Plan — Unit: shared-libs

**Unit**: shared-libs  
**Stories**: S-SL-01, S-SL-02, S-SL-03, S-SL-04  
**Code location**: Workspace root (`meedok-chat/`)  
**Documentation**: `aidlc-docs/construction/shared-libs/code/`

---

## Unit Context

**Dependencies**: None — this is the foundation unit  
**Produces**:
- `libs/shared-types/` — TypeScript DTOs, enums, constants
- `libs/domain/` — Domain entity interfaces
- `libs/ai-client/` — AWS Bedrock wrapper with circuit breaker, dual timeout, safe logger
- `prisma/schema.prisma` — Full database schema
- NX workspace baseline — `nx.json`, `tsconfig.base.json`, `package.json`, `.eslintrc.json`

---

## Stories Implemented

| Story | Description |
|-------|-------------|
| S-SL-01 | Shared TypeScript types and DTOs — `libs/shared-types`, `libs/domain` |
| S-SL-02 | AWS Bedrock AI client with streaming — `libs/ai-client` |
| S-SL-03 | Complete Prisma schema — all 7 tables, soft delete, tenant isolation |
| S-SL-04 | NX project structure, path aliases, module boundary enforcement |

---

## Generation Steps

## Developer Assignment

| Developer | Assigned Steps | Scope |
|-----------|---------------|-------|
| **Gabriel** | Steps 1, 2, 4, 6 | NX workspace bootstrap, libs/domain entities, libs/ai-client source, PBT tests |
| **Maycoll** | Steps 3, 5, 7, 8 | libs/shared-types DTOs/enums, unit tests, Prisma schema, documentation |

---

### Step 1: NX Workspace Bootstrap — 👤 Gabriel
- [x] 1.1 Create `package.json` (NX workspace root, pnpm, workspaces config, postinstall: prisma generate)
- [x] 1.2 Create `nx.json` (NX config, default targets, task runner)
- [x] 1.3 Create `tsconfig.base.json` (strict: true, `@meedok/*` path aliases)
- [x] 1.4 Create `.eslintrc.json` (root ESLint config with `@nx/enforce-module-boundaries`)
- [x] 1.5 Create `pnpm-workspace.yaml` (workspace packages: apps/*, libs/*)
- [x] 1.6 Create `.prettierrc` and `.gitignore`
- [x] *Story covered*: S-SL-04

### Step 2: `libs/domain` — Domain Entities — 👤 Gabriel
- [x] 2.1 Create `libs/domain/project.json` (NX project config, tags: scope:shared,type:util)
- [x] 2.2 Create `libs/domain/tsconfig.json` (extends root, strict)
- [x] 2.3 Create `libs/domain/src/entities/tenant.entity.ts`
- [x] 2.4 Create `libs/domain/src/entities/doctor.entity.ts` (DoctorRole type)
- [x] 2.5 Create `libs/domain/src/entities/patient.entity.ts`
- [x] 2.6 Create `libs/domain/src/entities/diagnosis.entity.ts`
- [x] 2.7 Create `libs/domain/src/entities/prescription.entity.ts` (PrescriptionStatus type)
- [x] 2.8 Create `libs/domain/src/entities/chat-session.entity.ts` (SessionStatus type)
- [x] 2.9 Create `libs/domain/src/entities/chat-message.entity.ts` (MessageRole, DoctorDecision types)
- [x] 2.10 Create `libs/domain/src/value-objects/patient-context.vo.ts` (PatientContext, DiagnosisSummary)
- [x] 2.11 Create `libs/domain/src/value-objects/jwt-payload.vo.ts` (JwtPayload)
- [x] 2.12 Create `libs/domain/src/value-objects/pagination.vo.ts` (PaginationCursor, PaginatedResult)
- [x] 2.13 Create `libs/domain/src/index.ts` (barrel export — all entities and value objects)
- [x] *Story covered*: S-SL-01 (domain layer)

### Step 3: `libs/shared-types` — DTOs, Enums, Constants — 👤 Maycoll
- [x] 3.1 Create `libs/shared-types/project.json` (NX project config, tags: scope:shared,type:util)
- [x] 3.2 Create `libs/shared-types/tsconfig.json`
- [x] 3.3 Create `libs/shared-types/src/enums/roles.enum.ts` (DoctorRole)
- [x] 3.4 Create `libs/shared-types/src/enums/session-status.enum.ts`
- [x] 3.5 Create `libs/shared-types/src/enums/message-role.enum.ts`
- [x] 3.6 Create `libs/shared-types/src/enums/doctor-decision.enum.ts`
- [x] 3.7 Create `libs/shared-types/src/enums/prescription-status.enum.ts`
- [x] 3.8 Create `libs/shared-types/src/enums/error-codes.enum.ts` (AiClientErrorCode)
- [x] 3.9 Create `libs/shared-types/src/dtos/auth.dto.ts` (LoginDto, TokenPairDto, RefreshTokenDto, LogoutDto)
- [x] 3.10 Create `libs/shared-types/src/dtos/patient.dto.ts` (PatientDto, CreatePatientDto, UpdatePatientDto)
- [x] 3.11 Create `libs/shared-types/src/dtos/diagnosis.dto.ts` (DiagnosisDto, CreateDiagnosisDto)
- [x] 3.12 Create `libs/shared-types/src/dtos/session.dto.ts` (SessionDto, SessionWithMessagesDto, CreateSessionDto)
- [x] 3.13 Create `libs/shared-types/src/dtos/message.dto.ts` (ChatMessageDto)
- [x] 3.14 Create `libs/shared-types/src/dtos/tenant.dto.ts` (TenantDto)
- [x] 3.15 Create `libs/shared-types/src/api/response.types.ts` (ApiResponse, ResponseMeta, PaginatedResult)
- [x] 3.16 Create `libs/shared-types/src/api/problem-details.types.ts` (ProblemDetails, ValidationError)
- [x] 3.17 Create `libs/shared-types/src/api/pagination.types.ts` (PaginationCursor)
- [x] 3.18 Create `libs/shared-types/src/ws/events.types.ts` (all WS event types — client→server and server→client)
- [x] 3.19 Create `libs/shared-types/src/constants/disclaimer.constant.ts` (AI_DISCLAIMER)
- [x] 3.20 Create `libs/shared-types/src/index.ts` (barrel export — all DTOs, enums, types, constants)
- [x] *Story covered*: S-SL-01 (shared types layer)

### Step 4: `libs/ai-client` — AWS Bedrock Wrapper — 👤 Gabriel
- [x] 4.1 Create `libs/ai-client/project.json` (NX project config, tags: scope:shared,type:util)
- [x] 4.2 Create `libs/ai-client/tsconfig.json`
- [x] 4.3 Create `libs/ai-client/src/errors.ts` (AiClientError class, AiClientErrorCode type)
- [x] 4.4 Create `libs/ai-client/src/types.ts` (ModelConfig, AiClientConfig interfaces)
- [x] 4.5 Create `libs/ai-client/src/safe-logger.ts` (SafeLogger interface, createSafeLogger(), SENSITIVE_KEYS)
- [x] 4.6 Create `libs/ai-client/src/circuit-breaker.ts` (CircuitBreaker class, bedrockCircuitBreaker singleton)
- [x] 4.7 Create `libs/ai-client/src/stream-timeout.ts` (StreamTimeoutHandles, createStreamTimeouts())
- [x] 4.8 Create `libs/ai-client/src/ai-client.ts` (AiClient class — streamInvoke(), invoke())
- [x] 4.9 Create `libs/ai-client/src/index.ts` (barrel export)
- [x] *Story covered*: S-SL-02

### Step 5: `libs/ai-client` Unit Tests — 👤 Maycoll
- [x] 5.1 Create `libs/ai-client/jest.config.ts`
- [x] 5.2 Create `libs/ai-client/src/__tests__/circuit-breaker.test.ts` (state transitions, failure counting, window expiry)
- [x] 5.3 Create `libs/ai-client/src/__tests__/stream-timeout.test.ts` (timer fire, first-chunk cancel, clearAll)
- [x] 5.4 Create `libs/ai-client/src/__tests__/safe-logger.test.ts` (key redaction, deep redaction)
- [x] 5.5 Create `libs/ai-client/src/__tests__/ai-client.test.ts` (streamInvoke success, retry, circuit open, timeout — Bedrock SDK mocked)
- [x] *Story covered*: S-SL-02 (test coverage)

### Step 6: `libs/ai-client` Property-Based Tests — 👤 Gabriel
- [x] 6.1 Create `libs/ai-client/src/__tests__/pbt/ai-client.pbt.test.ts` (error classification always returns boolean retryable; chunk parsing never throws)
- [x] 6.2 Create `libs/ai-client/src/__tests__/pbt/cursor.pbt.test.ts` (encode/decode round-trip; decoded cursor has correct types)
- [x] *Story covered*: S-SL-02 (PBT), NFR-SL-T01/T02/T03

### Step 7: Prisma Schema — 👤 Maycoll
- [x] 7.1 Create `prisma/schema.prisma` (full schema — all 7 models with soft delete, tenant isolation, UUID PKs)
- [x] 7.2 Create `prisma/.env.example` (DATABASE_URL placeholder)
- [x] *Story covered*: S-SL-03

### Step 8: Documentation Summary — 👤 Maycoll
- [x] 8.1 Create `aidlc-docs/construction/shared-libs/code/code-summary.md` (list of all generated files with descriptions)

---

## Acceptance Criteria Checklist

| Story | Criteria | Step |
|-------|----------|------|
| S-SL-01 | All DTOs, enums, WS types compile without errors | 2, 3 |
| S-SL-01 | No duplicate type definitions across apps | 3.20 barrel export |
| S-SL-02 | `AiClient.streamInvoke()` yields string chunks via AsyncIterable | 4.8 |
| S-SL-02 | Unit tested with mocked Bedrock SDK | 5.2–5.5 |
| S-SL-03 | schema.prisma contains all 7 tables | 7.1 |
| S-SL-03 | All tables include `tenant_id` | 7.1 |
| S-SL-03 | All tables include `deleted_at` (soft delete) | 7.1 |
| S-SL-04 | `@nx/enforce-module-boundaries` lint rule configured | 1.4 |
| S-SL-04 | `nx lint` passes on fresh workspace | 1.1–1.6 |

---

**Ready to proceed to Code Generation Part 2 (Generation)?**  
Review this plan, then reply **"approved"** to begin generating code.
