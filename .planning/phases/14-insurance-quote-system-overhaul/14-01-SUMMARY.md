---
phase: 14-insurance-quote-system-overhaul
plan: 01
subsystem: api
tags: [insurance, quote, firestore, cloud-functions, constants, entity]

# Dependency graph
requires:
  - phase: 04-provider-quote-system
    provides: "Quote entity, quoteConstants.js, broadcastQuoteRequests and submitQuote CFs"

provides:
  - "8 new insurance constant arrays in quoteConstants.js (STANDARD_EXCLUSIONS, STANDARD_CONDITIONS_PRECEDENT, CLAIMS_JURISDICTION, CLAIMS_RESPONSE_TIME, PREMIUM_PAYMENT_TERMS, POLITICAL_PERILS, COMMERCIAL_COVERAGE_BASIS, QUOTE_BINDING_STATUS)"
  - "Quote entity extended with nested sub-object fields (cargoMarine, commercialRisk, politicalRisk, exclusions, conditionsPrecedent, claimsHandling, premiumAdditions, quoteStatus, messageToBuyer)"
  - "Backward-compatible fromFirestore() that populates flat fields from cargoMarine for legacy doc support"
  - "4 new Quote helper methods: isFirmQuote(), isIndicativeQuote(), hasCommercialRisk(), hasPoliticalRisk()"
  - "broadcastQuoteRequests CF denormalizes buyerName, buyerCountry, sellerName, sellerCountry into both dealSnapshots"
  - "submitQuote CF validates nested cargoMarine (with backward compat), commercialRisk, politicalRisk, claimsHandling"

affects:
  - 14-02-insurance-quote-form
  - 14-03-insurance-quote-card
  - 14-04-deal-info-panel

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Nested sub-object fields on entity with null defaults — single entity class covers both old flat-field docs and new nested docs"
    - "Backward compat in fromFirestore: new nested docs populate flat field accessors via cargoMarine overlap — getPrice() and isInsurance() continue to work unchanged"
    - "Server-side default for quoteStatus — submitQuote CF sets indicative when client omits it"

key-files:
  created: []
  modified:
    - src/core/constants/quoteConstants.js
    - src/domain/entities/Quote.js
    - functions/index.js

key-decisions:
  - "[14-01]: Quote entity uses null defaults for Phase 14 nested sub-objects — old flat-field quotes remain fully functional; backward compat in fromFirestore() bridges both shapes"
  - "[14-01]: submitQuote CF uses cargo = quoteData.cargoMarine || quoteData pattern — single validation block supports old flat format and new nested format without branching"
  - "[14-01]: buyerName/buyerCountry/sellerName/sellerCountry added to BOTH insuranceDealSnapshot and logisticsDealSnapshot — both provider types benefit from counterparty identity; logistics still does NOT see price"
  - "[14-01]: terms field added to insuranceDealSnapshot only — payment terms text is deal-price-adjacent context for insurance providers"
  - "[14-01]: quoteStatus defaults to indicative server-side when absent — ensures all new Firestore quote docs have a binding status field"

patterns-established:
  - "Backward-compat entity update pattern: add new fields as null in constructor, assign from Firestore in fromFirestore(), provide legacy accessor bridging via conditional block"

requirements-completed: [INS-01, INS-02, INS-03, INS-04, INS-05, INS-06, INS-07, INS-08, INS-09, INS-10]

# Metrics
duration: 2min
completed: 2026-04-22
---

# Phase 14 Plan 01: Insurance Quote System Overhaul — Data Foundation Summary

**Nested insurance risk sub-objects on Quote entity, 8 new dropdown/checkbox constants, and buyer/seller denormalization in broadcastQuoteRequests with Phase 14 submitQuote validation**

## Performance

- **Duration:** 2 minutes
- **Started:** 2026-04-22T10:39:58Z
- **Completed:** 2026-04-22T10:42:00Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Added 8 new constant arrays to `quoteConstants.js` covering all Phase 14 form dropdowns/checkboxes (exclusions, conditions precedent, jurisdictions, response times, payment terms, political perils, coverage basis options, binding status)
- Extended `Quote` entity with 9 nested sub-object fields (cargoMarine, commercialRisk, politicalRisk, exclusions, conditionsPrecedent, claimsHandling, premiumAdditions, quoteStatus, messageToBuyer) with backward-compatible `fromFirestore()` bridging
- Added 4 Phase 14 helper methods: `isFirmQuote()`, `isIndicativeQuote()`, `hasCommercialRisk()`, `hasPoliticalRisk()`
- Updated `broadcastQuoteRequests` CF to fetch buyer/seller user docs and denormalize buyerName, buyerCountry, sellerName, sellerCountry into both insurance and logistics dealSnapshots; added `terms` field to insurance snapshot
- Updated `submitQuote` CF with backward-compatible cargoMarine validation, optional commercialRisk/politicalRisk/claimsHandling validation, and server-side quoteStatus default

## Task Commits

Each task was committed atomically:

1. **Task 1: Add insurance constants and extend Quote entity with nested sub-objects** - `9ebba24` (feat)
2. **Task 2: Update broadcastQuoteRequests and submitQuote Cloud Functions** - `0810455` (feat)

**Plan metadata:** See final docs commit (docs)

## Files Created/Modified

- `src/core/constants/quoteConstants.js` - Added 8 new constant arrays/objects; updated default export
- `src/domain/entities/Quote.js` - Added nested sub-object fields in constructor, Phase 14 assignment block in fromFirestore(), backward compat bridge, 4 new helper methods
- `functions/index.js` - Updated broadcastQuoteRequests to denormalize buyer/seller info; updated submitQuote insurance validation for nested cargoMarine format and optional risk sub-objects

## Decisions Made

- Quote entity uses null defaults for Phase 14 nested sub-objects — single class covers both old flat-field docs and new nested docs without a migration
- `submitQuote` CF uses `const cargo = quoteData.cargoMarine || quoteData` — single validation path supports both old flat format and new Phase 14 nested format
- `buyerName`/`buyerCountry`/`sellerName`/`sellerCountry` added to BOTH dealSnapshots — both provider types benefit from counterparty identity; logistics still does NOT see price (PORTAL-05 maintained)
- `quoteStatus` defaults to `{ status: 'indicative' }` server-side — ensures all new Firestore docs have a binding status without requiring client to send it

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required. Cloud Functions source is updated but not deployed (per project convention: deployment is manual).

## Next Phase Readiness

- All downstream UI plans (14-02 insurance quote form, 14-03 quote card, 14-04 deal info panel) can now consume the new constants and entity fields
- `Quote.fromFirestore()` is backward compatible — existing quotes in Firestore continue to work
- Cloud Functions must be manually deployed before the new validation logic takes effect in production

---
*Phase: 14-insurance-quote-system-overhaul*
*Completed: 2026-04-22*
