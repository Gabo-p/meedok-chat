# Component Methods — Meedok-chat

**Generated**: 2026-06-24  
**Stage**: Application Design  
**Note**: Detailed business rules and validation logic are defined in Functional Design (CONSTRUCTION phase)

---

## `apps/api` — AuthModule

### AuthController
```typescript
// POST /api/v1/auth/login
login(req: Request<{}, {}, LoginDto>): Promise<Response<TokenPairDto>>

// POST /api/v1/auth/refresh
refresh(req: Request<{}, {}, RefreshTokenDto>): Promise<Response<TokenPairDto>>

// POST /api/v1/auth/logout
logout(req: Request<{}, {}, LogoutDto>): Promise<Response<void>>
```

### AuthService
```typescript
// Validate credentials and issue JWT pair
login(credentials: LoginDto): Promise<TokenPairDto>

// Validate refresh token and issue new access token
refresh(refreshToken: string): Promise<TokenPairDto>

// Invalidate refresh token
logout(refreshToken: string): Promise<void>

// Build JWT payload from doctor record
buildTokenPayload(doctor: Doctor): JwtPayload

// Verify and decode an access token (used by AuthMiddleware)
verifyAccessToken(token: string): JwtPayload
```

### DoctorModel (Prisma)
```typescript
// Find doctor by email within a tenant
findByEmail(email: string, tenantId: string): Promise<Doctor | null>

// Find doctor by ID within a tenant
findById(doctorId: string, tenantId: string): Promise<Doctor | null>

// Store hashed refresh token against doctor record
saveRefreshToken(doctorId: string, hashedToken: string): Promise<void>

// Invalidate stored refresh token
clearRefreshToken(doctorId: string): Promise<void>
```

---

## `apps/api` — ChatModule

### ChatController
```typescript
// POST /api/v1/sessions
createSession(req: AuthenticatedRequest<{}, {}, CreateSessionDto>): Promise<Response<SessionDto>>

// GET /api/v1/sessions/:sessionId
getSession(req: AuthenticatedRequest<{ sessionId: string }>): Promise<Response<SessionWithMessagesDto>>

// GET /api/v1/sessions?patientId=
listSessions(req: AuthenticatedRequest<{}, { patientId: string }>): Promise<Response<SessionDto[]>>

// WebSocket upgrade handler — ws://…/api/v1/sessions/:sessionId/chat
handleWebSocketConnection(ws: WebSocket, req: AuthenticatedRequest<{ sessionId: string }>): void
```

### ChatService
```typescript
// Create a new chat session for a patient
createSession(doctorId: string, tenantId: string, patientId: string): Promise<ChatSession>

// Retrieve session with message history (tenant-scoped)
getSession(sessionId: string, tenantId: string): Promise<ChatSessionWithMessages>

// List sessions for a patient (tenant-scoped)
listSessionsByPatient(patientId: string, tenantId: string): Promise<ChatSession[]>

// Process incoming doctor message: build prompt, invoke AI, stream response
processMessage(
  sessionId: string,
  tenantId: string,
  doctorMessage: string,
  onChunk: (chunk: string) => void,
  onComplete: (fullResponse: string) => void,
  onError: (error: Error) => void
): Promise<void>

// Record doctor's confirmation or dismissal of an AI suggestion
recordSuggestionDecision(
  messageId: string,
  sessionId: string,
  tenantId: string,
  decision: 'confirmed' | 'dismissed'
): Promise<void>

// Close session and record end timestamp
closeSession(sessionId: string, tenantId: string): Promise<void>
```

### PromptBuilderService
```typescript
// Assemble a structured Bedrock prompt from patient context + doctor message
buildPrompt(
  patientContext: PatientContext,
  doctorMessage: string
): string

// Sanitise doctor-supplied text to prevent prompt injection
sanitiseInput(rawText: string): string

// Enforce maximum prompt length
validatePromptLength(prompt: string, maxTokens: number): void
```

### SessionModel (Prisma)
```typescript
create(data: CreateSessionData): Promise<ChatSession>
findById(sessionId: string, tenantId: string): Promise<ChatSession | null>
findWithMessages(sessionId: string, tenantId: string): Promise<ChatSessionWithMessages | null>
findByPatient(patientId: string, tenantId: string): Promise<ChatSession[]>
updateEndTime(sessionId: string, endTime: Date): Promise<void>
```

### MessageModel (Prisma)
```typescript
create(data: CreateMessageData): Promise<ChatMessage>
findBySession(sessionId: string, tenantId: string): Promise<ChatMessage[]>
updateDecision(messageId: string, decision: 'confirmed' | 'dismissed'): Promise<void>
```

---

## `apps/api` — PatientModule

### PatientController
```typescript
// POST /api/v1/patients
createPatient(req: AuthenticatedRequest<{}, {}, CreatePatientDto>): Promise<Response<PatientDto>>

// GET /api/v1/patients/:patientId
getPatient(req: AuthenticatedRequest<{ patientId: string }>): Promise<Response<PatientDto>>

// PUT /api/v1/patients/:patientId
updatePatient(
  req: AuthenticatedRequest<{ patientId: string }, {}, UpdatePatientDto>
): Promise<Response<PatientDto>>

// GET /api/v1/patients/:patientId/diagnoses
listDiagnoses(req: AuthenticatedRequest<{ patientId: string }>): Promise<Response<DiagnosisDto[]>>

// POST /api/v1/patients/:patientId/diagnoses
addDiagnosis(
  req: AuthenticatedRequest<{ patientId: string }, {}, CreateDiagnosisDto>
): Promise<Response<DiagnosisDto>>
```

