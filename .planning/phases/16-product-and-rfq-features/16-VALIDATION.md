---
phase: 16
slug: product-and-rfq-features
status: draft
nyquist_compliant: true
wave_0_complete: false
created: 2026-04-27
---

# Phase 16 — Validation Strategy

> Per-phase validation contract for feedback sampling during execution.

---

## Test Infrastructure

| Property | Value |
|----------|-------|
| **Framework** | No automated test framework (manual browser testing) |
| **Config file** | none |
| **Quick run command** | Manual smoke test of changed component |
| **Full suite command** | Manual browser testing of all PROD-XX scenarios |
| **Estimated runtime** | ~10 minutes per manual test pass |

---

## Sampling Rate

- **After every task commit:** Manual smoke test of changed component
- **After every plan wave:** Full manual walkthrough
- **Before `/gsd:verify-work`:** All PROD-XX scenarios passing
- **Max feedback latency:** N/A (manual testing)

---

## Per-Task Verification Map

| Task ID | Plan | Wave | Requirement | Test Type | Automated Command | File Exists | Status |
|---------|------|------|-------------|-----------|-------------------|-------------|--------|
| TBD | TBD | TBD | PROD-01-10 | manual | n/a | n/a | pending |

---

## Wave 0 Requirements

*Existing infrastructure covers all phase requirements. No test framework to install.*

---

## Manual-Only Verifications

| Behavior | Requirement | Why Manual | Test Instructions |
|----------|-------------|------------|-------------------|
| Star icon toggles favorite on product card | PROD-01 | UI interaction | Click star on product card, verify it fills/unfills, check /favorites page |
| /favorites page shows favorited products | PROD-01 | Page render | Navigate to /favorites from profile, verify starred products listed |
| Share button uses Web Share API | PROD-02 | Browser API | Click share on product detail, verify native share sheet or clipboard copy |
| Category sidebar filters products | PROD-03 | UI interaction | Click category in sidebar, verify grid filters correctly |
| Hover magnifier on product images | PROD-04 | Desktop interaction | Hover over product image, verify magnified lens appears |
| CSV upload preview + validation | PROD-05 | File upload flow | Upload CSV in admin, verify preview table with errors highlighted |
| CSV image URL download | PROD-05 | Server-side | Upload CSV with image URLs, verify images stored in Firebase Storage |
| RFQ modal no outside-click close | PROD-06 | UI interaction | Click outside RFQ modal, verify it stays open |
| QuotesSection enhanced display | PROD-07 | UI visual | View RFQ detail, verify enhanced quote details |
| Start Deal button on product detail | PROD-08 | Navigation | Click Start Deal, verify /deals/new pre-filled |
| Start Deal hidden for product owner | PROD-08 | Conditional render | View own product, verify no Start Deal button |

---

## Validation Sign-Off

- [x] All tasks have manual verify instructions
- [x] Sampling continuity: manual smoke test per task
- [x] No watch-mode flags
- [x] `nyquist_compliant: true` set in frontmatter

**Approval:** pending
