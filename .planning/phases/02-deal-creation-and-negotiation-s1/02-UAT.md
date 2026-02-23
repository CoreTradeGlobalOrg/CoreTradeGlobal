---
status: complete
phase: 02-deal-creation-and-negotiation-s1
source: 02-01-SUMMARY.md, 02-02-SUMMARY.md, 02-03-SUMMARY.md, 02-04-SUMMARY.md
started: 2026-02-23T00:00:00Z
updated: 2026-02-23T00:10:00Z
---

## Current Test

[testing complete]

## Tests

### 1. My Deals Nav Link
expected: When logged in as a member or admin, the Navbar shows a "My Deals" link (after RFQs). Clicking it navigates to /deals. Guests, providers, and lawyers should NOT see this link.
result: issue
reported: "when logged in as a member I saw my deals but it when I try to navigate I got this error 'Missing or insufficient permissions.'"
severity: major

### 2. Initiate Deal Button in Chat
expected: Open a product-based direct message conversation. An "Initiate Deal" button (with Handshake icon) should appear in the conversation header. It should NOT appear in group chats or conversations without a product.
result: pass

### 3. Deal Creation Page Load
expected: Clicking "Initiate Deal" navigates to /deals/new. The page shows the product image/name and the other party's company name in a header card, followed by the deal form with all 12 offer fields (price, quantity, unit, currency, conversion rate, incoterm, named place, delivery deadline, payment terms, insurance preference, notes, expiry hours).
result: issue
reported: "as an admin I can create but as member 'Missing or insufficient permissions.'"
severity: major

### 4. Incoterms Selector
expected: The Incoterms section shows 11 clickable pills (EXW, FCA, FAS, FOB, CFR, CIF, CPT, CIP, DAP, DPU, DDP). Hovering a pill shows a tooltip with description. Selecting one highlights it in gold with a glow effect and shows the selected label below the pills.
result: pass

### 5. Named Place Autocomplete
expected: After selecting an Incoterm, the Named Place input becomes enabled. Typing a city name (e.g. "Istanbul") shows a dropdown with up to 10 autocomplete results from UN/LOCODE data. Selecting a result fills the input. The label and placeholder change based on the selected Incoterm.
result: pass

### 6. Deal Form Validation & Estimated Total
expected: A live "Estimated Total" callout (gold box) updates as you change price and quantity. If currency differs from product base currency, a conversion rate field appears. Submitting with missing required fields shows validation errors. The notes field shows a character counter (max 2000).
result: issue
reported: "pass but I mentioned before if user change currency we need a api to conversion rate and change the price and I found product's quantity and unit doesnt pass the deal screen, and unit and quantities are not same with the product's quantity"
severity: major

### 7. Deal Submission
expected: Filling all required fields and clicking submit creates the deal. A loading spinner shows during submission. On success, you are redirected to the deal negotiation page (/deals/[dealId]).
result: issue
reported: "pass but I can't hear any notification sound or push notification for other user"
severity: major

### 8. My Deals Page
expected: Navigating to /deals shows your deals with three tab filters: All, Active (negotiating), and Completed (accepted/rejected/expired/withdrawn). The Active tab shows a badge count. Loading state shows 4 skeleton placeholder cards. Empty state shows a contextual message.
result: issue
reported: "I test in on admin it works I start to create composite index for firestore so as an admin pass as a member permission error"
severity: major

### 9. Deal Card Display
expected: Each deal card shows: product image (or Package icon fallback), color-coded status badge (green=negotiating, blue=accepted, red=rejected, gray=expired/withdrawn), latest offer summary (total price, unit price x quantity, Incoterm), turn indicator ("Your turn" with pulsing green dot OR "Waiting for..."), and relative timestamp. Hovering shows gold border.
result: issue
reported: "I can't check accepted or rejected due to member can not go to deal detail also permission"
severity: major

### 10. Deal Negotiation Page Layout
expected: Clicking a deal card navigates to /deals/[dealId]. The page shows a two-column layout on desktop (main content + sidebar) and single column on mobile. A ProductHero card at top links back to the product page. The offer timeline shows below.
result: issue
reported: "as admin pass, member permission error again"
severity: major

