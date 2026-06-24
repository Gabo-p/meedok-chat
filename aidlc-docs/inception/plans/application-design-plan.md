# Application Design Plan — Meedok-chat

Please answer each question by filling in the `[Answer]:` tag.
Choose a letter option or use X + description for custom answers.
Reply "done" when all answers are filled.

---

## Design Plan Checklist

- [x] Answer all questions below
- [x] Generate components.md
- [x] Generate component-methods.md
- [x] Generate services.md
- [x] Generate component-dependency.md
- [x] Generate application-design.md (consolidated)

---

## Section 1 — Component Identification

### Q1: NX monorepo application structure
Given NX monorepo with React + Express, how should the applications be organised?

A) Two NX apps: `apps/web` (React frontend) and `apps/api` (Express backend) — standard NX separation

B) Three NX apps: `apps/web`, `apps/api`, `apps/auth` — auth as a fully separate Express app with its own process and port

C) Two NX apps (`apps/web`, `apps/api`) plus shared libraries under `libs/` for domain logic and shared types

D) Other (please describe after [Answer]: tag below)

[Answer]: A

---

### Q2: Shared libraries strategy
Which shared code belongs in NX `libs/` packages (shared across apps)?

A) Types and interfaces only (`libs/shared-types`) — keep everything else in the apps

B) Types + domain entities + DTOs (`libs/shared-types`, `libs/domain`) — shared data shapes

C) Types + domain entities + utilities + API client (`libs/shared-types`, `libs/domain`, `libs/utils`, `libs/api-client`) — comprehensive shared layer

D) Other (please describe after [Answer]: tag below)

[Answer]: B

---

### Q3: Auth — standalone service or middleware within the API?
JWT auth is required. Should authentication live as:

A) A dedicated auth NX app (`apps/auth`) — separate Express process issuing and validating tokens, other services call it

B) An auth module within `apps/api` — routes `/auth/*`, controller, service, model all inside the main API app

C) Auth middleware library in `libs/auth` — reusable JWT validation logic imported by any app that needs it, with auth routes in `apps/api`

D) Other (please describe after [Answer]: tag below)

[Answer]: B

---

### Q4: Frontend component organisation
How should the React frontend be structured internally?

A) Feature-based folders: `features/chat`, `features/auth`, `features/patients` — each feature owns its components, hooks, and state

B) Type-based folders: `components/`, `hooks/`, `pages/`, `services/` — classic separation by type

C) Feature-based with a shared `components/ui/` for design system primitives (buttons, inputs, etc.)

D) Other (please describe after [Answer]: tag below)

[Answer]: A

---

## Section 2 — Service Layer Design

### Q5: Backend service layer — how many Express apps share service logic?
Given auth and chatbot both need patient data access, how is service logic shared?

A) All service logic lives inside `apps/api` — auth, chatbot, patient data are modules within one Express app

B) Shared service logic in `libs/` — imported by multiple apps; each app orchestrates its own routes

C) Separate NX apps per domain — each app is fully self-contained with its own service layer

D) Other (please describe after [Answer]: tag below)

[Answer]: A

---

### Q6: AI Integration layer — where does Bedrock live?
The Bedrock streaming integration is a distinct concern. Where should it live?

A) Directly inside the chatbot controller/service within `apps/api` — no separate abstraction

B) A dedicated `libs/ai-client` library — wraps AWS Bedrock SDK, handles streaming, imported by `apps/api`

C) A separate `apps/ai-worker` Express app — chatbot API calls it internally via HTTP

D) Other (please describe after [Answer]: tag below)

[Answer]: B
---

### Q7: Patient data service — read-only or read/write in MVP?
The chatbot reads patient data (symptoms + diagnosis history). Is the patient data service:

A) Read-only in MVP — only GET operations; no patient record creation or update via API

B) Read/write — doctors can also create/update patient records and add symptoms through the API

C) Read-only for chatbot; separate write endpoints for managing patient records (both in MVP)

D) Other (please describe after [Answer]: tag below)

[Answer]: B

---

### Q8: Multi-tenant enforcement — where is tenant scoping applied?
Every query must be scoped to a tenant. Where should tenant isolation be enforced?

A) At the service layer only — every service method receives and applies `tenantId`

B) At the middleware layer — JWT middleware extracts `tenantId` and attaches it to `req`; controllers pass it down to services

