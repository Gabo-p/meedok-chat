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

### Step 1: NX Workspace Bootstrap
- [ ] 1.1 Create `package.json` (NX workspace root, pnpm, workspaces config, postinstall: prisma generate)
- [ ] 1.2 Create `nx.json` (NX config, default targets, task runner)
- [ ] 1.3 Create `tsconfig.base.json` (strict: true, `@meedok/*` path aliases)
- [ ] 1.4 Create `.eslintrc.json` (root ESLint config with `@nx/enforce-module-boundaries`)
- [ ] 1.5 Create `pnpm-workspace.yaml` (workspace packages: apps/*, libs/*)
- [ ] 1.6 Create `.prettierrc` and `.gitignore`
- [ ] *Story covered*: S-SL-04

### Step 2: `libs/domain` — Domain Entities
- [ ] 2.1 Create `libs/domain/project.json` (NX project config, tags: scope:shared,type:util)
- [ ] 2.2 Create `libs/domain/tsconfig.json` (extends root, strict)
- [ ] 2.3 Create `libs/domain/src/entities/tenant.entity.ts`
- [ ] 2.4 Create `libs/domain/src/entities/doctor.entity.ts` (DoctorRole type)
- [ ] 2.5 Create `libs/domain/src/entities/patient.entity.ts`
- [ ] 2.6 Create `libs/domain/src/entities/diagnosis.entity.ts`
- [ ] 2.7 Create `libs/domain/src/entities/prescription.entity.ts` (PrescriptionStatus type)
- [ ] 2.8 Create `libs/domain/src/entities/chat-session.entity.ts` (SessionStatus type)
- [ ] 2.9 Create `libs/domain/src/entities/chat-message.entity.ts` (MessageRole, DoctorDecision types)
- [ ] 2.10 Create `libs/domain/src/value-objects/patient-context.vo.ts` (PatientContext, DiagnosisSummary)
- [ ] 2.11 Create `libs/domain/src/value-objects/jwt-payload.vo.ts` (JwtPayload)
- [ ] 2.12 Create `libs/domain/src/value-objects/pagination.vo.ts` (PaginationCursor, PaginatedResult)
- [ ] 2.13 Create `libs/domain/src/index.ts` (barrel export — all entities and value objects)
- [ ] *Story covered*: S-SL-01 (domain layer)

### Step 3: `libs/shared-types` — DTOs, Enums, Constants
- [ ] 3.1 Create `libs/shared-types/project.json` (NX project config, tags: scope:shared,type:util)
- [ ] 3.2 Create `libs/shared-types/tsconfig.json`
- [ ] 3.3 Create `libs/shared-types/src/enums/roles.enum.ts` (DoctorRole)
- [ ] 3.4 Create `libs/shared-types/src/enums/session-status.enum.ts`
- [ ] 3.5 Create `libs/shared-types/src/enums/message-role.enum.ts`
- [ ] 3.6 Create `libs/shared-types/src/enums/doctor-decision.enum.ts`
- [ ] 3.7 Create `libs/shared-types/src/enums/prescription-status.enum.ts`
- [ ] 3.8 Create `libs/shared-types/src/enums/error-codes.enum.ts` (AiClientErrorCode)
- [ ] 3.9 Create `libs/shared-types/src/dtos/auth.dto.ts` (LoginDto, TokenPairDto, RefreshTokenDto, LogoutDto)
- [ ] 3.10 Create `libs/shared-types/src/dtos/patient.dto.ts` (PatientDto, CreatePatientDto, UpdatePatientDto)
- [ ] 3.11 Create `libs/shared-types/src/dtos/diagnosis.dto.ts` (DiagnosisDto, CreateDiagnosisDto)
- [ ] 3.12 Create `libs/shared-types/src/dtos/session.dto.ts` (SessionDto, SessionWithMessagesDto, CreateSessionDto)
- [ ] 3.13 Create `libs/shared-types/src/dtos/message.dto.ts` (ChatMessageDto)
- [ ] 3.14 Create `libs/shared-types/src/dtos/tenant.dto.ts` (TenantDto)
- [ ] 3.15 Create `libs/shared-types/src/api/response.types.ts` (ApiResponse, ResponseMeta, PaginatedResult)
- [ ] 3.16 Create `libs/shared-types/src/api/problem-details.types.ts` (ProblemDetails, ValidationError)
- [ ] 3.17 Create `libs/shared-types/src/api/pagination.types.ts` (PaginationCursor)
- [ ] 3.18 Create `libs/shared-types/src/ws/events.types.ts` (all WS event types — client→server and server→client)
- [ ] 3.19 Create `libs/shared-types/src/constants/disclaimer.constant.ts` (AI_DISCLAIMER)
- [ ] 3.20 Create `libs/shared-types/src/index.ts` (barrel export — all DTOs, enums, types, constants)
- [ ] *Story covered*: S-SL-01 (shared types layer)

### Step 4: `libs/ai-client` — AWS Bedrock Wrapper
- [ ] 4.1 Create `libs/ai-client/project.json` (NX project config, tags: scope:shared,type:util)
- [ ] 4.2 Create `libs/ai-client/tsconfig.json`
- [ ] 4.3 Create `libs/ai-client/src/errors.ts` (AiClientError class, AiClientErrorCode type)
- [ ] 4.4 Create `libs/ai-client/src/types.ts` (ModelConfig, AiClientConfig interfaces)
- [ ] 4.5 Create `libs/ai-client/src/safe-logger.ts` (SafeLogger interface, createSafeLogger(), SENSITIVE_KEYS)
- [ ] 4.6 Create `libs/ai-client/src/circuit-breaker.ts` (CircuitBreaker class, bedrockCircuitBreaker singleton)
- [ ] 4.7 Create `libs/ai-client/src/stream-timeout.ts` (StreamTimeoutHandles, createStreamTimeouts())
- [ ] 4.8 Create `libs/ai-client/src/ai-client.ts` (AiClient class — streamInvoke(), invoke())
- [ ] 4.9 Create `libs/ai-client/src/index.ts` (barrel export)
- [ ] *Story covered*: S-SL-02

### Step 5: `libs/ai-client` Unit Tests
- [ ] 5.1 Create `libs/ai-client/jest.config.ts`
- [ ] 5.2 Create `libs/ai-client/src/__tests__/circuit-breaker.test.ts` (state transitions, failure counting, window expiry)
- [ ] 5.3 Create `libs/ai-client/src/__tests__/stream-timeout.test.ts` (timer fire, first-chunk cancel, clearAll)
- [ ] 5.4 Create `libs/ai-client/src/__tests__/safe-logger.test.ts` (key redaction, deep redaction)
- [ ] 5.5 Create `libs/ai-client/src/__tests__/ai-client.test.ts` (streamInvoke success, retry, circuit open, timeout — Bedrock SDK mocked)
- [ ] *Story covered*: S-SL-02 (test coverage)

### Step 6: `libs/ai-client` Property-Based Tests
- [ ] 6.1 Create `libs/ai-client/src/__tests__/pbt/ai-client.pbt.test.ts` (error classification always returns boolean retryable; chunk parsing never throws)
- [ ] 6.2 Create `libs/ai-client/src/__tests__/pbt/cursor.pbt.test.ts` (encode/decode round-trip; decoded cursor has correct types)
- [ ] *Story covered*: S-SL-02 (PBT), NFR-SL-T01/T02/T03

### Step 7: Prisma Schema
- [ ] 7.1 Create `prisma/schema.prisma` (full schema — all 7 models with soft delete, tenant isolation, UUID PKs)
- [ ] 7.2 Create `prisma/.env.example` (DATABASE_URL placeholder)
- [ ] *Story covered*: S-SL-03

### Step 8: Documentation Summary
- [ ] 8.1 Create `aidlc-docs/construction/shared-libs/code/code-summary.md` (list of all generated files with descriptions)

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
