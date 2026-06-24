# Requirements Verification Questions — Meedok-chat

Please answer each question by filling in the letter choice after the `[Answer]:` tag.
If none of the options match your needs, choose the last option (Other/X) and describe your preference after the tag.

Let me know when you're done and I'll generate the full requirements document.

---

## Part 1 — Resolving Business Open Questions

### Question 1 (OQ-B-1): Success metric — consultation time reduction target
The vision states "reduction in consultation time" as the primary KPI but gives no numeric target.
What measurable target should we set for the MVP?

A) Reduce average consultation time by 20%

B) Reduce average consultation time by 30%

C) Reduce average consultation time by 50%

D) Set an absolute time target instead (e.g. "deliver AI summary within 10 seconds of opening a patient record")

E) No numeric target for MVP — launch first, measure baseline, set target in Phase 2

X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

### Question 2 (OQ-B-2): Regulatory / compliance jurisdiction
Meedok-chat will handle patient medical records and history. Which jurisdiction(s) and regulation(s) apply?

A) Mexico — NOM-024-SSA3 (and potentially NOM-035 for health data)

B) United States — HIPAA

C) European Union — GDPR + applicable national health data law

D) Multiple jurisdictions (describe which ones after [Answer]:)

E) Jurisdiction not yet defined — treat as "internal tool" only for now, no external regulation

X) Other (please describe after [Answer]: tag below)

[Answer]: E

---

## Part 2 — Resolving Cross-Role Contradictions

### Question 3 (CONTRADICTION-1 & OQ-T-3): Secrets management approach
The current technical spec uses environment variables for secrets injection. If medical data regulations apply, this may be insufficient for PHI credential protection under ISO 27001 A.10.
Which approach should Meedok-chat use?

A) Keep environment variables — accept the risk, re-evaluate post-MVP

B) Upgrade to AWS Secrets Manager — store all database credentials, JWT signing keys, and API keys there

C) Upgrade to AWS Systems Manager Parameter Store (SecureString) — lighter-weight alternative to Secrets Manager

D) Decision depends on regulatory answer (Q2) — if no regulation applies, keep env vars; if regulation applies, use Secrets Manager

X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

### Question 4 (CONTRADICTION-2): Compliance scope and audit timeline
Security is listed as a top MVP NFR, but there is no compliance scope or audit date. How should we size security controls?

A) Build to ISO 27001 audit-readiness from day one — include logging, access reviews, and documented controls

B) Build with ISO 27001 intent but defer formal audit to Phase 2 — implement the controls, skip the paperwork for now

C) Build with basic security best practices only — no formal compliance target for MVP

X) Other (please describe after [Answer]: tag below)

[Answer]: B

---

## Part 3 — Resolving Technical Open Questions

### Question 5 (OQ-T-1): Prohibited language rationale
C# and PHP are on the prohibited list but no reason was given. What is the rationale?

A) Team expertise — the team has no experience with these languages

B) Platform direction — the company has standardised on JavaScript/TypeScript

C) Both of the above

X) Other (please describe after [Answer]: tag below)

[Answer]: B

---

### Question 6 (OQ-T-2): Service communication — chatbot ↔ backend edge
The architecture specifies "mixed sync + async" but the edge map is missing.
For the Diagnosis Chatbot's core interaction (doctor sends message → AI responds), what communication pattern applies?

A) Synchronous REST — doctor waits for a complete AI response (simple, easier to implement)

B) Synchronous REST with streaming — response streams token-by-token to the UI (better perceived latency)

C) Asynchronous — request queued, doctor polled or notified when ready (better for long-running AI calls)

X) Other (please describe after [Answer]: tag below)

[Answer]: B

---

### Question 7 (OQ-T-2 continued): Backend ↔ AI model edge
How does the backend communicate with the underlying AI/LLM service?

A) Direct synchronous HTTP call to an external LLM API (e.g. AWS Bedrock, OpenAI)

B) Asynchronous via a queue (e.g. SQS) — backend enqueues, a worker calls the LLM and returns the result

C) AWS Bedrock streaming API (sync with chunked response)

X) Other (please describe after [Answer]: tag below)

[Answer]: C

---

### Question 8 (OQ-T-2 continued): Which AI/LLM service will power the chatbot?
The vision describes an "AI-powered chatbot" but the underlying AI service is not specified in the technical environment.

A) AWS Bedrock (foundation models — Anthropic Claude, Amazon Titan, etc.)

B) OpenAI API (GPT-4 or equivalent)

