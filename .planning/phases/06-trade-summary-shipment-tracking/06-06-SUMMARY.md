---
phase: 06-trade-summary-shipment-tracking
plan: "06"
subsystem: database
tags: [firestore, security-rules, react-hooks, css, print]

# Dependency graph
requires:
  - phase: 06-trade-summary-shipment-tracking
    provides: QuoteRepository, ShipmentRepository, useTradeSummary hook
provides:
  - participants array-contains filter on providerQuotes collectionGroup query (fixes member permission errors)
  - graceful error handling on all 5 useTradeSummary subscriptions (no infinite loading)
  - composite Firestore index for providerUid+status+providerType on quoteRequests
  - composite Firestore index for dealId+participants+createdAt on providerQuotes
  - print CSS with @page margin:0 to eliminate browser URL footer
affects:
  - UAT Test 9 (Trade Summary permission errors)
  - UAT Test 11 (Active Shipments empty tab)
  - UAT Test 15 (print localhost URL footer)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Optional onError callback on all repository subscription methods — callers can propagate errors to set loaded flags"
    - "useTradeSummary error handler pattern: set loaded flag + setError + checkAllLoaded() in every subscription error callback"
    - "@page margin:0 with body margin inside @media print to clip browser chrome while preserving content spacing"

key-files:
  created: []
  modified:
    - src/data/repositories/QuoteRepository.js
    - src/data/repositories/ShipmentRepository.js
    - src/data/repositories/ContractRepository.js
    - src/data/repositories/DealRepository.js
    - src/data/repositories/LegalEngagementRepository.js
    - src/presentation/hooks/deal/useTradeSummary.js
    - firestore.indexes.json
    - src/app/globals.css

key-decisions:
  - "subscribeToQuotesForDeal signature changed to (dealId, uid, callback, onError) — uid required for Firestore participants rule compliance on collectionGroup query"
  - "All 5 useTradeSummary subscription errors set their loaded flag true and call checkAllLoaded() — prevents infinite spinner when any subscription fails"
  - "providerQuotes collectionGroup needs dealId+participants+createdAt composite index — both equality and array-contains filters combined require explicit index"
  - "@page margin:0 clips browser URL footer; body margin inside @media print preserves content margins without showing localhost in footer"

patterns-established:
  - "Repository onError pattern: accept optional callback parameter, default to console.error — callers control error propagation"
  - "useTradeSummary error resilience: partial data render allowed, loading never hangs forever even when subscriptions fail"

requirements-completed: [TRACK-01, TRACK-02]

# Metrics
duration: 3min
completed: 2026-03-30
---

# Phase 06 Plan 06: Firestore Permission Fix and Print CSS Summary

**Firestore participants filter on providerQuotes collectionGroup query, graceful subscription error handling in useTradeSummary, and @page margin:0 print CSS fix eliminating browser localhost URL footer**

## Performance

- **Duration:** 3 min
- **Started:** 2026-03-30T13:38:30Z
- **Completed:** 2026-03-30T13:41:51Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments
- Added `where('participants', 'array-contains', uid)` to `subscribeToQuotesForDeal` — satisfies Firestore security rule requiring the caller's UID in the participants array, fixing permission-denied errors for member users
- Added optional `onError` callback to all 5 repository subscription methods (Deal, Contract, Quote, Shipment, Legal) — callers now control error propagation instead of swallowing errors silently
- Updated `useTradeSummary` to pass error handlers to all 5 subscriptions — each error sets its loaded flag and calls `checkAllLoaded()`, preventing the infinite loading spinner when any subscription fails
- Added `providerUid+status+providerType` composite index on `quoteRequests` collection — fixes missing index error for `useActiveShipments` query (Active Shipments tab)
- Added `dealId+participants+createdAt` composite index on `providerQuotes` COLLECTION_GROUP — required for the new dual-filter query shape
- Changed `@page { margin: 20mm 15mm }` to `@page { margin: 0 }` with `body { margin: 20mm 15mm }` inside `@media print` — clips browser URL chrome (localhost footer) while preserving content margins

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix QuoteRepository participants filter and add error callbacks to repositories** - `ef0ff53` (fix)
2. **Task 2: Fix useTradeSummary error handling, add composite index, fix print CSS** - `14896a9` (fix)

