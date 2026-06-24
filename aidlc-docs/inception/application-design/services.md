# Services — Meedok-chat

**Generated**: 2026-06-24  
**Stage**: Application Design

---

## Service Architecture Overview

All backend services live inside `apps/api` as domain modules. The service layer sits between controllers (HTTP/WS boundary) and models (Prisma/DB boundary). Services orchestrate business logic and call models; they never call other controllers.

```
HTTP/WS Request
      |
  Middleware (AuthMiddleware — validates JWT, attaches req.user with tenantId)
      |
  Controller (parses request, calls service, formats response)
      |
  Service (business logic, orchestration, tenant scoping)
      |
  Model (Prisma — database access, always tenant-scoped)
      |
  MySQL 8 Database
```

---

## AuthService

**Domain**: Authentication and session token management

**Orchestration responsibilities**:
- Validates doctor credentials against hashed password in DB
- Issues JWT access token (short-lived, ~15 min) and refresh token (long-lived, ~7 days)
- Rotates refresh tokens on each use (single-use refresh token pattern)
- Delegates token verification to a shared `JwtHelper` utility

**Dependencies**:
- `DoctorModel` — credential lookup and refresh token storage
- `TenantService` — validate tenant exists on login
- `JwtHelper` — sign/verify JWT (wraps `jsonwebtoken` library)

**Does NOT**:
- Call any other domain service directly
- Access patient or chat data

---

## ChatService

**Domain**: Chat session lifecycle and AI-assisted diagnosis

**Orchestration responsibilities**:
1. Validates session belongs to authenticated doctor's tenant
2. Calls `PatientService.getPatientContext()` to retrieve patient data for prompt injection
3. Calls `PromptBuilderService.buildPrompt()` to assemble the structured Bedrock prompt
4. Calls `libs/ai-client` `AiClient.streamInvoke()` and pipes chunks to the WebSocket `onChunk` callback
5. Persists each doctor message and AI response via `MessageModel`
6. Records `streamComplete` and attaches mandatory disclaimer
7. Records session timestamps for KPI tracking via `SessionModel`

**Dependencies**:
- `SessionModel` — session CRUD
- `MessageModel` — message persistence
- `PatientService` — patient context retrieval (internal call, not HTTP)
- `PromptBuilderService` — prompt assembly and input sanitisation
- `AiClient` (`libs/ai-client`) — Bedrock streaming invocation

**Does NOT**:
- Directly query patient or diagnosis tables — delegates entirely to `PatientService`
- Store Bedrock prompt content in a way accessible outside the session

---

## PromptBuilderService

**Domain**: AI prompt construction and input safety

**Orchestration responsibilities**:
- Accepts `PatientContext` (from `PatientService`) and raw doctor message
- Sanitises doctor text to prevent prompt injection (strips instruction-like patterns, enforces delimiters)
- Assembles structured prompt with: system preamble, patient context block, conversation history, doctor message
- Enforces maximum prompt length (configurable `MAX_PROMPT_TOKENS`)
- Returns a single `string` ready for Bedrock invocation

**Dependencies**:
- No external service dependencies — pure transformation logic
- Configuration: `MAX_PROMPT_TOKENS`, `SYSTEM_PREAMBLE` (from environment)

**Does NOT**:
- Call the database
- Call `AiClient` directly — that is `ChatService`'s responsibility

---

## PatientService

**Domain**: Patient records and diagnosis history

**Orchestration responsibilities**:
- CRUD for patient records, always scoped to `tenantId`
- CRUD for diagnosis entries linked to a patient
- Exposes `getPatientContext()` — assembles `PatientContext` (current symptoms + diagnosis history) for consumption by `ChatService`
- Re-validates `tenantId` on every DB call (defence-in-depth, per NFR-04 / Q8-C decision)

**Dependencies**:
- `PatientModel` — patient record access
- `DiagnosisModel` — diagnosis history access

**Does NOT**:
- Call `ChatService` or `AuthService`
- Expose prescription write operations in MVP (prescription table exists in schema, reads allowed for context)

---

## TenantService

**Domain**: Tenant provisioning and lookup

**Orchestration responsibilities**:
- Provides `findById()` for use by `AuthMiddleware` during JWT validation
- Will support tenant creation for admin provisioning (no public endpoint in MVP)

**Dependencies**:
- `TenantModel` — tenant record access

**Does NOT**:
- Call any other domain service
- Expose public HTTP endpoints in MVP

---

## `libs/ai-client` — AiClient

**Domain**: AWS Bedrock integration

**Orchestration responsibilities**:
- Initialises `BedrockRuntimeClient` with AWS credentials from environment
- Calls `InvokeModelWithResponseStreamCommand` for streaming invocations
- Yields response chunks via `AsyncIterable<string>` — caller controls backpressure
- Handles Bedrock throttling errors with basic exponential backoff (1 retry)
- Never logs prompt content or response content

**Configuration** (from environment):
- `AWS_REGION`
- `BEDROCK_MODEL_ID` (e.g. `anthropic.claude-3-sonnet-20240229-v1:0`)
- `BEDROCK_MAX_TOKENS`
- `BEDROCK_TEMPERATURE`

**Does NOT**:
- Know about tenants, patients, or sessions
- Persist any data

---

## Service Interaction Diagram

```
Doctor (WebSocket message)
        |
        v
[AuthMiddleware] -- validates JWT, extracts tenantId, doctorId
        |
        v
[ChatController] -- handles WS message event
        |
        v
[ChatService]
  |-- calls --> [PatientService.getPatientContext(patientId, tenantId)]
  |                     |
  |                     v
  |               [PatientModel] + [DiagnosisModel]  --> MySQL 8
  |
  |-- calls --> [PromptBuilderService.buildPrompt(context, doctorMessage)]
  |
  |-- calls --> [AiClient.streamInvoke(prompt, config)]  --> AWS Bedrock
  |                     |
  |               chunks yielded via AsyncIterable
  |
  |-- pipes chunks --> WebSocket onChunk callback --> Doctor UI
  |
  |-- persists --> [MessageModel.create(...)]  --> MySQL 8
  |
  v
[ChatController] sends stream_complete WS event with disclaimer
```

---

## Service Rules

1. **Tenant isolation**: Every service method that touches the DB receives `tenantId` as an explicit parameter. No implicit global state.
2. **No cross-domain model access**: Services only call their own domain's models. Cross-domain access goes through the owning service.
3. **Error propagation**: Services throw typed errors (`AppError` subclasses). Controllers catch and map to RFC 7807 responses.
4. **No HTTP in services**: Services never call `fetch` or make outbound HTTP calls — that belongs in `libs/ai-client` or dedicated client libraries.
5. **Logging**: Every service method logs entry (INFO) and errors (ERROR) using Pino. Patient identifiers are masked in log output.