### 11. Offer Timeline & Color Coding
expected: The offer timeline shows chronological offer cards. Buyer offers have green accent, seller offers have gold accent, system cards (e.g. "Deal Initiated") have dashed neutral style. If there are more than 4 offers, earlier ones collapse behind a "Show earlier offers" toggle. Changed fields between rounds are highlighted with yellow background + strikethrough old value + arrow + new value.
result: skipped
reason: blocked by member permission issue - can't test two-party negotiation flow

### 12. Counter-Offer Form (Turn-Based)
expected: When it's your turn, a counter-offer form appears below the timeline, pre-filled with the latest offer values. It reuses the same Incoterms and Named Place inputs. When it's NOT your turn, a "Waiting for [Party]..." message with a Clock icon is shown instead.
result: skipped
reason: blocked by member permission issue - admin side shows "Waiting for the other party" correctly

### 13. Accept/Reject/Withdraw with Confirmation
expected: On the latest open offer: if it's your turn, Accept and Reject buttons appear. If you submitted the offer, a Withdraw button appears. Clicking any action shows an inline confirmation step (Confirm/Cancel) before executing. After execution, the deal shows a terminal state banner (green=accepted, red=rejected, gray=withdrawn).
result: skipped
reason: blocked by member permission issue - admin-side Withdraw works, gray withdrawn badge confirmed

### 14. Countdown Timer
expected: When an offer has an expiry time, a live countdown timer is displayed. It counts down second-by-second. Color changes based on urgency: green (>4h), yellow (<4h), red (<1h). Shows "Expired" badge when time runs out. Timer is hidden when deal is in a terminal state.
result: pass

### 15. Deal Sidebar
expected: The sidebar shows three sections: (1) Party Info Cards with company name, country, member since, verified badge (your card highlighted in gold), (2) Progress Tracker with vertical steps (Negotiation active in gold, future steps in gray), (3) Current Offer Summary with price, quantity, total, Incoterm, payment terms, round number, and "whose turn" indicator.
result: pass

### 16. Online Presence Indicator
expected: When the other party is also viewing the deal page, a green dot with "[Name] is viewing" appears at the top of the sidebar. When they leave, it disappears (within ~60 seconds).
result: skipped
reason: blocked by member permission issue - can't have two parties viewing simultaneously

## Summary

total: 16
passed: 5
issues: 7
pending: 0
skipped: 4

## Gaps

- truth: "My Deals page loads without errors when navigating to /deals as a member"
  status: failed
  reason: "User reported: when logged in as a member I saw my deals but it when I try to navigate I got this error 'Missing or insufficient permissions.'"
  severity: major
  test: 1
  artifacts: []
  missing: []

- truth: "Deal creation page loads for member users"
  status: failed
  reason: "User reported: as an admin I can create but as member 'Missing or insufficient permissions.'"
  severity: major
  test: 3
  artifacts: []
  missing: []

- truth: "Product quantity and unit pre-fill into deal form, currency conversion API available"
  status: failed
  reason: "User reported: product's quantity and unit doesnt pass the deal screen, and unit and quantities are not same with the product's quantity. Need API for currency conversion rate."
  severity: major
  test: 6
  artifacts: []
  missing: []

- truth: "Other party receives notification sound and push notification when deal is created"
  status: failed
  reason: "User reported: can't hear any notification sound or push notification for other user"
  severity: major
  test: 7
  artifacts: []
  missing: []

- truth: "My Deals page works for member role (not just admin)"
  status: failed
  reason: "User reported: as an admin pass as a member permission error"
  severity: major
  test: 8
  artifacts: []
  missing: []

- truth: "Deal card status badges testable for all states (member can access deal detail)"
  status: failed
  reason: "User reported: can't check accepted or rejected due to member can not go to deal detail also permission"
  severity: major
  test: 9
  artifacts: []
  missing: []

- truth: "Deal negotiation page accessible by member users"
  status: failed
  reason: "User reported: as admin pass, member permission error again"
  severity: major
  test: 10
  artifacts: []
  missing: []

- truth: "Deal initiated system message shows as formatted text with a 'Check the Deal' button linking to deal detail"
  status: failed
  reason: "User reported: system message shows 'Deal initiated for Industrial Lighting. View deal: /deals/MtzFs6Mj26WttiSOPPbG' but should be formatted text with a check the deal button"
  severity: major
  test: 14
  artifacts: []
  missing: []