## Files Created/Modified
- `src/data/repositories/QuoteRepository.js` - Added uid param and participants array-contains filter to subscribeToQuotesForDeal; added optional onError callback
- `src/data/repositories/ShipmentRepository.js` - Added optional onError callback to subscribeToShipmentUpdates
- `src/data/repositories/ContractRepository.js` - Added optional onError callback to subscribeToContract
- `src/data/repositories/DealRepository.js` - Added optional onError callback to subscribeToDeal
- `src/data/repositories/LegalEngagementRepository.js` - Added optional onError callback to subscribeToEngagementForDeal
- `src/presentation/hooks/deal/useTradeSummary.js` - Passes currentUserUid to subscribeToQuotesForDeal; adds error handlers to all 5 subscriptions
- `firestore.indexes.json` - Added providerUid+status+providerType index (quoteRequests) and dealId+participants+createdAt index (providerQuotes COLLECTION_GROUP)
- `src/app/globals.css` - @page margin changed to 0; body margin 20mm 15mm added inside @media print

## Decisions Made
- `subscribeToQuotesForDeal` signature changed to `(dealId, uid, callback, onError)` — `uid` is now required as second argument because the Firestore `providerQuotes` rule checks `request.auth.uid in resource.data.participants`, making the filter mandatory for any non-admin read
- Optional `onError` callback added to all repository methods (not just Quote and Shipment as originally planned) because `useTradeSummary` needs graceful error handling for all 5 subscriptions and the other repositories had the same pattern gap
- Added `dealId+participants+createdAt` composite index to `providerQuotes` COLLECTION_GROUP — the new query shape (equality on dealId + array-contains on participants) requires an explicit Firestore index not covered by the existing separate indexes

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added onError callbacks to ContractRepository, DealRepository, LegalEngagementRepository**
- **Found during:** Task 2 (useTradeSummary error handling)
- **Issue:** Plan specified adding error callbacks only to QuoteRepository and ShipmentRepository, but useTradeSummary needed to pass error handlers to all 5 subscriptions. The other 3 repositories had hardcoded `console.error` with no way for callers to intercept errors.
- **Fix:** Added optional `onError` parameter to `subscribeToContract`, `subscribeToDeal`, and `subscribeToEngagementForDeal` — same pattern as Quote and Shipment repositories
- **Files modified:** ContractRepository.js, DealRepository.js, LegalEngagementRepository.js
- **Verification:** Build passes, all call sites remain backwards-compatible (onError is optional)
- **Committed in:** ef0ff53 (Task 1 commit)

**2. [Rule 2 - Missing Critical] Added dealId+participants+createdAt composite index for providerQuotes**
- **Found during:** Task 2 (firestore.indexes.json update)
- **Issue:** The new `subscribeToQuotesForDeal` query combines `where('dealId','==',dealId)` and `where('participants','array-contains',uid)` with `orderBy('createdAt','desc')`. This query shape requires a composite index not covered by the existing `dealId+createdAt` or `participants+createdAt` indexes.
- **Fix:** Added the three-field composite index to firestore.indexes.json
- **Files modified:** firestore.indexes.json
- **Verification:** Index entry present in file; build passes
- **Committed in:** 14896a9 (Task 2 commit)

---

**Total deviations:** 2 auto-fixed (both Rule 2 - missing critical)
**Impact on plan:** Both auto-fixes essential for correctness and completeness. No scope creep.

## Issues Encountered
None — all changes were straightforward data layer fixes following established repository patterns.

## User Setup Required
Firestore indexes must be deployed after this plan to fix the Active Shipments tab and providerQuotes query:
```
firebase deploy --only firestore:indexes
```
Note: Per project memory, NEVER use `--force` on firestore:indexes without first checking remote-only indexes.

## Next Phase Readiness
- Firestore permission errors for member users reading Trade Summary are fixed (Tests 9 + 15)
- Active Shipments tab will work once indexes are deployed (Test 11)
- Print CSS no longer shows localhost URL in page footer (Test 15)
- Ready for 06-07 and 06-08 gap closure plans

---
*Phase: 06-trade-summary-shipment-tracking*
*Completed: 2026-03-30*
