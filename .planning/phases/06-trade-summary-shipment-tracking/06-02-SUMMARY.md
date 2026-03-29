---
phase: 06-trade-summary-shipment-tracking
plan: "02"
subsystem: trade-summary-ui
tags: [react, firestore, trade-summary, dark-theme, pdf-export, tab-switcher]
dependency_graph:
  requires:
    - 06-01 (ShipmentRepository, ShipmentUpdate entity, SHIPMENT_STATUS constants)
    - ContractRepository, QuoteRepository, LegalEngagementRepository (from earlier phases)
  provides:
    - TradeSummaryTab component with 7 sub-sections and loading skeleton
    - useTradeSummary hook with parallel onSnapshot subscriptions
    - SummaryHeroBanner with live shipment tracking pill
    - TradeInfoBar with deal number, product, total, incoterms, container, status
    - DealOverviewSection with product/price/quantity/incoterms/payment terms
    - PartiesProvidersSection with buyer/seller + selected insurance/logistics provider details
    - CostBreakdownSection with product + insurance + logistics = total
    - DocumentsSection with contract PDF link + placeholder slots for supporting docs
    - LegalConsultingSection with privacy-aware lawyer info (clientId guard)
    - TradeRouteMap dark-themed SVG with origin/destination pins and dashed route
    - DealPage tab switcher (Negotiation | Trade Summary)
    - DELIVERED TerminalBanner config (green theme)
    - @media print CSS for clean PDF output
  affects:
    - src/presentation/components/features/deal/DealPage/DealPage.jsx
    - src/app/globals.css
tech_stack:
  added: []
  patterns:
    - Closure flags pattern for parallel subscription loading (draftsLoaded/quotesLoaded/etc)
    - Privacy guard at both data layer (subscribeToEngagementForDeal) and UI layer (clientId check)
    - Progressive disclosure — sections show 'Pending' when provider not yet selected
    - Tab switcher state with auto-switch for PROVIDERS_SELECTED and DELIVERED statuses
    - @media print CSS with .no-print class and .trade-summary-print container
key_files:
  created:
    - src/presentation/hooks/deal/useTradeSummary.js
    - src/presentation/components/features/deal/TradeSummary/TradeSummaryTab.jsx
    - src/presentation/components/features/deal/TradeSummary/SummaryHeroBanner.jsx
    - src/presentation/components/features/deal/TradeSummary/TradeInfoBar.jsx
    - src/presentation/components/features/deal/TradeSummary/DealOverviewSection.jsx
    - src/presentation/components/features/deal/TradeSummary/PartiesProvidersSection.jsx
    - src/presentation/components/features/deal/TradeSummary/CostBreakdownSection.jsx
    - src/presentation/components/features/deal/TradeSummary/DocumentsSection.jsx
    - src/presentation/components/features/deal/TradeSummary/LegalConsultingSection.jsx
    - src/presentation/components/features/deal/TradeSummary/TradeRouteMap.jsx
  modified:
    - src/presentation/components/features/deal/DealPage/DealPage.jsx
    - src/app/globals.css
decisions:
  - "[06-02]: useTradeSummary subscribes to QuoteRepository.subscribeToQuotesForDeal then derives selectedInsuranceQuote/selectedLogisticsQuote by filtering status === ACCEPTED — no extra subscription needed"
  - "[06-02]: LegalConsultingSection has dual privacy guard: data layer (subscribeToEngagementForDeal filters by clientId) + UI layer (engagement.clientId === currentUserUid check) — defense in depth"
  - "[06-02]: TradeRouteMap uses static placeholder pin positions (left/right) per user decision — purely visual context, exact coordinates not required"
  - "[06-02]: DealPage tab auto-switches to 'summary' for PROVIDERS_SELECTED and DELIVERED — users in those statuses care more about tracking than negotiation history"
  - "[06-02]: Print CSS uses .trade-summary-print container class — scoped to summary content only, does not interfere with existing contract print styles"
metrics:
  duration: 7 minutes
  completed: "2026-03-29"
  tasks_completed: 2
  files_modified: 12
---

# Phase 6 Plan 02: Trade Summary UI Summary

**One-liner:** Full-featured trade summary tab with 7 data sections, useTradeSummary parallel subscription hook, dark-theme SVG map, DealPage tab switcher, and print CSS for PDF export.

## What Was Built

### Task 1: useTradeSummary Hook and All TradeSummary Sub-Components

- **useTradeSummary.js** — Multi-source aggregation hook with parallel Firestore subscriptions (deal, contract, quotes, shipments, legal engagement) using closure flags pattern. Derives `selectedInsuranceQuote` and `selectedLogisticsQuote` by filtering quotes with `status === ACCEPTED`. Loading state resolves only when all 5 subscriptions have fired at least once.

