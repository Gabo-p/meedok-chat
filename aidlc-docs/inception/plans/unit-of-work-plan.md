# Unit of Work Plan — Meedok-chat

Please answer each question by filling in the `[Answer]:` tag.
Choose a letter option or use X + description for custom answers.
Reply "done" when all answers are filled.

---

## Generation Plan Checklist

- [x] Answer all questions below
- [x] Generate unit-of-work.md
- [x] Generate unit-of-work-dependency.md
- [x] Generate unit-of-work-story-map.md
- [x] Validate unit boundaries and dependencies

---

## Preliminary Unit Breakdown (from Application Design)

Five units were identified in the execution plan:

| # | Unit | Core Components |
|---|------|----------------|
| 1 | `shared-libs` | `libs/shared-types`, `libs/domain`, `libs/ai-client` |
| 2 | `auth` | AuthModule, AuthMiddleware, DoctorModel, TenantModule |
| 3 | `patient-data` | PatientModule, PatientModel, DiagnosisModel, Prescription schema |
| 4 | `chatbot-api` | ChatModule, PromptBuilderService, SessionModel, MessageModel |
| 5 | `frontend` | `apps/web` — all features (auth, chat, patients, ui) |
| 6 | `infrastructure` | AWS CDK stack — EC2, VPC, load balancer, RDS, Bedrock IAM |

> Note: `shared-libs` was added as a foundational unit because `libs/ai-client`, `libs/shared-types`, and `libs/domain` must exist before any app unit can be built.

---

## Section 1 — Unit Boundaries and Grouping

### Q1: shared-libs as a separate unit
`libs/ai-client`, `libs/shared-types`, and `libs/domain` have no runtime deps and are prerequisites for all other units. Should they be their own unit?

A) Yes — treat `shared-libs` as Unit 1; it must complete (types + AI client) before other units start

B) No — split them: merge `shared-types` + `domain` into the first consuming unit, and `ai-client` into `chatbot-api`

C) No — `shared-types` and `domain` are trivial enough to generate inline during each unit; only `ai-client` deserves its own unit

X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

### Q2: Auth and tenant — same unit or separate?
The TenantModule is small (one service, one model) but auth depends on it. Should tenant live with auth?

A) Yes — combine TenantModule into the `auth` unit; they share the JWT/tenant concern

B) No — TenantModule is its own unit; auth depends on it and must follow it

X) Other (please describe after [Answer]: tag below)

[Answer]: B

---

### Q3: Frontend unit — one unit or split by feature?
`apps/web` has three features (auth, chat, patients). Should the frontend be one unit or split?

A) One unit — `frontend` covers all three features; the React app is built together

B) Two units — `frontend-auth` (login, token management) and `frontend-chat-patients` (chatbot + patient views)

C) Three units — one per feature (`frontend-auth`, `frontend-chat`, `frontend-patients`)

X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

### Q4: Infrastructure — one CDK unit or split per concern?
The CDK stack covers networking (VPC, EC2, load balancer), database (RDS MySQL), and IAM (Bedrock access). Should infrastructure be one unit or split?

A) One unit — a single CDK stack (`infrastructure`) covering all AWS resources

B) Two units — `infra-network` (VPC, EC2, LB) and `infra-data` (RDS, S3, IAM)

C) Three units — `infra-network`, `infra-data`, `infra-app` (ECS/EC2 app deployment config)

X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

## Section 2 — Dependencies and Build Sequence

### Q5: Build and development sequence
Given the dependencies between units, which development sequence do you prefer?

A) Strict sequential — complete each unit fully before starting the next:
   `shared-libs` → `auth` → `patient-data` → `chatbot-api` → `frontend` → `infrastructure`

B) Infrastructure first — build CDK stack early so the environment is ready for integration:
   `infrastructure` → `shared-libs` → `auth` → `patient-data` → `chatbot-api` → `frontend`

C) Parallel where possible — `shared-libs` + `infrastructure` in parallel, then `auth` + `patient-data` in parallel, then `chatbot-api`, then `frontend`

X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

### Q6: Prisma schema ownership
The Prisma schema (`prisma/schema.prisma`) and migrations define tables used by `auth`, `patient-data`, and `chatbot-api`. Which unit owns it?

A) `shared-libs` — schema is a shared foundation, generated alongside the shared types

B) A dedicated step at the start of `auth` — auth is the first domain unit and sets up the DB

C) Each unit owns its own schema slice — schema is built incrementally as each unit is generated

X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

## Section 3 — Team and Ownership

### Q7: Parallel development intent
The team has 2 engineers. Should units be designed for parallel development, or is sequential fine?

A) Sequential — 2 engineers work together on each unit; no parallelisation needed

B) Parallel where safe — split units that have no hard dependency so both engineers can work simultaneously

X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

## Section 4 — Technical Considerations

### Q8: Per-unit test scope
Each unit will have its own Jest unit tests. Should integration tests (cross-unit) be a separate unit or part of the final `chatbot-api` unit?

A) Integration tests are part of Build and Test stage — not tied to a specific unit

B) Add a dedicated `integration-tests` unit after all other units complete

X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

## Section 5 — Code Organisation

### Q9: NX project tags for build boundaries
NX supports project tags to enforce dependency rules (e.g. `apps/web` can't import from `apps/api`). Should AI-DLC configure NX tags and lint rules?

A) Yes — configure NX tags (`scope:api`, `scope:web`, `scope:shared`) and `@nx/enforce-module-boundaries` lint rule

B) No — skip NX tags for MVP; add them later if needed

X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

*Total questions: 9 | Fill in all [Answer]: tags, then reply "done".*
