# Vision Document — Answers History
<!-- Append-only. Never rewrite or truncate. -->

---

## Batch 1 — Q1–Q5 (validated 2026-06-24)

### Q1 [CORE]: Project name and type
[Answer]: B — New customer-facing product. Project name: **Meedok-chat**

### Q2 [CORE]: Primary target user
[Answer]: End users — doctors and physicians (medical professionals)

### Q3 [CORE]: Core capability
[Answer]: A chatbot for doctors/physicians that helps clarify prescriptions based on the patient's diagnosis and medical history

### Q4 [CORE]: Business problem
[Answer]: D — Cost / efficiency problem (existing process is too slow)

### Q5 [CORE]: Measurable outcome
[Answer]: Reduction in consultation time and improved clarity of results
⚠️ Caveat: no numeric target provided (e.g. "30% reduction in consultation time"). Flagged for refinement.

---

## Batch 2 — Q6–Q10 (validated 2026-06-24)

### Q6: Problem statement
[Answer]: Currently, medical consultation diagnosis time can range from minutes to hours. Meedok-chat aims to reduce diagnosis times by taking into account patient symptoms/history, providing clarity to the responsible physician, and helping validate diagnoses.

### Q7: Business drivers
[Answer]: C — Internal efficiency / cost reduction

### Q8 [CORE]: Target users and stakeholders

| Role | Description | Primary Need |
|------|-------------|--------------|
| Doctor | Manages patients, medical histories; chats with the chatbot about a patient's diagnosis and delivers results | Login, role-based permissions, patient history access, chatbot for diagnosis support |

⚠️ Caveat: "Primary Need" mixes user needs with technical requirements. Recorded as-is; technical items (login, RBAC) are captured in technical-environment.md.

### Q9: Business constraints
[Answer]: A — Budget cap (amount not specified)
⚠️ Note: Medical data handling likely implies regulatory constraints (e.g. HIPAA or local equivalent) — flagged as open question.

### Q10 [CORE]: Success metrics

| Metric | Current State | Target State | Measurement Method |
|--------|---------------|--------------|--------------------|
| Reduction in patient attention time | Manual review | Summary of patient profile | Time of attendance |

⚠️ Caveat: Target state has no numeric value. Flagged for refinement.

---

## Batch 3 — Q11–Q13 (validated 2026-06-24)

### Q11: Product vision statement
[Answer]: Every doctor using the chat to get a quick summary at hand so that medical attention is faster.

### Q12: Feature areas

- Patient History — full access to patient medical records and past prescriptions
- Diagnosis Chatbot — AI-powered chat to assist doctors in validating diagnoses
- Prescription Management — generate and track prescriptions per patient

### Q13: Future extensions (not committed)
[Answer]: B — None; the vision above represents the full considered scope.

---

## Batch 4 — Q14–Q16 (validated 2026-06-24)

### Q14 [CORE]: MVP features IN

| Feature | Rationale | Primary User Type |
|---------|-----------|-------------------|
| Diagnosis chatbot | Core value prop — the main reason doctors would use the product | Doctor |

### Q15: Non-functional priorities for MVP
[Answer]: A, B, D — Latency/responsiveness, Scalability, Security and data protection

### Q16: MVP features OUT

| Excluded Feature | Reason | Target Phase |
|------------------|--------|--------------|
| Patient-facing portal | Focus on doctors first | Phase 2 |

---

## Batch 5 — Q17–Q18 (validated 2026-06-24)

### Q17: Known risks

| Risk | Impact (High/Med/Low) | Mitigation |
|------|-----------------------|------------|
| AI hallucinations in diagnosis suggestions | High | Add disclaimer + require doctor confirmation before any prescription |

### Q18: Open questions
[Answer]: B — None; everything above is decided.

---
