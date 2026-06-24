# Domain Entities — Unit: shared-libs

**Generated**: 2026-06-24  
**Unit**: shared-libs  
**Location**: `libs/domain/`

---

## Entity Overview

All entities include `deleted_at: DateTime?` — **soft delete is universal; no entity can be hard deleted**.  
All entities include `tenant_id` for multi-tenant isolation (except `Tenant` itself).

---

## Tenant

```typescript
interface Tenant {
  id: string               // UUID
  name: string             // Clinic/hospital name
  slug: string             // URL-safe identifier
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null   // Soft delete — tenants are never hard deleted
}
```

---

## Doctor

```typescript
type DoctorRole = 'doctor' | 'admin'

interface Doctor {
  id: string
  tenantId: string          // FK → Tenant
  email: string
  passwordHash: string
  firstName: string
  lastName: string
  role: DoctorRole          // 'doctor' | 'admin'
  refreshTokenHash: string | null
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null    // Soft delete
}
```

---

## Patient

```typescript
interface Patient {
  id: string
  tenantId: string          // FK → Tenant
  firstName: string
  lastName: string
  dateOfBirth: Date
  gender: string | null
  bloodType: string | null
  contactPhone: string | null
  contactEmail: string | null
  nationalId: string | null          // National identity document number
  medicalRecordNumber: string | null // Internal medical record identifier
  currentSymptoms: string | null     // Free text — updated per consultation
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null    // Soft delete — medical records never hard deleted
}
```

---

## Diagnosis

```typescript
interface Diagnosis {
  id: string
  patientId: string         // FK → Patient
  tenantId: string          // FK → Tenant (denormalised for query efficiency)
  diagnosedBy: string       // FK → Doctor
  diagnosisText: string     // Free text clinical diagnosis
  notes: string | null      // Additional clinical observations
  diagnosedAt: Date         // When the diagnosis was made
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null    // Soft delete
}
```

---

## Prescription (schema only — no API/UI in MVP)

```typescript
type PrescriptionStatus = 'active' | 'inactive' | 'cancelled'

interface Prescription {
  id: string
  patientId: string         // FK → Patient
  doctorId: string          // FK → Doctor
  tenantId: string          // FK → Tenant
  medicationName: string
  dosage: string
  frequency: string
  startDate: Date
  endDate: Date | null
  status: PrescriptionStatus
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null    // Soft delete
}
```

---

## ChatSession

```typescript
type SessionStatus = 'open' | 'closed'

interface ChatSession {
  id: string
  patientId: string         // FK → Patient
  doctorId: string          // FK → Doctor
  tenantId: string          // FK → Tenant
  status: SessionStatus
  startedAt: Date           // KPI tracking — set on creation
  endedAt: Date | null      // KPI tracking — set when session closed
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null    // Soft delete — clinical sessions never hard deleted
}
```

---

## ChatMessage

```typescript
type MessageRole = 'doctor' | 'assistant'
type DoctorDecision = 'confirmed' | 'dismissed'

interface ChatMessage {
  id: string
  sessionId: string         // FK → ChatSession
  tenantId: string          // FK → Tenant (denormalised for query efficiency)
  role: MessageRole         // Who sent the message
  content: string           // Message text content
  disclaimerShown: boolean  // true for all 'assistant' messages; false for 'doctor'
  doctorDecision: DoctorDecision | null  // Set after doctor confirms/dismisses AI suggestion
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null    // Soft delete
}
```

---

## Value Objects

```typescript
// Used by PatientService.getPatientContext() → ChatService prompt injection
interface PatientContext {
  patientId: string
  currentSymptoms: string | null
  diagnosisHistory: DiagnosisSummary[]
}

interface DiagnosisSummary {
  id: string
  diagnosisText: string
  notes: string | null
  diagnosedAt: Date
}

// Cursor-based pagination
interface PaginationCursor {
  cursor: string | null     // Opaque cursor (base64-encoded last record ID + timestamp)
  limit: number             // Default: 20, max: 100
}

interface PaginatedResult<T> {
  data: T[]
  meta: {
    total: number
    nextCursor: string | null
    hasMore: boolean
  }
}

// JWT payload (embedded in token)
interface JwtPayload {
  sub: string               // doctorId
  tenantId: string
  role: DoctorRole
  iat: number
  exp: number
}

// Token usage metadata from Bedrock
interface TokenUsage {
  inputTokens: number
  outputTokens: number
}
```

---

## Prisma Schema

**File**: `prisma/schema.prisma`

```prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "mysql"
  url      = env("DATABASE_URL")
}

model Tenant {
  id        String    @id @default(uuid())
  name      String
  slug      String    @unique
  createdAt DateTime  @default(now()) @map("created_at")
  updatedAt DateTime  @updatedAt @map("updated_at")
  deletedAt DateTime? @map("deleted_at")

  doctors      Doctor[]
  patients     Patient[]
  sessions     ChatSession[]
  messages     ChatMessage[]
  diagnoses    Diagnosis[]
  prescriptions Prescription[]

  @@map("tenants")
}

model Doctor {
  id               String    @id @default(uuid())
  tenantId         String    @map("tenant_id")
  email            String
  passwordHash     String    @map("password_hash")
  firstName        String    @map("first_name")
  lastName         String    @map("last_name")
  role             String    @default("doctor")
  refreshTokenHash String?   @map("refresh_token_hash")
  createdAt        DateTime  @default(now()) @map("created_at")
  updatedAt        DateTime  @updatedAt @map("updated_at")
  deletedAt        DateTime? @map("deleted_at")

  tenant       Tenant        @relation(fields: [tenantId], references: [id])
  sessions     ChatSession[]
  diagnoses    Diagnosis[]
  prescriptions Prescription[]

  @@unique([tenantId, email])
  @@map("doctors")
}

model Patient {
  id                  String    @id @default(uuid())
  tenantId            String    @map("tenant_id")
  firstName           String    @map("first_name")
  lastName            String    @map("last_name")
  dateOfBirth         DateTime  @map("date_of_birth")
  gender              String?
  bloodType           String?   @map("blood_type")
  contactPhone        String?   @map("contact_phone")
  contactEmail        String?   @map("contact_email")
  nationalId          String?   @map("national_id")
  medicalRecordNumber String?   @map("medical_record_number")
  currentSymptoms     String?   @db.Text @map("current_symptoms")
  createdAt           DateTime  @default(now()) @map("created_at")
  updatedAt           DateTime  @updatedAt @map("updated_at")
  deletedAt           DateTime? @map("deleted_at")

  tenant        Tenant        @relation(fields: [tenantId], references: [id])
  diagnoses     Diagnosis[]
  prescriptions Prescription[]
  sessions      ChatSession[]

  @@unique([tenantId, nationalId])
  @@unique([tenantId, medicalRecordNumber])
  @@map("patients")
}

model Diagnosis {
  id            String    @id @default(uuid())
  patientId     String    @map("patient_id")
  tenantId      String    @map("tenant_id")
  diagnosedBy   String    @map("diagnosed_by")
  diagnosisText String    @db.Text @map("diagnosis_text")
  notes         String?   @db.Text
  diagnosedAt   DateTime  @map("diagnosed_at")
  createdAt     DateTime  @default(now()) @map("created_at")
  updatedAt     DateTime  @updatedAt @map("updated_at")
  deletedAt     DateTime? @map("deleted_at")

  patient Patient @relation(fields: [patientId], references: [id])
  tenant  Tenant  @relation(fields: [tenantId], references: [id])
  doctor  Doctor  @relation(fields: [diagnosedBy], references: [id])

  @@map("diagnoses")
}

model Prescription {
  id             String    @id @default(uuid())
  patientId      String    @map("patient_id")
  doctorId       String    @map("doctor_id")
  tenantId       String    @map("tenant_id")
  medicationName String    @map("medication_name")
  dosage         String
  frequency      String
  startDate      DateTime  @map("start_date")
  endDate        DateTime? @map("end_date")
  status         String    @default("active")
  createdAt      DateTime  @default(now()) @map("created_at")
  updatedAt      DateTime  @updatedAt @map("updated_at")
  deletedAt      DateTime? @map("deleted_at")

  patient Patient @relation(fields: [patientId], references: [id])
  doctor  Doctor  @relation(fields: [doctorId], references: [id])
  tenant  Tenant  @relation(fields: [tenantId], references: [id])

  @@map("prescriptions")
}

model ChatSession {
  id        String    @id @default(uuid())
  patientId String    @map("patient_id")
  doctorId  String    @map("doctor_id")
  tenantId  String    @map("tenant_id")
  status    String    @default("open")
  startedAt DateTime  @default(now()) @map("started_at")
  endedAt   DateTime? @map("ended_at")
  createdAt DateTime  @default(now()) @map("created_at")
  updatedAt DateTime  @updatedAt @map("updated_at")
  deletedAt DateTime? @map("deleted_at")

  patient  Patient       @relation(fields: [patientId], references: [id])
  doctor   Doctor        @relation(fields: [doctorId], references: [id])
  tenant   Tenant        @relation(fields: [tenantId], references: [id])
  messages ChatMessage[]

  @@map("chat_sessions")
}

model ChatMessage {
  id              String    @id @default(uuid())
  sessionId       String    @map("session_id")
  tenantId        String    @map("tenant_id")
  role            String
  content         String    @db.Text
  disclaimerShown Boolean   @default(false) @map("disclaimer_shown")
  doctorDecision  String?   @map("doctor_decision")
  createdAt       DateTime  @default(now()) @map("created_at")
  updatedAt       DateTime  @updatedAt @map("updated_at")
  deletedAt       DateTime? @map("deleted_at")

  session ChatSession @relation(fields: [sessionId], references: [id])
  tenant  Tenant      @relation(fields: [tenantId], references: [id])

  @@map("chat_messages")
}
```
