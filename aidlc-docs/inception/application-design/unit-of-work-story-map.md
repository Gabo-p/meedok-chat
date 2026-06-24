# Unit of Work Story Map — Meedok-chat

**Generated**: 2026-06-24  
**Stage**: Units Generation  
**Note**: No formal User Stories stage was executed (skipped — single user type, clear requirements). Stories are derived directly from functional requirements (FR-01 through FR-08) and mapped to units.

---

## Story Map by Unit

### Unit 1: `shared-libs` — Shared Libraries + Prisma Schema

| Story ID | Derived From | Description | Acceptance Criteria |
|----------|-------------|-------------|---------------------|
| S-SL-01 | FR-01, FR-02 | As a developer, I need shared TypeScript types and DTOs so that `apps/api` and `apps/web` share a type-safe contract | All DTOs, enums, and WS event types compile without errors; no duplicate type definitions across apps |
| S-SL-02 | FR-03 | As a developer, I need an AWS Bedrock client that streams responses so that the chatbot can deliver token-by-token output | `AiClient.streamInvoke()` yields string chunks via AsyncIterable; unit tested with mocked Bedrock SDK |
| S-SL-03 | FR-01–FR-08 | As a developer, I need a complete Prisma schema with all tables so that every domain unit has a database foundation | schema.prisma contains all 7 tables; `prisma migrate dev` runs without error; all tables include `tenant_id` |
| S-SL-04 | NFR-09 | As a developer, I need NX module boundary rules enforced so that `apps/web` never imports from `apps/api` | `@nx/enforce-module-boundaries` lint rule configured; `nx lint` passes on fresh workspace |

---

### Unit 2: `tenant` — Tenant Module

| Story ID | Derived From | Description | Acceptance Criteria |
|----------|-------------|-------------|---------------------|
| S-TN-01 | FR-02 | As the system, I need tenant records stored and retrievable so that all user data can be scoped to a clinic/hospital | `TenantService.findById()` returns correct tenant or null; Prisma query scoped by ID |
| S-TN-02 | FR-02 | As the system, I need tenant lookup to be fast and reliable so that auth middleware doesn't add significant latency | `TenantService.findById()` covered by unit tests with mocked Prisma; no N+1 queries |

---

### Unit 3: `auth` — Authentication Module

| Story ID | Derived From | Description | Acceptance Criteria |
|----------|-------------|-------------|---------------------|
| S-AU-01 | FR-01 | As a doctor, I can log in with my email and password so that I receive a JWT access token and refresh token | `POST /api/v1/auth/login` returns `{ accessToken, refreshToken }` for valid credentials; returns 401 for invalid |
| S-AU-02 | FR-01 | As a doctor, I can refresh my access token so that I stay authenticated without re-entering credentials | `POST /api/v1/auth/refresh` returns new token pair; invalidates old refresh token (single-use) |
| S-AU-03 | FR-01 | As a doctor, I can log out so that my refresh token is invalidated | `POST /api/v1/auth/logout` clears refresh token; subsequent refresh attempts return 401 |
| S-AU-04 | FR-01, FR-02 | As the system, every protected request is validated for a valid JWT containing tenantId and doctorId so that unauthenticated requests are rejected | `AuthMiddleware` returns 401 for missing/expired/invalid JWT; attaches `req.user` for valid tokens |
| S-AU-05 | FR-02 | As the system, cross-tenant access is blocked at the middleware level so that a doctor from Clinic A cannot access Clinic B data | `AuthMiddleware` returns 403 if `tenantId` in token mismatches route context; logged as security event |
| S-AU-06 | NFR-03 | As the system, JWT signing keys are configurable via environment so that keys can be rotated | JWT secret read from `process.env.JWT_SECRET`; configurable expiry via `process.env.JWT_EXPIRY` |

---

### Unit 4: `patient-data` — Patient Data Module

