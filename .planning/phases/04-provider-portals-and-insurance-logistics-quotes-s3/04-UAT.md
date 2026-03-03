---
status: diagnosed
phase: 04-provider-portals-and-insurance-logistics-quotes-s3
source: 04-01-SUMMARY.md, 04-02-SUMMARY.md, 04-03-SUMMARY.md, 04-04-SUMMARY.md, 04-05-PLAN.md
started: 2026-03-03T00:00:00Z
updated: 2026-03-03T17:20:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Provider Dashboard Access & Kanban Layout
expected: Navigate to /provider/dashboard as a provider. See 4-column kanban (New Requests, Quoted, Declined, Selected) with color dots and count badges. Provider type badge in header. /provider redirects to /provider/dashboard.
result: pass

### 2. Kanban Card & Quote Detail View
expected: Click a request card in the kanban. Two-column detail view opens showing deal info (product, quantity, incoterm, payment terms, currency, delivery deadline). Insurance providers see price per unit and estimated total. Logistics providers do NOT see any price fields.
result: pass
note: User requests quote history per request (not currently available)

### 3. Insurance Quote Form Submission
expected: In the detail view as insurance provider, fill quote form (ICC coverage type, premium, coverage amount, deductible %, war/strikes clauses, policy start/end dates, coverage scope, validity, notes). Submit creates quote. Card moves to Quoted column. Clicking again shows form pre-filled for editing.
result: pass
note: Permission error on provider invitation onboarding screen (separate bug, not form itself)

### 4. Logistics Quote Form Submission
expected: In the detail view as logistics provider, fill quote form (transport mode, freight cost, transit days, loading/arrival dates, validity, capability tags, notes). Selecting "sea" transport mode shows container type field. Submit creates quote. Card moves to Quoted column.
result: pass

### 5. DealPage Quotes Banner
expected: For a deal with contract_approved status, DealPage shows a blue banner reading "Insurance and Logistics Quotes Available" with a "Compare Quotes" link. Clicking the link navigates to /deals/[dealId]/quotes. The yellow contract banner only appears for ACCEPTED deals, not contract_approved.
result: pass

### 6. DealSidebar Progress Tracker
expected: Progress tracker stepper shows 4 steps (Negotiation, Agreement, Quotes, Tracking). Active step reflects deal status: negotiation for active deals, agreement for accepted, quotes for contract_approved, tracking for providers_selected.
result: pass

### 7. Buyer Quotes Comparison Page
expected: Navigate to /deals/[dealId]/quotes as buyer. Page shows two sections: Insurance Quotes (green accent) and Logistics Quotes (blue accent). Each section has filter pills and sort select. Quote cards show provider details, pricing, countdown timers. Auto-calculated ribbon badges (Cheapest, Fastest, Best Value) appear on qualifying cards.
result: issue
reported: "I can not see cards(quotes) even I sent as a logistics and insurance provider but other things are available"
severity: major

### 8. Quote Selection & Cost Breakdown
expected: On the quotes comparison page, select an insurance quote and a logistics quote. Sidebar shows trade process stepper, selection summary with selected provider names, and live cost breakdown (goods + freight + premium = total). Confirm button is disabled until at least one provider selected, then becomes enabled.
result: issue
reported: "failed because I can not see any quotes for insurance and logistics"
severity: blocker

### 9. Confirm Provider Selection
expected: Click Confirm Selections button on the quotes page. Deal advances to providers_selected status. DealPage now shows a blue "Providers Selected" terminal banner. DealCard shows a blue "Providers Selected" badge. Progress tracker shows tracking step as active.
result: issue
reported: "still the same issue I can not select because there is no quotes for insurance or logistics"
severity: blocker

### 10. Provider Decline & Withdraw Actions
expected: As a provider with a pending request, click Decline — request moves to Declined column. As a provider with a submitted quote, click Withdraw — quote is withdrawn. Both actions update kanban in real-time.
result: issue
reported: "decline works as expected but I can not see anything related to withdrawn"
severity: major

## Summary

total: 10
passed: 6
issues: 4
pending: 0
skipped: 0

## Gaps

- truth: "Quote cards visible on buyer quotes comparison page"
  status: failed
  reason: "User reported: I can not see cards(quotes) even I sent as a logistics and insurance provider but other things are available"
  severity: major
  test: 7
  root_cause: "broadcastQuoteRequests stored providerType as raw role ('insurance_provider'/'logistics_provider') but useQuotesForDeal hook filters by short-form ('insurance'/'logistics'). Filter never matches, so quote arrays are always empty."
  artifacts:
    - path: "functions/index.js"
      issue: "broadcastQuoteRequests stores providerType as user role instead of short-form"
    - path: "src/presentation/hooks/quote/useQuotesForDeal.js"
      issue: "Filters by q.providerType === 'insurance' which never matches 'insurance_provider'"
  missing:
    - "Normalize providerType to short-form in broadcastQuoteRequests"
    - "Add normalizeProviderType in Quote.fromFirestore and QuoteRequest.fromFirestore for existing data"

- truth: "Select insurance and logistics quotes with cost breakdown"
  status: failed
  reason: "User reported: failed because I can not see any quotes for insurance and logistics"
  severity: blocker
  test: 8
  root_cause: "Downstream of Gap 7 — no quotes rendered means nothing to select"
  artifacts: []
  missing: []

- truth: "Confirm provider selection advances deal to providers_selected"
  status: failed
  reason: "User reported: still the same issue I can not select because there is no quotes for insurance or logistics"
  severity: blocker
  test: 9
  root_cause: "Downstream of Gap 7 — no quotes rendered means nothing to confirm"
  artifacts: []
  missing: []

- truth: "Provider can withdraw a submitted quote"
  status: failed
  reason: "User reported: decline works as expected but I can not see anything related to withdrawn"
  severity: major
  test: 10
  root_cause: "ProviderDashboard.jsx hardcodes existingQuote={null} when rendering QuoteDetailView. Withdraw button checks existingQuote?.isActive() which is always falsy. No hook exists to fetch provider's existing quote for a request."
  artifacts:
    - path: "src/presentation/components/features/provider/ProviderDashboard/ProviderDashboard.jsx"
      issue: "existingQuote={null} hardcoded at line 84"
    - path: "src/presentation/components/features/provider/QuoteDetailView/QuoteDetailView.jsx"
      issue: "Withdraw button conditional at line 206 depends on existingQuote prop"
  missing:
    - "Create useQuoteForRequest hook using QuoteRepository.subscribeToQuotesForRequest()"
    - "Wire hook into ProviderDashboard to pass existingQuote to QuoteDetailView"

## Additional Bugs (out of scope for Phase 4 tests)

- Provider invitation onboarding screen: "Missing or insufficient permissions" error
- Contract clause approval: sometimes requires multiple clicks to register
- DealPage banner for contract_approved deals: shows "Coming in Phase 4" instead of "Compare Quotes" link on some deals
