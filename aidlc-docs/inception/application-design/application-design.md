# Application Design — Meedok-chat

**Generated**: 2026-06-24  
**Stage**: Application Design (INCEPTION PHASE)  
**Status**: Awaiting approval

> This document consolidates all application design artifacts. See individual files for full detail.

---

## 1. Design Decisions Summary

| Area | Decision |
|------|----------|
| Monorepo structure | NX — `apps/web` (React) + `apps/api` (Express) + `libs/` |
| Shared libraries | `libs/shared-types`, `libs/domain`, `libs/ai-client` |
| Auth placement | Module inside `apps/api` (`/api/v1/auth/*`) |
| Frontend structure | Feature-based: `features/chat`, `features/auth`, `features/patients` |
| Service layer | All backend services inside `apps/api` |
| AI integration | `libs/ai-client` wraps AWS Bedrock SDK; streaming via AsyncIterable |
| Patient data scope | Read/write in MVP |
| Tenant isolation | Defence-in-depth: middleware (JWT extraction) + service layer (re-validates on every query) |
| Streaming mechanism | WebSocket (WSS) — bidirectional; doctor can interact mid-stream |
| Session lifecycle | Explicit: `POST /sessions` creates session; messages reference `sessionId` |
| Prompt assembly | Dedicated `PromptBuilderService` inside `apps/api` |
| Frontend data fetching | TanStack Query + native `fetch` |
| Database ORM | Prisma |
| Database engine | MySQL 8 |
| API versioning | URL prefix: `/api/v1/` |
| Error format | RFC 7807 Problem Details |

---

## 2. NX Monorepo Layout

```
meedok-chat/                          (NX workspace root)
  apps/
    api/                              Express backend
      src/
        modules/
          auth/                       AuthModule
            auth.routes.ts
            auth.controller.ts
            auth.service.ts
            doctor.model.ts
          chat/                       ChatModule
            chat.routes.ts
            chat.controller.ts
            chat.service.ts
            prompt-builder.service.ts
            session.model.ts
            message.model.ts
          patient/                    PatientModule
            patient.routes.ts
            patient.controller.ts
            patient.service.ts
            patient.model.ts
            diagnosis.model.ts
          tenant/                     TenantModule
            tenant.service.ts
            tenant.model.ts
        middleware/
          auth.middleware.ts          JWT validation + tenant scoping
          error.middleware.ts         RFC 7807 error handler
          validate.middleware.ts      JSON Schema validation
        app.ts                        Express app bootstrap
        main.ts                       Entry point
    web/                              React frontend
      src/
        features/
          auth/                       Login, token management, route guards
          chat/                       Chatbot UI, streaming, confirmation controls
          patients/                   Patient list, detail, diagnosis history
        components/
          ui/                         Design system primitives
        app.tsx                       Root component + routing
        main.tsx                      Entry point
  libs/
    shared-types/                     DTOs, enums, WS message types (no runtime deps)
    domain/                           Domain entities (no framework deps)
    ai-client/                        AWS Bedrock SDK wrapper + streaming
  prisma/
    schema.prisma                     Prisma schema (MySQL 8)
    migrations/                       Migration files
  infrastructure/                     AWS CDK (TypeScript)
  nx.json
  package.json
```

---

## 3. Components (Summary)

Full detail: `components.md`

| Component | Location | Responsibility |
|-----------|----------|----------------|
| AuthModule | `apps/api/modules/auth` | JWT issuance, validation, refresh |
| ChatModule | `apps/api/modules/chat` | Session lifecycle, AI orchestration, WS streaming |
| PatientModule | `apps/api/modules/patient` | Patient CRUD, diagnosis history, context for prompts |
| TenantModule | `apps/api/modules/tenant` | Tenant lookup (admin, no public endpoints MVP) |
| AuthMiddleware | `apps/api/middleware` | JWT validation + tenant scoping on every request |
| `libs/ai-client` | `libs/ai-client` | AWS Bedrock SDK wrapper, streaming AsyncIterable |
| `libs/shared-types` | `libs/shared-types` | Shared DTOs, enums, WS event types |
| `libs/domain` | `libs/domain` | Domain entities (framework-free) |
| `features/auth` | `apps/web/features/auth` | Login UI, token storage, protected routes |
| `features/chat` | `apps/web/features/chat` | Chatbot UI, WebSocket, streaming renderer |
| `features/patients` | `apps/web/features/patients` | Patient list/detail, diagnosis history |
| `components/ui` | `apps/web/components/ui` | Shared design primitives (presentational only) |

