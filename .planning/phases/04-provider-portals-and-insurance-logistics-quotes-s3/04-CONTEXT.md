# Phase 4: Provider Portals and Insurance/Logistics Quotes (S3) - Context

**Gathered:** 2026-03-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Insurance and logistics providers receive and respond to quote requests, and buyers compare quotes and select providers — with server-enforced validity and correct data visibility. Logistics providers never see deal price. After selection, the deal advances to the next stage.

</domain>

<decisions>
## Implementation Decisions

### Quote Request Distribution
- Broadcast to all registered providers of the matching type (insurance or logistics) — no buyer selection of specific providers
- Auto-triggered on contract approval (deal status becomes contract_approved) — zero friction
- One round only per deal per provider type — no re-requesting
- Providers can explicitly decline a request (removes from their active list, buyer sees who declined)
- Both buyer and seller can view incoming quotes and selections, but only buyer can select
- Providers do NOT see how many other providers are quoting — blind competition
- Fixed 72-hour deadline for providers to submit quotes (consistent with existing offer expiry)
- Per-quote in-app notification to buyer as quotes arrive (reuses existing notification system)
- Providers can edit/revise their quote before the submission deadline
- Providers can withdraw their submitted quote before buyer acceptance
- Real-time quote updates via Firestore listeners (consistent with deal negotiation pattern)
- Buyer can accept a quote anytime — no need to wait for deadline to pass (early selection)

### Provider Portal Experience
- Kanban-style visual columns: New Requests, Quoted, Declined, Selected — visual groupings only, no drag-and-drop
- Rich preview per kanban card: product name, origin → destination route, quantity, Incoterm, deadline countdown, status badge
- Separate provider route (e.g., /provider/dashboard) — not integrated into existing dashboard
- Shared layout for insurance and logistics providers — same kanban structure, only the quote form fields differ
- Side-by-side layout for quote detail view: deal info on left, quote form on right (mirrors DealPage two-column pattern)
- Single-page quote form for both insurance and logistics (not wizard/multi-step)
- All providers notified on selection: winning provider gets "Your quote was accepted", others get "Another provider was selected"

### Insurance Quote Form Fields
- ICC coverage type selector: A (All Risks), B (Named Perils Extended), C (Named Perils Basic)
- War Clause and Strikes Clause as optional add-ons
- Premium amount, coverage amount, deductible/franchise percentage
- Claims payment period (business days)
- Policy validity period (start/end dates)
- Coverage scope (warehouse-to-warehouse, port-to-port, door-to-door)
- Certificate type, currency, notes/special conditions
- Quote validity period set by provider (e.g., 12h, 24h, 48h)
- Reference mockup: `other_items/sigorta-teklif-portali.html`

### Logistics Quote Form Fields
- Transport mode: Sea, Air, Road, Rail, Multimodal
- Container type (20ft, 40ft, 40ft HC, etc.) — relevant for sea freight
- Pricing (total freight cost), estimated timeline, loading date, estimated arrival
- Quote validity period set by provider
- Provider-entered capability tags (GPS Tracking, Cold Chain, Door-to-Door, Customs Support, etc.)
- Notes/special conditions

### Quote Comparison & Selection (Buyer View)
- Adapted to existing DealPage two-column pattern (main content + sidebar), not the mockup's three-column
- Insurance and logistics quote sections shown side-by-side, stacked vertically on mobile
- Filter pills: logistics by transport mode (All, Sea, Road, Air, Rail), insurance by coverage type (All, Full, Basic, ICC A/B/C)
- Sort options: by price (low/high), timeline (fastest), validity (most time remaining)
- Auto-calculated ribbons on cards: "Best Value", "Fastest", "Cheapest"
- Live pulse indicator with real-time quote count
- Quote cards show: provider name + location (no ratings/stars in v1), pricing, coverage/mode details, capability tags, validity countdown + select button
- Full deal contract details visible in the quote request (product, quantity, Incoterms, named place, delivery deadline, payment terms — minus price for logistics)
- Reference mockup: `other_items/S3-sigorta-tasima.html`