C) Both: middleware extracts and validates `tenantId` from JWT, service layer re-validates before every DB query (defence in depth)

D) Other (please describe after [Answer]: tag below)

[Answer]: C

---

## Section 3 — Component Methods (Interface Contracts)

### Q9: Chatbot API — streaming response delivery to frontend
The backend must stream Bedrock responses to the React UI. What mechanism?

A) Server-Sent Events (SSE) — `Content-Type: text/event-stream`, simple unidirectional stream from server to client

B) WebSockets — bidirectional connection, more overhead but allows doctor to interrupt mid-stream

C) HTTP chunked transfer encoding — standard HTTP response with chunked body, no special client protocol needed

D) Other (please describe after [Answer]: tag below)

[Answer]: B

---

### Q10: Chat session — how is a session identified and initiated?
When a doctor opens a chat for a patient, how is the session lifecycle managed?

A) Explicit session creation: `POST /sessions` returns a `sessionId`; all subsequent messages reference it

B) Implicit session per consultation: session is automatically created when the first message is sent for a patient; no separate session endpoint

C) Stateless per-message: no session concept in MVP — each message is independent, full patient context injected each time

D) Other (please describe after [Answer]: tag below)

[Answer]: A

---

### Q11: AI prompt construction — where does the prompt assembly happen?
The system injects patient context (symptoms + diagnosis history) into the Bedrock prompt. Where is this assembled?

A) In the chatbot controller — pulls patient data inline and assembles the prompt before calling the AI service

B) In a dedicated `PromptBuilderService` — receives patient context + doctor message, returns a structured prompt string; called by the chatbot service

C) In the AI client library (`libs/ai-client`) — the library accepts structured inputs and handles prompt formatting internally

D) Other (please describe after [Answer]: tag below)

[Answer]: B

---

## Section 4 — Component Dependencies and Communication

### Q12: Frontend ↔ Backend API communication
The React frontend needs to call the Express API. Given `axios` is prohibited:

A) Native `fetch` with a hand-written wrapper in `libs/api-client` — shared by all frontend features

B) Native `fetch` called directly in each feature's service/hook — no shared wrapper

C) React Query (TanStack Query) for data fetching + native `fetch` as the transport — adds caching and loading state management

D) Other (please describe after [Answer]: tag below)

[Answer]: C

---

### Q13: Database access pattern — ORM or query builder?
The stack is Node.js + Express + SQL (relational). Which data access pattern?

A) Knex.js — SQL query builder, lightweight, good TypeScript support, no magic

B) TypeORM — full ORM with decorators, entity classes, migrations, TypeScript-native

C) Prisma — modern ORM with schema-first approach, auto-generated client, excellent TypeScript types

D) Raw SQL via `pg` / `mysql2` driver — maximum control, no abstraction layer

E) Other (please describe after [Answer]: tag below)

[Answer]: C

---

### Q14: Which relational database engine?
The technical environment specifies SQL/relational. Which engine?

A) PostgreSQL — recommended for production, strong JSON support, excellent NX/Node ecosystem support

B) MySQL 8 — widely hosted, familiar to many teams

C) Amazon Aurora PostgreSQL — managed AWS service, compatible with PostgreSQL, scales well

D) Amazon Aurora MySQL — managed AWS service, MySQL-compatible

E) Other (please describe after [Answer]: tag below)

[Answer]: B

---

## Section 5 — Design Patterns

### Q15: API versioning strategy
The REST API will evolve. How should it be versioned from day one?

A) URL prefix versioning: `/api/v1/...` — simple, explicit, easy to deprecate

B) Header versioning: `Accept: application/vnd.meedok.v1+json` — cleaner URLs, more complex clients

C) No versioning in MVP — add when needed

D) Other (please describe after [Answer]: tag below)

[Answer]: A

---

### Q16: Error response format
What standard error response shape should all API endpoints return?

A) Simple: `{ "error": "message" }` — minimal

B) RFC 7807 Problem Details: `{ "type": "...", "title": "...", "status": 400, "detail": "..." }` — standard, machine-readable

C) Custom envelope: `{ "success": false, "code": "ERROR_CODE", "message": "...", "details": {} }` — verbose but flexible

D) Other (please describe after [Answer]: tag below)

[Answer]: B

---

*Total questions: 16 | Fill in all [Answer]: tags, then reply "done".*
