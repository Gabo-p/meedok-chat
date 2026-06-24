# NFR Design Plan — Unit: shared-libs

Please answer each question by filling in the `[Answer]:` tag.
Reply "done" when all answers are filled.

---

## Plan Checklist
- [x] Answer all questions below
- [x] Generate nfr-design-patterns.md
- [x] Generate logical-components.md

---

## Context

**Unit**: `shared-libs`  
**NFRs to incorporate**: Circuit breaker (NFR-SL-R01), dual timeout (NFR-SL-P01/P02), Prisma query timeout (NFR-SL-P04), PBT harness (NFR-SL-T01/T02), connection pool (NFR-SL-P03)

---

## Section 1 — Resilience Patterns

### Q1: Circuit breaker — storage scope
The circuit breaker tracks failure count and state. Where should this state live?

A) In-process module-level singleton — one circuit breaker shared across all `AiClient` calls in the same Node.js process

B) Per-`AiClient`-instance — each instantiation of `AiClient` gets its own independent circuit breaker state

C) External store (Redis) — circuit state shared across multiple EC2 instances

X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

### Q2: Circuit breaker — failure counting scope
Which errors should increment the circuit breaker failure counter?

A) Fatal errors only (`INVALID_REQUEST`, `AUTH_ERROR`, `MODEL_ERROR`) — retryable errors are temporary and should not trip the circuit

B) All errors after retry exhaustion — both retryable (after single retry fails) and fatal errors count

C) All Bedrock errors regardless of retry — even the first retryable error increments the counter

X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

## Section 2 — Performance Patterns

### Q3: Dual timeout implementation
Two `AbortController` timers are needed: first-chunk (5s) and total-stream (120s). How should they compose?

A) Two independent `AbortController` instances — first-chunk timer cancelled when first chunk arrives; total-stream timer runs for full duration

B) Single `AbortController` with two phases — same signal, but the timeout value switches after first chunk arrives

C) Wrap in a helper class `StreamTimeoutController` that manages both timers transparently

X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

## Section 3 — Security Patterns

### Q4: Prompt content sanitisation in `libs/ai-client`
The business rules require prompt content is never logged (BR-SL-09). Should `libs/ai-client` enforce this internally or rely on the caller?

A) `libs/ai-client` enforces it internally — the logger instance injected into `AiClient` is wrapped to strip any `prompt` or `chunk` keys before writing

B) Convention only — `libs/ai-client` documents the rule; callers are responsible for not passing prompt content to the logger

C) `libs/ai-client` accepts a `sensitiveKeys` config array — any log field matching those keys is redacted automatically

X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

## Section 4 — PBT Harness

### Q5: PBT test file location
Where should property-based tests live relative to the source files they test?

A) Co-located: `libs/ai-client/src/__tests__/ai-client.pbt.test.ts` alongside unit tests

B) Separate PBT directory: `libs/ai-client/src/__tests__/pbt/` — all property tests grouped together

C) Root test directory: `libs/ai-client/tests/pbt/` — outside `src/`

X) Other (please describe after [Answer]: tag below)

[Answer]: B

---

*Total questions: 5 | Fill in all [Answer]: tags, then reply "done".*
