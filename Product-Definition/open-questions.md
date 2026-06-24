# Open Questions for AI-DLC

Pre-declared ambiguities and unresolved decisions surfaced during definition.
AI-DLC should address these early in Requirements Analysis.

Last generated: 2026-06-24T00:00:00Z

---

## Business (Vision) open questions

### OQ-B-1: No numeric success target defined
- **Source section**: Success Metrics
- **Question**: What is the specific measurable target for consultation time reduction?
- **User's stated reasoning**: "Reducción del tiempo de consulta y claridad de resultados" — directional but no number given.
- **Suggested resolution path**: Define a baseline (e.g. current average consultation time) and agree on a target percentage or absolute reduction before Requirements Analysis. This becomes the primary KPI for launch readiness.

### OQ-B-2: Regulatory / compliance scope not confirmed
- **Source section**: Business Constraints
- **Question**: Does Meedok-chat need to comply with a medical data regulation (e.g. HIPAA, NOM-024-SSA3 in Mexico, GDPR, or equivalent)?
- **User's stated reasoning**: Only a budget cap was stated as a hard constraint. Patient medical history handling almost certainly triggers data-privacy regulations.
- **Suggested resolution path**: Identify the jurisdiction(s) where the product will operate and confirm which regulation applies. This directly impacts data storage design, audit logging, consent flows, and breach-notification procedures.

---

## Technical (Technical Environment) open questions

### OQ-T-1: Prohibited language rationale not specified
- **Source section**: Programming Languages — Prohibited
- **Question**: What is the reason C# and PHP are prohibited?
- **User's stated reasoning**: Both were listed as prohibited but the "Reason" column was left blank.
- **Suggested resolution path**: Confirm the rationale (team expertise, platform direction, licensing) so AI-DLC can correctly reject suggestions involving those languages and explain why to future contributors.

### OQ-T-2: Mixed service communication — edge map missing
- **Source section**: Architecture and Patterns
- **Question**: Which specific service edges use synchronous (REST) communication vs. asynchronous messaging, and which async pattern applies (queue, pub/sub)?
- **User's stated reasoning**: T15 was answered "D — Mix" with no further detail.
- **Suggested resolution path**: At minimum, define whether the chatbot ↔ backend edge and the backend ↔ database edge are sync or async. This affects API design, error handling strategy, and infrastructure choices.

### OQ-T-3: ISO 27001 posture verification
- **Source section**: Security
- **Question**: Do the chosen security controls (JWT auth, environment-variable secrets, EC2 deployment) satisfy ISO 27001 audit requirements?
- **User's stated reasoning**: ISO 27001 was selected as the compliance framework, but the security choices (env-var secrets, no dedicated secrets manager) may not meet ISO 27001 control A.9/A.10 requirements under audit.
- **Suggested resolution path**: Review ISO 27001 Annex A controls against the current security stack. Specifically, evaluate whether env-var secrets injection qualifies as a compliant secrets management approach or whether AWS Secrets Manager / Parameter Store is required.

### OQ-T-4: Function/module pattern — no concrete example
- **Source section**: Example Code Patterns
- **Question**: What does a canonical Express module look like in this codebase? (error handling, logging, DI conventions)
- **User's stated reasoning**: T27 stated "logging" as the convention but no snippet or file path was provided.
- **Suggested resolution path**: Provide one representative service file from an existing project, or agree to use Express community conventions (middleware-based error handling, Winston/Pino logging) as the default.

### OQ-T-5: Test pattern — no example provided
- **Source section**: Example Code Patterns
- **Question**: What does a canonical Jest test look like? (describe/it structure, setup/teardown, mocking conventions)
- **User's stated reasoning**: T28 was left blank.
- **Suggested resolution path**: Confirm Jest describe/it/expect defaults are acceptable, or provide one example test file.

### OQ-T-6: Infrastructure-as-code tooling undefined
- **Source section**: Example Code Patterns
- **Question**: What IaC tool will manage AWS infrastructure (CDK, Terraform, CloudFormation, or other)?
- **User's stated reasoning**: T29 selected "A — paste snippet" but no snippet was provided.
- **Suggested resolution path**: Select the IaC tool before architecture design begins. Given the team's TypeScript familiarity, AWS CDK is a natural fit but must be confirmed.

---

## Cross-role contradictions

### CONTRADICTION-1: Medical data security vs. env-var secrets
- **Business signal**: Vision requires handling sensitive patient medical records and history (OQ-B-2 flags likely HIPAA/regulatory scope).
- **Technical signal**: Secrets management is environment variables injected by the deployment system (T20-C), which is generally insufficient for regulated medical data environments.
- **Contradiction**: If a medical data regulation (HIPAA, ISO 27001 A.10, etc.) applies, environment-variable secrets may not satisfy audit requirements for PHI (Protected Health Information) access credentials.
- **Resolution required**: Confirm regulatory scope (OQ-B-2) first, then re-evaluate T20 — likely upgrade to AWS Secrets Manager / Parameter Store.

### CONTRADICTION-2: Security priority (MVP) vs. compliance framework undefined
- **Business signal**: Q15 lists "Security and data protection" as a top MVP non-functional priority.
- **Technical signal**: ISO 27001 is the stated compliance framework, but no compliance scope or audit timeline was provided.
- **Contradiction**: Prioritising security in the MVP without a defined compliance scope risks either over-engineering controls or building a system that fails its first audit.
- **Resolution required**: Define the compliance scope (jurisdiction, regulation, audit timeline) before Requirements Analysis so security controls are sized correctly from the start.

---

## Summary

Total open questions: **8** (Business: 2, Technical: 6)
Contradictions flagged: **2**

AI-DLC should load this file during Requirements Analysis and resolve each entry
before proceeding to User Stories or Application Design.
