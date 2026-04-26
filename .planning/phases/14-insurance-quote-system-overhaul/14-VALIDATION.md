---
phase: 14
slug: insurance-quote-system-overhaul
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-04-26
---

# Phase 14 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | No automated test framework (manual browser testing) |
| **Config file** | none |
| **Quick run command** | Manual smoke test of changed component |
| **Full suite command** | Manual browser testing of full insurance quote flow |
| **Estimated runtime** | ~10 minutes per manual test pass |

---

## Sampling Rate

- **After every task commit:** Manual smoke test of changed component
- **After every plan wave:** Full manual walkthrough of insurance quote submission + buyer comparison
- **Before `/gsd:verify-work`:** All INS-XX scenarios passing
- **Max feedback latency:** N/A (manual testing)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 14-01-01 | 01 | 1 | INS-01 | manual | n/a | n/a | pending |
| 14-01-02 | 01 | 1 | INS-02 | manual | n/a | n/a | pending |
| 14-02-01 | 02 | 1 | INS-03 | manual | n/a | n/a | pending |
| 14-02-02 | 02 | 1 | INS-04,05,06 | manual | n/a | n/a | pending |
| 14-03-01 | 03 | 2 | INS-07,08,09 | manual | n/a | n/a | pending |
| 14-03-02 | 03 | 2 | INS-10 | manual | n/a | n/a | pending |
| 14-04-01 | 04 | 2 | INS-11,12 | manual | n/a | n/a | pending |

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements. No test framework to install.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Quote entity backward compatibility | INS-01 | Data migration verification | Verify old flat-field quotes still render in InsuranceQuoteCard |
| Deal info panel shows buyer/seller names | INS-02 | UI visual verification | Login as provider, view quote request, verify names + countries visible |
| Accordion risk type sections | INS-03 | UI interaction | Open insurance form, verify Cargo required, Commercial/Political expandable |
| Commercial Risk section fields | INS-04 | Form field verification | Expand Commercial Risk, verify all fields present and validate |
| Political Risk section fields | INS-05 | Form field verification | Expand Political Risk, verify all fields and political peril checkboxes |
| Cargo/Marine % of Loss Covered | INS-06 | Form field verification | Verify dropdown added to existing ICC form section |
| Exclusions checkbox list | INS-07 | Form field verification | Verify all 9 standard exclusions + free text area |
| Conditions Precedent | INS-08 | Form field verification | Verify all 6 standard conditions + free text area |
| Claims Handling section | INS-09 | Form field verification | Verify jurisdiction, response time, contact email fields |
| Quote status Indicative/Firm | INS-10 | Form interaction | Toggle to Firm, verify binding conditions appears, submit modal shows status |
| Quote summary modal | INS-11 | UI interaction | Click Submit, verify modal shows all filled sections before confirmation |
| Buyer comparison expandable | INS-12 | UI visual verification | View buyer quotes page, verify expandable sections for commercial/political risk |

---

## Validation Sign-Off

- [x] All tasks have manual verify instructions
- [x] Sampling continuity: manual smoke test per task
- [x] No watch-mode flags
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