| Story ID | Derived From | Description | Acceptance Criteria |
|----------|-------------|-------------|---------------------|
| S-PD-01 | FR-07 | As a doctor, I can create a patient record so that the patient exists in the system | `POST /api/v1/patients` returns created patient with ID; scoped to authenticated doctor's tenant |
| S-PD-02 | FR-07 | As a doctor, I can view a patient's details so that I have their current information before a consultation | `GET /api/v1/patients/:patientId` returns patient data; returns 404 if not in doctor's tenant |
| S-PD-03 | FR-07 | As a doctor, I can update a patient's symptoms so that the current consultation state is captured | `PUT /api/v1/patients/:patientId` updates record; tenant-scoped; returns updated patient |
| S-PD-04 | FR-04, FR-07 | As a doctor, I can view a patient's full diagnosis history so that I understand their medical background | `GET /api/v1/patients/:patientId/diagnoses` returns all diagnosis entries; ordered by date descending |
| S-PD-05 | FR-07 | As a doctor, I can add a diagnosis entry to a patient's history so that outcomes are recorded | `POST /api/v1/patients/:patientId/diagnoses` creates entry; linked to patient and tenantId |
| S-PD-06 | FR-04 | As the chatbot system, I can retrieve a structured patient context (symptoms + diagnosis history) so that the AI prompt is properly informed | `PatientService.getPatientContext()` returns `PatientContext`; used internally by ChatService; not a public HTTP endpoint |
| S-PD-07 | FR-06 | As a developer, the prescriptions table exists in the database so that Phase 2 Prescription Management requires no schema migration | Prisma schema contains `prescriptions` table with all required fields; no API endpoints exposed in MVP |
| S-PD-08 | FR-02 | As the system, all patient queries are tenant-scoped at both middleware and service layers so that cross-tenant data leaks are impossible | All PatientModel and DiagnosisModel queries include `WHERE tenant_id = ?`; service layer re-validates tenantId before every query |

---

### Unit 5: `chatbot-api` — Chatbot API Module

| Story ID | Derived From | Description | Acceptance Criteria |
|----------|-------------|-------------|---------------------|
| S-CA-01 | FR-05 | As a doctor, I can create a chat session for a patient so that I have a workspace to conduct AI-assisted diagnosis | `POST /api/v1/sessions` returns session with ID; linked to patientId, doctorId, tenantId; `started_at` recorded |
| S-CA-02 | FR-05 | As a doctor, I can view a session's full message history so that I can review the consultation | `GET /api/v1/sessions/:sessionId` returns session with all messages; tenant-scoped; 404 if not in tenant |
| S-CA-03 | FR-05 | As a doctor, I can list all chat sessions for a patient so that I can access prior consultation history | `GET /api/v1/sessions?patientId=` returns sessions list; ordered by `started_at` descending |
| S-CA-04 | FR-03 | As a doctor, I can send a message via WebSocket and receive a streaming AI response so that diagnosis support feels immediate | WS connection established on `/api/v1/sessions/:sessionId/chat`; `send_message` event triggers Bedrock stream; `stream_chunk` events arrive within 3s first token (P95) |
| S-CA-05 | FR-04 | As the system, the patient's context (symptoms + diagnosis history) is automatically injected into the AI prompt so that the AI has full clinical context | `PromptBuilderService.buildPrompt()` receives `PatientContext` + doctor message; assembled prompt includes structured patient context block |
| S-CA-06 | FR-03 | As a doctor, every AI response includes a mandatory disclaimer so that I am always aware the suggestion requires my clinical confirmation | Every `stream_complete` WS event includes `disclaimer` field; disclaimer text is non-empty and hardcoded as a system constant |
| S-CA-07 | FR-03 | As a doctor, I can confirm or dismiss an AI suggestion so that my decision is recorded | `confirm_suggestion` / `dismiss_suggestion` WS events update `chat_messages.doctor_decision`; response is persisted before acknowledgement |
| S-CA-08 | FR-08 | As the system, consultation start and end times are recorded so that the 20% KPI can be measured | `chat_sessions.started_at` set on creation; `ended_at` set when session is closed; both persisted in DB |
| S-CA-09 | NFR-05 | As the system, doctor-supplied chat input is sanitised before being injected into AI prompts so that prompt injection attacks are mitigated | `PromptBuilderService.sanitiseInput()` strips instruction-like patterns; doctor text wrapped in explicit delimiters in assembled prompt |
| S-CA-10 | NFR-01 | As a doctor, the AI response begins streaming within 3 seconds so that consultation flow is not disrupted | `AiClient.streamInvoke()` pipes first chunk to WS without buffering; P95 first-chunk latency ≤ 3s under load |

---

### Unit 6: `frontend` — React Frontend

