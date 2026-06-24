# Requirements Document — Meedok-chat

**Version**: 1.0  
**Generated**: 2026-06-24  
**Phase**: INCEPTION — Requirements Analysis  
**Status**: Approved pending user sign-off

---

## Intent Analysis Summary

| Field | Value |
|-------|-------|
| User request | Build an AI-powered diagnosis chatbot for doctors to reduce consultation time |
| Request type | New product — Greenfield |
| Scope estimate | Multiple components (chatbot UI, backend API, AI integration, auth, patient data layer) |
| Complexity estimate | Moderate-to-complex — multi-tenant, AWS Bedrock streaming, ISO 27001 intent, medical data |
| MVP boundary | Diagnosis Chatbot only — Patient-facing portal OUT; Prescription Management data model IN (no endpoints) |

---

## 1. Functional Requirements

### FR-01: Doctor Authentication and Session Management
- Doctors must authenticate using JWT-based credentials issued by the platform's own auth service.
- Sessions must be scoped per tenant (clinic/hospital) — a doctor's token must carry a tenant identifier.
- JWT must have a configurable expiry and support refresh tokens.
- Unauthenticated requests to any API endpoint must return HTTP 401.
- Unauthorised cross-tenant access attempts must return HTTP 403 and be logged.

### FR-02: Multi-Tenant Isolation
- The system must support multiple clinics/hospitals as isolated tenants.
- Patient data, consultation history, and chat sessions must be strictly partitioned by tenant.
- No query, API call, or AI prompt may leak data across tenant boundaries.
- Tenant provisioning is an administrative operation (out of MVP UI scope, but the data model must support it).

### FR-03: Diagnosis Chatbot — Core Interaction
- Doctors must be able to open a chat session tied to a specific patient.
- The doctor submits a message (symptoms, clinical question, or free text).
- The backend calls AWS Bedrock streaming API; the response streams token-by-token back to the UI.
- The UI must render the streaming response progressively (not wait for completion).
- The chatbot must include a visible disclaimer on every AI-generated response: *"AI-generated suggestion — requires physician confirmation before any clinical action."*
- Doctors must explicitly confirm or dismiss each AI suggestion before it is recorded.

### FR-04: Patient Context Injection
- When a doctor opens a chat session for a patient, the system must automatically retrieve and inject into the AI prompt:
  - Current consultation symptoms (entered by the doctor or drawn from the active consultation record).
  - Patient's past diagnosis history (all prior diagnoses on record for that patient within the tenant).
- The injected context must be formatted as a structured prompt prefix before the doctor's message.
- Patient data injected into prompts must never be stored by the AI provider (Bedrock stateless invocation only).

### FR-05: Chat Session Management
- Each chat session is linked to one patient and one doctor.
- Sessions must be persisted so the doctor can review the conversation history within the same consultation.
- Session history must not be shared with other doctors or tenants.
- Doctors may start a new session for the same patient (prior sessions remain accessible as read-only history).

### FR-06: Prescription Data Model (No Endpoints)
- The database schema must include a `prescriptions` table (or equivalent relational model) to support Phase 2 Prescription Management without a migration.
- Minimum fields: prescription ID, patient ID, doctor ID, tenant ID, medication name, dosage, frequency, start date, end date, status (active/inactive/cancelled), created at, updated at.
- No API endpoints or UI for prescriptions are required in MVP.
- The AI chatbot may read past prescriptions from this table when constructing patient context (FR-04), even if the prescription UI is not yet built.

### FR-07: Patient History Read Access
- The system must expose an internal service method (not a public endpoint) for retrieving a patient's past diagnoses scoped to a tenant.
- This is consumed by FR-04 (context injection) only.
- Patient records are read-only from the chatbot's perspective in MVP.

### FR-08: Consultation Time Tracking
- The system must record the start time and end time of each chat session.
- This data is used to measure the primary KPI: 20% reduction in average consultation time.
- Reports or exports for time tracking are out of MVP scope but the raw data must be captured.

---

## 2. Non-Functional Requirements

### NFR-01: Latency — Streaming Response
- First token from AWS Bedrock must appear in the UI within **3 seconds** of the doctor submitting a message under normal load.
- The streaming connection must use HTTP chunked transfer or Server-Sent Events (SSE) from backend to frontend.
- The backend must not buffer the full Bedrock response before forwarding — it must stream chunks as received.

