# Technical Environment — Answers History
<!-- Append-only. Never rewrite or truncate. -->

---

## Batch 1 — T1–T5 (validated 2026-06-24)

### T1 [CORE]: Runtime environment
[Answer]: A — Cloud only

### T2 [CORE]: Cloud provider
[Answer]: A — AWS

### T3 [CORE]: Deployment model
[Answer]: C — VMs / EC2-style

### T4: Team size and experience
[Answer]: 2 engineers. Strong in React, TypeScript/Node, Express.

### T5 [CORE]: Required languages

| Language | Version | Purpose | Rationale |
|----------|---------|---------|-----------|
| JavaScript | latest | Frontend (React) + Backend (Express) | Team expertise |

---

## Batch 2 — T6–T10 (validated 2026-06-24)

### T6: Permitted languages

| Language | Conditions for Use |
|----------|--------------------|
| JavaScript | (no specific conditions stated) |
| SQL | (no specific conditions stated) |
| TypeScript | (no specific conditions stated) |

### T7 [CORE]: Prohibited languages
⚠️ Caveat: reasons not provided — flagged for clarification.

| Language | Reason |
|----------|--------|
| C# | (not stated) |
| PHP | (not stated) |

### T8 [CORE]: Required frameworks

| Framework | Domain | Rationale |
|-----------|--------|-----------|
| Express | Backend | (not stated) |
| React | Frontend | (not stated) |
| NX | Monorepo | (not stated) |

### T9: Preferred frameworks
(none specified)

### T10 [CORE]: Prohibited libraries

| Prohibited | Reason | Use Instead |
|------------|--------|-------------|
| axios | Security | native fetch |

---

## Batch 3 — T11–T16 (validated 2026-06-24)

### T11: Allowed cloud services

| Service | Constraints / Notes |
|---------|---------------------|
| S3 | For docs and image handling |

### T12: Disallowed cloud services
[Answer]: B — None

### T13 [CORE]: API style
[Answer]: REST (OpenAPI-described)

### T14 [CORE]: Data patterns
[Answer]: A — Relational / SQL

### T15: Messaging / integration patterns
[Answer]: D — Mix (no further detail provided — flagged as caveat; specific edges TBD)

### T16: Project structure conventions
[Answer]: A — Monorepo

---

## Batch 4 — T17–T21 (validated 2026-06-24)

### T17 [CORE]: Authentication method
[Answer]: B — JWT issued by our own auth service

### T18: Encryption
[Answer]: A — Everything encrypted at rest AND in transit

### T19: Input validation
[Answer]: A — Schema validation at the API boundary (JSON Schema)

### T20 [CORE]: Secrets management
[Answer]: C — Environment variables injected by the deployment system

### T21: Compliance framework
[Answer]: B — ISO 27001

---

## Batch 5 — T22–T25 (validated 2026-06-24)

### T22 [CORE]: Test types required
[Answer]: A — Unit

### T23: Coverage targets
[Answer]: B — ≥70% overall

### T24: Tooling per test type

| Test Type | Tool |
|-----------|------|
| Unit | Jest |

### T25: CI/CD gates
[Answer]: A — Unit tests pass

---

## Batch 6 — T26–T29 (validated 2026-06-24)

### T26: Example endpoint pattern
[Answer]: Module handler pattern — routes > middleware > module > controller, model, routes, services

### T27: Example function / module pattern
[Answer]: Logging-based error handling convention (no snippet provided — flagged as open item)

### T28: Example test pattern
[Answer]: (skipped — no answer provided — flagged as open item)

### T29: Example infrastructure snippet
[Answer]: A selected but no snippet pasted — flagged as open item (IaC pattern TBD)

---
