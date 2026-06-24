# Business Rules — Unit: tenant

**Generated**: 2026-06-24  
**Unit**: tenant

---

## BR-TN-01: findById Returns Only Non-Deleted Tenants

**Rule**: `TenantService.findById()` and `TenantModel.findById()` MUST filter out soft-deleted tenants.

**Implementation**: All queries include `WHERE deleted_at IS NULL` (inherits BR-SL-01).

**Behaviour**: If a tenant exists but has `deletedAt` set, `findById()` returns `null` — the same as if the tenant never existed. Callers (AuthMiddleware) treat `null` as an invalid tenant claim and reject the request with HTTP 401.

---

## BR-TN-02: Tenant Lookup Always Scoped by ID

**Rule**: `TenantModel.findById()` queries by primary key (`id`) only. No full-table scans.

**Implementation**: Prisma `findFirst({ where: { id, deletedAt: null } })` — `id` is the UUID primary key, indexed.

---

## BR-TN-03: Cache TTL is 60 Seconds

**Rule**: Cached tenant records expire after exactly 60 seconds. Expired entries are evicted on next access.

**Implementation**: `expiresAt = Date.now() + 60_000`. On cache hit, check `Date.now() > expiresAt` before returning.

---

## BR-TN-04: Prisma Singleton — One Instance Per Process

**Rule**: There MUST be exactly one `PrismaClient` instance per Node.js process. All model files import from `apps/api/src/db/prisma-client.ts`.

**Implementation**: Module-level singleton. Node.js module caching ensures a single instance.

**Rationale**: Multiple instances would create multiple connection pools, exhausting MySQL 8's connection limit.

---

## BR-TN-05: Query Timeout — 5 Seconds

**Rule**: All database queries executed through the Prisma singleton MUST time out after 5 seconds (NFR-SL-P04).

**Implementation**: `$extends` query wrapper applied in `prisma-client.ts` — applies globally to all operations across all units.

---

## Business Rules Summary

| ID | Rule | Severity | Component |
|----|------|----------|-----------|
| BR-TN-01 | findById returns only non-deleted tenants | Critical | TenantService, TenantModel |
| BR-TN-02 | Lookup by primary key only — no table scans | High | TenantModel |
| BR-TN-03 | Cache TTL = 60 seconds, evict on expiry | Medium | TenantService |
| BR-TN-04 | One Prisma instance per process | Critical | prisma-client.ts |
| BR-TN-05 | 5-second query timeout on all Prisma ops | High | prisma-client.ts |
