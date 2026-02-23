---
phase: 02-deal-creation-and-negotiation-s1
plan: 07
subsystem: api
tags: [firebase, httpsCallable, cloud-functions, deal-negotiation]

# Dependency graph
requires:
  - phase: 02-deal-creation-and-negotiation-s1
    provides: submitCounterOffer Cloud Function expecting offer key in request.data

provides:
  - useDealActions.submitCounterOffer sends correct wire key (offer) matching Cloud Function expectation

affects:
  - 02-deal-creation-and-negotiation-s1 (VERIFICATION.md SC2 counter-offer exchange unblocked)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "httpsCallable payload key names must match exactly what the Cloud Function destructures from request.data"

key-files:
  created: []
  modified:
    - src/presentation/hooks/deal/useDealActions.js

key-decisions:
  - "Only the wire key name changes (offerData -> offer); the local variable name remains offerData for function signature clarity"

patterns-established:
  - "Wire key names in httpsCallable calls must match the Cloud Function's request.data destructuring exactly"

requirements-completed: [NEGO-01, NEGO-02, NEGO-03, NEGO-04, NEGO-05, NEGO-06, NEGO-07]

# Metrics
duration: 1min
completed: 2026-02-23
---

# Phase 02 Plan 07: Fix submitCounterOffer Parameter Name Mismatch Summary

**Fixed one-character wire key mismatch (`offerData` -> `offer`) in useDealActions.js so counter-offer data reaches the Cloud Function instead of arriving as `undefined`**

## Performance

- **Duration:** 1 min
- **Started:** 2026-02-23T03:38:12Z
- **Completed:** 2026-02-23T03:39:00Z
- **Tasks:** 1 completed
- **Files modified:** 1

## Accomplishments

- Identified the exact line causing all counter-offer submissions to fail with `invalid-argument`
- Changed `fn({ dealId, offerData, expectedRound })` to `fn({ dealId, offer: offerData, expectedRound })` on line 47
- Aligned client wire key with Cloud Function destructuring (`const { dealId, offer, expectedRound } = request.data`)
- Verified no other call sites in the codebase use `offerData` as a wire key to Cloud Functions

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix submitCounterOffer parameter name mismatch** - `687cd58` (fix)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `src/presentation/hooks/deal/useDealActions.js` - Changed `offerData` wire key to `offer: offerData` in httpsCallable payload (line 47 only)

## Decisions Made

- Only the wire key name changes; the local variable `offerData` in the function signature (line 42) is preserved for readability clarity. The distinction is: local variable = `offerData`, wire format key = `offer`.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - the fix was a single-line, single-character change that was immediately verifiable via grep.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Counter-offer submission flow is now unblocked end-to-end
- VERIFICATION.md Success Criterion 2 ("The seller can submit a counter-offer modifying any terms — both parties see the full offer history timeline") can now be tested
- Phase 02 UAT counter-offer scenarios are ready for validation

---
*Phase: 02-deal-creation-and-negotiation-s1*
*Completed: 2026-02-23*
