# Functional Design Plan — Unit: shared-libs

Please answer each question by filling in the `[Answer]:` tag.
Reply "done" when all answers are filled.

---

## Plan Checklist
- [x] Answer all questions below
- [x] Generate business-logic-model.md
- [x] Generate business-rules.md
- [x] Generate domain-entities.md

---

## Context

**Unit**: `shared-libs`  
**Stories**: S-SL-01 (shared types), S-SL-02 (AiClient streaming), S-SL-03 (Prisma schema), S-SL-04 (NX boundaries)  
**Components**: `libs/shared-types`, `libs/domain`, `libs/ai-client`, `prisma/schema.prisma`

---

## Section 1 — Domain Entities

### Q1: Doctor role model
Doctors are the only user type in MVP. Does the `doctors` table need any role/permission fields beyond a simple `role` enum?

A) Simple role enum only: `role: ENUM('doctor', 'admin')` — admin for future tenant provisioning

B) Single role only: `role: ENUM('doctor')` — no admin role needed in MVP, add later

C) Role + permissions array: `role` + `permissions: JSON` — flexible for future RBAC expansion

X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

### Q2: Patient identity fields
What fields are required on the `patients` table for MVP?

A) Minimal: `id`, `tenant_id`, `first_name`, `last_name`, `date_of_birth`, `current_symptoms`, `created_at`, `updated_at`

B) Extended: minimal + `gender`, `blood_type`, `contact_phone`, `contact_email`

C) Extended + medical identifiers: B + `national_id`, `medical_record_number`

X) Other (please describe after [Answer]: tag below)

[Answer]: C

---

### Q3: Diagnosis entry — what does it record?
What fields are needed on each `diagnoses` record?

A) Core: `id`, `patient_id`, `tenant_id`, `diagnosed_by` (doctor FK), `diagnosis_text`, `diagnosed_at`, `created_at`, `updated_at`

B) Core + notes: A + `notes` (free text for additional clinical observations)

C) Core + notes + ICD code: B + `icd_code` (International Classification of Diseases code)

X) Other (please describe after [Answer]: tag below)

[Answer]: B

---

### Q4: Chat message — AI disclaimer storage
The AI disclaimer must appear on every AI message. How is it stored?

A) Disclaimer text stored in each `chat_messages` row — full text persisted per message

B) Disclaimer is a system constant in code — only a boolean `disclaimer_shown` flag stored in DB

C) Disclaimer version stored — `disclaimer_version` field in DB; actual text resolved from code config by version

X) Other (please describe after [Answer]: tag below)

[Answer]: B

---

### Q5: Soft deletes
Should any entities support soft delete (a `deleted_at` timestamp) rather than hard delete?

A) No soft deletes — hard delete only for MVP; add soft delete in Phase 2 if needed

B) Soft delete on `patients` only — medical records should not be permanently deleted

C) Soft delete on `patients`, `diagnoses`, and `chat_sessions` — all clinical data preserved

X) Other (please describe after [Answer]: tag below)

[Answer]: X - que nada se pueda eliminar en realidad, todo sea softdelete

---

## Section 2 — AI Client Business Logic

### Q6: Bedrock model invocation — request format
AWS Bedrock supports multiple model families with different request schemas. Which format should `libs/ai-client` target?

A) Anthropic Claude Messages API format — `{ messages: [{ role, content }], max_tokens, ... }` (recommended for Claude 3)

B) Amazon Titan Text format — `{ inputText, textGenerationConfig: { maxTokenCount, ... } }`

C) Generic converse API — use AWS Bedrock's unified `ConverseStream` command that works across model families

X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

### Q7: AI client error classification
When Bedrock returns an error, how should `libs/ai-client` classify and surface it?

A) Two categories: `retryable` (throttling, service unavailable) and `fatal` (invalid request, auth error) — caller decides retry strategy

B) Throw typed errors: `BedrockThrottleError`, `BedrockAuthError`, `BedrockModelError`, `BedrockTimeoutError` — caller handles each type

C) Single `AiClientError` with a `code` field and `retryable: boolean` property

X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

### Q8: Streaming chunk format
What does each yielded chunk from `AiClient.streamInvoke()` contain?

A) Raw string only — the text delta from the model response, nothing else

B) Structured object: `{ text: string, stopReason?: string, usage?: TokenUsage }` — includes metadata when available

C) Raw string for text deltas; a final sentinel object `{ done: true, stopReason, usage }` at stream end

X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

## Section 3 — Shared Types and DTOs

### Q9: API response envelope
All REST responses follow RFC 7807 for errors (decided in App Design). What about success responses — should they use an envelope?

A) No envelope for success — return the resource directly (e.g. `{ id, name, ... }`)

B) Success envelope: `{ data: T, meta?: { page, total } }` — consistent wrapper, useful for paginated lists

C) Envelope for lists only: arrays wrapped in `{ data: T[], meta: { total } }`; single resources returned directly

X) Other (please describe after [Answer]: tag below)

[Answer]: B

---

### Q10: Pagination strategy
Patient lists and session lists will need pagination. Which strategy?

A) Offset/limit: `?page=1&pageSize=20` — simple, widely understood

B) Cursor-based: `?cursor=<token>&limit=20` — more efficient for large datasets, no duplicate results on insert

C) No pagination in MVP — return all records; add pagination in Phase 2

X) Other (please describe after [Answer]: tag below)

[Answer]: B

---

## Section 4 — NX Workspace Structure

### Q11: TypeScript configuration strategy
NX monorepos typically use a root `tsconfig.base.json` with path aliases. Which approach?

A) Root `tsconfig.base.json` with path aliases for all libs (e.g. `@meedok/shared-types`, `@meedok/domain`, `@meedok/ai-client`)

B) Relative imports only — no path aliases; imports use relative paths to `libs/`

X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

### Q12: Package manager
Which package manager should the NX monorepo use?

A) npm — standard, no additional tooling

B) pnpm — faster installs, strict dependency isolation, workspace support

C) yarn (v1 classic) — familiar, broad ecosystem support

X) Other (please describe after [Answer]: tag below)

[Answer]: B

---

*Total questions: 12 | Fill in all [Answer]: tags, then reply "done".*