### NFR-02: Scalability — Concurrent Users
- The system must support at least **50 concurrent authenticated doctors** at MVP launch without degradation.
- The architecture must allow horizontal scaling of the API layer (stateless EC2 instances behind a load balancer) to accommodate growth.
- AWS Bedrock concurrency limits must be factored into capacity planning.

### NFR-03: Security — Authentication and Authorisation
- All API endpoints must validate the JWT on every request (no session cookies).
- JWT signing keys must be rotated on a defined schedule.
- Role-based access: only the `doctor` role may invoke chatbot and patient data endpoints.
- All inter-service communication must use HTTPS; no plain HTTP allowed.

### NFR-04: Security — Data Protection
- All data at rest must be encrypted (AWS EBS/RDS encryption enabled).
- All data in transit must use TLS 1.2 or higher.
- Patient data must never appear in application logs (log scrubbing required).
- Secrets (DB credentials, JWT signing key, Bedrock API config) are injected via environment variables for MVP; upgrade to AWS Secrets Manager is deferred to post-MVP.

### NFR-05: Security — Input Validation
- All API request bodies must be validated against JSON Schema at the API boundary before reaching the controller layer.
- Prompt injection attacks must be mitigated: doctor-supplied text in AI prompts must be sanitised and delimited to prevent instruction injection.
- Maximum prompt length must be enforced to prevent denial-of-service via oversized requests.

### NFR-06: ISO 27001 Intent (Deferred Formal Audit)
- Security controls must be implemented with ISO 27001 Annex A intent:
  - Access control (A.9): RBAC enforced, principle of least privilege.
  - Cryptography (A.10): Encryption at rest and in transit as above.
  - Operations security (A.12): Structured logging, error handling without stack trace exposure.
  - Incident management (A.16): Error logging sufficient to support incident investigation.
- Formal ISO 27001 certification and audit paperwork are deferred to Phase 2.

### NFR-07: Observability
- All API requests must produce structured logs (JSON format via Pino) including: timestamp, request ID, tenant ID, doctor ID (masked), HTTP method, path, status code, duration.
- Patient identifiers in logs must be masked or pseudonymised.
- Application errors must be logged with stack traces to a secure log store (not exposed to API consumers).

### NFR-08: Test Coverage
- Unit test coverage must be ≥ 70% overall (measured by Jest).
- Unit tests must pass in CI before any merge or deploy.
- Test pattern: Jest `describe`/`it`/`expect`, `beforeEach`/`afterEach`, `jest.mock()` for external dependencies.

### NFR-09: Code and Module Conventions
- Layering: `routes → middleware → controller → model → service`
- All modules must follow Express community conventions with Pino for structured logging.
- Error handling via Express error-handling middleware (no try/catch leaking to route handlers).
- No `axios` — use native `fetch` with an abort-controller wrapper.

---

## 3. Technical Constraints (Hard — from technical-environment.md)

| Constraint | Value | Type |
|------------|-------|------|
| Runtime | Cloud (AWS only) | Hard |
| Deployment | EC2 (VM-style) | Hard |
| Languages allowed | JavaScript, TypeScript, SQL | Hard allow-list |
| Languages prohibited | C#, PHP | Hard deny-list (platform direction) |
| Frontend framework | React | Required |
| Backend framework | Express | Required |
| Monorepo tooling | NX | Required |
| HTTP client | Native `fetch` + abort-controller | Required (axios prohibited) |
| API style | REST (OpenAPI-described) | Required |
| Auth | JWT (own auth service) | Required |
| Cloud storage | AWS S3 (documents/images) | Allow-listed |
| AI service | AWS Bedrock (streaming API) | Decided (Q8) |
| IaC | AWS CDK (TypeScript) | Decided (Q11) |
| Secrets (MVP) | Environment variables | Accepted risk, post-MVP upgrade |
| Logging | Pino (structured JSON) | Decided (Q9) |
| Testing | Jest ≥ 70% coverage | Required |
| Compliance | ISO 27001 intent (no formal audit MVP) | Decided (Q4) |
| Regulation | None for MVP (internal tool, jurisdiction TBD) | Decided (Q2) |

