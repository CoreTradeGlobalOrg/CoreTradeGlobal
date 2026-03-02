---
phase: 04-provider-portals-and-insurance-logistics-quotes-s3
plan: "04"
subsystem: ui
tags: [react, nextjs, firestore, onSnapshot, quotes, insurance, logistics, comparison-view]

# Dependency graph
requires:
  - phase: 04-provider-portals-and-insurance-logistics-quotes-s3
    plan: "01"
    provides: Quote entity, QuoteRequest entity, QuoteRepository.subscribeToQuotesForRequest, QuoteRepository.subscribeToQuotesForDeal, quoteConstants (QUOTE_STATUS, ICC_COVERAGE, TRANSPORT_MODE, etc.)
  - phase: 04-provider-portals-and-insurance-logistics-quotes-s3
    plan: "02"
    provides: acceptQuote and confirmProviderSelection Cloud Functions
  - phase: 04-provider-portals-and-insurance-logistics-quotes-s3
    plan: "03"
    provides: useQuoteActions hook (submitQuote, acceptQuote, declineRequest, withdrawQuote, confirmSelection)

provides:
  - useQuotesForDeal hook: real-time two-level subscription returning insurance/logistics splits and selected quote tracking
  - /deals/[dealId]/quotes route page with auth/status/participant guards
  - QuotesPage: two-column comparison layout with filter pills, sort select, auto-calculated ribbons
  - QuotesSidebar: trade stepper, selection summary, live cost breakdown, confirm button
  - InsuranceQuoteCard: ICC coverage, premium, deductible, war/strikes, policy period, select button
  - LogisticsQuoteCard: transport mode icon, freight cost, transit days, capability tags, select button

affects:
  - 04-05: Provider selection confirmation via confirmProviderSelection CF is triggered from this page

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Two-level onSnapshot subscription: subscribe to requests, then for each request subscribe to providerQuotes subcollection
    - useRef array for tracking multiple unsubscribe functions (avoids stale closure issues)
    - Auto-calculated ribbon badges using useMemo over active quotes array
    - Consistent two-column page layout pattern (lg:grid-cols-3, col-span-2 main + col-span-1 sidebar)

key-files:
  created:
    - src/presentation/hooks/quote/useQuotesForDeal.js
    - src/app/(main)/deals/[dealId]/quotes/page.jsx
    - src/presentation/components/features/quote/QuotesPage/QuotesPage.jsx
    - src/presentation/components/features/quote/QuotesSidebar/QuotesSidebar.jsx
    - src/presentation/components/features/quote/InsuranceQuoteCard/InsuranceQuoteCard.jsx
    - src/presentation/components/features/quote/LogisticsQuoteCard/LogisticsQuoteCard.jsx
  modified: []

key-decisions:
  - "useQuotesForDeal uses a quotesMapRef (not state) to track per-request quote arrays — avoids stale closure when request subscriptions fire asynchronously"
  - "Insurance and logistics quotes filtered to exclude WITHDRAWN and EXPIRED statuses, but include ACCEPTED so selected quotes remain visible on cards"
  - "QuotesSidebar Confirm button disabled until at least one provider selected (partial selection allowed per CONTEXT.md)"
  - "Ribbon algorithm: Cheapest by getPrice(), Fastest by estimatedTransitDays, Best Value by price-per-transit-day ratio — each assigned to different quotes to avoid duplicate ribbons"
  - "LogisticsQuoteCard shows ONLY the quote's own freight cost; never displays deal price (price separation maintained)"

patterns-established:
  - "Two-level subscription pattern: outer subscribe → for each result, inner subscribe → aggregation via ref map + flat()"
  - "Quote card selection: onSelect(quoteRequestId, quoteId) passes both IDs for acceptQuote CF call"
  - "Filter pills + sort select combo for quote section headers — consistent UX across insurance and logistics"

requirements-completed: [QUOTE-01, QUOTE-02, QUOTE-03, QUOTE-05, QUOTE-06]

# Metrics
duration: 6min
completed: 2026-03-02
---

# Phase 4 Plan 04: Buyer Quotes Comparison Page Summary

