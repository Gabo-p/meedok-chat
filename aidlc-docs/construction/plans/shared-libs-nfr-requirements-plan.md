# NFR Requirements Plan — Unit: shared-libs

Please answer each question by filling in the `[Answer]:` tag.
Reply "done" when all answers are filled.

---

## Plan Checklist
- [x] Answer all questions below
- [x] Generate nfr-requirements.md
- [x] Generate tech-stack-decisions.md

---

## Context

**Unit**: `shared-libs`  
**Components**: `libs/ai-client`, `libs/shared-types`, `libs/domain`, `prisma/schema.prisma`  
**Active extensions**: Security Baseline, Resiliency Baseline, Property-Based Testing

---

## Section 1 — AiClient Performance and Reliability

### Q1: AiClient timeout
If AWS Bedrock does not return the first chunk within a configurable window, the stream should be aborted. What is the acceptable first-chunk timeout for `libs/ai-client`?

A) 5 seconds — abort if no first chunk arrives within 5s

B) 10 seconds — allow up to 10s before aborting (Bedrock cold-start buffer)

C) 30 seconds — maximum tolerance for slow model warm-up

X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

### Q2: AiClient — total stream timeout
Beyond first-chunk latency, a stream that runs indefinitely (e.g. stuck) must also be capped.

A) 60 seconds total stream duration maximum

B) 120 seconds total stream duration maximum

C) No total stream timeout — let the stream run until Bedrock closes it or an error occurs

X) Other (please describe after [Answer]: tag below)

[Answer]: B

---

### Q3: Prisma connection pool size
The API server (EC2) connects to MySQL 8 via Prisma. What connection pool size should be configured?

A) Default Prisma pool (connection_limit = num_cpus * 2 + 1) — auto-sized

B) Fixed pool: 10 connections per API instance

C) Fixed pool: 20 connections per API instance

X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

## Section 2 — Security (Security Baseline Extension — ENABLED)

### Q4: Prisma schema — sensitive field encryption at application level
The database is encrypted at rest (infrastructure-level). Should any fields be additionally encrypted at the application layer (e.g. `national_id`, `medical_record_number`)?

A) No application-level encryption — infrastructure-level encryption at rest is sufficient for MVP

B) Yes — encrypt `national_id` and `medical_record_number` at application level before storing (AES-256)

C) Yes — encrypt all PII fields (`national_id`, `medical_record_number`, `contact_phone`, `contact_email`) at application level

X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

### Q5: Prisma migrations — safety gate
Database migrations run against production MySQL. Should there be a safety mechanism to prevent destructive migrations?

A) No automated gate — developers review migrations manually before applying

B) CI check: fail the pipeline if a migration contains `DROP TABLE`, `DROP COLUMN`, or `TRUNCATE`

C) Shadow database validation: Prisma validates migrations against a shadow DB before allowing deploy

X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

## Section 3 — Resiliency (Resiliency Baseline Extension — ENABLED)

### Q6: AiClient — circuit breaker
Should `libs/ai-client` implement a circuit breaker to stop hammering Bedrock when it is consistently failing?

A) Yes — open circuit after 3 consecutive fatal errors within 60 seconds; half-open after 30 seconds

B) Yes — open circuit after 5 consecutive failures; half-open after 60 seconds

C) No — keep the single retry (BR-SL-08) and let the caller handle repeated failures; circuit breaker is overkill for MVP

X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

### Q7: Prisma — query timeout
Long-running DB queries can block the connection pool. Should individual Prisma queries have a timeout?

A) Yes — 5 second query timeout on all Prisma operations

B) Yes — 10 second query timeout on all Prisma operations

C) No timeout — rely on MySQL's own `wait_timeout` setting

X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

## Section 4 — Property-Based Testing (PBT Extension — ENABLED)

### Q8: PBT scope for shared-libs
Which components in `shared-libs` are PBT candidates?

A) `libs/ai-client` only — chunk parsing logic and error classification are good PBT targets

B) `libs/ai-client` + cursor pagination encoding/decoding — round-trip property: `decode(encode(x)) === x`

C) All of the above + DTO validation — property: any valid DTO round-trips through JSON serialisation without data loss

X) Other (please describe after [Answer]: tag below)

[Answer]: B

---

### Q9: PBT library
Which property-based testing library should be used alongside Jest?

A) `fast-check` — most mature JS/TS PBT library, excellent Jest integration

B) `jest-fast-check` — thin wrapper around fast-check designed for Jest

C) No PBT library — implement property tests manually using Jest's `test.each` with hand-crafted edge cases

X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

## Section 5 — Maintainability

### Q10: Prisma client generation — when does it run?
The Prisma client must be generated from `schema.prisma` before any app code compiles. When should `prisma generate` run?

A) As a `postinstall` npm/pnpm script — runs automatically after `pnpm install`

B) As an explicit NX target — developers run `nx run shared-libs:generate-prisma` manually

C) In CI only — `prisma generate` runs as a CI pipeline step before build

X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

*Total questions: 10 | Fill in all [Answer]: tags, then reply "done".*