---

## 4. Extension Configuration

| Extension | Status | Rationale |
|-----------|--------|-----------|
| Security Baseline | **ENABLED** | Production-grade app handling sensitive medical data |
| Resiliency Baseline | **ENABLED** | Business-critical workload, multi-tenant, doctor-facing |
| Property-Based Testing | **ENABLED** | AI response parsing, patient data transformations, serialisation |

---

## 5. Resolved Open Questions

| ID | Question | Resolution |
|----|----------|------------|
| OQ-B-1 | Numeric success target | **20% reduction** in average consultation time |
| OQ-B-2 | Regulatory jurisdiction | **None for MVP** — internal tool, no external regulation declared; re-evaluate before any public launch |
| OQ-T-1 | Prohibited language rationale | **Platform direction** — company standardised on JavaScript/TypeScript |
| OQ-T-2 | Service communication edges | **Chatbot↔Backend**: streaming REST (SSE/chunked). **Backend↔Bedrock**: AWS Bedrock streaming API |
| OQ-T-3 | ISO 27001 secrets posture | **Env vars accepted for MVP**, upgrade to Secrets Manager post-MVP |
| OQ-T-4 | Express module pattern | **Express + Pino** community conventions, middleware error handling |
| OQ-T-5 | Jest test pattern | **Standard Jest** — describe/it/expect, beforeEach/afterEach, jest.mock() |
| OQ-T-6 | IaC tooling | **AWS CDK (TypeScript)** |
| CONTRADICTION-1 | Medical data vs. env-var secrets | Accepted risk for MVP (Q2=no regulation, Q3=keep env vars) |
| CONTRADICTION-2 | Security priority vs. undefined compliance | Resolved: ISO 27001 intent, formal audit Phase 2 |

---

## 6. MVP Scope Boundary

### In Scope (MVP)
| Feature | Detail |
|---------|--------|
| Diagnosis Chatbot | Core AI chat interaction with AWS Bedrock streaming |
| Doctor Authentication | JWT-based, multi-tenant |
| Patient Context Injection | Current symptoms + past diagnosis history |
| Chat Session Persistence | Per-patient, per-doctor, per-tenant |
| Prescription Data Model | DB schema only — no UI or API endpoints |
| Consultation Time Tracking | Raw data capture only (no reporting UI) |
| Multi-Tenant Architecture | Multiple clinics/hospitals isolated |

### Out of Scope (MVP)
| Feature | Target Phase |
|---------|-------------|
| Patient-facing portal | Phase 2 |
| Prescription Management UI and API | Phase 2 |
| Consultation time reporting dashboard | Phase 2 |
| Formal ISO 27001 audit and certification | Phase 2 |
| AWS Secrets Manager migration | Post-MVP |
| Numeric KPI dashboard | Phase 2 |

---

## 7. Key Risks

| Risk | Impact | Mitigation |
|------|--------|------------|
| AI hallucinations in diagnosis suggestions | High | Mandatory disclaimer + explicit doctor confirmation before any clinical action (FR-03) |
| Bedrock latency exceeding 3s first-token | Medium | Streaming response (NFR-01); monitor P95 latency in production |
| Prompt injection via doctor-supplied text | High | Input sanitisation and delimiter injection at service layer (NFR-05) |
| Cross-tenant data leak | Critical | Tenant ID enforced at every query and prompt; automated tests for isolation (FR-02) |
| Env-var secrets insufficient post-MVP | Medium | Accepted for MVP; Secrets Manager upgrade tracked as Phase 2 backlog item |
| Regulation applies after launch | Medium | OQ-B-2 deferred — must re-evaluate before any public or commercial launch |

---

## 8. Success Criteria

| Metric | Target | Measurement |
|--------|--------|-------------|
| Consultation time reduction | 20% reduction vs. baseline | Consultation session duration tracked per FR-08 |
| First-token latency | ≤ 3 seconds (P95) | Application performance monitoring |
| Unit test coverage | ≥ 70% | Jest coverage report in CI |
| Multi-tenant isolation | Zero cross-tenant data leaks | Automated isolation tests + security review |