---

## 4. Service Layer (Summary)

Full detail: `services.md`

| Service | Depends On | Key Responsibility |
|---------|------------|--------------------|
| AuthService | DoctorModel, TenantService, JwtHelper | Credentials → JWT pair |
| ChatService | PatientService, PromptBuilderService, AiClient, SessionModel, MessageModel | End-to-end chat + streaming |
| PromptBuilderService | (none) | Sanitise input, assemble Bedrock prompt |
| PatientService | PatientModel, DiagnosisModel | Patient CRUD + context assembly |
| TenantService | TenantModel | Tenant lookup |
| AiClient | AWS Bedrock SDK | Streaming model invocation |

---

## 5. API Surface (MVP)

| Method | Path | Auth | Description |
|--------|------|------|-------------|
| POST | `/api/v1/auth/login` | None | Issue JWT pair |
| POST | `/api/v1/auth/refresh` | Refresh token | Rotate tokens |
| POST | `/api/v1/auth/logout` | JWT | Invalidate refresh token |
| POST | `/api/v1/patients` | JWT | Create patient |
| GET | `/api/v1/patients/:patientId` | JWT | Get patient |
| PUT | `/api/v1/patients/:patientId` | JWT | Update patient |
| GET | `/api/v1/patients/:patientId/diagnoses` | JWT | List diagnoses |
| POST | `/api/v1/patients/:patientId/diagnoses` | JWT | Add diagnosis |
| POST | `/api/v1/sessions` | JWT | Create chat session |
| GET | `/api/v1/sessions/:sessionId` | JWT | Get session + history |
| GET | `/api/v1/sessions?patientId=` | JWT | List sessions for patient |
| WS | `/api/v1/sessions/:sessionId/chat` | JWT (on upgrade) | Bidirectional chat stream |

All endpoints return RFC 7807 Problem Details on error.  
All endpoints (except `/auth/login`, `/auth/refresh`) require valid JWT with matching `tenantId`.

---

## 6. Database Schema (Logical)

```
tenants
  id, name, created_at, updated_at

doctors
  id, tenant_id (FK tenants), email, password_hash, refresh_token_hash,
  first_name, last_name, role, created_at, updated_at

patients
  id, tenant_id (FK tenants), first_name, last_name, date_of_birth,
  current_symptoms, created_at, updated_at

diagnoses
  id, patient_id (FK patients), tenant_id, diagnosis_text, notes,
  diagnosed_by (FK doctors), diagnosed_at, created_at, updated_at

prescriptions  [schema only — no API/UI in MVP]
  id, patient_id (FK patients), doctor_id (FK doctors), tenant_id,
  medication_name, dosage, frequency, start_date, end_date,
  status (active|inactive|cancelled), created_at, updated_at

chat_sessions
  id, patient_id (FK patients), doctor_id (FK doctors), tenant_id,
  status (open|closed), started_at, ended_at, created_at, updated_at

chat_messages
  id, session_id (FK chat_sessions), tenant_id, role (doctor|assistant),
  content, disclaimer_shown, doctor_decision (confirmed|dismissed|null),
  created_at, updated_at
```

All tables include `tenant_id` and all queries filter by it — multi-tenant isolation at the data layer.

---

## 7. Component Dependencies (Summary)

Full detail: `component-dependency.md`

Key dependency rules:
1. Layer order enforced: `routes → middleware → controller → service → model`
2. Cross-domain calls are one-directional: `ChatService` → `PatientService`, never reversed
3. `libs/` have no circular dependencies and `libs/domain` is framework-free
4. `tenantId` flows explicitly top-down — never from global state
5. No service makes outbound HTTP calls — external I/O is in `libs/ai-client` only

---

## 8. Non-Functional Considerations (Design-Level)

| NFR | Design Response |
|-----|----------------|
| Streaming latency ≤ 3s first token | `AiClient` streams directly; `ChatService` pipes chunks immediately to WS without buffering |
| Multi-tenant isolation | `tenantId` in every query; middleware + service layer double-enforcement |
| WebSocket auth | JWT validated on WS upgrade handshake via `AuthMiddleware` |
| Prompt injection | `PromptBuilderService` sanitises input and wraps doctor text in explicit delimiters |
| ISO 27001 intent | RBAC via JWT claims; Pino structured logging with PII masking; error middleware hides stack traces |
| Prisma migrations | All schema changes tracked in `prisma/migrations/` — no manual DDL |
| AWS CDK | Infrastructure defined in `infrastructure/` as TypeScript CDK constructs |