- **SummaryHeroBanner.jsx** — Status hero with deal status icon (lucide-react), product name, quantity/price/incoterm stats, and live shipment tracking pill with color-coded status (green=delivered, blue=in transit, yellow=at customs). Dark theme bg-[#0F1C2E] with gold accent for status highlights. Responsive stack on mobile.

- **TradeInfoBar.jsx** — Horizontal strip showing deal number (last 8 chars), product, total amount, incoterms, container number (from latestShipment.containerNumber or 'Pending'), status badge. Has `no-print` class to hide in PDF output.

- **DealOverviewSection.jsx** — Product, price, quantity, total value, incoterm, named place, payment terms in key-value pair card layout with separator borders.

- **PartiesProvidersSection.jsx** — Buyer/seller party cards + selected insurance provider (ICC coverage, premium, validity) and logistics provider (transport mode, freight cost, transit days). Shows 'Pending provider selection' with clock icon when provider not yet selected.

- **CostBreakdownSection.jsx** — Product cost (price × quantity) + insurance premium + logistics fee = total. Values show as 'Pending' when not available. Footer note when total is partial.

- **DocumentsSection.jsx** — Contract PDF link to `/deals/{dealId}/contract` (shows 'Pending contract approval' when no contract). Four informational placeholder slots: Insurance Certificate, Bill of Lading, Commercial Invoice, Packing List.

- **LegalConsultingSection.jsx** — Privacy-aware: shows only current user's lawyer info (engagement where `clientId === currentUserUid`). Shows status badge (active/completed/pending/declined), lawyer profile link, link to legal channel. Falls back to 'No legal counsel' message with 'Find a Lawyer' link.

- **TradeRouteMap.jsx** — Dark-themed SVG (bg-[#0b1626]) with simplified continental outlines for visual context. Gold origin pin (left), blue destination pin (right), dashed quadratic bezier route line. Legend at bottom. 180px height.

- **TradeSummaryTab.jsx** — Main orchestrator calling useTradeSummary. Shows animated loading skeleton while data loads. Two-column desktop layout: main content (left) + sidebar (right: map). Print/PDF button calls `window.print()`. Legal disclaimer footer.

### Task 2: DealPage Tab Integration and Print CSS

- **DealPage.jsx** — Added `useState` for `activeTab`. Added `showSummaryTab` computation (true for CONTRACT_APPROVED, PROVIDERS_SELECTED, DELIVERED, ACCEPTED). Added tab switcher UI with gold active underline styling (`.no-print` class). Auto-switches to 'summary' tab via `useEffect` when deal status is PROVIDERS_SELECTED or DELIVERED. DELIVERED TerminalBanner config added (green theme). isTerminal fallback updated to include DELIVERED. DealSidebar only renders with negotiation tab.

- **globals.css** — Added `.trade-summary-print` container styles for print: white background, black text, A4 page size with 20mm/15mm margins, break-inside avoid on sections.

## Deviations from Plan

### Auto-fixed Issues

None.

### Scope Notes

- DealSidebar renders only in negotiation tab (not summary tab) — summary tab has its own two-column layout with TradeRouteMap in the right sidebar. This is intentional: the summary is a self-contained view.
- `draftCount` field on LegalEngagement entity was not found — LegalConsultingSection renders without it gracefully (shows 0 when undefined).

## Self-Check

### Files created/exist:
- src/presentation/hooks/deal/useTradeSummary.js: FOUND
- src/presentation/components/features/deal/TradeSummary/TradeSummaryTab.jsx: FOUND
- src/presentation/components/features/deal/TradeSummary/SummaryHeroBanner.jsx: FOUND
- src/presentation/components/features/deal/TradeSummary/TradeInfoBar.jsx: FOUND
- src/presentation/components/features/deal/TradeSummary/DealOverviewSection.jsx: FOUND
- src/presentation/components/features/deal/TradeSummary/PartiesProvidersSection.jsx: FOUND
- src/presentation/components/features/deal/TradeSummary/CostBreakdownSection.jsx: FOUND
- src/presentation/components/features/deal/TradeSummary/DocumentsSection.jsx: FOUND
- src/presentation/components/features/deal/TradeSummary/LegalConsultingSection.jsx: FOUND
- src/presentation/components/features/deal/TradeSummary/TradeRouteMap.jsx: FOUND

### Commits:
- 6778219: feat(06-02): useTradeSummary hook and all TradeSummary sub-components
- b8a9ff9: feat(06-02): DealPage tab integration and print CSS

### Build:
- `npm run build` — PASSED (no errors, no warnings)

## Self-Check: PASSED
