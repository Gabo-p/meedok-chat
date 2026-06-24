# Tech Stack Decisions — Unit: tenant

**Generated**: 2026-06-24  
**Unit**: tenant  
**Note**: All tech stack choices are inherited from shared-libs. No new dependencies introduced by this unit.

---

## Stack (fully inherited from shared-libs)

| Concern | Decision | Source |
|---------|----------|--------|
| Language | TypeScript (strict) | shared-libs |
| Runtime | Node.js LTS | shared-libs |
| ORM | Prisma v5+ | shared-libs |
| Database | MySQL 8 | shared-libs |
| Prisma singleton | `apps/api/src/db/prisma-client.ts` | Decided in tenant functional design (Q1) |
| Query timeout | 5s via `$extends` in singleton | NFR-SL-P04 / tenant Q2 |
| Logging | Pino (injected) | shared-libs |
| Test runner | Jest v29+ | shared-libs |
| PBT | `fast-check` v3+ | shared-libs |

## New Files Introduced by This Unit

| File | Purpose |
|------|---------|
| `apps/api/src/db/prisma-client.ts` | Prisma singleton with `$extends` 5s timeout — **shared by all units** |
| `apps/api/src/modules/tenant/tenant.service.ts` | TenantService with in-memory TTL cache |
| `apps/api/src/modules/tenant/tenant.model.ts` | TenantModel — thin Prisma wrapper |

## No New Dependencies

This unit adds no new `package.json` entries. All required packages (`@prisma/client`, `prisma`) were declared in shared-libs.
