---
phase: 17
slug: registration-onboarding-and-misc
status: draft
nyquist_compliant: false
wave_0_complete: false
created: 2026-04-27
---

# Phase 17 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | None — manual browser testing (no test framework in project) |
| **Config file** | none |
| **Quick run command** | `npm run dev` + browser verification |
| **Full suite command** | `npm run build` + Lighthouse accessibility audit |
| **Estimated runtime** | ~30 seconds (build) |

---

## Sampling Rate

- **After every task commit:** Manual browser smoke-test of modified page
- **After every plan wave:** Full registration + onboarding flow walkthrough
- **Before `/gsd:verify-work`:** All 9 requirements verified in browser + `npm run build` passes
- **Max feedback latency:** 30 seconds (build check)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| 17-01-01 | 01 | 1 | REG-01 | manual | Browser: /register | N/A | ⬜ pending |
| 17-01-02 | 01 | 1 | REG-02 | manual | Browser: register + check Firestore role | N/A | ⬜ pending |
| 17-01-03 | 01 | 1 | REG-03 | manual | Browser: select country, check phone prefix | N/A | ⬜ pending |
| 17-01-04 | 01 | 1 | REG-04 | smoke | Vercel preview URL check | N/A | ⬜ pending |
| 17-02-01 | 02 | 1 | REG-05 | manual | Browser: first login tour | N/A | ⬜ pending |
| 17-02-02 | 02 | 1 | REG-06 | manual | Browser: dashboard profile card | N/A | ⬜ pending |
| 17-03-01 | 03 | 2 | REG-07 | manual | Browser: FAB Support tab | N/A | ⬜ pending |
| 17-04-01 | 04 | 2 | REG-08 | manual | Browser: profile upload request | N/A | ⬜ pending |
| 17-04-02 | 04 | 2 | REG-09 | manual | Lighthouse audit | N/A | ⬜ pending |

*Status: ⬜ pending · ✅ green · ❌ red · ⚠️ flaky*

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements. No test framework needed — all items are UI/flow changes verified via browser and build checks.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Company type dropdown | REG-01 | Visual + interaction | Register page, select each company type |
| Role auto-assignment | REG-02 | Firestore + auth claims | Register as logistics, check Firestore user doc + custom claims |
| Phone code auto-fill | REG-03 | Interaction behavior | Select Turkey, verify +90 appears in phone field |
| Vercel preview fix | REG-04 | Deployment check | Deploy to Vercel preview, load /register |
| Onboarding tour | REG-05 | Multi-step overlay | First login, walk through 5 steps, verify skip persists |
| Profile completion | REG-06 | Progress calculation | Check %, fill fields, verify updates |
| Zoho SalesIQ | REG-07 | Third-party embed | Open FAB, click Support tab, verify Zoho loads |
| Upload request | REG-08 | Firestore + notification | Click request button, check admin notification |
| Accessibility | REG-09 | Audit | Run Lighthouse, check all pages for WCAG 2.1 AA |
| Cookie consent | — | Banner behavior | First visit, accept/decline, verify GA blocking |

---

## Validation Sign-Off

- [ ] All tasks have manual verify instructions
- [ ] Sampling continuity: every wave has browser walkthrough
- [ ] No watch-mode flags
- [ ] Feedback latency < 30s (build check)
- [ ] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
