---
phase: 15
slug: deal-and-trade-flow-enhancements
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-26
---

# Phase 15 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None — manual browser testing (no test framework in project) |
| **Config file** | none |
| **Quick run command** | `npm run dev` + browser verification |
| **Full suite command** | `npm run build` (build-time type/lint check) |
| **Estimated runtime** | ~30 seconds (build) |

---

## Sampling Rate

- **After every task commit:** Manual browser smoke-test of modified page
- **After every plan wave:** Full deal flow walkthrough (negotiation → contract → quotes → summary)
- **Before `/gsd:verify-work`:** All 16 backlog items verified in browser + `npm run build` passes
- **Max feedback latency:** 30 seconds (build check)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 15-01-01 | 01 | 1 | CONTRACT-UX | manual | Browser: /deals/[id]/contract | N/A | ⬜ pending |
| 15-01-02 | 01 | 1 | CONTRACT-PROGRESS | manual | Browser: /deals/[id]/contract | N/A | ⬜ pending |
| 15-01-03 | 01 | 1 | CONTRACT-EXPAND | manual | Browser: /deals/[id]/contract | N/A | ⬜ pending |
| 15-02-01 | 02 | 1 | LAWYER-ALL-PAGES | manual | Browser: each deal stage page | N/A | ⬜ pending |
| 15-02-02 | 02 | 1 | LAWYER-SLIM | manual | Browser: click dismiss | N/A | ⬜ pending |
| 15-03-01 | 03 | 2 | SKIP-QUOTES | manual | Browser: /deals/[id]/quotes | N/A | ⬜ pending |
| 15-03-02 | 03 | 2 | CHAT-BUTTONS | manual | Browser: TradeSummary tab | N/A | ⬜ pending |
| 15-04-01 | 04 | 2 | DEAL-ID | manual | Browser: /deals/[id] | N/A | ⬜ pending |
| 15-04-02 | 04 | 2 | PDF-DOWNLOAD | manual | Browser: /deals/[id] | N/A | ⬜ pending |
| 15-05-01 | 05 | 3 | DATEPICKER | manual | Grep: type="date" returns 0 | N/A | ⬜ pending |
| 15-05-02 | 05 | 3 | NUM-FOCUS | manual | Browser: click number input | N/A | ⬜ pending |
| 15-05-03 | 05 | 3 | VALIDATION | manual | Submit forms, check messages | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements. No test framework needed — all items are UI changes verified via browser and build checks.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Yellow highlight on unaccepted clauses | CONTRACT-UX | Visual styling — no test framework | Navigate to contract page, verify yellow bg on unchecked clauses, green check on accepted |
| LegalBanner on all trade pages | LAWYER-ALL-PAGES | Multi-page visual check | Navigate negotiation, contract, quotes, summary — verify banner on each |
| Skip quotes flow | SKIP-QUOTES | Interactive flow | Click "Skip — I'll arrange my own", verify "Not arranged via platform" state, test undo |
| Chat buttons open FAB | CHAT-BUTTONS | Integration with messaging context | Click each Chat button on TradeSummary, verify correct conversation opens |
| DatePicker accent colors | DATEPICKER | Visual styling per context | Check product-related date inputs (gold), RFQ-related (blue) |
| Number input auto-select | NUM-FOCUS | Browser interaction behavior | Click into each number input field, verify text is selected |
| Validation locale | VALIDATION | Language verification | Submit empty forms, verify all error messages are English |

---

## Validation Sign-Off

- [ ] All tasks have manual verify instructions
- [ ] Sampling continuity: every wave has browser walkthrough
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s (build check)
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
