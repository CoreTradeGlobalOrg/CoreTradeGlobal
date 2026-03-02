---
phase: 04-provider-portals-and-insurance-logistics-quotes-s3
plan: "01"
subsystem: database
tags: [firestore, quote, entity, repository, onSnapshot, di-container]

# Dependency graph
requires:
  - phase: 03-contract-agreement-s2
    provides: CONTRACT_APPROVED deal status and Contract entity as the gateway trigger for Phase 4 quote distribution

provides:
  - quoteConstants.js with QUOTE_REQUEST_STATUS, QUOTE_STATUS, ICC_COVERAGE, COVERAGE_SCOPE, TRANSPORT_MODE, CONTAINER_TYPE, CAPABILITY_TAGS, QUOTE_VALIDITY_OPTIONS, QUOTE_REQUEST_DEADLINE_HOURS
  - QuoteRequest entity with fromFirestore, kanban column derivation, and status helpers
  - Quote entity with fromFirestore (all Timestamp fields), isExpired(), isActive(), getPrice()
  - QuoteRequestRepository with subscribeToRequestsForProvider and subscribeToRequestsForDeal
  - QuoteRepository with subscribeToQuotesForRequest and subscribeToQuotesForDeal (providerQuotes subcollection)
  - PROVIDERS_SELECTED deal status with CONTRACT_APPROVED transition
  - Deal.isProvidersSelected() and Deal.isAwaitingQuotes() semantic helpers
  - DI container singletons: getQuoteRequestRepository(), getQuoteRepository()
  - DealCard PROVIDERS_SELECTED badge (blue color family)

affects:
  - 04-02: Cloud Functions plan builds broadcastQuoteRequests against QuoteRequest/Quote entities and quoteConstants
  - 04-03: Provider portal kanban uses QuoteRequestRepository.subscribeToRequestsForProvider and QuoteRequest.getKanbanColumn()
  - 04-04: Buyer quotes page uses QuoteRepository.subscribeToQuotesForDeal and Quote.isActive()/getPrice()

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Entity fromFirestore with Timestamp.toDate?.() pattern (consistent with Deal.js, Contract.js)
    - Lazy singleton DI container registration (consistent with ContractRepository pattern)
    - onSnapshot repositories returning unsubscribe functions for component cleanup
    - providerQuotes subcollection name to avoid collision with requests/{id}/quotes

key-files:
  created:
    - src/core/constants/quoteConstants.js
    - src/domain/entities/QuoteRequest.js
    - src/domain/entities/Quote.js
    - src/data/repositories/QuoteRequestRepository.js
    - src/data/repositories/QuoteRepository.js
  modified:
    - src/core/constants/dealConstants.js
    - src/core/constants/collections.js
    - src/domain/entities/Deal.js
    - src/core/di/container.js
    - src/presentation/components/features/deal/DealCard/DealCard.jsx

key-decisions:
  - "providerQuotes subcollection name (not quotes) avoids collision with existing requests/{id}/quotes subcollection per Research Pitfall 7"
  - "PROVIDERS_SELECTED is terminal for the full deal lifecycle; CONTRACT_APPROVED is now a Phase 4 gateway (not final terminal)"
  - "Deal.isAwaitingQuotes() is a semantic alias for isContractApproved() — improves Phase 4 UI code readability without changing behavior"
  - "Quote entity uses null defaults for type-specific fields — single class covers both insurance and logistics quote shapes"
  - "collectionGroup(providerQuotes) with dealId filter enables buyer view across all requests; requires composite Firestore index"

patterns-established:
  - "Entity pattern: constructor with null defaults for optional fields + static fromFirestore with Timestamp.toDate?.() for all Date fields"
  - "Repository pattern: constructor(firestoreDataSource) + onSnapshot methods returning unsubscribe + error logging"
  - "DI pattern: let repo = null; getRepo() { if (!repo) repo = new Repo(this.getFirestoreDataSource()); return repo; } + _reset() null assignment"

requirements-completed: [QUOTE-03, PORTAL-05]

# Metrics
duration: 4min
completed: 2026-03-02
---

# Phase 4 Plan 01: Data Model Layer Summary

**Quote data model for insurance/logistics provider portals: quoteConstants, QuoteRequest+Quote entities, QuoteRequest+Quote repositories, PROVIDERS_SELECTED deal status extension, and DI registration**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-02T16:09:37Z
- **Completed:** 2026-03-02T16:13:20Z
- **Tasks:** 2
- **Files modified:** 10 (5 created, 5 modified)

