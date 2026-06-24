# Units of Work — Meedok-chat

**Generated**: 2026-06-24  
**Stage**: Units Generation  
**Build approach**: Strict sequential — 2 engineers, one unit at a time  
**Total units**: 7

---

## Unit Overview

| # | Unit ID | Name | Layer | Build Order |
|---|---------|------|-------|-------------|
| 1 | `shared-libs` | Shared Libraries + Prisma Schema | Foundation | 1st |
| 2 | `tenant` | Tenant Module | Backend | 2nd |
| 3 | `auth` | Authentication Module | Backend | 3rd |
| 4 | `patient-data` | Patient Data Module | Backend | 4th |
| 5 | `chatbot-api` | Chatbot API Module | Backend | 5th |
| 6 | `frontend` | React Frontend | Frontend | 6th |
| 7 | `infrastructure` | AWS CDK Infrastructure | Infrastructure | 7th |

---

## Unit 1: `shared-libs` — Shared Libraries + Prisma Schema

**Description**: The foundational unit that all other units depend on. Generates shared TypeScript libraries, the Prisma schema with all database tables, and the AWS Bedrock AI client wrapper.

**Scope**:
- `libs/shared-types/` — TypeScript DTOs, enums, WebSocket message types
- `libs/domain/` — Domain entity types (framework-free)
- `libs/ai-client/` — AWS Bedrock SDK wrapper with streaming AsyncIterable
- `prisma/schema.prisma` — Full database schema (all tables for all units)
- `prisma/migrations/` — Initial migration

**Key deliverables**:
- All shared TypeScript interfaces and enums consumed by `apps/api` and `apps/web`
- `AiClient.streamInvoke()` and `AiClient.invoke()` with Bedrock streaming
- Complete Prisma schema: `tenants`, `doctors`, `patients`, `diagnoses`, `prescriptions`, `chat_sessions`, `chat_messages`
- NX project tags configured: `scope:shared`, `scope:api`, `scope:web` + `@nx/enforce-module-boundaries` lint rule
- NX workspace baseline: `nx.json`, `package.json`, monorepo structure

**NX projects**:
- `libs/shared-types` — tag: `scope:shared, type:util`
- `libs/domain` — tag: `scope:shared, type:util`
- `libs/ai-client` — tag: `scope:shared, type:util`

**Tests**: Unit tests for `AiClient` (mock Bedrock SDK); no tests for pure type files.

**Prerequisites**: None — this is the foundation.

---

## Unit 2: `tenant` — Tenant Module

**Description**: Minimal but critical unit that provides tenant record storage and lookup. Must exist before `auth` because `AuthMiddleware` calls `TenantService.findById()` on every request.

**Scope**:
- `apps/api/src/modules/tenant/tenant.service.ts`
- `apps/api/src/modules/tenant/tenant.model.ts`

**Key deliverables**:
- `TenantService.findById(tenantId)` — used by auth middleware and auth service
- `TenantModel` (Prisma) — queries `tenants` table
- Prisma client initialisation and shared DB connection config (`apps/api/src/db/prisma-client.ts`)

**NX projects**:
- Part of `apps/api` — tag: `scope:api, type:feature`

**Tests**: Unit tests for `TenantService` with mocked Prisma client.

**Prerequisites**: Unit 1 (`shared-libs`) — Prisma schema must exist.

---

## Unit 3: `auth` — Authentication Module

**Description**: JWT-based doctor authentication. Issues and validates access + refresh token pairs, enforces tenant scoping on every protected route via middleware.

**Scope**:
- `apps/api/src/modules/auth/auth.routes.ts`
- `apps/api/src/modules/auth/auth.controller.ts`
- `apps/api/src/modules/auth/auth.service.ts`
- `apps/api/src/modules/auth/doctor.model.ts`
- `apps/api/src/middleware/auth.middleware.ts`
- `apps/api/src/utils/jwt.helper.ts`

**Key deliverables**:
- `POST /api/v1/auth/login` — credential validation → JWT pair
- `POST /api/v1/auth/refresh` — single-use refresh token rotation
- `POST /api/v1/auth/logout` — refresh token invalidation
- `AuthMiddleware` — JWT verification + `tenantId`/`doctorId` injection into `req.user`
- `JwtHelper` — sign/verify wrapper around `jsonwebtoken`
- Express app bootstrap (`apps/api/src/app.ts`, `apps/api/src/main.ts`)
- Global error middleware (`apps/api/src/middleware/error.middleware.ts`) — RFC 7807
- JSON Schema validation middleware (`apps/api/src/middleware/validate.middleware.ts`)

