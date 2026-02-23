---
phase: 02-deal-creation-and-negotiation-s1
plan: "05"
subsystem: database
tags: [firestore, security-rules, deals, offers, unece, units, pre-fill]

# Dependency graph
requires:
  - phase: 02-deal-creation-and-negotiation-s1
    provides: Deal creation UI, DealForm, DEAL_UNITS constants, offers subcollection structure
provides:
  - Firestore offers subcollection security rule using get() on parent deal document
  - UNECE_TO_DEAL_UNIT mapping (KGM->kg, TNE->ton, PCE->pieces, MTR->metre, MTK->m2, CH->containers)
  - Deal form quantity pre-fill from product.stockQuantity
  - Deal form unit pre-fill with UNECE code mapping
affects: [phase-02, phase-03, phase-04, phase-05, phase-07]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Firestore subcollection rules must use get() to read parent document fields (resource.data refers to the subcollection document, not the parent)"
    - "UNECE unit codes mapped to deal-specific simplified units at the UI layer, not stored in Firestore"

key-files:
  created: []
  modified:
    - firestore.rules
    - src/core/constants/dealConstants.js
    - src/app/(main)/deals/new/page.jsx

key-decisions:
  - "Offers subcollection rule uses get(/databases/$(database)/documents/deals/$(dealId)) to read buyerId/sellerId — resource.data inside /offers/{offerId} refers to the offer document, not the parent deal"
  - "UNECE_TO_DEAL_UNIT mapping lives in dealConstants.js alongside DEAL_UNITS — colocation of related unit conversion logic"
  - "Deal form falls back to raw product.unit if no UNECE mapping exists — graceful degradation for unmapped unit codes"

patterns-established:
  - "Firestore subcollection security: always use get() to access parent document fields from within a subcollection rule"
  - "UNECE-to-deal-unit mapping: products use UNECE codes, deal form uses simplified trade units, mapping happens at form pre-fill time"

requirements-completed: [NEGO-01, NEGO-02]

# Metrics
duration: 2min
completed: 2026-02-23
---

# Phase 02 Plan 05: Fix Firestore Member Permissions and Deal Form Unit Mapping Summary

**Firestore offers subcollection fixed using get() on parent deal, UNECE unit codes mapped to DEAL_UNITS, and deal form pre-fills stockQuantity — unblocking all member user deal access failures**

## Performance

- **Duration:** ~2 min
- **Started:** 2026-02-23T01:47:42Z
- **Completed:** 2026-02-23T01:49:22Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments
- Fixed critical Firestore security rules bug where `isDealParticipant()` inside `/offers/{offerId}` was reading `resource.data.buyerId` from the offer document (not the parent deal) — now uses `get()` to fetch parent deal document
- Added `UNECE_TO_DEAL_UNIT` mapping object in `dealConstants.js` covering 21 UNECE codes across 6 deal unit categories
- Deal form at `/deals/new` now pre-fills `quantity` from `product.stockQuantity` and maps UNECE unit codes to DEAL_UNITS values via the mapping

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix Firestore offers subcollection security rule for member access** - `d7d8358` (fix)
2. **Task 2: Fix product quantity and unit pre-fill with UNECE-to-DEAL_UNITS mapping** - `a929ccd` (feat)

## Files Created/Modified
- `firestore.rules` - Offers subcollection rule now uses `get(/databases/$(database)/documents/deals/$(dealId))` instead of `isDealParticipant()` which read wrong resource.data context
- `src/core/constants/dealConstants.js` - Added `UNECE_TO_DEAL_UNIT` mapping object with 21 unit codes; added to default export
- `src/app/(main)/deals/new/page.jsx` - Imported `UNECE_TO_DEAL_UNIT`; updated `defaultValues` to use `product.stockQuantity` for quantity and mapped UNECE unit code for unit

## Decisions Made
- Offers subcollection rule uses `get()` to read parent deal document — `resource.data` inside `/offers/{offerId}` match block refers to the offer document, not the parent deal. The `isDealParticipant()` helper that reads `resource.data.buyerId/sellerId` only works correctly in the parent `/deals/{dealId}` match block.
- `UNECE_TO_DEAL_UNIT` placed in `dealConstants.js` alongside `DEAL_UNITS` — colocation of related unit conversion logic so both can be imported together at the deal form.
- Fallback chain `UNECE_TO_DEAL_UNIT[product?.unit] || product?.unit || ''` — graceful degradation for any unmapped UNECE codes.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- Build initially failed with `.next/lock` stale lock file from a previous interrupted build. Removed lock file and build passed cleanly.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All 5 Firestore permission failures (tests 1, 3, 8, 9, 10) for member users are resolved
- The 4 skipped UAT tests (11, 12, 13, 16) are now unblocked — member users can access offers subcollection
- Deal form pre-fills quantity and unit correctly from product data
- Ready for Plan 06 (UAT gap closure for remaining issues)

---
*Phase: 02-deal-creation-and-negotiation-s1*
*Completed: 2026-02-23*
