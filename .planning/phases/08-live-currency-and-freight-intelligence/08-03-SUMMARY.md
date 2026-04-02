---
phase: 08-live-currency-and-freight-intelligence
plan: 03
subsystem: ui
tags: [freight, freightos, estimator, deal, sidebar, cors, proxy, react, lucide]

# Dependency graph
requires:
  - phase: 08-01
    provides: useLiveCurrency singleton hook and convertAmount helper for USD-to-deal-currency conversion
  - phase: 08-02
    provides: CurrencyConvertPanel already integrated in DealSidebar; FreightEstimatorWidget goes below it
provides:
  - FreightEstimatorWidget collapsible component in DealSidebar with on-demand Freightos estimates
  - useFreightEstimate hook with client-side-first fetch and CORS proxy fallback
  - freightConstants.js with loadtypes, transport modes, chargeable weight helpers
  - /api/freight/estimate proxy route as CORS fallback with in-memory rate limiter
affects: [deal sidebar, deal page, any future freight or logistics feature]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Client-side-first external API fetch with TypeError-triggered CORS proxy fallback"
    - "On-demand fetch hook (no auto-run) — user must click to trigger estimate"
    - "Defensive Freightos response parsing with optional chaining (Pitfall 5)"
    - "In-memory server-side rate limiter for proxy route (counter + window reset)"

key-files:
  created:
    - src/core/constants/freightConstants.js
    - src/presentation/hooks/intelligence/useFreightEstimate.js
    - src/presentation/components/features/deal/DealSidebar/FreightEstimatorWidget.jsx
    - src/app/api/freight/estimate/route.js
  modified:
    - src/presentation/components/features/deal/DealSidebar/DealSidebar.jsx

key-decisions:
  - "Client-side direct fetch first; CORS proxy fallback only on TypeError — preserves per-user IP rate budget vs shared server IP"
  - "INTEL-04 tradeoff comment in both hook and proxy route — explicit documentation of rate limit impact when proxy is used"
  - "Chargeable weight = max(actual, volumetric) using 5000 cm3/kg divisor — industry standard; Freightos handles mode-specific divisors internally"
  - "Load type auto-detected via suggestLoadType() heuristic, shown as read-only badge — user cannot manually override (reduces form complexity)"
  - "FreightEstimatorWidget available on all deal stages per user decision from INTEL-03"
  - "Freightos attribution link required by ToS — rendered below results as per plan"

patterns-established:
  - "Client-first external API pattern: direct fetch -> TypeError catch -> proxy retry with console.warn"
  - "On-demand hook pattern: no useEffect polling, only imperative fetchEstimate() call on user action"

requirements-completed: [INTEL-03, INTEL-04, INTEL-05]

# Metrics
duration: 4min
completed: 2026-04-02
---

# Phase 08 Plan 03: Freight Estimator Widget Summary

**Collapsible freight estimator in DealSidebar using Freightos public API: client-side-first with CORS proxy fallback, per-mode cost cards in deal currency, and graceful degradation**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-04-02T12:52:49Z
- **Completed:** 2026-04-02T12:56:00Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- Created `freightConstants.js` with Freightos URL, load type constants, TRANSPORT_MODES, `getChargeableWeight()`, and `suggestLoadType()` helpers
- Built `useFreightEstimate` hook: on-demand fetch (not auto-run), client-side-first Freightos call with automatic CORS proxy fallback, 429 rate limit detection, and defensive response parsing
- Created `FreightEstimatorWidget`: collapsible form with origin/destination (pre-filled from deal namedPlace), weight, optional LxWxH dimensions with volumetric weight display, load type badge, per-mode result cards with costs converted to deal currency, "Powered by Freightos" attribution link, and all three error states (API failure, rate limit, no results)
- Integrated FreightEstimatorWidget into DealSidebar below CurrencyConvertPanel on all deal stages
- Created `/api/freight/estimate` CORS proxy route with in-memory rate limiter (50 req/hr window)

## Task Commits

Each task was committed atomically:

1. **Task 1: Freight constants, useFreightEstimate hook, and CORS proxy route** - `34c8f13` (feat)
2. **Task 2: FreightEstimatorWidget component and DealSidebar integration** - `7092dc4` (feat)

## Files Created/Modified
- `src/core/constants/freightConstants.js` - Freightos URL constants, load types, transport modes array, weight calculation helpers
- `src/presentation/hooks/intelligence/useFreightEstimate.js` - On-demand hook with client-side-first fetch, CORS fallback, rate limit detection, defensive response parser
- `src/presentation/components/features/deal/DealSidebar/FreightEstimatorWidget.jsx` - Collapsible form widget with results cards, deal currency conversion, Freightos attribution
- `src/app/api/freight/estimate/route.js` - Thin CORS proxy with in-memory rate limiter
- `src/presentation/components/features/deal/DealSidebar/DealSidebar.jsx` - Import and render FreightEstimatorWidget below CurrencyConvertPanel

## Decisions Made
- Used `TypeError` detection as CORS signal — TypeError is the browser error thrown on network/CORS failure, allowing clean distinction from HTTP errors
- Set proxy rate limit to 50 req/hr (half of Freightos 100/hr budget) — reserves headroom for concurrent users while still allowing useful proxy usage
- Load type shown as read-only badge (not user-editable select) — reduces form complexity; suggestLoadType heuristic is sufficient for estimation purposes
- `reset()` called when form fields change after result shown — prevents stale results from misleading users after they modify inputs

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required. Freightos public API requires no API key.

## Next Phase Readiness
- Phase 08 is now complete: currency ticker (08-01), currency conversion panel (08-02), and freight estimator (08-03) all shipped
- FreightEstimatorWidget uses convertAmount from useLiveCurrency — already tested with multiple simultaneous consumers in 08-02
- Phase 7 (Platform Hardening) depends on Phase 6 + Phase 8 — both are now complete

---
*Phase: 08-live-currency-and-freight-intelligence*
*Completed: 2026-04-02*

## Self-Check: PASSED

All files confirmed on disk. Both task commits verified in git history.
