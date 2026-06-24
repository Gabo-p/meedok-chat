# Tech Stack Decisions — Unit: shared-libs

**Generated**: 2026-06-24  
**Unit**: shared-libs

---

## Core Stack (Confirmed from Technical Environment + Application Design)

| Concern | Decision | Rationale |
|---------|----------|-----------|
| Language | TypeScript (strict mode) | Team expertise; type safety critical for medical data |
| Runtime | Node.js (LTS) | Express + NX ecosystem |
| Monorepo tooling | NX | Required by technical environment |
| Package manager | pnpm | Faster installs, strict dependency isolation, workspace support |
| ORM | Prisma v5+ | Schema-first, auto-generated TypeScript client, excellent migration tooling |
| Database | MySQL 8 | Selected in Application Design (Q14) |

---

## libs/ai-client — AWS Bedrock

| Concern | Decision | Version | Rationale |
|---------|----------|---------|-----------|
| AWS SDK | `@aws-sdk/client-bedrock-runtime` | v3 (latest) | Required for `InvokeModelWithResponseStreamCommand` |
| Model API format | Anthropic Claude Messages API | Claude 3 Sonnet | Selected in functional design (Q6-A) |
| Streaming | `InvokeModelWithResponseStreamCommand` | v3 SDK | Native streaming; yields `AsyncIterable` of binary chunks |
| Timeout mechanism | `AbortController` | Node.js built-in | First-chunk: 5s; total stream: 120s |
| Circuit breaker | Custom implementation | — | No external library; state machine with CLOSED/OPEN/HALF_OPEN, 3 failures / 60s window / 30s half-open |
| Error classification | Custom `AiClientError` | — | `retryable: boolean` + `code: AiClientErrorCode`; two-category model |
| Logging | Pino (passed from caller) | — | No direct Pino dep in `libs/ai-client`; logger injected via constructor |

### Circuit Breaker — No External Library Decision
A lightweight custom circuit breaker is preferred over `opossum` or `cockatiel` for MVP because:
1. Scope is limited to a single outbound call (Bedrock only)
2. Avoids adding a dependency to a shared library consumed by all units
3. The required behaviour (3 failures / 60s / 30s half-open) is straightforward to implement and test

---

## libs/shared-types

| Concern | Decision | Rationale |
|---------|----------|-----------|
| Dependencies | Zero runtime dependencies | Types only — must not pull in framework code |
| Exports | Named exports from `src/index.ts` | Single barrel export for clean `@meedok/shared-types` imports |
| Validation | None in this library | JSON Schema validation is the API layer's responsibility (`ajv` in `apps/api`) |

---

## libs/domain

| Concern | Decision | Rationale |
|---------|----------|-----------|
| Dependencies | Zero runtime dependencies | Framework-free — BR-SL-14 |
| Exports | Named exports from `src/index.ts` | Single barrel export |
| TypeScript config | Extends root `tsconfig.base.json` | `strict: true` inherited |

---

## Prisma

| Concern | Decision | Version | Rationale |
|---------|----------|---------|-----------|
| Prisma ORM | `prisma` + `@prisma/client` | v5+ (latest) | Schema-first; excellent MySQL 8 support |
| Client generation | `postinstall` pnpm script | — | Auto-generates on every `pnpm install` |
| Migration strategy | `prisma migrate dev` (dev) / `prisma migrate deploy` (prod) | — | Standard Prisma workflow |
| Connection pool | Default (`num_cpus × 2 + 1`) | — | Auto-sized for MVP; tune post-launch |
| Query timeout | 5 seconds | — | Via Prisma query extension or `$transaction` timeout |
| Shadow database | Not configured for MVP | — | Manual migration review accepted (Q5-A) |
| Schema location | `prisma/schema.prisma` at workspace root | — | Single schema for all units |

---

## Testing Stack

| Concern | Decision | Version | Rationale |
|---------|----------|---------|-----------|
| Test runner | Jest | v29+ | Required by technical environment |
| PBT library | `fast-check` | v3+ | Most mature JS/TS PBT library; direct Jest integration |
| AWS SDK mocking | `@aws-sdk/client-bedrock-runtime` mocked via `jest.mock()` | — | Standard Jest module mocking |
| Coverage tool | Jest built-in (`--coverage`) | — | ≥70% threshold enforced in CI |
| PBT runs | 100 examples per property in CI | — | `fc.assert(..., { numRuns: 100, seed: 42 })` |

---

## NX Configuration

| Concern | Decision | Rationale |
|---------|----------|-----------|
| Path aliases | `@meedok/shared-types`, `@meedok/domain`, `@meedok/ai-client` | Clean imports, no relative path traversal |
| Module boundaries | `@nx/enforce-module-boundaries` ESLint rule | Prevents cross-scope imports at lint time |
| Project tags | `scope:shared`, `scope:api`, `scope:web`, `scope:infra` | Enforces dependency direction |
| Build targets | `build`, `test`, `lint` per library | Standard NX targets |
| Test target | `jest.config.ts` per library | Each library has its own Jest config extending root |

---

## Dependency Summary for shared-libs Unit

### Production dependencies
```
@aws-sdk/client-bedrock-runtime   (libs/ai-client only)
@prisma/client                    (prisma client — generated)
prisma                            (CLI — devDependency)
```

### Development / test dependencies
```
fast-check                        (PBT)
jest                              (test runner)
ts-jest                           (TypeScript Jest transformer)
@types/node
typescript
```

### Explicitly excluded
```
axios        — prohibited (technical environment deny-list)
C#, PHP      — prohibited languages
```
