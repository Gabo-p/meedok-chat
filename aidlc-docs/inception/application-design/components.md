# Components — Meedok-chat

**Generated**: 2026-06-24  
**Stage**: Application Design

---

## NX Monorepo Structure

```
meedok-chat/
  apps/
    api/          — Express backend (all server-side modules)
    web/          — React frontend
  libs/
    shared-types/ — TypeScript interfaces, DTOs, enums shared across apps
    domain/       — Domain entities and domain-level logic (no framework deps)
    ai-client/    — AWS Bedrock SDK wrapper with streaming support
```

---

## Backend Components (`apps/api`)

### 1. AuthModule
**Purpose**: Handles doctor authentication — token issuance, validation, and refresh.

**Responsibilities**:
- Issue signed JWTs containing `doctorId`, `tenantId`, and `role` claims
- Validate incoming JWTs on protected routes
- Support token refresh without re-authentication
- Enforce tenant scoping from token claims

**Interfaces**:
- `POST /api/v1/auth/login` — credential validation, returns access + refresh token pair
- `POST /api/v1/auth/refresh` — exchanges refresh token for new access token
- `POST /api/v1/auth/logout` — invalidates refresh token

**Layer**: routes → middleware → AuthController → AuthService → DoctorModel

---

### 2. ChatModule
**Purpose**: Core diagnosis chatbot — manages chat sessions and AI-assisted responses.

**Responsibilities**:
- Create and persist chat sessions linked to a patient and doctor
- Accept doctor messages and orchestrate AI response generation
- Stream AI responses back to the client via WebSocket
- Inject mandatory AI disclaimer into every response
- Enforce explicit doctor confirmation/dismissal of AI suggestions
- Record session start/end timestamps for KPI tracking

**Interfaces**:
- `POST /api/v1/sessions` — create a new chat session for a patient
- `GET /api/v1/sessions/:sessionId` — retrieve session with message history
- `GET /api/v1/sessions?patientId=` — list sessions for a patient (read-only history)
- WebSocket endpoint `ws://…/api/v1/sessions/:sessionId/chat` — bidirectional streaming channel

**Layer**: routes → middleware → ChatController → ChatService → PromptBuilderService → `libs/ai-client` → SessionModel

---

### 3. PatientModule
**Purpose**: Manages patient records, diagnosis history, and prescription schema.

**Responsibilities**:
- CRUD operations for patient records (scoped to tenant)
- Read and write diagnosis history entries per patient
- Expose patient context (symptoms + diagnosis history) for chatbot prompt injection
- Persist prescription schema (no API endpoints for prescriptions in MVP)

**Interfaces**:
- `POST /api/v1/patients` — create patient record
- `GET /api/v1/patients/:patientId` — retrieve patient record
- `PUT /api/v1/patients/:patientId` — update patient record
- `GET /api/v1/patients/:patientId/diagnoses` — list diagnosis history
- `POST /api/v1/patients/:patientId/diagnoses` — add a diagnosis entry
- `GET /api/v1/patients/:patientId/context` — internal method: returns structured patient context for prompt injection (not a public HTTP endpoint)

**Layer**: routes → middleware → PatientController → PatientService → PatientModel / DiagnosisModel

---

### 4. TenantModule
**Purpose**: Tenant provisioning and management (administrative, no UI in MVP).

**Responsibilities**:
- Create and store tenant records (clinic/hospital)
- Provide tenant lookup for JWT claim validation
- Serve as the root for all tenant-scoped data relationships

**Interfaces**:
- Internal service only — no public HTTP endpoints in MVP
- `TenantService.findById(tenantId)` — used by AuthMiddleware to validate tenant claims

**Layer**: TenantService → TenantModel

---

### 5. AuthMiddleware (cross-cutting)
**Purpose**: Request-level JWT validation and tenant scoping applied to all protected routes.

**Responsibilities**:
- Extract and verify JWT signature on every protected request
- Attach `doctorId`, `tenantId`, and `role` to `req.user`
- Reject requests with missing, expired, or invalid tokens (HTTP 401)
- Reject requests where `tenantId` in token doesn't match route context (HTTP 403)

**Layer**: Middleware — applied globally to all routes under `/api/v1/` except `/auth/login` and `/auth/refresh`

---

## Shared Libraries

### 6. `libs/ai-client`
**Purpose**: AWS Bedrock SDK abstraction with streaming support.

**Responsibilities**:
- Initialise and configure the AWS Bedrock Runtime client
- Accept structured prompt input and model configuration
- Invoke Bedrock with streaming enabled; emit chunks via async iterator or callback
- Handle Bedrock error responses and retries (basic)
- Never store prompt content or response content persistently

**Interfaces**:
- `AiClient.streamInvoke(prompt: string, config: ModelConfig): AsyncIterable<string>`

---

### 7. `libs/shared-types`
**Purpose**: TypeScript type definitions shared between `apps/api` and `apps/web`.

**Responsibilities**:
- Define request/response DTOs for all API endpoints
- Define WebSocket message shapes (client→server, server→client)
- Define RFC 7807 error response type
- Define enums: `Role`, `SessionStatus`, `DiagnosisStatus`, `PrescriptionStatus`

---

### 8. `libs/domain`
**Purpose**: Domain entity definitions (plain TypeScript classes/interfaces, no framework dependencies).

**Responsibilities**:
- Define domain entities: `Doctor`, `Patient`, `Tenant`, `ChatSession`, `ChatMessage`, `Diagnosis`, `Prescription`
- Define value objects and business invariants (e.g. session state machine)
- No Prisma, Express, or React imports allowed in this library

---

## Frontend Components (`apps/web`)

### 9. `features/auth`
**Purpose**: Doctor login, token management, and protected route gating.

**Responsibilities**:
- Login form and credential submission
- Store access/refresh tokens securely (memory + httpOnly cookie pattern)
- Intercept expired token responses and trigger refresh
- Redirect unauthenticated users to login

**Key components**: `LoginPage`, `AuthProvider`, `useAuth` hook, `ProtectedRoute`

---

### 10. `features/chat`
**Purpose**: Diagnosis chatbot UI — the core MVP user experience.

**Responsibilities**:
- Display chat session history for a patient
- Accept doctor message input and send via WebSocket
- Render streaming AI responses progressively (token by token)
- Display mandatory AI disclaimer on every AI message
- Render confirmation/dismissal controls for each AI suggestion
- Show session start/end time

**Key components**: `ChatPage`, `MessageList`, `MessageInput`, `StreamingMessage`, `AiDisclaimer`, `ConfirmationControls`, `useChatSession` hook, `useWebSocket` hook

---

### 11. `features/patients`
**Purpose**: Patient record browsing and management.

**Responsibilities**:
- List patients for the authenticated doctor's tenant
- View and edit patient details and diagnosis history
- Navigate to a patient's chat sessions

**Key components**: `PatientListPage`, `PatientDetailPage`, `DiagnosisHistoryList`, `usePatients` hook

---

### 12. `components/ui` (shared design primitives)
**Purpose**: Reusable UI building blocks used across features.

**Responsibilities**:
- Provide accessible, consistent base components: `Button`, `Input`, `TextArea`, `Spinner`, `ErrorMessage`, `Modal`, `Badge`
- No business logic — presentational only

---
