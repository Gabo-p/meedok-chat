# Business Logic Model — Unit: tenant

**Generated**: 2026-06-24  
**Unit**: tenant

---

## 1. Prisma Client Singleton

**File**: `apps/api/src/db/prisma-client.ts`  
**Pattern**: Single exported instance shared by all model files in `apps/api`

### Initialisation Flow

```
apps/api/src/main.ts (app bootstrap)
  |
  v
import { prisma } from './db/prisma-client'
  |
  v
PrismaClient instantiated ONCE with $extends query timeout (5s, NFR-SL-P04)
  |
  v
All model files import { prisma } from '../../db/prisma-client'
  |
  v
MySQL 8 connection pool (default: num_cpus × 2 + 1)
```

### Singleton Code Model

```typescript
import { PrismaClient } from '@prisma/client'

const QUERY_TIMEOUT_MS = 5_000

const basePrisma = new PrismaClient({
  log: [{ emit: 'event', level: 'query' }, 'warn', 'error'],
})

export const prisma = basePrisma.$extends({
  query: {
    $allModels: {
      async $allOperations({ operation, model, args, query }) {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(
            () => reject(new Error(`DB query timeout: ${model}.${operation} exceeded ${QUERY_TIMEOUT_MS}ms`)),
            QUERY_TIMEOUT_MS,
          ),
        )
        return Promise.race([query(args), timeoutPromise])
      },
    },
  },
})

export type PrismaClientWithExtensions = typeof prisma
```

---

## 2. TenantService — Lookup with In-Memory Cache

**Cache strategy**: In-memory `Map<string, { tenant: Tenant; expiresAt: number }>` with 60-second TTL (Q3-B)

### Lookup Flow

```
AuthMiddleware calls TenantService.findById(tenantId)
  |
  v
[Cache check]
  Hit and not expired → return cached Tenant
  Miss or expired →
    |
    v
    [TenantModel.findById(tenantId)]
      WHERE id = tenantId AND deleted_at IS NULL  (BR-SL-01, Q4-A)
      |
      |-- Found → store in cache with TTL=60s → return Tenant
      |-- Not found → return null (tenant doesn't exist or is soft-deleted)
  |
  v
AuthMiddleware receives Tenant | null
  null → reject request with HTTP 401 (invalid tenant claim)
```

### Cache Invalidation
- TTL-based only (60s) — no explicit invalidation for MVP
- Cache resets on process restart (EC2 instance restart or deploy)
- Tenant records are administrative and change rarely; 60s staleness is acceptable

### Cache Model

```typescript
interface CacheEntry {
  tenant: Tenant
  expiresAt: number  // Date.now() + TTL_MS
}

const TTL_MS = 60_000
const cache = new Map<string, CacheEntry>()

// Lookup sequence:
function getCached(tenantId: string): Tenant | null {
  const entry = cache.get(tenantId)
  if (!entry) return null
  if (Date.now() > entry.expiresAt) {
    cache.delete(tenantId)
    return null
  }
  return entry.tenant
}

function setCached(tenantId: string, tenant: Tenant): void {
  cache.set(tenantId, { tenant, expiresAt: Date.now() + TTL_MS })
}
```

---

## 3. TenantModel — Database Access

**Pattern**: Thin Prisma wrapper — no business logic, only data access

```typescript
// Single method for MVP
async findById(tenantId: string): Promise<Tenant | null>
  → prisma.tenant.findFirst({
      where: { id: tenantId, deletedAt: null }  // BR-SL-01 + BR-SL-02
    })
```

No write operations in MVP — tenant provisioning is administrative (out of scope).
