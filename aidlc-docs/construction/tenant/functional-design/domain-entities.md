# Domain Entities — Unit: tenant

**Generated**: 2026-06-24  
**Unit**: tenant  
**Note**: The `Tenant` domain entity and Prisma schema are defined in Unit 1 (`shared-libs`). This file is a reference summary only.

---

## Tenant Entity (defined in `libs/domain`)

```typescript
// libs/domain/src/entities/tenant.entity.ts
export interface Tenant {
  id: string;          // UUID v4 — primary key
  name: string;        // Clinic/hospital display name
  slug: string;        // URL-safe unique identifier
  createdAt: Date;
  updatedAt: Date;
  deletedAt: Date | null;  // Soft delete — BR-TN-01
}
```

## Prisma Model (defined in `prisma/schema.prisma`)

```prisma
model Tenant {
  id        String    @id @default(uuid())
  name      String
  slug      String    @unique
  createdAt DateTime  @default(now()) @map("created_at")
  updatedAt DateTime  @updatedAt @map("updated_at")
  deletedAt DateTime? @map("deleted_at")
  // ... relations to Doctor, Patient, etc.
  @@map("tenants")
}
```

## Prisma Client Singleton (new in this unit)

```typescript
// apps/api/src/db/prisma-client.ts  (new file — owned by tenant unit)
export const prisma = new PrismaClient().$extends({
  query: { $allModels: { $allOperations: /* 5s timeout */ } }
})
export type PrismaClientWithExtensions = typeof prisma
```

This singleton is the shared database access point for **all** domain units (tenant, auth, patient-data, chatbot-api).
