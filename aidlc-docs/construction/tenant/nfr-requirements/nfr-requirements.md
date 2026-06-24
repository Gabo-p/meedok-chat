# NFR Requirements — Unit: tenant

**Generated**: 2026-06-24  
**Unit**: tenant  
**Note**: All NFR decisions for this unit flow directly from shared-libs NFR Requirements and prior approved answers. No additional questions required.  
**Active extensions**: Security Baseline ✅ | Resiliency Baseline ✅ | Property-Based Testing ✅

---

## Performance Requirements

### NFR-TN-P01: Tenant Lookup Latency
- **Requirement**: Tenant lookup via `TenantService.findById()` must NOT add measurable latency to the request path when the cache is warm.
- **Target**: Cache hit response < 1ms (in-process Map lookup).
- **Implementation**: In-memory TTL cache (BR-TN-03) — warm hits return synchronously without a DB round-trip.

### NFR-TN-P02: Query Timeout (inherited)
- **Requirement**: All `TenantModel` Prisma queries inherit the 5-second timeout from the shared Prisma singleton (NFR-SL-P04, BR-TN-05).
- **Implementation**: Automatic via `$extends` wrapper in `apps/api/src/db/prisma-client.ts`.

### NFR-TN-P03: Cache Memory Footprint
- **Requirement**: The in-memory tenant cache must not grow unboundedly.
- **Implementation**: Cache entries are evicted on TTL expiry (60s). Given MVP tenant count is small (< 100), no maximum size limit is needed for MVP.

---

## Security Requirements (Security Baseline Extension)

### NFR-TN-S01: Soft-Deleted Tenant = Unauthorized
- **Requirement**: A request carrying a JWT with a soft-deleted tenant's ID MUST be rejected with HTTP 401. The system must not differentiate between "tenant not found" and "tenant deleted" in the response (no information leakage).
- **Implementation**: `TenantService.findById()` returns `null` for both cases (BR-TN-01); `AuthMiddleware` treats `null` as HTTP 401.

### NFR-TN-S02: No Tenant Data in Logs
- **Requirement**: `TenantService` and `TenantModel` must not log tenant `name`, `slug`, or any PII. Only `tenantId` (UUID) may appear in structured logs.
- **Implementation**: Pino log calls include only `{ tenantId, operation, durationMs }`.

### NFR-TN-S03: Prisma Singleton — No Raw SQL
- **Requirement**: `TenantModel` must use Prisma's typed query API only. No `$queryRaw` or `$executeRaw` (NFR-SL-S03).

---

## Resiliency Requirements (Resiliency Baseline Extension)

### NFR-TN-R01: Cache Miss Resilience
- **Requirement**: If the DB query on a cache miss fails (timeout, connection error), the error must propagate to `AuthMiddleware` which returns HTTP 503. The failed lookup must NOT be cached.
- **Implementation**: Only successful DB results are stored in cache. Errors propagate as thrown exceptions.

### NFR-TN-R02: Prisma Reconnect (inherited)
- **Requirement**: Prisma's built-in connection pool handles transient MySQL connection loss automatically (NFR-SL-R03).

---

## Property-Based Testing Requirements (PBT Extension)

### NFR-TN-T01: PBT Scope
- **Assessment**: `tenant` unit has minimal pure logic — only the cache TTL check is a PBT candidate.
- **Property**: For any `expiresAt` value and current time, `isExpired(entry)` returns the correct boolean.
- **Implementation**: 1 PBT property test in `tenant.model.pbt.test.ts`.

---

## Extension Compliance Summary

| Extension | Applicable Rules | Status |
|-----------|-----------------|--------|
| Security Baseline | NFR-TN-S01 through S03 | ✅ All addressed |
| Resiliency Baseline | NFR-TN-R01 through R02 | ✅ All addressed |
| Property-Based Testing | NFR-TN-T01 (1 property) | ✅ Addressed |
