---
status: diagnosed
phase: 06-trade-summary-shipment-tracking
source: 06-01-SUMMARY.md, 06-02-SUMMARY.md, 06-03-SUMMARY.md, 06-04-SUMMARY.md, 06-05-SUMMARY.md
started: 2026-03-30T00:00:00Z
updated: 2026-03-30T15:25:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Trade Summary Tab Visibility & Auto-Switch
expected: Navigate to a deal in PROVIDERS_SELECTED or DELIVERED status. The DealPage should show a tab switcher with "Negotiation" and "Trade Summary" tabs. The tab should auto-switch to "Trade Summary" for these statuses.
result: pass

### 2. Summary Hero Banner
expected: On the Trade Summary tab, a dark-themed hero banner displays the deal status icon, product name, quantity/price/incoterm stats, and a color-coded shipment tracking pill (green=delivered, blue=in transit, yellow=at customs).
result: pass

### 3. Deal Overview Section
expected: Trade Summary shows a card layout with product name, price per unit, quantity, total value, incoterm, named place, and payment terms as key-value pairs.
result: pass

### 4. Parties & Providers Section
expected: Shows buyer and seller party cards with actual names. Below them, selected insurance provider (coverage type, premium, validity) and logistics provider (transport mode, freight cost, transit days). If providers not yet selected, shows "Pending provider selection" with clock icon.
result: issue
reported: "Trade parties show placeholder 'Buyer' and 'Seller' text instead of actual user names"
severity: major

### 5. Cost Breakdown Section
expected: Shows product cost (price x quantity) + insurance premium + logistics fee = total amount. Values show as "Pending" if provider quotes not yet available.
result: pass

### 6. Documents Section
expected: Shows a link to the contract PDF (navigates to /deals/{dealId}/contract). Also shows placeholder slots for Insurance Certificate, Bill of Lading, Commercial Invoice, and Packing List.
result: pass

### 7. Legal Consulting Section
expected: If you have engaged a lawyer on this deal, shows your lawyer's info (status badge, profile link, legal channel link). If no legal counsel, shows a "No legal counsel" message with a "Find a Lawyer" link. Should NOT show the other party's lawyer info.
result: pass

### 8. Trade Route Map & Order Timeline in Sidebar
expected: Right sidebar of Trade Summary shows a dark-themed SVG map with gold origin pin and blue destination pin connected by a dashed route line. Below the map, an OrderTimeline displays chronological milestones (deal status changes, shipment updates, insurance coverage) as a vertical timeline.
result: issue
reported: "pass but the world map looks like shit we need to draw a realistic world map"
severity: cosmetic

### 9. DealCard Tracking Badge & ETA
expected: On the deals list page, deals with active shipments show a tracking status badge (using shipment status labels) and ETA display on the DealCard.
result: issue
reported: "after buyer or seller selected quotes doesn't navigate automatically to the trade summary. Also logistics provider can not update status there is no place for that. These are major issues. Permission error - user can not read this trade summary."
severity: blocker

### 10. Deals Page Status Summary & Activity Feed
expected: The member deals page shows status summary cards at the top (counts of active, completed deals etc.), a recent activity feed showing latest deal notifications, and an active shipments section. A "New Deal" quick action button is visible.
result: issue
reported: "New Deal button text is yellow needs to be black. Clicking button shows 'Missing conversation or product context' error."
severity: major

### 11. Provider Dashboard - Active Shipments Tab
expected: As a logistics provider, the provider dashboard shows a second tab "Active Shipments" alongside "Quote Requests". Clicking it shows deal cards for selected shipments with product name, buyer/seller, current status badge, container number, tracking ref, and ETA countdown.
result: issue
reported: "it is total empty even buyer-seller selected that logistics provider"
severity: blocker

### 12. Shipment Status Update Form
expected: As a logistics provider on the Active Shipments tab, expanding a deal card reveals a shipment update form. The status dropdown only allows forward progression (statuses at or before current are disabled). Container number and tracking ref are required on first update. Submitting shows a success toast and updates the status badge.
result: skipped
reason: Blocked by test 11 — Active Shipments tab is empty

### 13. Insurance Coverage Confirmation
expected: As an insurance provider, the provider dashboard shows an "Active Shipments" tab with deal cards. Each card has a "Confirm Coverage" button. Clicking it confirms coverage (success toast). After confirmation, the button changes to "Coverage Active" (green, disabled). Re-clicking is prevented (idempotent).
result: skipped
reason: Blocked by test 11 — Active Shipments tab is empty

### 14. Admin Trade Overview Stats
expected: On the admin dashboard, a "Trade Overview" section shows stat cards for total deals, active shipments, and delivered deal count.
result: pass

### 15. Print / PDF Export
expected: On the Trade Summary tab, clicking the Print/PDF button triggers the browser's print dialog. The print preview shows a clean layout with white background, proper margins, and no navigation/sidebar elements.
result: issue
reported: "Member users get permission error on Trade Summary. Print output shows localhost link at the bottom."
severity: major

## Summary

total: 15
passed: 7
issues: 6
pending: 0
skipped: 2

## Gaps

