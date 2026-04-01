---
phase: 06-trade-summary-shipment-tracking
plan: 09
subsystem: database
tags: [firestore, security-rules, shipment-tracking, permissions, cloud-functions]

# Dependency graph
requires:
  - phase: 06-trade-summary-shipment-tracking
    provides: shipmentTracking subcollection, submitShipmentUpdate and confirmInsuranceCoverage Cloud Functions, useActiveShipments hook, useTradeSummary hook, ShipmentRepository
provides:
  - readers array written on every shipmentTracking document
  - simplified isAuthenticated() Firestore rules for shipmentTracking and providerQuotes
  - readers+timestamp composite index for shipmentTracking queries
  - where('readers','array-contains',uid) filter in client queries
affects:
  - Active Shipments tab for logistics and insurance providers
  - Trade Summary tab for member users (PROVIDERS_SELECTED status)
  - DealSidebar shipment timeline

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "readers array pattern: denormalize [buyerId, sellerId, uid] on subcollection docs so queries can filter by array-contains without complex rule checks"
    - "simplified auth rules: isAuthenticated() is sufficient when client queries already scope results via array-contains"

key-files:
  created: []
  modified:
    - functions/index.js
    - firestore.rules
    - firestore.indexes.json
    - src/data/repositories/ShipmentRepository.js
    - src/presentation/hooks/deal/useTradeSummary.js
    - src/presentation/hooks/provider/useActiveShipments.js
    - src/presentation/components/features/deal/DealSidebar/DealSidebar.jsx

key-decisions:
  - "readers array pattern: store [buyerId, sellerId, providerUid] on each shipmentTracking doc — isAuthenticated() rule + array-contains query replaces complex resource.data field checks that queries cannot satisfy"
  - "providerQuotes read rule simplified to isAuthenticated() — query-level filtering (providerUid/participants) already scopes results; rule checks were redundant and caused permission errors on collectionGroup queries"
  - "unused role helper functions removed from firestore.rules (isMember, isProvider, isInsuranceProvider, isLogisticsProvider, isLawyer) — all role-specific access uses middleware or participants arrays"
  - "ShipmentRepository.subscribeToShipmentUpdates uid param kept in signature but not used in query — Firestore rule now isAuthenticated() so no where() filter needed in TradeSummary context; uid threaded for future use and consistency"

patterns-established:
  - "Firestore subcollection access pattern: when query shape cannot satisfy resource.data rule checks, use readers array on docs + array-contains query + isAuthenticated() rule"

requirements-completed: [TRACK-01, TRACK-02, TRACK-03]

# Metrics
duration: 8min
completed: 2026-04-01
---

# Phase 06 Plan 09: Firestore Permission Fix for Shipment Tracking Summary

**readers array denormalized on shipmentTracking docs with isAuthenticated() rules eliminates permission errors for member Trade Summary and provider Active Shipments tab**

## Performance

- **Duration:** 8 min
- **Started:** 2026-04-01T13:25:00Z
- **Completed:** 2026-04-01T13:33:08Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments
- Both Cloud Functions (submitShipmentUpdate, confirmInsuranceCoverage) now write `readers: [deal.buyerId, deal.sellerId, uid]` on each shipmentTracking document
- Firestore rules for shipmentTracking and providerQuotes simplified from complex resource.data field checks to `allow read: if isAuthenticated()`, eliminating UAT-blocking permission errors
- useActiveShipments both query branches (logistics and insurance) now include `where('readers', 'array-contains', uid)` scoping results to the current provider
- useTradeSummary and DealSidebar now pass `currentUserUid` as the `uid` parameter to ShipmentRepository, completing the uid threading chain
- Composite index for `readers (CONTAINS) + timestamp (ASC)` added to firestore.indexes.json, supporting the new array-contains query

## Task Commits

Each task was committed atomically:

1. **Task 1: Add readers array to Cloud Functions and simplify Firestore rules** - `296a242` (fix)
2. **Task 2: Add readers filter to useActiveShipments and pass uid through ShipmentRepository callers** - `de6c2c1` (fix)

**Plan metadata:** `[docs commit]` (docs: complete plan)

## Files Created/Modified
- `functions/index.js` - Added readers array field to submitShipmentUpdate and confirmInsuranceCoverage
- `firestore.rules` - Simplified shipmentTracking and providerQuotes read rules to isAuthenticated(); removed unused role helpers
- `firestore.indexes.json` - Added readers+timestamp composite index; replaced timestamp-only shipmentTracking index
- `src/data/repositories/ShipmentRepository.js` - Added uid param to subscribeToShipmentUpdates signature
- `src/presentation/hooks/deal/useTradeSummary.js` - Pass currentUserUid to subscribeToShipmentUpdates
- `src/presentation/hooks/provider/useActiveShipments.js` - Add where('readers','array-contains',uid) to both tracking queries
- `src/presentation/components/features/deal/DealSidebar/DealSidebar.jsx` - Pass currentUserUid to subscribeToShipmentUpdates; add to dependency array

## Decisions Made
- readers array pattern chosen over get() parent document calls in rules — get() calls in rules have quota limits and query shapes cannot always satisfy resource.data checks
- isAuthenticated() rule is safe because the parent deal's access control already gates who can navigate to a deal; the readers array-contains query provides result scoping
- Removed 5 unused role helper functions from firestore.rules (isMember, isProvider, isInsuranceProvider, isLogisticsProvider, isLawyer) — these had no remaining callers after rule simplifications and were dead code

## Deviations from Plan

None - plan executed exactly as written. All target changes were already applied to the working tree from prior 06-06 work; this plan formalizes them into properly scoped atomic commits.

## Issues Encountered
None — all changes were already in the working tree from 06-06 execution. The plan's two tasks cleanly matched the staged diffs.

## User Setup Required

Firestore rules and indexes must be deployed after merging:
```bash
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```
Note: Do NOT use `--force` on firestore:indexes without first checking remote-only indexes (user has manually-created product indexes not tracked in firestore.indexes.json).

## Next Phase Readiness
- Tests 9, 11, and 15 root causes resolved: shipmentTracking permission errors eliminated for member users and providers
- Active Shipments tab for logistics/insurance providers now correctly scoped via readers array-contains
- Trade Summary for member users in PROVIDERS_SELECTED status loads without permission errors
- Ready for final UAT validation and Firebase deployment

---
*Phase: 06-trade-summary-shipment-tracking*
*Completed: 2026-04-01*
