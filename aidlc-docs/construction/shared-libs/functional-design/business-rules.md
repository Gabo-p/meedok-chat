# Business Rules — Unit: shared-libs

**Generated**: 2026-06-24  
**Unit**: shared-libs

---

## BR-SL-01: Universal Soft Delete — No Hard Deletes

**Rule**: No entity in the system may be permanently deleted. All delete operations set `deleted_at` to the current timestamp.

**Applies to**: Tenant, Doctor, Patient, Diagnosis, Prescription, ChatSession, ChatMessage

**Implementation**:
- All Prisma queries that retrieve records MUST include `WHERE deleted_at IS NULL`
- Any attempt to hard-delete a record MUST be rejected at the service layer
- Soft-deleted records are excluded from all API responses unless explicitly queried by an admin
- Rationale: Medical record integrity — clinical data must be preserved for audit and regulatory purposes

**Query pattern**:
```typescript
// ✅ Correct — always filter soft-deleted records
prisma.patient.findMany({ where: { tenantId, deletedAt: null } })

// ❌ Wrong — will return deleted records
prisma.patient.findMany({ where: { tenantId } })
```

---

## BR-SL-02: Tenant Isolation on All Queries

**Rule**: Every database query for tenant-scoped entities must include `tenantId` in the WHERE clause.

**Applies to**: Doctor, Patient, Diagnosis, Prescription, ChatSession, ChatMessage

**Implementation**:
- All model methods receive `tenantId` as an explicit parameter
- No model method may omit `tenantId` from a query on a tenant-scoped table
- Violation of this rule is a **Critical** security defect

**Example**:
```typescript
// ✅ Correct
prisma.patient.findFirst({ where: { id: patientId, tenantId, deletedAt: null } })

// ❌ Wrong — cross-tenant leak risk
prisma.patient.findFirst({ where: { id: patientId } })
```

---

## BR-SL-03: Doctor Email Uniqueness Per Tenant

**Rule**: A doctor's email address must be unique within their tenant. The same email may exist in different tenants.

**Applies to**: Doctor entity

**Implementation**: Prisma `@@unique([tenantId, email])` constraint on `doctors` table.  
**Error response**: HTTP 409 Conflict with `type: "duplicate-email"` when violated.

---

## BR-SL-04: Patient Identity Uniqueness Per Tenant

**Rule**: Within a tenant, `national_id` and `medical_record_number` must each be unique (when provided).

**Applies to**: Patient entity

**Implementation**: Prisma `@@unique([tenantId, nationalId])` and `@@unique([tenantId, medicalRecordNumber])`.  
**Note**: Both fields are optional; uniqueness constraint only applies when the field is non-null.

---

## BR-SL-05: AI Disclaimer on Every Assistant Message

**Rule**: Every `ChatMessage` with `role = 'assistant'` MUST have `disclaimerShown = true`.

**Applies to**: ChatMessage entity

**Implementation**: 
- `disclaimerShown` defaults to `false` in schema
- The service layer that creates assistant messages MUST set `disclaimerShown = true`
- This rule is enforced at the service layer (not at the DB constraint level)
- Disclaimer text is a system constant defined in `libs/shared-types`:

```typescript
export const AI_DISCLAIMER =
  'AI-generated suggestion — requires physician confirmation before any clinical action.'
```

---

## BR-SL-06: Doctor Decision Required for AI Suggestions

**Rule**: `doctorDecision` on a `ChatMessage` is `null` until the doctor explicitly confirms or dismisses. Once set, it cannot be changed.

**Applies to**: ChatMessage entity

**States**:
```
null → 'confirmed'   (terminal)
null → 'dismissed'   (terminal)
```
Any attempt to update `doctorDecision` on a message that already has a decision MUST be rejected with HTTP 409.

---

## BR-SL-07: AiClient — Input Must Not Be Empty

**Rule**: `AiClient.streamInvoke()` and `AiClient.invoke()` MUST reject empty or whitespace-only prompts.

