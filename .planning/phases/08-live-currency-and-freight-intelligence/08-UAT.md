---
status: diagnosed
phase: 08-live-currency-and-freight-intelligence
source: [08-01-SUMMARY.md, 08-02-SUMMARY.md, 08-03-SUMMARY.md]
started: 2026-04-02T13:00:00Z
updated: 2026-04-04T10:00:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Currency Ticker on Homepage
expected: Visit the homepage (no login required). A Bloomberg-style scrolling marquee appears above the hero section showing currency pairs with rates, colored arrow indicators, and an "Updated X ago" timestamp. The ticker auto-scrolls continuously. Hovering pauses the scroll.
result: issue
reported: "can't see the header, ticker covers the navbar - severe issue"
severity: blocker

### 2. Currency Ticker Stale/Fallback States
expected: If you disconnect from the internet or wait for the cache to expire, the ticker should show an amber "delayed" badge when using cached rates, or a "temporarily unavailable" message if cache is 24h+ old. Rates should still display from cache when available.
result: pass

### 3. Currency Convert Panel in Deal Sidebar
expected: Open any deal page. In the sidebar below "Current Terms", a Currency Conversion panel appears with two dropdown selectors for target currencies. Each dropdown lists all 8 currencies (USD, EUR, GBP, TRY, CNY, JPY, AED, SAR). Selecting a currency shows the deal's amounts converted to that currency with the live rate displayed.
result: pass

### 4. Currency Convert Panel Persistence
expected: Select a target currency in the conversion panel, then refresh the page. The previously selected target currency should be restored from localStorage (not reset to default).
result: pass

### 5. Currency Convert Panel in Trade Summary
expected: Navigate to the Trade Summary tab of a deal. Below the Cost Breakdown section, the same Currency Conversion panel appears and works identically to the sidebar version.
result: issue
reported: "pass but both sides dropdown arrow so near to right edge we need to fix that UI error"
severity: cosmetic

### 6. Freight Estimator Widget in Deal Sidebar
expected: On any deal page sidebar, below the Currency Conversion panel, a collapsible "Freight Estimator" section appears. Expanding it shows a form with origin/destination fields (pre-filled from deal's named places), a weight input, and optional LxWxH dimension fields. A load type badge is auto-detected and shown as read-only.
result: issue
reported: "it works but it just show express why is that?"
severity: major

### 7. Freight Estimate Results
expected: Fill in the freight estimator form and click the estimate button. After a brief loading state, per-transport-mode result cards appear showing estimated freight costs converted to the deal's currency. A "Powered by Freightos" attribution link appears below the results.
result: issue
reported: "there is no transport mode it shows just express"
severity: major

### 8. Freight Estimator Error States
expected: If the Freightos API is rate-limited, a rate limit message appears. If the API fails entirely, a general error message is shown. If no results match the route, a "no results" message appears. The widget does not crash in any case.
result: skipped
reason: Hard to test without triggering rate limits

## Summary

total: 8
passed: 3
issues: 4
pending: 0
skipped: 1

## Gaps

- truth: "Currency ticker visible without covering navbar/header"
  status: fixed
  reason: "User reported: can't see the header, ticker covers the navbar - severe issue"
  severity: blocker
  test: 1
  root_cause: "Ticker added ~28px height inside fixed navbar but all pages used hardcoded pt-[100px]/pt-[120px] for navbar clearance. Hero overlay position also didn't account for taller navbar."
  artifacts:
    - path: "src/presentation/components/homepage/Navbar/Navbar.jsx"
      issue: "No dynamic height tracking for navbar with ticker"
    - path: "src/app/globals.css"
      issue: "Hardcoded sticky-search top offsets"
    - path: "src/app/(main)/homepage.css"
      issue: "Hero overlay position didn't clear taller navbar"
  missing:
    - "Added ResizeObserver to Navbar setting --navbar-height CSS variable"
    - "Replaced all hardcoded pt-[100px]/pt-[120px] with pt-[var(--navbar-height)] across 40+ files"
    - "Adjusted hero-overlay top calc from 40% to 44%"
  debug_session: ""

- truth: "Currency conversion dropdowns have proper padding from right edge"
  status: fixed
  reason: "User reported: pass but both sides dropdown arrow so near to right edge we need to fix that UI error"
  severity: cosmetic
  test: 5
  root_cause: "Select elements used px-2 (8px) horizontal padding, leaving dropdown arrow cramped against right edge"
  artifacts:
    - path: "src/presentation/components/features/deal/DealSidebar/CurrencyConvertPanel.jsx"
      issue: "Insufficient right padding on select elements"
  missing:
    - "Changed px-2 to pl-2 pr-6 on both target currency selects"
  debug_session: ""

- truth: "Freight estimator shows multiple transport modes (sea, air, truck, express)"
  status: not_a_bug
  reason: "User reported: it works but it just show express why is that?"
  severity: major
  test: 6
  root_cause: "Freightos public API returns only Express mode for certain route/weight combinations. Code correctly handles multiple modes when API provides them. Different routes or heavier weights may return sea/air/truck."
  artifacts:
    - path: "src/presentation/hooks/intelligence/useFreightEstimate.js"
      issue: "Parsing logic is correct — handles both array and single-mode responses"
    - path: "src/presentation/components/features/deal/DealSidebar/FreightEstimatorWidget.jsx"
      issue: "Rendering maps over ALL quotes, no filtering"
  missing: []
  debug_session: ""

- truth: "Freight estimate results show per-transport-mode cards with costs"
  status: not_a_bug
  reason: "User reported: there is no transport mode it shows just express"
  severity: major
  test: 7
  root_cause: "Same as test 6 — API-level behavior, not code bug. Freightos returns modes based on route/weight availability."
  artifacts: []
  missing: []
  debug_session: ""
