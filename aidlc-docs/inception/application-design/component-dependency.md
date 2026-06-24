# Component Dependencies — Meedok-chat

**Generated**: 2026-06-24  
**Stage**: Application Design

---

## Dependency Matrix

| Consumer → | AuthMiddleware | AuthService | ChatService | PromptBuilderService | PatientService | TenantService | AiClient (lib) | DoctorModel | SessionModel | MessageModel | PatientModel | DiagnosisModel | TenantModel |
|---|---|---|---|---|---|---|---|---|---|---|---|---|---|
| **AuthController** | | ✓ | | | | | | | | | | | |
| **ChatController** | | | ✓ | | | | | | | | | | |
| **PatientController** | | | | | ✓ | | | | | | | | |
| **AuthMiddleware** | | ✓ | | | | ✓ | | | | | | | |
| **AuthService** | | | | | | ✓ | | ✓ | | | | | |
| **ChatService** | | | | ✓ | ✓ | | ✓ | | ✓ | ✓ | | | |
| **PromptBuilderService** | | | | | | | | | | | | | |
| **PatientService** | | | | | | | | | | | ✓ | ✓ | |
| **TenantService** | | | | | | | | | | | | | ✓ |
| **useChatSession (web)** | | | | | | | | | | | | | |
| **usePatients (web)** | | | | | | | | | | | | | |
| **useAuth (web)** | | | | | | | | | | | | | |

---

## Dependency Graph

```
apps/web (React)
  |
  |-- features/auth
  |     useAuth hook
  |       |-- TanStack Query + fetch --> POST /api/v1/auth/*
  |
  |-- features/chat
  |     useChatSession hook
  |       |-- TanStack Query + fetch --> GET /api/v1/sessions/*
  |       |-- useWebSocket hook -------> WS  /api/v1/sessions/:id/chat
  |
  |-- features/patients
  |     usePatients / usePatient hooks
  |       |-- TanStack Query + fetch --> GET/POST /api/v1/patients/*
  |
  |-- components/ui (no deps — presentational only)
  |
  |-- libs/shared-types (imported — DTOs, enums, WS message shapes)

apps/api (Express)
  |
  |-- AuthMiddleware (applied to all protected routes)
  |     |-- AuthService.verifyAccessToken()
  |     |-- TenantService.findById()
  |
  |-- AuthModule
  |     AuthController --> AuthService --> DoctorModel (Prisma)
  |                                    --> TenantService
  |                                    --> JwtHelper
  |
  |-- ChatModule
  |     ChatController --> ChatService --> PatientService.getPatientContext()
  |                                    --> PromptBuilderService.buildPrompt()
  |                                    --> AiClient.streamInvoke()   [libs/ai-client]
  |                                    --> SessionModel (Prisma)
  |                                    --> MessageModel (Prisma)
  |
  |-- PatientModule
  |     PatientController --> PatientService --> PatientModel (Prisma)
  |                                          --> DiagnosisModel (Prisma)
  |
  |-- TenantModule
  |     TenantService --> TenantModel (Prisma)
  |
  |-- libs/shared-types (imported — request/response DTOs)
  |-- libs/domain     (imported — domain entity types)

libs/ai-client
  |-- AWS Bedrock Runtime SDK --> AWS Bedrock (external)

libs/shared-types
  (no runtime dependencies — types only)

libs/domain
  (no runtime dependencies — pure TypeScript)
```

---

## Communication Patterns by Edge

| Edge | Pattern | Protocol | Notes |
|------|---------|----------|-------|
| `apps/web` → `apps/api` (data fetch) | Request/Response | HTTPS REST | TanStack Query manages caching, loading, error states; native `fetch` as transport |
| `apps/web` → `apps/api` (chat streaming) | Bidirectional stream | WebSocket (WSS) | `useWebSocket` hook manages connection lifecycle; messages are typed JSON events |
| `apps/api` → MySQL 8 | Synchronous query | Prisma client (TCP) | All queries include `tenantId` in WHERE clause |
| `apps/api` → AWS Bedrock | Streaming invocation | HTTPS (AWS SDK) | `AiClient` uses `InvokeModelWithResponseStreamCommand`; chunks piped to WebSocket |
| `AuthMiddleware` → `TenantService` | In-process call | Function call | Synchronous; tenant cached per request |
| `ChatService` → `PatientService` | In-process call | Function call | Not HTTP — direct service-to-service call within `apps/api` |
| `ChatService` → `PromptBuilderService` | In-process call | Function call | Pure transformation — no I/O |

---

## Key Dependency Rules

### Rule 1: Strict layer ordering
```
routes → middleware → controller → service → model
```
No layer may skip a level or call upward (e.g. a model must never call a service).

### Rule 2: Cross-domain service calls are one-directional
`ChatService` may call `PatientService` (chat depends on patient context).
`PatientService` must never call `ChatService`.
`AuthService` must never call `ChatService` or `PatientService`.

### Rule 3: `libs/` have no circular dependencies
```
apps/api      --> libs/shared-types, libs/domain, libs/ai-client
apps/web      --> libs/shared-types, libs/domain
libs/ai-client --> (no libs/ dependencies)
libs/domain    --> (no libs/ dependencies)
libs/shared-types --> (no libs/ dependencies)
```

### Rule 4: Tenant ID flows top-down, never assumed
`tenantId` is extracted once by `AuthMiddleware` from the verified JWT, attached to `req.user`, passed explicitly through controller → service → model. No service reads `tenantId` from a global or singleton.

### Rule 5: `libs/domain` is framework-free
No Prisma, Express, React, or AWS SDK imports are allowed in `libs/domain`. It must be importable by any layer without pulling in framework dependencies.

---

## Data Flow — Chat Message (end-to-end)

```
Doctor types message in ChatPage (apps/web)
  |
  | WS send: { type: 'send_message', content: '...' }
  v
useWebSocket hook --> WSS connection --> apps/api WS handler
  |
  v
ChatController.handleWebSocketConnection()
  |
  v
AuthMiddleware validates JWT on WS upgrade (tenantId, doctorId attached)
  |
  v
ChatService.processMessage(sessionId, tenantId, doctorMessage, onChunk, onComplete, onError)
  |
  |-- PatientService.getPatientContext(patientId, tenantId)
  |       |-- PatientModel.findById()      --> MySQL 8
  |       |-- DiagnosisModel.findByPatient()--> MySQL 8
  |       returns PatientContext
  |
  |-- PromptBuilderService.buildPrompt(context, doctorMessage)
  |       sanitises input, assembles structured prompt string
  |
  |-- AiClient.streamInvoke(prompt, config) --> AWS Bedrock
  |       yields chunks via AsyncIterable<string>
  |
  |-- for each chunk:
  |       onChunk(chunk) --> ChatController pipes to WebSocket
  |       WS send: { type: 'stream_chunk', messageId, chunk }  --> apps/web
  |       StreamingMessage component renders chunk
  |
  |-- on complete:
  |       MessageModel.create({ role: 'assistant', content: fullResponse, ... })
  |       onComplete(fullResponse)
  |       WS send: { type: 'stream_complete', messageId, fullContent, disclaimer }
  |
  v
Doctor sees full AI response with disclaimer + Confirm/Dismiss controls
  |
  | WS send: { type: 'confirm_suggestion' | 'dismiss_suggestion', messageId }
  v
ChatService.recordSuggestionDecision() --> MessageModel.updateDecision() --> MySQL 8
```