### Confirmation & Cost Summary
- Cost breakdown updates live as buyer selects/deselects quotes
- No platform service fee in v1 — breakdown: goods value + freight cost + insurance premium = total
- Allow partial selection (buyer can confirm with just one provider type if deal doesn't require both — e.g., EXW may not need insurance)
- Inline confirmation + redirect to deal summary/tracking page (no modal)
- Trade process stepper in sidebar — functional, reflecting actual deal progress through all stages (negotiation, agreement, contract, insurance & transport)

### Data Visibility Rules
- Insurance providers see full deal info INCLUDING price
- Logistics providers see full deal info EXCLUDING price — enforced at data layer (Firestore rules)
- Both buyer and seller can view all quotes and the selection process

### Claude's Discretion
- Exact card spacing, shadows, and responsive breakpoints
- Loading skeleton design for quote cards
- Empty state when no quotes have arrived yet
- Error state handling for failed quote submissions
- Kanban column styling and card animation
- Provider portal mobile responsiveness approach
- Risk analysis sidebar design on provider quote form (reference mockup available)

</decisions>

<specifics>
## Specific Ideas

- Reference `other_items/S3-sigorta-tasima.html` for buyer quote comparison view — follow UI language and color coding (blue for logistics, green for insurance)
- Reference `other_items/sigorta-teklif-portali.html` for provider quote submission form — ICC scope selector, cargo detail grid, risk analysis sidebar
- Adapt mockup layouts to existing DealPage two-column pattern (main ~70%, sidebar ~30%)
- Trade process stepper should be functional and show actual deal progress, not static
- Follow existing app's dark theme UI language and component patterns

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `CountdownTimer` component: Existing countdown with color thresholds (green/yellow/red). Reusable for quote validity timers
- `DealPage` two-column layout: Desktop two-column, mobile stacked. Pattern to follow for quote comparison view
- `DealSidebar`: Existing sidebar pattern for deal metadata — extend for selections + cost breakdown
- `DealCard`: Card component for deal lists — pattern reference for quote cards
- `OfferTimeline`: Timeline component — pattern reference for trade process stepper
- `ProductHero`: Hero section pattern — reusable for quote page hero
- Notification system: In-app + FCM + email notifications already built in Phase 2
- `DEAL_STATUS` state machine: `CONTRACT_APPROVED` is the terminal state that triggers Phase 4
- `INSURANCE_PREFERENCE` enum: Already tracks buyer/seller insurance responsibility per Incoterm

### Established Patterns
- Repository pattern: Create `QuoteRepository`, `QuoteRequestRepository` following existing `DealRepository`/`ContractRepository`
- Cloud Functions: Server-side validation and state transitions (existing pattern from deals + contracts)
- Firestore real-time listeners: `onSnapshot` pattern used throughout deal negotiation
- DI container: All repositories registered in `src/core/di/container.js`
- Constants pattern: Create `quoteConstants.js` following `dealConstants.js`/`contractConstants.js`
- Hooks pattern: Create `useQuotes`, `useQuoteRequest` following existing `useDeal`, `useDealActions`

### Integration Points
- `DEAL_STATUS.CONTRACT_APPROVED` triggers auto-creation of quote requests (new Cloud Function)
- New Firestore collections needed: `quoteRequests`, `quotes` (or subcollections under deals)
- New routes: `/provider/dashboard`, `/deals/[dealId]/quotes`
- Middleware: Route protection for provider portal routes (role-based, existing pattern)
- `COLLECTIONS` and `SUBCOLLECTIONS` constants need new entries
- Deal status needs new value after provider selection (e.g., `providers_selected`)

</code_context>

<deferred>
## Deferred Ideas

- Provider ratings and review system — future phase (no ratings in v1, just name + location)
- Draft quote saving for providers — could be added in Phase 7 hardening
- Risk analysis/scoring system for cargo (shown in mockup but complex) — future enhancement

</deferred>

---

*Phase: 04-provider-portals-and-insurance-logistics-quotes-s3*
*Context gathered: 2026-03-02*