C) Azure OpenAI Service

D) Self-hosted / open-source model on EC2 (e.g. LLaMA, Mistral)

E) Not decided yet — leave as a configurable integration point

X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

### Question 9 (OQ-T-4): Canonical Express module pattern
No concrete code snippet was provided for the function/module pattern. How should AI-DLC generate code?

A) Use Express community conventions — middleware-based error handling, Winston for structured logging, no DI framework

B) Use Express community conventions — middleware-based error handling, Pino for structured logging, no DI framework

C) Provide a representative snippet now (paste after [Answer]:) and AI-DLC will follow it exactly

X) Other (please describe after [Answer]: tag below)

[Answer]: B

---

### Question 10 (OQ-T-5): Jest test pattern
No canonical test file was provided. Which Jest conventions should AI-DLC follow?

A) Standard Jest defaults — describe/it/expect, beforeEach/afterEach, jest.mock() for dependencies

B) Standard Jest defaults as above, plus explicit AAA (Arrange-Act-Assert) comment blocks in each test

C) Provide a representative test file now (paste after [Answer]:) and AI-DLC will follow it exactly

X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

### Question 11 (OQ-T-6): Infrastructure-as-Code tooling
No IaC tool was confirmed. Which tool will manage AWS infrastructure?

A) AWS CDK (TypeScript) — aligns with the team's TypeScript familiarity; recommended

B) Terraform — provider-agnostic, widely used

C) AWS CloudFormation (raw YAML/JSON) — no extra tooling required

D) No IaC for MVP — provision manually via AWS Console, add IaC in Phase 2

X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

## Part 4 — MVP Scope Clarifications

### Question 12: Patient data in scope for MVP chatbot
The MVP includes only the "Diagnosis Chatbot". The chatbot needs to reason over patient history and symptoms. What patient data is in scope for the chatbot to access?

A) Only the current consultation's symptoms (no historical data in MVP)

B) Current symptoms + the patient's past diagnosis history

C) Current symptoms + full medical history (past diagnoses, prescriptions, lab results)

X) Other (please describe after [Answer]: tag below)

[Answer]: B

---

### Question 13: Doctor authentication — multi-tenant or single organisation?
JWT-based auth is confirmed. Is Meedok-chat a single-organisation internal tool or a multi-tenant SaaS for multiple clinics/hospitals?

A) Single organisation — one set of users, one database, one deployment

B) Multi-tenant — multiple clinics/hospitals each with isolated data

C) Not decided — design for single org in MVP, architect to support multi-tenancy later

X) Other (please describe after [Answer]: tag below)

[Answer]: B

---

### Question 14: Prescription management in MVP
The vision lists "Prescription Management" as a full scope feature but marks it OUT of MVP. Should it influence the MVP data model?

A) No — keep it completely out; do not model prescriptions in MVP

B) Yes — include the data model and DB schema but no UI or API endpoints yet

C) Partial — model it in the DB only if the AI chatbot needs to read past prescriptions to support diagnosis

X) Other (please describe after [Answer]: tag below)

[Answer]: Y

---

## Part 5 — Extension Opt-In

### Question 15: Security Extension
Should the Security Baseline extension rules be enforced for this project?
These rules apply as blocking constraints at every construction stage (functional design, code generation, etc.) and enforce OWASP Top-10 mitigations, input sanitisation, auth hardening, and secrets hygiene.

A) Yes — enforce all SECURITY rules as blocking constraints (recommended for production-grade applications handling medical data)

B) No — skip all SECURITY rules (suitable for PoCs, prototypes, and experimental projects)

X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

### Question 16: Resiliency Baseline Extension
Should the Resiliency Baseline extension (AWS Well-Architected Reliability Pillar) be applied?
This provides directional best practices for fault tolerance, high availability, observability, and recoverability across 15 practice areas.

A) Yes — apply the resiliency baseline as directional best practices and design-time guidance (recommended for business-critical workloads)

B) No — skip the resiliency baseline (suitable for PoCs, prototypes, and experimental projects)

X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

### Question 17: Property-Based Testing Extension
Should property-based testing (PBT) rules be enforced?
The chatbot involves AI response parsing, data transformations on patient records, and serialisation — all good PBT candidates.

A) Yes — enforce all PBT rules as blocking constraints

B) Partial — enforce PBT rules only for pure functions and serialisation round-trips

C) No — skip all PBT rules; standard Jest unit tests are sufficient

X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

*Total questions: 17 | Please fill in all [Answer]: tags, then reply "done".*