**Two-column buyer quotes comparison page at /deals/[dealId]/quotes with real-time insurance and logistics quote cards, filter pills, sort select, auto-calculated ribbons (Cheapest/Fastest/Best Value), live cost breakdown sidebar, and provider selection confirm flow**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-02T16:17:26Z
- **Completed:** 2026-03-02T16:24:13Z
- **Tasks:** 2
- **Files modified:** 6 (all new)

## Accomplishments
- Built the full buyer quotes comparison experience: real-time subscription, filter/sort, ribbon auto-calculation, select flow, and confirm to advance deal to providers_selected
- useQuotesForDeal implements two-level onSnapshot subscription (requests → per-request providerQuotes) with clean ref-based unsubscribe tracking
- All six artifacts meet plan min_lines requirements; build compiles with zero errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Quotes hook and route page** - `94c01b7` (feat)
2. **Task 2: QuotesPage, QuotesSidebar, InsuranceQuoteCard, LogisticsQuoteCard** - `49f4b72` (feat)

**Plan metadata:** (docs commit — follows)

## Files Created/Modified

### Created
- `src/presentation/hooks/quote/useQuotesForDeal.js` — Two-level subscription: quoteRequests + per-request providerQuotes; derived insurance/logistics splits; selected quote tracking; declinedCount
- `src/app/(main)/deals/[dealId]/quotes/page.jsx` — Route page with auth guard, deal status guard (contract_approved/providers_selected), participant check, isBuyer derivation, Suspense boundary
- `src/presentation/components/features/quote/QuotesPage/QuotesPage.jsx` — Main layout: insurance (green) and logistics (blue) sections, filter pills, sort select, ribbon computation, empty states, grid layout
- `src/presentation/components/features/quote/QuotesSidebar/QuotesSidebar.jsx` — Trade process stepper (4-step: Negotiation→Agreement→Insurance&Transport→Tracking), selection summary, cost breakdown (goods+freight+premium=total), confirm button for buyer, info message for seller
- `src/presentation/components/features/quote/InsuranceQuoteCard/InsuranceQuoteCard.jsx` — ICC label, premium (prominent), coverage amount, deductible, coverage scope, war/strikes clause indicators, policy period dates, CountdownTimer, ribbon badge, select button
- `src/presentation/components/features/quote/LogisticsQuoteCard/LogisticsQuoteCard.jsx` — Transport mode with lucide icon, freight cost (prominent), transit days, container type (sea only), loading/arrival dates, capability tag pills, CountdownTimer, ribbon badge, select button

## Decisions Made

- **Two-level subscription with quotesMapRef:** The per-request quote subscriptions fire asynchronously after the requests subscription fires. Using a `quotesMapRef` object (requestId -> Quote[]) instead of state for aggregation prevents stale closures and avoids re-triggering the outer subscription effect.
- **Ribbon assignment with no-duplicate logic:** `if (!ribbons[id])` guard ensures each card gets at most one ribbon. Priority: Cheapest set first, then Fastest (if different card), then Best Value (if yet another different card).
- **Partial selection allowed:** The confirm button is enabled as long as at least one provider (insurance OR logistics) is selected. Plan allows partial selection — buyer is not forced to select both.
- **Price separation maintained:** LogisticsQuoteCard does not display any deal price. It only shows the quote's own `freightCost`. The dealSnapshot for logistics providers never includes price (enforced by Plan 02's allowlist).

## Deviations from Plan

None — plan executed exactly as written. The `useQuoteActions` hook was found to already exist (created in the Plan 03 execution that ran before this plan), so no Rule 3 fix was needed.

## Issues Encountered

None — build compiled successfully with zero errors after all files were created.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Buyer can now compare, select, and confirm providers — advancing deal to `providers_selected` via the `confirmProviderSelection` Cloud Function
- Plan 05 (tracking) can use the `providers_selected` deal status as its gateway trigger
- All quote card components reusable for potential future admin views

---
*Phase: 04-provider-portals-and-insurance-logistics-quotes-s3*
*Completed: 2026-03-02*

## Self-Check: PASSED

All 6 created files confirmed present on disk. Both task commits (94c01b7, 49f4b72) confirmed in git log.