## Accomplishments
- Created complete data model layer for Phase 4: all 9 quote constant groups, QuoteRequest and Quote entities with full Firestore adapter methods, and real-time repositories
- Extended deal status machine with PROVIDERS_SELECTED terminal state and CONTRACT_APPROVED->PROVIDERS_SELECTED transition
- Registered QuoteRequestRepository and QuoteRepository as lazy DI singletons; DealCard renders new blue badge for providers_selected status

## Task Commits

Each task was committed atomically:

1. **Task 1: Quote constants, entities, and repositories** - `9668f5f` (feat)
2. **Task 2: Deal status extension, collections update, DI registration, DealCard badge** - `9e3d26e` (feat)

**Plan metadata:** (docs commit — follows)

## Files Created/Modified

### Created
- `src/core/constants/quoteConstants.js` - QUOTE_REQUEST_STATUS, QUOTE_STATUS, ICC_COVERAGE, COVERAGE_SCOPE, TRANSPORT_MODE, CONTAINER_TYPE, CAPABILITY_TAGS, QUOTE_VALIDITY_OPTIONS, QUOTE_REQUEST_DEADLINE_HOURS
- `src/domain/entities/QuoteRequest.js` - QuoteRequest entity: fromFirestore, isPending/isQuoted/isDeclined/isSelected, isExpiredDeadline, getKanbanColumn (newRequests/quoted/declined/selected), isInsurance/isLogistics
- `src/domain/entities/Quote.js` - Quote entity: fromFirestore with all Timestamp conversions, isExpired(), isActive(), getPrice(), isInsurance/isLogistics, null defaults for type-specific fields
- `src/data/repositories/QuoteRequestRepository.js` - subscribeToRequestsForProvider (provider kanban), subscribeToRequestsForDeal (buyer overview), both with onSnapshot + unsubscribe
- `src/data/repositories/QuoteRepository.js` - subscribeToQuotesForRequest (per-request subcollection), subscribeToQuotesForDeal (collectionGroup for buyer comparison), providerQuotes subcollection name

### Modified
- `src/core/constants/dealConstants.js` - Added PROVIDERS_SELECTED status; CONTRACT_APPROVED now transitions to PROVIDERS_SELECTED (was terminal empty array)
- `src/core/constants/collections.js` - Added QUOTE_REQUESTS and PROVIDER_QUOTES to COLLECTIONS and SUBCOLLECTIONS
- `src/domain/entities/Deal.js` - isTerminal() includes PROVIDERS_SELECTED; added isProvidersSelected() and isAwaitingQuotes() helpers
- `src/core/di/container.js` - Imported QuoteRequestRepository and QuoteRepository; added getQuoteRequestRepository() and getQuoteRepository() lazy singletons; added both to _reset()
- `src/presentation/components/features/deal/DealCard/DealCard.jsx` - Added PROVIDERS_SELECTED to STATUS_CONFIG with blue color family badge

## Decisions Made

- **providerQuotes subcollection name:** Using `providerQuotes` instead of `quotes` to avoid collision with the existing `requests/{id}/quotes` subcollection (Research Pitfall 7). `SUBCOLLECTIONS.PROVIDER_QUOTES` constant documents this decision.
- **PROVIDERS_SELECTED terminality:** Now added to `isTerminal()` in Deal.js alongside CONTRACT_APPROVED. CONTRACT_APPROVED remains in isTerminal() because it is terminal for the negotiation flow, even though it is also a gateway for Phase 4 quote distribution.
- **Quote entity design:** Single class handles both insurance and logistics shapes. Type-specific fields default to null. `getPrice()` returns the correct price field based on `providerType`. This avoids an InsuranceQuote/LogisticsQuote inheritance hierarchy with minimal complexity cost.
- **collectionGroup for buyer view:** `subscribeToQuotesForDeal` uses `collectionGroup('providerQuotes')` with `where('dealId', '==', dealId)`. This requires a composite Firestore index on `providerQuotes: dealId + createdAt` — index deployment needed before production use.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None — build compiled successfully with no errors after all modifications.

## User Setup Required

None - no external service configuration required. The composite Firestore index for `collectionGroup('providerQuotes')` will be needed before production deployment; this is documented in the QuoteRepository source comment.

## Next Phase Readiness

- All data model contracts established — Plan 02 (Cloud Functions) can build `broadcastQuoteRequests` against QuoteRequest entity and quoteConstants
- Plan 03 (Provider Portal) can use QuoteRequestRepository and QuoteRequest.getKanbanColumn()
- Plan 04 (Buyer Quotes Page) can use QuoteRepository and Quote.isActive()/getPrice()
- `npm run build` passes — no regressions introduced

---
*Phase: 04-provider-portals-and-insurance-logistics-quotes-s3*
*Completed: 2026-03-02*
