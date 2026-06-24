# Business Logic Model — Unit: shared-libs

**Generated**: 2026-06-24  
**Unit**: shared-libs

---

## 1. AiClient — Streaming Invocation Model

### Invocation Flow

```
Caller
  |
  | AiClient.streamInvoke(prompt, config)
  v
[Input Validation]
  - prompt must not be empty
  - config.modelId must be non-empty string
  - config.maxTokens must be 1–4096
  - config.temperature must be 0.0–1.0
  |
  v
[Build Bedrock Request]
  Format: Anthropic Claude Messages API
  {
    messages: [{ role: "user", content: prompt }],
    max_tokens: config.maxTokens,
    temperature: config.temperature,
    anthropic_version: "bedrock-2023-05-31"
  }
  |
  v
[InvokeModelWithResponseStreamCommand]
  AWS Bedrock Runtime SDK
  |
  |-- on chunk received:
  |     parse chunk bytes → extract text delta
  |     yield raw string delta to caller
  |
  |-- on throttling error (429 / ThrottlingException):
  |     classify as RETRYABLE
  |     apply exponential backoff: wait 1s, retry once
  |     if retry fails → throw AiClientError({ retryable: true, code: 'THROTTLED' })
  |
  |-- on service unavailable (503):
  |     classify as RETRYABLE
  |     throw AiClientError({ retryable: true, code: 'SERVICE_UNAVAILABLE' })
  |
  |-- on validation error / auth error / model error:
  |     classify as FATAL
  |     throw AiClientError({ retryable: false, code: <error_code> })
  |
  v
Caller receives AsyncIterable<string> — iterates chunks as they arrive
```

### Error Model

```typescript
class AiClientError extends Error {
  constructor(
    message: string,
    public readonly code: AiClientErrorCode,
    public readonly retryable: boolean,
    public readonly cause?: unknown
  ) { super(message) }
}

type AiClientErrorCode =
  | 'THROTTLED'              // retryable: true
  | 'SERVICE_UNAVAILABLE'    // retryable: true
  | 'INVALID_REQUEST'        // retryable: false
  | 'AUTH_ERROR'             // retryable: false
  | 'MODEL_ERROR'            // retryable: false
  | 'TIMEOUT'                // retryable: true
  | 'STREAM_INTERRUPTED'     // retryable: true
```

### Configuration Model

```typescript
interface ModelConfig {
  modelId: string          // e.g. 'anthropic.claude-3-sonnet-20240229-v1:0'
  maxTokens: number        // 1–4096, default: 2048
  temperature: number      // 0.0–1.0, default: 0.7
  topP?: number            // 0.0–1.0, optional
}

// Resolved from environment at startup
interface AiClientConfig {
  region: string           // AWS_REGION
  defaultModelId: string   // BEDROCK_MODEL_ID
  defaultMaxTokens: number // BEDROCK_MAX_TOKENS (default: 2048)
  defaultTemperature: number // BEDROCK_TEMPERATURE (default: 0.7)
}
```

---

## 2. Shared Types — API Contract Model

### Success Response Envelope

All successful REST responses are wrapped:

```typescript
interface ApiResponse<T> {
  data: T
  meta?: ResponseMeta
}

interface ResponseMeta {
  total?: number           // Total record count (for lists)
  nextCursor?: string | null  // Cursor for next page (cursor-based pagination)
  hasMore?: boolean        // Whether more pages exist
}
```

**Single resource response**:
```json
{
  "data": { "id": "uuid", "firstName": "Ana", ... }
}
```

**List response with pagination**:
```json
{
  "data": [ { "id": "uuid", ... }, ... ],
  "meta": {
    "total": 150,
    "nextCursor": "eyJpZCI6InV1aWQiLCJ0cyI6MTcwMH0=",
    "hasMore": true
  }
}
```

### Error Response — RFC 7807 Problem Details

```typescript
interface ProblemDetails {
  type: string        // URI identifying the error type
  title: string       // Short human-readable summary
  status: number      // HTTP status code
  detail: string      // Human-readable explanation
  instance?: string   // URI of the specific occurrence (request ID)
  errors?: ValidationError[]  // Field-level validation errors
}

interface ValidationError {
  field: string
  message: string
}
```

**Example**:
```json
{
  "type": "https://meedok.io/errors/validation-error",
  "title": "Validation Error",
  "status": 400,
  "detail": "Request body failed schema validation",
  "instance": "/api/v1/patients",
  "errors": [
    { "field": "dateOfBirth", "message": "Must be a valid ISO 8601 date" }
  ]
}
```

### Cursor-Based Pagination Model

```
Cursor encoding:
  cursor = base64(JSON.stringify({ id: lastRecordId, ts: lastRecordTimestamp }))

Query logic:
  IF cursor provided:
    decode cursor → extract { id, ts }
    WHERE (created_at < ts) OR (created_at = ts AND id < lastId)
    ORDER BY created_at DESC, id DESC
    LIMIT limit + 1  ← fetch one extra to detect hasMore

  IF cursor is null:
    return first page (most recent records first)
    ORDER BY created_at DESC, id DESC
    LIMIT limit + 1

  After fetch:
    IF results.length > limit → hasMore = true, pop extra record
    ELSE → hasMore = false
    nextCursor = hasMore ? encode(last result) : null
```

---

## 3. NX Workspace — Path Alias Model

### TypeScript Path Aliases (`tsconfig.base.json`)

```json
{
  "compilerOptions": {
    "paths": {
      "@meedok/shared-types": ["libs/shared-types/src/index.ts"],
      "@meedok/domain":       ["libs/domain/src/index.ts"],
      "@meedok/ai-client":    ["libs/ai-client/src/index.ts"]
    }
  }
}
```

### Import Convention

```typescript
// ✅ Correct — use path aliases
import { PatientDto, LoginDto } from '@meedok/shared-types'
import { Patient, ChatSession } from '@meedok/domain'
import { AiClient } from '@meedok/ai-client'

// ❌ Wrong — no relative cross-lib imports
import { Patient } from '../../libs/domain/src/entities/patient'
```

### NX Module Boundary Enforcement

Tag assignments and constraint matrix established in `unit-of-work.md` (Unit 1 scope):
- `scope:web` → may only depend on `scope:shared`
- `scope:api` → may only depend on `scope:shared`
- `scope:infra` → no lib dependencies
- `scope:shared` → may only depend on `scope:shared`

Enforced via `@nx/enforce-module-boundaries` ESLint rule in `nx.json`.
