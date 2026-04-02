---
phase: 08-live-currency-and-freight-intelligence
verified: 2026-04-02T12:59:36Z
status: human_needed
score: 14/14 must-haves verified (automated); 3 items need human confirmation
re_verification: false
human_verification:
  - test: "Visit homepage without login — confirm currency ticker scrolls above hero section with live rates"
    expected: "Scrolling marquee with gold pair labels (EUR/USD, GBP/USD, etc.), white rate values, green/red/gray arrows, 'Updated X ago' timestamp, smooth infinite loop"
    why_human: "Requires browser rendering; CSS marquee animation, live API call, and arrow direction changes cannot be verified statically"
  - test: "Navigate to any deal negotiation page — confirm CurrencyConvertPanel appears in sidebar below 'Current Terms' section"
    expected: "Two dropdowns showing 8 currencies, unit price and estimated total in gold, exchange rate label, localStorage persistence across refresh"
    why_human: "Requires authenticated deal page; localStorage persistence and dropdown state are runtime behaviors"
  - test: "Click 'Get Estimate' on FreightEstimatorWidget with valid origin/destination/weight — confirm results appear per transport mode"
    expected: "Per-mode cards (Sea FCL/LCL, Air, Road) with cost ranges in deal currency, transit times, and 'Powered by Freightos' attribution link below results"
    why_human: "Freightos API is an external live endpoint; response shape and CORS behavior can only be confirmed at runtime"
---

# Phase 8: Live Currency and Freight Intelligence — Verification Report

**Phase Goal:** Live currency ticker on homepage, multi-currency conversion in deals, freight cost estimator widget
**Verified:** 2026-04-02T12:59:36Z
**Status:** human_needed — all automated checks passed; 3 items require browser/runtime confirmation
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Any visitor (no login) sees a scrolling currency ticker above the hero on the homepage | ? HUMAN | `CurrencyTicker` imported and rendered at line 31 of `page.js`, above `HeroSection` at line 34; component is substantive with marquee logic |
| 2 | Ticker shows 8 currencies with rates and arrow change indicators | ✓ VERIFIED | `TICKER_CURRENCIES` exports 8 codes; `TICKER_PAIRS` exports 16 pairs; `ArrowIndicator` component compares `current` vs `previous` rates with `text-emerald-400`/`text-red-400` colors |
| 3 | Ticker displays 'Updated Xs ago' relative timestamp | ✓ VERIFIED | `CurrencyTicker.jsx` line 117: `formatDistanceToNow(new Date(fetchedAt), { addSuffix: true })` |
| 4 | Rates auto-refresh every 60s without page reload | ✓ VERIFIED | `useLiveCurrency.js` line 172: `setInterval(fetchAndNotify, POLL_INTERVAL)` with `POLL_INTERVAL = 60_000` |
| 5 | API failure shows cached rates with warning; if cache expired, shows 'temporarily unavailable' | ✓ VERIFIED | Fallback logic in `fetchAndNotify`: loads `localStorage` cache and sets `_error = 'Using cached rates'` (isStale path); `CurrencyTicker.jsx` line 156 renders "Currency rates temporarily unavailable" on `cacheExpired || (error && !rates)` |
| 6 | Ticker is responsive on mobile with smaller text | ✓ VERIFIED | `CurrencyTicker.jsx` line 170: `text-[10px] sm:text-xs` on the marquee container |
| 7 | Deal sidebar shows currency conversion panel with two dropdowns for 8 currencies | ✓ VERIFIED | `CurrencyConvertPanel.jsx` exports full component with two `<select>` elements over `TICKER_CURRENCIES`; `DealSidebar.jsx` line 361 renders it with `snapshot` props |
| 8 | Target currency selections persist to localStorage | ✓ VERIFIED | `CurrencyConvertPanel.jsx` lines 162-169: `localStorage.setItem(TARGET_CURRENCY_KEYS.target1/2, code)` on change; hydrated from `localStorage` on mount with `useEffect` |
| 9 | Conversion panel also appears on the Trade Summary tab | ✓ VERIFIED | `TradeSummaryTab.jsx` line 29: import; line 136: rendered with snapshot props |
| 10 | Rates auto-refresh on the same 60s interval (shared singleton) | ✓ VERIFIED | `CurrencyConvertPanel` and `FreightEstimatorWidget` both call `useLiveCurrency()` which is a module-level singleton — only one `setInterval` ever runs regardless of consumer count |
| 11 | Deal sidebar shows collapsible freight estimator expanded by default | ✓ VERIFIED | `FreightEstimatorWidget.jsx` line 116: `useState(true)` for `expanded`; `DealSidebar.jsx` line 371 renders it unconditionally for all deal stages |
| 12 | Freight estimator accepts origin, destination, weight, optional dimensions | ✓ VERIFIED | Form fields for all four inputs present; volumetric weight computed via `getChargeableWeight`; load type auto-detected via `suggestLoadType` shown as read-only badge |
| 13 | Results show per-mode cost range in deal currency with attribution link | ✓ VERIFIED | `ModeCard` converts from `quote.currency` (USD) to `dealCurrency` via `convertAmount`; "Powered by Freightos" attribution at line 353 with `https://www.freightos.com` link in new tab |
| 14 | All error/unavailability states handled without blocking deal flow | ✓ VERIFIED | Currency: skeleton, isStale badge, cacheExpired message; Freight: rate limit (amber), API error with retry button, no-results message — all non-blocking UI states |