**NX projects**:
- Part of `apps/api` — tag: `scope:api, type:feature`

**Tests**: Unit tests for `AuthService` (mock `DoctorModel`, `TenantService`), `AuthMiddleware` (mock `AuthService`), `JwtHelper`.

**Prerequisites**: Unit 1 (`shared-libs`), Unit 2 (`tenant`).

---

## Unit 4: `patient-data` — Patient Data Module

**Description**: Patient record management and diagnosis history. Provides the `getPatientContext()` method consumed internally by the chatbot unit.

**Scope**:
- `apps/api/src/modules/patient/patient.routes.ts`
- `apps/api/src/modules/patient/patient.controller.ts`
- `apps/api/src/modules/patient/patient.service.ts`
- `apps/api/src/modules/patient/patient.model.ts`
- `apps/api/src/modules/patient/diagnosis.model.ts`

**Key deliverables**:
- `POST /api/v1/patients` — create patient
- `GET /api/v1/patients/:patientId` — get patient
- `PUT /api/v1/patients/:patientId` — update patient
- `GET /api/v1/patients/:patientId/diagnoses` — list diagnoses
- `POST /api/v1/patients/:patientId/diagnoses` — add diagnosis
- `PatientService.getPatientContext()` — internal method assembling `PatientContext` for chatbot
- Prescription table exists in Prisma schema (Unit 1) — no endpoints in MVP

**NX projects**:
- Part of `apps/api` — tag: `scope:api, type:feature`

**Tests**: Unit tests for `PatientService` (mock `PatientModel`, `DiagnosisModel`), `PatientController` (mock `PatientService`).

**Prerequisites**: Unit 1 (`shared-libs`), Unit 2 (`tenant`), Unit 3 (`auth`) — `AuthMiddleware` must exist for route protection.

---

## Unit 5: `chatbot-api` — Chatbot API Module

**Description**: The core MVP value unit. Manages chat sessions, orchestrates patient context injection, calls AWS Bedrock via streaming, and delivers responses to the frontend via WebSocket.

**Scope**:
- `apps/api/src/modules/chat/chat.routes.ts`
- `apps/api/src/modules/chat/chat.controller.ts`
- `apps/api/src/modules/chat/chat.service.ts`
- `apps/api/src/modules/chat/prompt-builder.service.ts`
- `apps/api/src/modules/chat/session.model.ts`
- `apps/api/src/modules/chat/message.model.ts`
- WebSocket server integration in `apps/api/src/app.ts`

**Key deliverables**:
- `POST /api/v1/sessions` — create chat session
- `GET /api/v1/sessions/:sessionId` — get session + message history
- `GET /api/v1/sessions?patientId=` — list sessions for a patient
- `WS /api/v1/sessions/:sessionId/chat` — bidirectional streaming channel
- `PromptBuilderService` — prompt assembly + input sanitisation + length enforcement
- `ChatService.processMessage()` — full orchestration pipeline: context → prompt → Bedrock stream → WS chunks → persist
- `ChatService.recordSuggestionDecision()` — doctor confirmation/dismissal tracking
- Mandatory AI disclaimer injected in every `stream_complete` event
- Session start/end timestamps for KPI tracking

**NX projects**:
- Part of `apps/api` — tag: `scope:api, type:feature`

**Tests**: Unit tests for `PromptBuilderService` (pure function — PBT candidate), `ChatService` (mock `PatientService`, `AiClient`, `SessionModel`, `MessageModel`), `ChatController` (mock `ChatService`).

**Prerequisites**: Unit 1 (`shared-libs`), Unit 2 (`tenant`), Unit 3 (`auth`), Unit 4 (`patient-data`).

---

## Unit 6: `frontend` — React Frontend

**Description**: The complete doctor-facing React application — login, chatbot UI with streaming, and patient management.

