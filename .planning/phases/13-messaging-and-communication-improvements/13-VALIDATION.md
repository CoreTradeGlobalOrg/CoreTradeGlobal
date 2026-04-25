---
phase: 13
slug: messaging-and-communication-improvements
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-04-25
---

# Phase 13 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | No automated test framework (manual browser testing) |
| **Config file** | none |
| **Quick run command** | Manual smoke test of changed component |
| **Full suite command** | Full manual walkthrough of all MSG-XX scenarios |
| **Estimated runtime** | ~5 minutes per manual test pass |

---

## Sampling Rate

- **After every task commit:** Manual smoke test of changed component
- **After every plan wave:** Full manual walkthrough of all MSG-XX scenarios
- **Before `/gsd:verify-work`:** All MSG-XX scenarios passing
- **Max feedback latency:** N/A (manual testing)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 13-01-01 | 01 | 1 | MSG-01 | manual | n/a | n/a | pending |
| 13-01-02 | 01 | 1 | MSG-02 | manual | n/a | n/a | pending |
| 13-01-03 | 01 | 1 | MSG-03 | manual | n/a | n/a | pending |
| 13-02-01 | 02 | 1 | MSG-04 | manual | n/a | n/a | pending |
| 13-02-02 | 02 | 1 | MSG-05 | manual | n/a | n/a | pending |
| 13-03-01 | 03 | 2 | MSG-06 | manual | n/a | n/a | pending |
| 13-03-02 | 03 | 2 | MSG-07 | manual | n/a | n/a | pending |
| 13-03-03 | 03 | 2 | MSG-08 | manual | n/a | n/a | pending |
| 13-04-01 | 04 | 1 | MSG-09 | manual | n/a | n/a | pending |
| 13-04-02 | 04 | 1 | MSG-10 | manual | n/a | n/a | pending |
| 13-04-03 | 04 | 1 | MSG-11 | manual | n/a | n/a | pending |

*Status: pending / green / red / flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements. No test framework to install.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Profile card renders in FAB widget | MSG-01 | UI visual verification | Open FAB chat, verify avatar, name, company, country, role badge visible |
| Profile card renders on /messages page | MSG-02 | UI visual verification | Open /messages, select conversation, verify profile card at top |
| Profile card click navigates to profile | MSG-03 | Navigation verification | Click profile card, verify redirect to /profile/[userId] |
| FAB hidden on /messages | MSG-04 | Route-conditional rendering | Navigate to /messages, verify FAB not visible |
| Notification click routes correctly | MSG-05 | Context-dependent navigation | Click message notification on /messages page, verify conversation opens inline |
| Provider quote chat sidebar on buyer page | MSG-06 | UI layout verification | Open /deals/[dealId]/quotes as buyer, verify chat sidebar visible |
| Provider quote chat sidebar on provider page | MSG-07 | UI layout verification | Open /provider/quotes/[requestId] as provider, verify chat sidebar visible |
| Shared conversation thread | MSG-08 | Data verification | Send message as provider, verify buyer sees same message and vice versa |
| Insurance dashboard labels | MSG-09 | Text verification | Login as insurance_provider, verify "Insurance Requests" and "Active Policies" tabs |
| Logistics dashboard labels | MSG-10 | Text verification | Login as logistics_provider, verify "Logistics Requests" and "Active Shipments" tabs |
| Kanban column labels | MSG-11 | Text verification | Verify insurance columns: New Inquiries, Quoted, Declined, Policy Active; logistics: New Requests, Quoted, Declined, Shipment Active |

---

## Validation Sign-Off

- [x] All tasks have manual verify instructions
- [x] Sampling continuity: manual smoke test per task
- [x] No watch-mode flags
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