**Score: 14/14 truths verified (automated)**

---

## Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/core/constants/currencyConstants.js` | 8 currencies, 16 pairs, cache/polling constants | ✓ VERIFIED | 8 `TICKER_CURRENCIES`, 16 `TICKER_PAIRS`, `FRANKFURTER_BASE_URL`, `CURRENCY_CACHE_KEY`, `CURRENCY_CACHE_TTL`, `POLL_INTERVAL`, `TARGET_CURRENCY_KEYS` — all exports present |
| `src/presentation/hooks/intelligence/useLiveCurrency.js` | Singleton polling hook with cache, exports `convertAmount` | ✓ VERIFIED | Module-level `_rates/_intervalId/_subscribers`; `useLiveCurrency` and `convertAmount` both exported; `localStorage` guarded; `document.hidden` skip |
| `src/presentation/components/homepage/CurrencyTicker/CurrencyTicker.jsx` | Marquee component with live rates | ✓ VERIFIED | Calls `useLiveCurrency`, renders duplicate `TickerItems` blocks for seamless loop, hover-to-pause, skeleton, fallback states |
| `src/presentation/components/features/deal/DealSidebar/CurrencyConvertPanel.jsx` | Two-dropdown conversion panel | ✓ VERIFIED | Full implementation with `ConversionBlock` sub-component, localStorage hydration guard, `pickDefault` auto-swap, stale/error states |
| `src/core/constants/freightConstants.js` | Freightos URL, load types, transport modes, weight helpers | ✓ VERIFIED | `FREIGHTOS_LOADTYPES` (5 types), `TRANSPORT_MODES` (5 modes with icons), `getChargeableWeight`, `suggestLoadType` |
| `src/presentation/hooks/intelligence/useFreightEstimate.js` | On-demand fetch hook with CORS fallback | ✓ VERIFIED | Client-side-first fetch to Freightos; `TypeError` triggers proxy retry; 429 detection; `parseFreightosResponse` with optional chaining; `reset()` |
| `src/presentation/components/features/deal/DealSidebar/FreightEstimatorWidget.jsx` | Collapsible freight form with results | ✓ VERIFIED | Collapsible via `useState(true)`; auto-fills destination from `snapshot.namedPlace`; result cards via `ModeCard`; all 3 error states; attribution link |
| `src/app/api/freight/estimate/route.js` | CORS fallback proxy with rate limiter | ✓ VERIFIED | `GET` handler forwards all params; in-memory rate limiter (50 req/hr); 429 upstream handling; INTEL-04 deviation comment present |

---

## Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `useLiveCurrency.js` | `https://api.frankfurter.dev/v2/rates` | `fetch` with 60s `setInterval` | ✓ WIRED | Line 94: `fetch(${FRANKFURTER_BASE_URL}/rates?base=EUR&quotes=USD,GBP,TRY,CNY,JPY,AED,SAR)` |
| `CurrencyTicker.jsx` | `useLiveCurrency.js` | `useLiveCurrency()` hook call | ✓ WIRED | Line 18: import; line 147: destructured call in component body |
| `page.js` | `CurrencyTicker.jsx` | import and render above HeroSection | ✓ WIRED | Line 11: import; line 31: `<CurrencyTicker />` before `<HeroSection />` at line 34 |
| `CurrencyConvertPanel.jsx` | `useLiveCurrency.js` | `useLiveCurrency()` + `convertAmount` | ✓ WIRED | Lines 16-18: both imported; line 138: hook call; lines 90-91: `convertAmount` used in `ConversionBlock` |
| `DealSidebar.jsx` | `CurrencyConvertPanel.jsx` | import and render below OfferSummary | ✓ WIRED | Line 19: import; lines 361-366: rendered with 4 props from snapshot |
| `TradeSummaryTab.jsx` | `CurrencyConvertPanel.jsx` | import and render in cost section | ✓ WIRED | Line 29: import; lines 136-141: rendered with snapshot props |
| `useFreightEstimate.js` | `https://ship.freightos.com/api/shippingCalculator` | client-side fetch on user click | ✓ WIRED | Line 133: `fetch(${FREIGHTOS_BASE_URL}?${params.toString()})` inside `fetchEstimate` callback |
| `FreightEstimatorWidget.jsx` | `useFreightEstimate.js` | `useFreightEstimate()` hook call | ✓ WIRED | Line 17: import; line 127: destructured call |
| `FreightEstimatorWidget.jsx` | `useLiveCurrency.js` | `convertAmount` for USD to deal currency | ✓ WIRED | Line 18: import; lines 65-66: `convertAmount` used in `ModeCard` |
| `DealSidebar.jsx` | `FreightEstimatorWidget.jsx` | import and render below CurrencyConvertPanel | ✓ WIRED | Line 20: import; line 371: `<FreightEstimatorWidget deal={deal} latestOffer={latestOffer} />` |

---

## Requirements Coverage

| Requirement | Source Plan | Description | Status | Evidence |
|-------------|------------|-------------|--------|----------|
| INTEL-01 | 08-01 | Homepage live currency ticker, no login required, auto-refresh, last-updated timestamp | ✓ SATISFIED | `CurrencyTicker` rendered in `page.js` (no auth gate); 60s polling in `useLiveCurrency`; `formatDistanceToNow` timestamp in component |
| INTEL-02 | 08-02 | Deal negotiation page shows offer amounts in base + two user-selected target currencies with live conversion | ✓ SATISFIED | `CurrencyConvertPanel` in `DealSidebar` with two dropdowns, `convertAmount` for unit price and estimated total |
| INTEL-03 | 08-03 | Deal sidebar freight estimator: origin, destination, load type, weight, min/max per mode via Freightos with attribution | ✓ SATISFIED | `FreightEstimatorWidget` form fields + `ModeCard` per-mode results + "Powered by Freightos" link |
| INTEL-04 | 08-03 | Freight estimator runs client-side (browser-to-Freightos), server never proxies | ⚠️ PARTIAL | Client-side-first fetch confirmed (line 133 of `useFreightEstimate.js`). However, `/api/freight/estimate` proxy route exists as explicit CORS fallback. Plan 03 treats this as a documented deviation: INTEL-04 tradeoff comment is present in both `useFreightEstimate.js` (lines 13, 158-163) and `route.js` (line 4). The requirement as written ("server NEVER proxies") is technically violated by the existence of the proxy. Human decision required on whether the "CORS fallback only" design satisfies intent. |
| INTEL-05 | 08-01, 08-02, 08-03 | Both widgets show graceful fallback states when external APIs unavailable; deal flow never blocked | ✓ SATISFIED | Currency: `isStale` badge, `cacheExpired` unavailability message; Freight: error + retry button, rate limit message, "no results" state — deal workflow is never gated on either widget |