**Implementation**: Validate before calling Bedrock SDK. Throw `AiClientError({ code: 'INVALID_REQUEST', retryable: false })`.

---

## BR-SL-08: AiClient — Single Retry on Retryable Errors

**Rule**: On a retryable Bedrock error (THROTTLED, SERVICE_UNAVAILABLE, TIMEOUT), the client retries exactly once after a 1-second delay. If the retry also fails, the error is propagated to the caller.

**Implementation**:
```
attempt 1 → retryable error → wait 1000ms → attempt 2 → error → throw AiClientError
```
No further retries. The caller (ChatService) is responsible for user-facing error handling.

---

## BR-SL-09: AiClient — Prompt Content Must Never Be Logged

**Rule**: The `prompt` parameter passed to `AiClient.streamInvoke()` and the response chunks MUST NOT appear in application logs. Only metadata (model ID, token counts, duration, error codes) may be logged.

**Rationale**: Prompts contain patient medical data — logging them would violate ISO 27001 data protection intent.

---

## BR-SL-10: Cursor Pagination — Maximum Page Size

**Rule**: The `limit` parameter in cursor-based pagination requests must not exceed 100. Requests with `limit > 100` are rejected with HTTP 400.

**Default limit**: 20 records per page.

---

## BR-SL-11: Cursor Integrity

**Rule**: Pagination cursors are opaque to the client. They must be base64-encoded and treated as single-use tokens. The server must validate cursor format before use; invalid cursors return HTTP 400 with `type: "invalid-cursor"`.

---

## BR-SL-12: Prisma Schema — All IDs Are UUIDs

**Rule**: All entity primary keys use UUID v4 (`@default(uuid())`). No auto-increment integers.

**Rationale**: Prevents ID enumeration attacks; supports multi-tenant distributed systems safely.

---

## BR-SL-13: TypeScript Strict Mode Required

**Rule**: All `libs/` packages MUST compile with TypeScript `strict: true`. The root `tsconfig.base.json` sets `"strict": true` and this setting must not be overridden in any library-level `tsconfig.json`.

**Rationale**: Eliminates implicit `any`, null reference errors, and unsafe type assertions — critical for a medical data application.

---

## BR-SL-14: `libs/domain` Must Have Zero Framework Dependencies

**Rule**: `libs/domain` must not import from Express, React, Prisma, AWS SDK, or any other framework. It contains only pure TypeScript interfaces, types, enums, and value objects.

**Validation**: `libs/domain/package.json` must have an empty `dependencies` object.  
**Rationale**: Domain entities must be importable from any layer without pulling in framework dependencies.

---

## Business Rules Summary

| ID | Rule | Severity | Entity/Component |
|----|------|----------|-----------------|
| BR-SL-01 | Universal soft delete — no hard deletes | Critical | All entities |
| BR-SL-02 | Tenant isolation on all queries | Critical | All tenant-scoped entities |
| BR-SL-03 | Doctor email unique per tenant | High | Doctor |
| BR-SL-04 | Patient identity unique per tenant | High | Patient |
| BR-SL-05 | AI disclaimer on every assistant message | High | ChatMessage |
| BR-SL-06 | Doctor decision is terminal once set | Medium | ChatMessage |
| BR-SL-07 | AiClient rejects empty prompts | High | AiClient |
| BR-SL-08 | Single retry on retryable Bedrock errors | Medium | AiClient |
| BR-SL-09 | Prompt content never logged | Critical | AiClient |
| BR-SL-10 | Pagination max page size = 100 | Low | All list endpoints |
| BR-SL-11 | Cursor integrity validation | Medium | All paginated endpoints |
| BR-SL-12 | All IDs are UUID v4 | High | All entities |
| BR-SL-13 | TypeScript strict mode in all libs | High | All libs |
| BR-SL-14 | libs/domain has zero framework dependencies | High | libs/domain |