### PatientService
```typescript
// Create a new patient record (tenant-scoped)
createPatient(data: CreatePatientDto, tenantId: string): Promise<Patient>

// Retrieve a patient (tenant-scoped)
getPatient(patientId: string, tenantId: string): Promise<Patient>

// Update patient record (tenant-scoped)
updatePatient(patientId: string, data: UpdatePatientDto, tenantId: string): Promise<Patient>

// List diagnosis history for a patient (tenant-scoped)
listDiagnoses(patientId: string, tenantId: string): Promise<Diagnosis[]>

// Add a diagnosis entry for a patient (tenant-scoped)
addDiagnosis(patientId: string, data: CreateDiagnosisDto, tenantId: string): Promise<Diagnosis>

// Retrieve structured patient context for prompt injection (internal — not exposed via HTTP)
getPatientContext(patientId: string, tenantId: string): Promise<PatientContext>
```

### PatientModel (Prisma)
```typescript
create(data: CreatePatientData): Promise<Patient>
findById(patientId: string, tenantId: string): Promise<Patient | null>
update(patientId: string, data: UpdatePatientData, tenantId: string): Promise<Patient>
```

### DiagnosisModel (Prisma)
```typescript
findByPatient(patientId: string, tenantId: string): Promise<Diagnosis[]>
create(data: CreateDiagnosisData): Promise<Diagnosis>
```

---

## `apps/api` — TenantModule

### TenantService
```typescript
// Find tenant by ID (used by AuthMiddleware)
findById(tenantId: string): Promise<Tenant | null>
```

### TenantModel (Prisma)
```typescript
findById(tenantId: string): Promise<Tenant | null>
```

---

## `apps/api` — AuthMiddleware

```typescript
// Express middleware: validates JWT, attaches req.user, enforces tenant
authenticate(req: Request, res: Response, next: NextFunction): void

// Extract Bearer token from Authorization header
extractBearerToken(authHeader: string | undefined): string | null
```

---

## `libs/ai-client`

### AiClient
```typescript
// Stream a Bedrock model invocation; yields response chunks as strings
streamInvoke(
  prompt: string,
  config: ModelConfig
): AsyncIterable<string>

// One-shot (non-streaming) invocation for testing/utility use
invoke(
  prompt: string,
  config: ModelConfig
): Promise<string>
```

### Types
```typescript
interface ModelConfig {
  modelId: string        // e.g. 'anthropic.claude-3-sonnet-20240229-v1:0'
  maxTokens: number
  temperature: number
  topP?: number
}

interface PatientContext {
  patientId: string
  currentSymptoms: string
  diagnosisHistory: DiagnosisSummary[]
}

interface DiagnosisSummary {
  date: string
  diagnosis: string
  notes?: string
}
```

---

## `apps/web` — Feature Hooks

### `features/auth`
```typescript
// Provides auth state and actions to the component tree
useAuth(): {
  doctor: Doctor | null
  isAuthenticated: boolean
  login(credentials: LoginDto): Promise<void>
  logout(): Promise<void>
}
```

### `features/chat`
```typescript
// Manages a chat session: messages, WebSocket connection, streaming state
useChatSession(sessionId: string): {
  messages: ChatMessage[]
  isStreaming: boolean
  sendMessage(text: string): void
  confirmSuggestion(messageId: string): void
  dismissSuggestion(messageId: string): void
  error: Error | null
}

// Manages the raw WebSocket connection lifecycle
useWebSocket(url: string): {
  send(data: string): void
  lastMessage: MessageEvent | null
  readyState: number
}
```

### `features/patients`
```typescript
// Fetches and caches patient list for the authenticated tenant
usePatients(): {
  patients: Patient[]
  isLoading: boolean
  error: Error | null
}

// Fetches a single patient with diagnosis history
usePatient(patientId: string): {
  patient: Patient | null
  diagnoses: Diagnosis[]
  isLoading: boolean
  error: Error | null
}
```

---

## WebSocket Message Protocol

### Client → Server
```typescript
interface SendMessageEvent {
  type: 'send_message'
  content: string          // doctor's text input
}

interface ConfirmSuggestionEvent {
  type: 'confirm_suggestion'
  messageId: string
}

interface DismissSuggestionEvent {
  type: 'dismiss_suggestion'
  messageId: string
}
```

### Server → Client
```typescript
interface StreamChunkEvent {
  type: 'stream_chunk'
  messageId: string
  chunk: string            // partial AI response token(s)
}

interface StreamCompleteEvent {
  type: 'stream_complete'
  messageId: string
  fullContent: string
  disclaimer: string       // mandatory AI disclaimer text
}

interface ErrorEvent {
  type: 'error'
  code: string
  message: string
}
```