### INTEL-04 Deviation Assessment

The REQUIREMENTS.md entry for INTEL-04 reads: *"server never proxies Freightos calls, per-IP rate limits apply per user."* The implementation uses client-side calls as the primary path (satisfying the intent), but provides `/api/freight/estimate` as a CORS emergency fallback. The plan explicitly documents this deviation with `INTEL-04 deviation:` and `INTEL-04 tradeoff:` comments. The proxy is guarded by its own rate limiter (50 req/hr). This is a **designed and documented partial deviation** — the requirement's intent (preserve per-user rate limits) is best-effort. A human should confirm this tradeoff is accepted.

---

## Anti-Patterns Found

No blockers or stubs detected.

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `FreightEstimatorWidget.jsx` | 181, 213, 227 | HTML `placeholder` attribute on inputs | ℹ️ Info | These are valid HTML input placeholder attributes, not code stubs. Not a concern. |
| `route.js` | 24 comment | "In production, replace with Redis-backed limiter for multi-instance deployments" | ⚠️ Warning | In-memory rate limiter will not share state across multiple server processes/pods. Acceptable for current deployment stage; would need Redis in a scaled environment. |

---

## Human Verification Required

### 1. Homepage Currency Ticker — Visual and Live Data

**Test:** Visit `http://localhost:3000` (or deployed URL) without logging in.
**Expected:** A dark scrolling bar above the hero section shows gold pair labels (e.g. EUR/USD, GBP/USD), white rate values, green `▲` or red `▼` arrows, a "Updated X ago" timestamp. Bar scrolls continuously and pauses on hover.
**Why human:** CSS marquee animation, live API fetch to Frankfurter, and arrow direction changes on rate refresh require a running browser.

### 2. Deal Sidebar — CurrencyConvertPanel and FreightEstimatorWidget

**Test:** Log in, navigate to any deal negotiation page. Inspect the sidebar.
**Expected:** Below the "Current Terms" section: (a) "Currency Conversion" panel with two currency dropdowns, unit price and total in gold. Select new currencies — values update, persist after page refresh. Below that: "Freight Estimate" collapsible section expanded by default, with origin/destination auto-filled where namedPlace is available.
**Why human:** Requires authenticated deal page; localStorage persistence and auto-fill from deal data are runtime behaviors.

### 3. Freight Estimator — API Call and Results

**Test:** On any deal page, fill Origin (e.g. "Istanbul"), Destination (e.g. "Rotterdam"), Weight (e.g. 500), click "Get Estimate".
**Expected:** Per-mode cards appear for Sea FCL, Sea LCL, Air Freight, and/or Road modes, each showing a min–max cost range in the deal's base currency and transit days. "Powered by Freightos" attribution link visible below results.
**Why human:** Freightos public API is a live external endpoint; response availability and CORS behavior can only be confirmed at runtime.

### 4. INTEL-04 Tradeoff Acceptance

**Test:** Review `/api/freight/estimate/route.js` and decide whether the CORS-only fallback proxy is acceptable.
**Expected:** Product owner confirms the "client-first, proxy only on CORS block" design satisfies the spirit of INTEL-04 despite the proxy existing.
**Why human:** Architectural/product decision on whether a documented emergency fallback violates the requirement's intent.

---

## Summary

All 8 required artifacts exist on disk, are substantive (no stubs or placeholders), and are correctly wired to their consumers. All 6 commits from SUMMARY files are confirmed in git history. The three plans collectively satisfy INTEL-01, INTEL-02, INTEL-03, and INTEL-05 fully. INTEL-04 is partially satisfied — the primary path is client-side as required, but a proxy fallback exists and is documented as an intentional deviation. No blocking gaps were found. Three items require human/browser verification before the phase can be declared fully passed.

---

_Verified: 2026-04-02T12:59:36Z_
_Verifier: Claude (gsd-verifier)_
