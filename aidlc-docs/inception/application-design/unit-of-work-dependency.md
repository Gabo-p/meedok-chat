# Unit of Work Dependencies — Meedok-chat

**Generated**: 2026-06-24  
**Stage**: Units Generation  
**Build sequence**: Strict sequential

---

## Dependency Matrix

| Unit | shared-libs | tenant | auth | patient-data | chatbot-api | frontend | infrastructure |
|------|:-----------:|:------:|:----:|:------------:|:-----------:|:--------:|:--------------:|
| **shared-libs** | — | | | | | | |
| **tenant** | ✓ required | — | | | | | |
| **auth** | ✓ required | ✓ required | — | | | | |
| **patient-data** | ✓ required | ✓ required | ✓ required | — | | | |
| **chatbot-api** | ✓ required | ✓ required | ✓ required | ✓ required | — | | |
| **frontend** | ✓ required | | ✓ types only | ✓ types only | ✓ types only | — | |
| **infrastructure** | | | | | | ✓ deploy target | — |

---

## Dependency Details

### Unit 1: `shared-libs`
**Depends on**: Nothing  
**Blocks**: All other units — no unit can start until shared-libs is complete

| Dependency | Type | Reason |
|-----------|------|--------|
| (none) | — | Foundation unit |

---

### Unit 2: `tenant`
**Depends on**: `shared-libs`  
**Blocks**: `auth`, `patient-data`, `chatbot-api`

| Dependency | Type | Reason |
|-----------|------|--------|
| `shared-libs` → Prisma schema | Hard | `tenants` table must exist in schema.prisma |
| `shared-libs` → `libs/domain` | Hard | `Tenant` entity type used in `TenantService` |
| `shared-libs` → `libs/shared-types` | Hard | `TenantDto` type referenced |

---

### Unit 3: `auth`
**Depends on**: `shared-libs`, `tenant`  
**Blocks**: `patient-data`, `chatbot-api`, `frontend`

| Dependency | Type | Reason |
|-----------|------|--------|
| `shared-libs` → Prisma schema | Hard | `doctors` table must exist |
| `shared-libs` → `libs/domain` | Hard | `Doctor` entity type |
| `shared-libs` → `libs/shared-types` | Hard | `LoginDto`, `TokenPairDto`, `JwtPayload` |
| `tenant` → `TenantService` | Hard | `AuthMiddleware` calls `TenantService.findById()` to validate tenant claim |

---

### Unit 4: `patient-data`
**Depends on**: `shared-libs`, `tenant`, `auth`  
**Blocks**: `chatbot-api`

| Dependency | Type | Reason |
|-----------|------|--------|
| `shared-libs` → Prisma schema | Hard | `patients`, `diagnoses`, `prescriptions` tables must exist |
| `shared-libs` → `libs/domain` | Hard | `Patient`, `Diagnosis` entity types |
| `shared-libs` → `libs/shared-types` | Hard | `PatientDto`, `DiagnosisDto`, `PatientContext` |
| `tenant` → `TenantService` | Soft | Service-layer tenant re-validation (defence-in-depth) |
| `auth` → `AuthMiddleware` | Hard | All patient routes are protected — middleware must exist |

---

### Unit 5: `chatbot-api`
**Depends on**: `shared-libs`, `tenant`, `auth`, `patient-data`  
**Blocks**: `frontend` (stable API contract needed), `infrastructure` (app must be complete)

| Dependency | Type | Reason |
|-----------|------|--------|
| `shared-libs` → Prisma schema | Hard | `chat_sessions`, `chat_messages` tables must exist |
| `shared-libs` → `libs/domain` | Hard | `ChatSession`, `ChatMessage` entity types |
| `shared-libs` → `libs/shared-types` | Hard | `SessionDto`, WS message event types |
| `shared-libs` → `libs/ai-client` | Hard | `AiClient.streamInvoke()` — core chatbot dependency |
| `tenant` → `TenantService` | Soft | Service-layer tenant re-validation |
| `auth` → `AuthMiddleware` | Hard | All chat routes + WS upgrade protected |
| `patient-data` → `PatientService` | Hard | `ChatService` calls `PatientService.getPatientContext()` |

---

### Unit 6: `frontend`
**Depends on**: `shared-libs` (hard), `auth`/`patient-data`/`chatbot-api` (types only — soft)  
**Blocks**: `infrastructure` (frontend build artifact needed for deployment)

| Dependency | Type | Reason |
|-----------|------|--------|
| `shared-libs` → `libs/shared-types` | Hard | All DTOs and WS event types used in hooks and components |
| `shared-libs` → `libs/domain` | Hard | Domain entity types used in React state |
| `auth` → `LoginDto`, `TokenPairDto` | Soft (types) | Auth feature uses these DTOs — types must exist, running API not required for unit tests |
| `patient-data` → `PatientDto`, `DiagnosisDto` | Soft (types) | Patient feature uses these DTOs |
| `chatbot-api` → `SessionDto`, WS events | Soft (types) | Chat feature uses session and WS message types |

> **Note**: Frontend unit tests use mocked API responses. Integration with live backend is validated in Build and Test stage.

---

### Unit 7: `infrastructure`
**Depends on**: All units 1–6 (deployment targets)  
**Blocks**: Nothing (final unit)

| Dependency | Type | Reason |
|-----------|------|--------|
| `chatbot-api` (apps/api) | Deploy target | EC2 instances run the Express API — app must be complete to know resource requirements |
| `frontend` (apps/web) | Deploy target | Static assets served from EC2/S3 — app must be complete |
| `shared-libs` → `libs/ai-client` config | Soft | Bedrock model ID and region inform IAM policy scope |

---

## Build Sequence (Strict Sequential)

```
Unit 1: shared-libs
  |
  v
Unit 2: tenant
  |
  v
Unit 3: auth
  |
  v
Unit 4: patient-data
  |
  v
Unit 5: chatbot-api
  |
  v
Unit 6: frontend
  |
  v
Unit 7: infrastructure
  |
  v
Build and Test (all units together)
```

---

## Critical Path

The critical path runs through all 7 units sequentially. No parallelisation opportunities exist given the strict sequential decision (Q5=A, Q7=A).

**Longest chain**: `shared-libs` → `tenant` → `auth` → `patient-data` → `chatbot-api` → `frontend` → `infrastructure`

**Highest-risk dependency**: `chatbot-api` → `patient-data` → `PatientService.getPatientContext()`  
This is the only cross-module service call in the system. If the `PatientContext` shape changes, both units are affected. The type is defined in `libs/shared-types` (Unit 1) to make this contract explicit and compile-time validated.

---

## Integration Points (tested in Build and Test stage)

| Integration | Units Involved | Test Type |
|-------------|---------------|-----------|
| JWT auth flow end-to-end | `auth` + `tenant` | Integration |
| Patient CRUD with tenant isolation | `patient-data` + `auth` | Integration |
| Chat session creation + message send | `chatbot-api` + `patient-data` + `auth` | Integration |
| WebSocket streaming (Bedrock mocked) | `chatbot-api` + `frontend` | Integration |
| Cross-tenant isolation | All backend units | Security integration |
| Full doctor workflow (login → patient → chat) | All units | E2E |
