# Phase 8: Live Currency and Freight Intelligence - Context

**Gathered:** 2026-04-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Live currency ticker on the homepage (no login required), multi-currency deal conversions in the deal sidebar, and a freight cost estimator widget in the deal sidebar — all powered by client-side API calls (Frankfurter for currency, Freightos for freight). The deal flow is never blocked by third-party API failures. CoreTradeGlobal is not party to or responsible for any transaction.

</domain>

<decisions>
## Implementation Decisions

### Currency Ticker (Homepage)
- Auto-scrolling marquee bar positioned above the hero section, scrolls away with page content
- Dark background with gold #FFD700 accents for currency codes, white for rate values — matches platform theme
- 8 currencies: USD, EUR, GBP, TRY, CNY, JPY, AED, SAR
- Rates shown using conventional market quoting direction for each pair (both ways, e.g., EUR/USD 1.08 and USD/EUR 0.92)
- Arrow-only change indicators (▲/▼) — no percentage change shown
- "Updated Xs ago" relative timestamp appended at the end of the scrolling marquee
- Same marquee on mobile with smaller text — responsive, not hidden
- Homepage only — not on deal pages or other routes

### Deal Currency Conversion Panel
- Positioned in DealSidebar, below the existing offer summary section
- Two dropdown selectors for target currencies — user picks from the same 8 currencies as the ticker
- Default target currencies: EUR and USD (before user customizes)
- Selection persisted to localStorage
- Shows both unit price and estimated total (price × quantity) converted to each target currency
- Auto-refreshes on the same 60s polling interval as the homepage ticker (shared useLiveCurrency hook)
- Appears on both negotiation pages and Trade Summary tab — wherever price/cost info is displayed

### Freight Estimator Widget
- Positioned in DealSidebar, collapsible section expanded by default
- Origin/destination fields auto-populate from deal's Incoterms named places — user can override
- Weight field with unit auto-detected from deal product entity; falls back to kg for manual entry
- Optional dimensions field (L×W×H) for volumetric weight calculation — higher of actual/volumetric used
- Load type auto-detected from weight/volume — system suggests appropriate transport modes (sea FCL, sea LCL, air, road)
- Results displayed as stacked cards per transport mode, each showing min/max cost range and transit time estimate
- Freight costs shown in deal's base currency (converted from USD via live rates)
- User must click "Get Estimate" button — no auto-run on page load (preserves 100 req/hr per-IP rate limit)
- "Powered by Freightos" attribution link below results, opens freightos.com in new tab
- Available across all deal stages in the sidebar (not hidden after provider selection)

### Fallback & Degradation
- Currency API failure: show last-known cached rates with a warning badge ("Rates from X hours ago"); cache stored in localStorage with 24-hour TTL
- Single warning style for both stale and unavailable states — no severity tiers
- Warning auto-dismisses silently on next successful 60s fetch — no toast or notification
- When cache expires (24h+ with no API recovery): show "Currency rates temporarily unavailable" message
- Freight API failure: show "Unable to fetch freight estimates" error message with retry button — no cached freight data
- Rate limit (429 response): show "Estimate limit reached. Try again in a few minutes." — only surfaced when actually hit
- Loading states use skeleton loaders (animate-pulse) matching existing DealSidebar patterns (PartyCard precedent)

### Claude's Discretion
- Exact marquee scroll speed and animation implementation
- Specific Frankfurter API endpoint structure and polling mechanism
- Freightos API integration details and response parsing
- Volumetric weight calculation formula and mode suggestion thresholds
- Skeleton loader specific shapes and sizes
- Exact dropdown styling and positioning within the sidebar
- How to handle edge cases (e.g., deal with no currency set, product with no weight info)

</decisions>

<specifics>
## Specific Ideas

- Ticker should feel like a Bloomberg/Reuters financial data bar — professional, data-dense in a slim space
- Freight estimate cards with transport mode icons (ship, plane, truck) for quick visual scanning
- Currency conversion panel should be contextual — shows the current offer's amounts, not abstract conversion
- Auto-populate freight fields from deal data to minimize user effort — the deal already has Incoterms named places and product info

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `DealSidebar.jsx`: Right sidebar with party info, progress tracker, offer summary — currency panel and freight estimator integrate as new sections below existing content
- `Offer.js` entity: Has `price`, `currency` (ISO 4217), `quantity`, `estimatedTotal` fields — conversion reads these directly
- `PartyCard` in DealSidebar: Uses `animate-pulse` skeleton pattern — loading states should follow this pattern
- Homepage modular sections (HeroSection, FeaturedProducts, etc.): Ticker becomes a new component above HeroSection in page.js
- `OrderTimeline`, `ETACountdown`: Already imported in DealSidebar — new widgets follow same integration pattern

### Established Patterns
- Dark theme: bg-[#0F1C2E], border-[#2A3B52], gold #FFD700 accents, white text
- Hooks pattern: custom hooks (useDeal, useTradeSummary, useActiveShipments) for data subscriptions — useLiveCurrency follows same pattern
- localStorage persistence: LegalBanner uses per-deal localStorage keys — currency selection uses similar pattern
- Client-side data fetching: existing pattern of hooks with loading/error/data states

### Integration Points
- `src/app/(main)/page.js`: Homepage — CurrencyTicker component inserted above HeroSection
- `DealSidebar.jsx`: New CurrencyConvertPanel and FreightEstimatorWidget sections added below offer summary
- `TradeSummaryTab`: Currency conversion panel also displayed here (shared hook)
- `src/core/constants/`: New currencyConstants.js for the 8 supported currencies
- Deal entity / Offer entity: Read price, currency, quantity, Incoterms named place for auto-population

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 08-live-currency-and-freight-intelligence*
*Context gathered: 2026-04-02*