| Story ID | Derived From | Description | Acceptance Criteria |
|----------|-------------|-------------|---------------------|
| S-FE-01 | FR-01 | As a doctor, I can log in through a web UI so that I access the application | Login form submits credentials; on success stores tokens and redirects to dashboard; on failure shows error message |
| S-FE-02 | FR-01 | As a doctor, my session is automatically refreshed so that I am not logged out mid-consultation | `useAuth` hook detects 401 responses, calls refresh endpoint transparently, retries original request |
| S-FE-03 | FR-07 | As a doctor, I can browse my tenant's patient list so that I can select a patient to consult | `PatientListPage` loads patients via TanStack Query; shows loading and error states |
| S-FE-04 | FR-07 | As a doctor, I can view a patient's profile and diagnosis history so that I have context before starting a chat | `PatientDetailPage` shows patient details and `DiagnosisHistoryList`; all loaded via TanStack Query |
| S-FE-05 | FR-03, FR-05 | As a doctor, I can open a chat session for a patient and send messages so that I interact with the AI assistant | `ChatPage` creates or loads session; `MessageInput` submits via WebSocket; `MessageList` renders history |
| S-FE-06 | FR-03 | As a doctor, I see the AI response stream in progressively so that I can start reading before it completes | `StreamingMessage` component renders tokens as they arrive via WebSocket `stream_chunk` events |
| S-FE-07 | FR-03 | As a doctor, I always see the AI disclaimer on AI messages so that I am reminded to apply clinical judgement | `AiDisclaimer` component renders on every assistant message; cannot be hidden by the user |
| S-FE-08 | FR-03 | As a doctor, I can confirm or dismiss an AI suggestion via UI controls so that my decision is captured | `ConfirmationControls` renders Confirm/Dismiss buttons on each AI message; sends WS event on click; buttons disabled after decision |
| S-FE-09 | NFR-07 | As a developer, frontend errors are handled gracefully so that doctors see actionable messages not stack traces | All TanStack Query error states render `ErrorMessage` component; WS errors trigger user-visible notification |

---

### Unit 7: `infrastructure` — AWS CDK Stack

| Story ID | Derived From | Description | Acceptance Criteria |
|----------|-------------|-------------|---------------------|
| S-IN-01 | NFR-02 | As the system, EC2 instances are deployed behind a load balancer with auto-scaling so that the system handles ≥50 concurrent users | CDK stack creates ALB + ASG; health check configured; `cdk synth` produces valid CloudFormation |
| S-IN-02 | NFR-04 | As the system, RDS MySQL 8 is deployed in a private subnet with encryption at rest so that patient data is protected | CDK creates RDS instance with `storageEncrypted: true`; no public accessibility; in private subnet |
| S-IN-03 | NFR-04 | As the system, all data in transit is encrypted so that patient data cannot be intercepted | ALB configured with HTTPS listener; EC2 → RDS uses SSL; security groups block plain HTTP on internal ports |
| S-IN-04 | FR-03 | As the system, EC2 instances have IAM permissions to invoke AWS Bedrock so that the chatbot can call the AI service | IAM role attached to EC2 instances grants `bedrock:InvokeModelWithResponseStream` for configured model ARN |
| S-IN-05 | NFR-04 | As the system, S3 bucket is private and encrypted so that stored documents are protected | CDK creates S3 bucket with `blockPublicAccess: BLOCK_ALL`, `encryption: S3_MANAGED` |
| S-IN-06 | NFR-02 | As the system, the VPC is configured across 2 availability zones so that the system is resilient to single-AZ failure | CDK VPC construct spans 2 AZs with public and private subnets |

---

## Story Count Summary

| Unit | Stories | Derived From |
|------|---------|-------------|
| `shared-libs` | 4 | FR-01–FR-08, NFR-09 |
| `tenant` | 2 | FR-02 |
| `auth` | 6 | FR-01, FR-02, NFR-03 |
| `patient-data` | 8 | FR-02, FR-04, FR-06, FR-07 |
| `chatbot-api` | 10 | FR-03, FR-04, FR-05, FR-08, NFR-01, NFR-05 |
| `frontend` | 9 | FR-01, FR-03, FR-05, FR-07, NFR-07 |
| `infrastructure` | 6 | NFR-02, NFR-04, FR-03 |
| **Total** | **45** | |

---

## Requirements Coverage Check

| Requirement | Covered By Unit(s) |
|-------------|-------------------|
| FR-01 Auth and session management | `auth`, `frontend` |
| FR-02 Multi-tenant isolation | `shared-libs`, `tenant`, `auth`, `patient-data`, `chatbot-api` |
| FR-03 Diagnosis chatbot core interaction | `chatbot-api`, `frontend` |
| FR-04 Patient context injection | `patient-data`, `chatbot-api` |
| FR-05 Chat session management | `chatbot-api`, `frontend` |
| FR-06 Prescription data model (no endpoints) | `shared-libs` (schema), `patient-data` |
| FR-07 Patient history read/write access | `patient-data`, `frontend` |
| FR-08 Consultation time tracking | `chatbot-api` |
| NFR-01 Latency — streaming ≤3s | `chatbot-api` |
| NFR-02 Scalability — ≥50 concurrent | `infrastructure` |
| NFR-03 Security — auth/authz | `auth` |
| NFR-04 Security — data protection | `infrastructure` |
| NFR-05 Security — input validation | `chatbot-api` |
| NFR-06 ISO 27001 intent | `auth`, `chatbot-api`, `infrastructure` |
| NFR-07 Observability | `auth`, `chatbot-api`, `patient-data` |
| NFR-08 Test coverage ≥70% | All units |
| NFR-09 Code/module conventions | `shared-libs` (NX rules), all units |

All 8 functional requirements and all 9 non-functional requirements are covered. ✅
