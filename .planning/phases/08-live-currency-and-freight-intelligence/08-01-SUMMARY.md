---
phase: 08-live-currency-and-freight-intelligence
plan: 01
subsystem: ui
tags: [frankfurter, currency, marquee, localstorage, react-hooks, polling]

# Dependency graph
requires: []
provides:
  - useLiveCurrency singleton hook with localStorage cache and 60s polling
  - convertAmount helper for cross-currency conversion via EUR intermediary
  - CurrencyTicker marquee component above homepage hero section
  - currencyConstants with TICKER_CURRENCIES (8), TICKER_PAIRS (16), cache/polling constants
affects:
  - 08-02 (CurrencyConvertPanel in DealSidebar consumes useLiveCurrency)
  - 08-03 (FreightEstimatorWidget may read rates for USD conversion display)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Module-level singleton pattern for shared polling hook (prevents duplicate setInterval)
    - localStorage currency cache with 24h TTL and stale detection
    - CSS keyframes marquee with duplicated content for seamless infinite loop
    - Background tab skip via document.hidden before fetch

key-files:
  created:
    - src/core/constants/currencyConstants.js
    - src/presentation/hooks/intelligence/useLiveCurrency.js
    - src/presentation/components/homepage/CurrencyTicker/CurrencyTicker.jsx
  modified:
    - src/app/(main)/page.js
    - src/app/globals.css

key-decisions:
  - "useLiveCurrency uses module-level singleton (not React context) — multiple consumers share one setInterval and one fetch cycle"
  - "EUR as Frankfurter base currency — single API call for all 7 non-EUR rates; reciprocal/cross-rates computed mathematically"
  - "16 TICKER_PAIRS defined covering all 8 currencies in conventional forex quoting directions"
  - "AED and SAR handled gracefully — pairs omitted from ticker if rates absent from Frankfurter response (ECB does not publish Gulf currencies)"
  - "isStale derived from error === 'Using cached rates' — signals degraded but functional state to UI"
  - "cacheExpired computed from fetchedAt + 24h TTL — triggers 'temporarily unavailable' message if no fresh data for 24h+"

patterns-established:
  - "Pattern: Module-level singleton hook — share polling state across multiple consumers without React context"
  - "Pattern: convertAmount(amount, from, to, rates) — EUR as intermediary for any 2-currency conversion"
  - "Pattern: Marquee with duplicated JSX content blocks for seamless CSS infinite scroll"

requirements-completed: [INTEL-01, INTEL-05]

# Metrics
duration: 4min
completed: 2026-04-02
---

# Phase 8 Plan 01: Currency Ticker Summary

**Frankfurter-powered homepage currency ticker with singleton polling hook, localStorage fallback cache, and seamless CSS marquee above the hero section**

## Performance

- **Duration:** 4 min
- **Started:** 2026-04-02T12:02:55Z
- **Completed:** 2026-04-02T12:06:32Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- `useLiveCurrency` singleton hook: 60s polling, localStorage cache with 24h TTL, background tab skip, stale/cacheExpired detection, `convertAmount` helper
- `currencyConstants.js`: 8 currencies with flags, 16 conventional forex pairs, all cache/polling constants
- `CurrencyTicker`: Bloomberg-style auto-scrolling marquee with gold pair labels, white rates, green/red/gray arrow indicators, "Updated X ago" timestamp, hover-to-pause, responsive text sizing
- Homepage integration: CurrencyTicker rendered above HeroSection — visible to all visitors without login (INTEL-01)
- Build passes clean with no errors or warnings

## Task Commits

Each task was committed atomically:

1. **Task 1: Currency constants and useLiveCurrency singleton hook** - `e14617f` (feat)
2. **Task 2: CurrencyTicker marquee component and homepage integration** - `0eb608c` (feat)

**Plan metadata:** (see final commit below)

## Files Created/Modified

- `src/core/constants/currencyConstants.js` - 8 TICKER_CURRENCIES, 16 TICKER_PAIRS, FRANKFURTER_BASE_URL, CURRENCY_CACHE_KEY, CURRENCY_CACHE_TTL, POLL_INTERVAL, TARGET_CURRENCY_KEYS
- `src/presentation/hooks/intelligence/useLiveCurrency.js` - Singleton polling hook with localStorage cache, convertAmount helper
- `src/presentation/components/homepage/CurrencyTicker/CurrencyTicker.jsx` - Marquee component, arrow indicators, skeleton loader, fallback states
- `src/app/(main)/page.js` - Added CurrencyTicker import and render above HeroSection
- `src/app/globals.css` - Added @keyframes marquee and .animate-marquee class

## Decisions Made

- **Singleton pattern over React context:** Module-level `_rates`, `_intervalId`, `_subscribers` variables ensure one fetch cycle regardless of how many components call `useLiveCurrency`. Plan 02 (CurrencyConvertPanel) will call the same hook without any extra fetches.
- **EUR as Frankfurter base:** Single API call `GET /rates?base=EUR&quotes=USD,GBP,TRY,CNY,JPY,AED,SAR` for all 7 non-EUR rates. Cross-rates computed as `rates[quote] / rates[base]`. Avoids doubling API calls for both directions.
- **AED/SAR graceful omission:** These Gulf currencies are not in ECB dataset. `getPairRate()` returns `null` for missing keys; `availablePairs` filter in `TickerItems` silently omits those pairs. No error thrown.
- **`isStale` via error string:** When falling back to cache, `_error` is set to `'Using cached rates'`. `isStale` is derived as `error === 'Using cached rates'` which causes the amber warning badge to display alongside the rates.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None — build passed clean on first attempt.

## User Setup Required

None - Frankfurter API requires no authentication, no API keys, and has no rate limits.

## Self-Check: PASSED

All created files confirmed to exist. Both task commits (e14617f, 0eb608c) confirmed in git log.

## Next Phase Readiness

- `useLiveCurrency` is ready for Plan 02 consumption (CurrencyConvertPanel in DealSidebar)
- `convertAmount` exported and usable in any component needing cross-currency math
- `TARGET_CURRENCY_KEYS` constants exported for Plan 02 localStorage persistence
- Homepage ticker live and visible without login

---
*Phase: 08-live-currency-and-freight-intelligence*
*Completed: 2026-04-02*