**Scope**:
- `apps/web/src/features/auth/` — `LoginPage`, `AuthProvider`, `useAuth`, `ProtectedRoute`
- `apps/web/src/features/chat/` — `ChatPage`, `MessageList`, `MessageInput`, `StreamingMessage`, `AiDisclaimer`, `ConfirmationControls`, `useChatSession`, `useWebSocket`
- `apps/web/src/features/patients/` — `PatientListPage`, `PatientDetailPage`, `DiagnosisHistoryList`, `usePatients`, `usePatient`
- `apps/web/src/components/ui/` — `Button`, `Input`, `TextArea`, `Spinner`, `ErrorMessage`, `Modal`, `Badge`
- `apps/web/src/app.tsx`, `apps/web/src/main.tsx`
- TanStack Query provider setup + native `fetch` client

**Key deliverables**:
- Login flow with JWT storage and auto-refresh
- Chat page: session creation, WebSocket connection, progressive streaming render, disclaimer display, confirm/dismiss controls
- Patient list and detail pages with diagnosis history
- Accessible UI component library (`components/ui`)
- TanStack Query setup for all REST data fetching

**NX projects**:
- `apps/web` — tag: `scope:web, type:app`

**Tests**: Unit tests for `useAuth`, `useChatSession`, `useWebSocket`, `PromptBuilder` logic in frontend (if any), component render tests for `StreamingMessage`, `AiDisclaimer`, `ConfirmationControls`.

**Prerequisites**: Unit 1 (`shared-libs`), Unit 3 (`auth`) — shared types and auth DTOs must exist; ideally Unit 5 (`chatbot-api`) API is stable for integration.

---

## Unit 7: `infrastructure` — AWS CDK Stack

**Description**: Complete AWS infrastructure as TypeScript CDK constructs. Provisions all cloud resources needed to deploy and run Meedok-chat.

**Scope**:
- `infrastructure/bin/app.ts` — CDK app entry point
- `infrastructure/lib/meedok-stack.ts` — main CDK stack
- `infrastructure/lib/constructs/` — reusable CDK constructs
  - `network.construct.ts` — VPC, subnets, security groups
  - `compute.construct.ts` — EC2 auto-scaling group, load balancer
  - `database.construct.ts` — RDS MySQL 8 instance, parameter group
  - `storage.construct.ts` — S3 bucket for documents/images
  - `iam.construct.ts` — IAM roles and policies (EC2 → Bedrock, EC2 → RDS, EC2 → S3)
- `infrastructure/cdk.json`

**Key deliverables**:
- VPC with public/private subnets across 2 AZs
- EC2 Auto Scaling Group (min 1, max N) behind an Application Load Balancer
- RDS MySQL 8 instance (encrypted at rest) in private subnet
- S3 bucket (encrypted, private) for document storage
- IAM role for EC2 instances with Bedrock invocation permissions
- Security groups: LB → EC2 (HTTP/HTTPS), EC2 → RDS (MySQL 3306), EC2 → internet (HTTPS for Bedrock)
- Environment variable injection via EC2 user data or SSM (secrets deferred to post-MVP per Q3 decision)

**NX projects**:
- `infrastructure` — tag: `scope:infra, type:app`

**Tests**: CDK snapshot tests (`cdk synth` output validated).

**Prerequisites**: All application units (1–6) — infrastructure is defined last, after app requirements are fully known.

---

## Code Organisation Strategy (Greenfield)

```
meedok-chat/                    (NX workspace root)
  apps/
    api/                        scope:api
    web/                        scope:web
  libs/
    shared-types/               scope:shared
    domain/                     scope:shared
    ai-client/                  scope:shared
  prisma/                       (owned by Unit 1)
    schema.prisma
    migrations/
  infrastructure/               scope:infra (Unit 7)
  nx.json
  package.json
  tsconfig.base.json
```

### NX Module Boundary Rules (`nx.json`)
```json
{
  "rules": {
    "@nx/enforce-module-boundaries": [{
      "allow": [],
      "depConstraints": [
        { "sourceTag": "scope:web",    "onlyDependOnLibsWithTags": ["scope:shared"] },
        { "sourceTag": "scope:api",    "onlyDependOnLibsWithTags": ["scope:shared"] },
        { "sourceTag": "scope:infra",  "onlyDependOnLibsWithTags": [] },
        { "sourceTag": "scope:shared", "onlyDependOnLibsWithTags": ["scope:shared"] }
      ]
    }]
  }
}
```
This ensures `apps/web` never imports from `apps/api` and vice versa — all sharing goes through `libs/`.