- truth: "Parties & Providers section shows actual buyer/seller names"
  status: failed
  reason: "User reported: Trade parties show placeholder 'Buyer' and 'Seller' text instead of actual user names"
  severity: major
  test: 4
  root_cause: "PartiesProvidersSection.jsx lines 136-137 pass hardcoded label='Buyer'/'Seller' instead of actual names. Deal entity doesn't map buyerName/sellerName from Firestore. useTradeSummary doesn't fetch user profiles."
  artifacts:
    - path: "src/presentation/components/features/deal/TradeSummary/PartiesProvidersSection.jsx"
      issue: "Hardcoded label='Buyer'/'Seller' on PartyCard components (lines 136-137)"
    - path: "src/domain/entities/Deal.js"
      issue: "Does not map buyerName/sellerName fields from Firestore"
    - path: "src/presentation/hooks/deal/useTradeSummary.js"
      issue: "Does not fetch user profiles for buyerId/sellerId"
  missing:
    - "Map buyerName/sellerName in Deal.fromFirestore() or fetch user profiles in useTradeSummary"
    - "Pass actual names to PartyCard label prop"

- truth: "Trade Route Map displays a realistic world map"
  status: failed
  reason: "User reported: pass but the world map looks like shit we need to draw a realistic world map"
  severity: cosmetic
  test: 8
  root_cause: "TradeRouteMap.jsx uses 6 crude hardcoded SVG polygons (5-7 vertices each) as continent shapes. Pin positions are fixed at (80,80) and (320,90) regardless of actual trade route."
  artifacts:
    - path: "src/presentation/components/features/deal/TradeSummary/TradeRouteMap.jsx"
      issue: "Crude polygon approximations, fixed pin positions, no geographic data"
  missing:
    - "Replace with Natural Earth 110m SVG paths for realistic continent outlines (~10KB gzipped)"
    - "Add location lookup table for dynamic pin positioning"

- truth: "Auto-navigation to trade summary after provider selection, logistics provider can update shipment status, member users can read trade summary without permission errors"
  status: failed
  reason: "User reported: after buyer or seller selected quotes doesn't navigate automatically to the trade summary. Also logistics provider can not update status there is no place for that. Permission error - user can not read this trade summary."
  severity: blocker
  test: 9
  root_cause: "Two Firestore permission failures: (1) shipmentTracking rule uses resource.data.dealBuyerId but query has no matching where clause — Firestore can't validate; (2) QuoteRepository.subscribeToQuotesForDeal uses collectionGroup query without where('participants','array-contains',uid). Error callbacks in repositories only console.error, never set *Loaded flags → infinite loading. Navigation works but destination fails."
  artifacts:
    - path: "firestore.rules"
      issue: "shipmentTracking rule (lines 291-298) uses resource.data fields but query has no where clause to satisfy it"
    - path: "src/data/repositories/QuoteRepository.js"
      issue: "subscribeToQuotesForDeal (lines 82-87) missing participants filter"
    - path: "src/data/repositories/ShipmentRepository.js"
      issue: "subscribeToShipmentUpdates (lines 48-51) has no where clause for rule"
    - path: "src/presentation/hooks/deal/useTradeSummary.js"
      issue: "onSnapshot error callbacks never set *Loaded flags → infinite loading"
  missing:
    - "Fix shipmentTracking rule to use get() on parent deal doc (like offers/contract rules)"
    - "Add where('participants','array-contains',uid) to subscribeToQuotesForDeal"
    - "Handle onSnapshot errors gracefully — set loaded flags and surface error state"

- truth: "New Deal button has readable text and navigates correctly"
  status: failed
  reason: "User reported: New Deal button text is yellow needs to be black. Clicking button shows 'Missing conversation or product context' error."
  severity: major
  test: 10
  root_cause: "Button links to /deals/new without required conversationId/productId query params. The /deals/new page guards against missing params (lines 65-71). Button text color may be CSS specificity override of text-[#0F1B2B]."
  artifacts:
    - path: "src/app/(main)/deals/page.jsx"
      issue: "New Deal button (lines 330-336) links to /deals/new without required params"
    - path: "src/app/(main)/deals/new/page.jsx"
      issue: "Guards on missing conversationId/productId (lines 44-45, 65-71)"
  missing:
    - "Change button to link to /marketplace or /messages instead of /deals/new"
    - "Fix button text color — ensure dark text on gold background"

- truth: "Active Shipments tab shows deal cards for providers who have been selected"
  status: failed
  reason: "User reported: it is total empty even buyer-seller selected that logistics provider"
  severity: blocker
  test: 11
  root_cause: "Missing composite Firestore index for providerUid+status+providerType on quoteRequests collection. Existing indexes cover providerUid+createdAt, dealId+createdAt, status+deadline but NOT the 3-field combination. Query fails with FAILED_PRECONDITION. Secondary: old quoteRequests may have providerType='logistics_provider' instead of 'logistics'."
  artifacts:
    - path: "firestore.indexes.json"
      issue: "Missing composite index for providerUid+status+providerType on quoteRequests"
    - path: "src/presentation/hooks/provider/useActiveShipments.js"
      issue: "Query at lines 212-217 requires 3-field composite index that doesn't exist"
  missing:
    - "Add composite index: quoteRequests(providerUid ASC, status ASC, providerType ASC)"
    - "Deploy index: firebase deploy --only firestore:indexes"
    - "Check/backfill old providerType values (logistics_provider → logistics)"

- truth: "Member users can view and print Trade Summary; print output has no localhost URLs"
  status: failed
  reason: "User reported: Member users get permission error on Trade Summary. Print output shows localhost link at the bottom."
  severity: major
  test: 15
  root_cause: "Permission error is same root cause as test 9 (shipmentTracking + providerQuotes rules). Localhost link is browser default print header/footer — @page rule has margins where browser renders URL. Fix: set @page margin:0 and use body margin instead."
  artifacts:
    - path: "src/app/globals.css"
      issue: "@page rule (lines 1214-1217) has margins where browser renders URL in footer"
  missing:
    - "Set @page { margin: 0 } and add body margin in @media print to clip browser chrome"
