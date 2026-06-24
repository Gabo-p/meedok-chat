# Functional Design Plan — Unit: tenant

Please answer each question by filling in the `[Answer]:` tag.
Reply "done" when all answers are filled.

---

## Plan Checklist
- [x] Answer all questions below
- [x] Generate business-logic-model.md
- [x] Generate business-rules.md
- [x] Generate domain-entities.md (reference only — entity defined in shared-libs)

---

## Context

**Unit**: `tenant`  
**Stories**: S-TN-01 (TenantService.findById), S-TN-02 (fast lookup, no N+1)  
**Components**: `TenantService`, `TenantModel`, Prisma client initialisation  
**Depends on**: Unit 1 (`shared-libs`) — Prisma schema, `@meedok/domain` Tenant entity

---

## Section 1 — Prisma Client Initialisation

### Q1: Prisma client singleton
The Prisma client should be a singleton to avoid connection pool exhaustion. Where should it be initialised?

A) `apps/api/src/db/prisma-client.ts` — a single exported singleton used by all model files across all domain modules

B) Each domain module creates its own Prisma client instance — simpler but risks multiple pool connections

X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

### Q2: Prisma query timeout extension
NFR-SL-P04 requires a 5-second query timeout on all Prisma operations. Should the timeout extension be applied in the singleton?

A) Yes — apply the `$extends` query timeout wrapper in `prisma-client.ts` so all modules inherit it automatically

B) No — apply it per-module; each model file wraps its own queries

X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

## Section 2 — TenantService Design

### Q3: Tenant lookup caching
`TenantService.findById()` is called on every authenticated request (by AuthMiddleware). Should results be cached?

A) No caching — query the DB every time; tenants are rarely updated and connection pool handles the load

B) In-memory cache with a short TTL (e.g. 60 seconds) — reduces DB load for high-traffic deployments

C) Request-scoped cache — cache within a single request lifecycle only (no cross-request state)

X) Other (please describe after [Answer]: tag below)

[Answer]: B

---

### Q4: Soft-delete awareness
`TenantService.findById()` must respect universal soft delete (BR-SL-01). Should it also expose a method to check if a tenant is active?

A) `findById()` only returns non-deleted tenants — callers receive `null` if tenant is soft-deleted

B) `findById()` returns the tenant regardless of `deletedAt`; callers check `deletedAt` themselves

C) `findById()` returns non-deleted tenants, plus a separate `isActive(tenantId)` boolean helper

X) Other (please describe after [Answer]: tag below)

[Answer]: A

---

*Total questions: 4 | Fill in all [Answer]: tags, then reply "done".*
