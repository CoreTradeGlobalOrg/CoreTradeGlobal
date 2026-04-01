---
phase: 06-trade-summary-shipment-tracking
verified: 2026-04-01T15:45:00Z
status: human_needed
score: 20/20 must-haves verified
re_verification:
  previous_status: human_needed
  previous_score: 18/18
  gaps_closed:
    - "Member users and providers can view shipmentTracking docs without permission errors (readers array denormalized on docs; Firestore rules simplified to isAuthenticated(); useActiveShipments filters by readers array-contains uid)"
    - "Browse Marketplace button links to /products (not /marketplace which did not exist); !text-black applied for reliable contrast on gold background"
    - "InsuranceCoverageTab CoverageCard has per-card confirming state preventing double-click during async confirmation"
    - "useDeal subscription error callback sets dealLoaded and calls checkLoaded, preventing infinite loading spinner on inaccessible deals"
  gaps_remaining: []
  regressions:
    - "Truth #17 wording updated: href corrected from /marketplace to /products (plan 06-10 treated /marketplace as the wrong destination; /products is the actual marketplace route)"
human_verification:
  - test: "Open a deal in PROVIDERS_SELECTED status as buyer or seller. Check that Trade Summary tab auto-selects. Verify Parties & Providers section shows actual company/display names for buyer and seller (not placeholder Buyer/Seller text)."
    expected: "Actual company names (or displayNames) appear for both parties. Right sidebar shows TradeRouteMap with recognizable continental outlines and OrderTimeline with deal milestones."
    why_human: "User name resolution from Firestore and map visual quality require a live browser session with real Firestore data."
  - test: "As a logistics provider with a selected quote, open the provider dashboard Active Shipments tab. Verify deal cards are shown for all deals where you are the selected logistics provider."
    expected: "Active Shipments tab is not empty; deal cards appear with product name, current status, and an expandable ShipmentUpdateForm. Submitting an update changes the deal currentShipmentStatus and notifies buyer/seller. Deploy required first: firebase deploy --only firestore:rules && firebase deploy --only firestore:indexes (do NOT use --force on indexes)."
    why_human: "Requires live Firebase environment with deployed composite indexes (readers+timestamp on shipmentTracking; providerUid+status+providerType on quoteRequests) and a real selected quoteRequest document."
  - test: "On the Trade Summary tab, click Print/PDF. Check print preview footer area."
    expected: "Print preview shows no localhost URL in the page footer. Instead shows coretradeglobal.com branded footer at bottom. Content has approximately 20mm top/bottom, 25mm bottom padding, 15mm side padding. No navigation or sidebar elements visible."
    why_human: "Browser print rendering and @page CSS behavior require a live browser session to confirm."
  - test: "As an insurance provider, click Confirm Coverage on a deal. Attempt to click it rapidly a second time."
    expected: "First click sets confirming=true, button disables (guarded by isCoverageActive || actionLoading || confirming). On success, button transitions to Coverage Active. Second rapid click does nothing. Finally block resets confirming on completion or error."
    why_human: "Requires live Firebase environment for Cloud Function invocation and real-time Firestore idempotency check."
  - test: "On the member deals page, confirm the Browse Marketplace button is visible with black text on gold background and navigates to /products without errors."
    expected: "Button reads Browse Marketplace, text is black (!text-black), background is gold #FFD700. Clicking navigates to /products with no console errors."
    why_human: "Visual contrast with !text-black Tailwind modifier and client-side navigation require a live browser session."
  - test: "Navigate to a deal page when the deal document is inaccessible or deleted."
    expected: "Deal page shows loading=false after subscription error (does not hang with infinite spinner). Error state or empty deal is rendered gracefully."
    why_human: "Requires a live environment with an inaccessible deal to trigger the error path added to useDeal.js."
---

# Phase 6: Trade Summary and Shipment Tracking — Verification Report

**Phase Goal:** Build the Trade Summary tab and shipment-tracking layer so every accepted deal shows a consolidated view of all trade details plus live shipment updates.
**Verified:** 2026-04-01T15:45:00Z
**Status:** human_needed
**Re-verification:** Yes — fourth verification pass, after gap closure plans 06-09 and 06-10

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | DELIVERED status exists in deal state machine and is the true terminal state | VERIFIED | `dealConstants.js`: `DELIVERED: 'delivered'`; `VALID_DEAL_TRANSITIONS` maps `PROVIDERS_SELECTED -> [DELIVERED]`, `DELIVERED -> []`; `Deal.isTerminal()` includes DELIVERED |
| 2 | Shipment tracking subcollection exists with Firestore rules allowing any authenticated user to read and CF-only writes | VERIFIED | `firestore.rules` line 266: `allow read: if isAuthenticated()`; line 267: `allow write: if false` — simplified from resource.data field checks by plan 06-09 |
| 3 | submitShipmentUpdate and confirmInsuranceCoverage Cloud Functions exist, validate provider authorization, and write readers array on shipmentTracking docs | VERIFIED | `functions/index.js` line 3228: `readers: [deal.buyerId, deal.sellerId, uid]` in submitShipmentUpdate; line 3351: same in confirmInsuranceCoverage — added by plan 06-09 commit 296a242 |
| 4 | Buyer and seller can view a trade summary tab from CONTRACT_APPROVED onwards | VERIFIED | `DealPage.jsx` lines 132-139: `showSummaryTab` enabled for CONTRACT_APPROVED, PROVIDERS_SELECTED, DELIVERED, ACCEPTED; TradeSummaryTab renders all 7 sections |
| 5 | Summary shows deal overview, parties, providers, costs, documents, legal info | VERIFIED | All 7 sub-components present and substantive: DealOverviewSection, PartiesProvidersSection, CostBreakdownSection, DocumentsSection, LegalConsultingSection, SummaryHeroBanner, TradeInfoBar |
| 6 | LegalConsultingSection shows only current user's lawyer — never opposing party's | VERIFIED | `LegalConsultingSection.jsx` line 68: `legalEngagement?.clientId === currentUserUid ? legalEngagement : null` |
| 7 | Logistics provider can submit shipment status updates via provider dashboard | VERIFIED | `useActiveShipments.js` line 274: `httpsCallable(functions, 'submitShipmentUpdate')`; `ActiveShipmentsTab.jsx` (253 lines) renders ShipmentUpdateForm per deal |
| 8 | Insurance coverage confirmation is idempotent and guarded against double-click | VERIFIED | `functions/index.js` line 3292: deterministic doc ID `coverage_${dealId}` with transaction idempotency; `InsuranceCoverageTab.jsx` line 67: `const [confirming, setConfirming] = useState(false)`; line 70: guard `if (isCoverageActive \|\| actionLoading \|\| confirming) return;`; finally block resets — added by plan 06-10 commit 4e7b7e9 |
| 9 | DealCard shows tracking status badge and ETA when available | VERIFIED | `DealCard.jsx` lines 155-159: renders tracking badge from `deal.currentShipmentStatus` using SHIPMENT_STATUS_LABELS |
| 10 | Member deals page has status summary cards, recent activity feed, and active shipments | VERIFIED | `deals/page.jsx`: StatusSummaryCards, RecentActivityFeed with onSnapshot on notifications |
| 11 | OrderTimeline shows deal, shipment, and insurance milestones in chronological order | VERIFIED | `OrderTimeline.jsx` (362 lines): three milestone builders merged and sorted by timestamp (lines 331-335) |
| 12 | OrderTimeline is accessible on the primary view path for PROVIDERS_SELECTED and DELIVERED deals | VERIFIED | `TradeSummaryTab.jsx` line 28: import; line 71: shipmentUpdates destructured; lines 141-145: rendered in right sidebar |
| 13 | Member users can view Trade Summary without permission errors | VERIFIED | `firestore.rules` line 266: `allow read: if isAuthenticated()` on shipmentTracking; `QuoteRepository.js` line 52: `where('participants', 'array-contains', userId)`; `useTradeSummary.js`: all 5 subscriptions set loaded flags on error and call checkAllLoaded() |
| 14 | Active Shipments tab shows deal cards for selected providers | VERIFIED | `firestore.indexes.json`: composite index `providerUid+status+providerType` on quoteRequests COLLECTION; `useActiveShipments.js` lines 142 and 170: `where('readers', 'array-contains', uid)` on both tracking queries — added by plan 06-09 commit de6c2c1 |
| 15 | Print output has branded footer and no localhost URL | VERIFIED | `globals.css` lines 1213-1236: `@page { margin: 0; size: A4; }` with `body { padding: 20mm 15mm 25mm !important; margin: 0 !important; }` and `body::after { content: "coretradeglobal.com"; position: fixed; bottom: 5mm; }` inside `@media print` |
| 16 | Trade Summary shows actual buyer and seller names, not placeholder text | VERIFIED | `useTradeSummary.js` lines 52-53, 183-189: state + `UserRepository.getById` for both party IDs; `PartiesProvidersSection.jsx` lines 138-139: `label={buyerName \|\| 'Buyer'}` and `label={sellerName \|\| 'Seller'}` |
| 17 | New Deal button navigates to /products with reliable black text on gold background | VERIFIED | `deals/page.jsx` line 331: `href="/products"`, line 332: `!text-black` applied (Tailwind important modifier overrides dark mode/parent specificity) — corrected from /marketplace to /products by plan 06-10 commit 4e7b7e9 |
| 18 | Trade Route Map displays recognizable continental outlines | VERIFIED | `TradeRouteMap.jsx` (225 lines): 11 Natural Earth 110m simplified continent path constants rendered as `<path>` elements via equirectangular projection; 800x400 viewBox |
| 19 | shipmentTracking client queries are scoped to the requesting provider via readers array-contains filter | VERIFIED | `useActiveShipments.js` lines 142 and 170: `where('readers', 'array-contains', uid)` on both logistics and insurance trackingQ branches; composite index `readers (CONTAINS) + timestamp (ASC)` present in `firestore.indexes.json` |
| 20 | useDeal hook resolves loading state on subscription failure (no infinite spinner) | VERIFIED | `useDeal.js` lines 114-118: error callback on subscribeToDeal sets `dealLoaded = true` and calls `checkLoaded()` — added by plan 06-10 commit 4e7b7e9 |

**Score: 20/20 truths verified**

### Required Artifacts

| Artifact | Status | Details |
|----------|--------|---------|
| `src/core/constants/shipmentConstants.js` | VERIFIED | SHIPMENT_STATUS (7 values) and SHIPMENT_STATUS_LABELS exported |
| `src/core/constants/dealConstants.js` | VERIFIED | DELIVERED in DEAL_STATUS; transitions correctly mapped |
| `src/domain/entities/ShipmentUpdate.js` | VERIFIED | fromFirestore factory, isLogistics(), isInsurance(), isDelivered(), isCoverageActive() |
| `src/data/repositories/ShipmentRepository.js` | VERIFIED | `subscribeToShipmentUpdates(dealId, uid, callback, onError)` — uid param in signature (line 50); isAuthenticated() rule means no readers filter needed in this path; uid threaded for consistency |
| `src/data/repositories/QuoteRepository.js` | VERIFIED | subscribeToQuotesForDeal accepts uid; adds participants array-contains filter (line 52) |
| `src/data/repositories/ContractRepository.js` | VERIFIED | subscribeToContract with optional onError callback |
| `src/data/repositories/DealRepository.js` | VERIFIED | subscribeToDeal with optional onError callback |
| `src/data/repositories/LegalEngagementRepository.js` | VERIFIED | subscribeToEngagementForDeal with optional onError callback |
| `src/core/di/container.js` | VERIFIED | shipmentRepository singleton; getUserRepository() for name fetching |
| `functions/index.js` | VERIFIED | submitShipmentUpdate (readers array line 3228), confirmInsuranceCoverage (readers array line 3351) |
| `src/presentation/hooks/deal/useTradeSummary.js` | VERIFIED | Passes currentUserUid to subscribeToShipmentUpdates (line 139); 5 parallel subscriptions with error handlers; buyerName/sellerName fetched via UserRepository |
| `src/presentation/hooks/deal/useDeal.js` | VERIFIED | Error callback on subscribeToDeal (lines 114-118) prevents infinite loading |
| `src/presentation/components/features/deal/TradeSummary/TradeSummaryTab.jsx` | VERIFIED | Imports OrderTimeline; destructures buyerName/sellerName + shipmentUpdates; renders all 7 sections + OrderTimeline; passes names to PartiesProvidersSection |
| `src/presentation/components/features/deal/TradeSummary/PartiesProvidersSection.jsx` | VERIFIED | Accepts buyerName/sellerName props; passed to PartyCard label (lines 138-139) |
| `src/presentation/components/features/deal/TradeSummary/OrderTimeline.jsx` | VERIFIED | 362 lines; three milestone categories; clickable milestones; pending future milestones |
| `src/presentation/components/features/deal/TradeSummary/TradeRouteMap.jsx` | VERIFIED | 225 lines; 11 Natural Earth continent paths; 800x400 equirectangular viewBox; dark theme; gold/blue pins; bezier route |
| `src/presentation/components/features/provider/ActiveShipmentsTab.jsx` | VERIFIED | 253 lines; delivery stats; expandable deal cards; ShipmentUpdateForm embedded |
| `src/presentation/components/features/provider/ShipmentUpdateForm.jsx` | VERIFIED | 248 lines; forward-only status dropdown; note/container/trackingRef/ETA fields |
| `src/presentation/components/features/provider/InsuranceCoverageTab.jsx` | VERIFIED | 184 lines; confirming state guard (line 67-79); coverage confirmation with idempotent button state |
| `src/presentation/hooks/provider/useActiveShipments.js` | VERIFIED | where('readers','array-contains',uid) on both trackingQ branches (lines 142, 170) |
| `src/presentation/components/features/deal/TradeSummary/ETACountdown.jsx` | VERIFIED | 61 lines; formatDistanceToNow; setInterval update; handles past ETAs |
| `firestore.indexes.json` | VERIFIED | readers+timestamp CONTAINS on shipmentTracking COLLECTION; providerUid+status+providerType on quoteRequests COLLECTION; dealId+participants+createdAt on providerQuotes COLLECTION_GROUP |
| `src/app/globals.css` | VERIFIED | @page margin:0, body padding 20mm 15mm 25mm, body::after branded footer inside @media print |
| `src/app/(main)/deals/page.jsx` | VERIFIED | Browse Marketplace button: href=/products, !text-black, gold background (lines 331-335) |

### Key Link Verification

| From | To | Via | Status | Details |
|------|-----|-----|--------|---------|
| `functions/index.js` (submitShipmentUpdate) | `deals/{dealId}/shipmentTracking` | Firestore write in CF with readers array | VERIFIED | Line 3228: `readers: [deal.buyerId, deal.sellerId, uid]` written on add |
| `functions/index.js` (confirmInsuranceCoverage) | `deals/{dealId}/shipmentTracking` | Transaction write with readers array | VERIFIED | Line 3351: `readers: [deal.buyerId, deal.sellerId, uid]` written in transaction |
| `functions/index.js` (submitShipmentUpdate) | `deal.status = DELIVERED` | Transaction when status=delivered | VERIFIED | Lines 3242-3266: SHIPMENT_STATUS_CF.DELIVERED triggers runTransaction |
| `ShipmentRepository.js` | `container.js` | `getShipmentRepository()` | VERIFIED | container.js: returns singleton ShipmentRepository |
| `DealPage.jsx` | `TradeSummaryTab.jsx` | Tab switcher activeTab state | VERIFIED | Lines 259-262: `activeTab === 'summary'` renders TradeSummaryTab |
| `useTradeSummary.js` | 5 repositories | Parallel onSnapshot with error callbacks | VERIFIED | Each error sets loaded flag, calls checkAllLoaded() — no infinite spinner |
| `useTradeSummary.js` | `UserRepository.getById` | useEffect on deal.buyerId/sellerId | VERIFIED | Lines 183-189: companyName preferred, displayName fallback |
| `useTradeSummary.js` | `ShipmentRepository.subscribeToShipmentUpdates` | Passes currentUserUid as uid param | VERIFIED | Line 137-139: dealId then currentUserUid then callback |
| `QuoteRepository.subscribeToQuotesForDeal` | Firestore providerQuotes rule | where('participants','array-contains',uid) | VERIFIED | Line 52: satisfies `isAuthenticated()` rule + query scoping |
| `LegalConsultingSection.jsx` | `engagement.clientId === currentUserUid` | Privacy filter | VERIFIED | Line 68: explicit clientId check as UI-layer guard |
| `ShipmentUpdateForm.jsx` | `functions/index.js` (submitShipmentUpdate) | httpsCallable | VERIFIED | `useActiveShipments.js` line 274 |
| `InsuranceCoverageTab.jsx` | `functions/index.js` (confirmInsuranceCoverage) | httpsCallable | VERIFIED | `useActiveShipments.js` line 295 |
| `InsuranceCoverageTab.jsx CoverageCard` | Double-click guard | confirming state + finally block | VERIFIED | Lines 67-79: useState(false), guard on entry, setConfirming(true), finally resets |
| `useActiveShipments.js` | `quoteRequests` collection | Query where providerUid==uid AND status==selected | VERIFIED | Lines 214-215: two where clauses; covered by composite index |
| `useActiveShipments.js` | `deals/{dealId}/shipmentTracking` | where readers array-contains uid | VERIFIED | Lines 142 and 170: filter on both logistics and insurance branches |
| `OrderTimeline.jsx` | `deal.statusHistory + shipmentUpdates` | Merge and sort by timestamp | VERIFIED | Lines 331-335: spreads three arrays and sorts by `toMs(timestamp)` |
| `TradeSummaryTab.jsx` | `OrderTimeline.jsx` | Import + JSX render in right sidebar | VERIFIED | Line 28: import; lines 141-145: JSX with deal/shipmentUpdates/dealId props |
| `TradeSummaryTab.jsx` | `PartiesProvidersSection.jsx` | buyerName/sellerName props | VERIFIED | Lines 73-74: destructured from hook; lines 123-124: passed as props |
| `DealCard.jsx` | `deal.currentShipmentStatus` | Denormalized field badge display | VERIFIED | Lines 155-159: renders tracking badge from denormalized field |
| `deals/page.jsx` | notifications collection | onSnapshot for recent activity | VERIFIED | Lines 179-188: onSnapshot on `/users/{uid}/notifications` ordered by createdAt DESC |
| `useDeal.js` | `DealRepository.subscribeToDeal` | Error callback sets dealLoaded | VERIFIED | Lines 114-118: `(err) => { dealLoaded = true; checkLoaded(); }` as third argument |

### Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|-------------|-------------|-------------|--------|---------|
| TRACK-01 | 06-01, 06-02, 06-06, 06-07, 06-08, 06-09 | Buyer and seller can view trade summary dashboard with deal overview | VERIFIED | TradeSummaryTab (7 sections), DealPage tab switcher, useTradeSummary with error resilience and real names, isAuthenticated() rules on shipmentTracking eliminating permission errors — all wired and confirmed. REQUIREMENTS.md marks Complete. |
| TRACK-02 | 06-01, 06-03, 06-06, 06-09 | Shipment tracking with provider-submitted status updates | VERIFIED | submitShipmentUpdate CF writes readers array, ShipmentRepository with error callback, ActiveShipmentsTab, ShipmentUpdateForm, confirmInsuranceCoverage CF, InsuranceCoverageTab with confirming guard, composite index for provider query — all present and wired. REQUIREMENTS.md marks Complete. |
| TRACK-03 | 06-04, 06-05, 06-07, 06-10 | Order timeline showing all completed milestones with timestamps | VERIFIED | OrderTimeline (362 lines) wired in TradeSummaryTab right sidebar; accessible on primary view path for PROVIDERS_SELECTED/DELIVERED deals. useDeal error callback added by 06-10. REQUIREMENTS.md marks Complete. |
| TRACK-04 | 06-03, 06-04, 06-10 | Role-dispatched dashboard showing relevant view per role | VERIFIED | Members: deals page with stats/activity/Browse Marketplace (href=/products); Lawyers: LawyerDashboard; Providers: provider dashboard with ActiveShipmentsTab/InsuranceCoverageTab. REQUIREMENTS.md marks Complete. |

All 4 requirement IDs (TRACK-01 through TRACK-04) are accounted for across plans 06-01 through 06-10. No orphaned requirements found.

### Anti-Patterns Found

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `src/data/repositories/OfferRepository.js` | 62 | `[DEBUG] OFFERS subscription failed:` console.error label | Info | Debug label left in production path; functional — error is still logged correctly |
| `src/presentation/hooks/deal/useDeal.js` | 115 | `[DEBUG] useDeal: DEAL DOC subscription failed:` console.error label | Info | Debug label left in production path; functional — error callback works correctly |

No blocker or warning anti-patterns found. The two `[DEBUG]` prefixes on console.error calls are cosmetic (logging label naming) and do not affect functionality. No stubs, empty handlers, or return-null implementations found in any file modified by plans 06-09 or 06-10.

### Human Verification Required

#### 1. Trade Summary Tab — Actual Party Names and Map Quality

**Test:** Open a deal in PROVIDERS_SELECTED status as buyer or seller. Confirm the Parties & Providers section shows actual company/display names.
**Expected:** Real names appear for both buyer and seller (not "Buyer"/"Seller" placeholders). Right sidebar shows TradeRouteMap with recognizable continents (Africa, Americas, Eurasia, Australia visible) and OrderTimeline with deal milestones below it.
**Why human:** User name resolution from live Firestore data and map visual quality require a browser session.

#### 2. Active Shipments Tab — Provider Can See Selected Deals

**Test:** Deploy indexes first (`firebase deploy --only firestore:indexes` — do NOT use --force per project memory). As a logistics provider with a selected quote, open the provider dashboard Active Shipments tab.
**Expected:** Deal cards appear for all deals where the provider is selected. Expanding a card shows ShipmentUpdateForm. Status dropdown only allows forward progression. Submitting updates `deal.currentShipmentStatus`.
**Why human:** Requires live Firebase environment with deployed Firestore indexes (readers+timestamp on shipmentTracking; providerUid+status+providerType on quoteRequests) and a real selected quoteRequest document.

#### 3. Print / PDF — Branded Footer, No Localhost URL

**Test:** On Trade Summary tab, click Print/PDF. Inspect print preview header and footer areas.
**Expected:** No localhost URL. Footer shows `coretradeglobal.com` in small grey text. Content has full page width with padding. No navigation or sidebar elements visible.
**Why human:** Browser print rendering and `body::after { position: fixed }` behavior in print context require a live browser session.

#### 4. Insurance Coverage Double-Click Prevention

**Test:** As an insurance provider, click Confirm Coverage once, then rapidly click a second time before the Cloud Function completes.
**Expected:** First click disables the button (confirming=true guards re-entry). On success, button transitions to Coverage Active permanently. Finally block resets confirming on error.
**Why human:** Requires live Firebase environment with Cloud Function round-trip latency to test the race window.

#### 5. Browse Marketplace Button — Visual Contrast and Navigation

**Test:** On the member deals page, inspect and click the gold Browse Marketplace button.
**Expected:** Text is black (enforced by `!text-black` overriding dark mode), background is gold `#FFD700`, clicking navigates to `/products` (not `/marketplace`) without console errors.
**Why human:** Tailwind `!text-black` important modifier behavior in dark mode context and client-side navigation to `/products` require a live browser session to confirm.

#### 6. Deal Page Loading on Inaccessible Deal

**Test:** Navigate to a deal page for a deleted or inaccessible deal (or simulate a permission error on the deal subscription).
**Expected:** Deal page renders with loading=false; shows graceful empty/error state rather than an infinite spinner.
**Why human:** Requires a live environment where the error path in useDeal's subscription error callback can be triggered.

### Re-Verification Summary

**This is the fourth verification pass for Phase 06.**

Plans 06-09 and 06-10 closed 4 additional gaps after the third verification pass, bringing the phase to full automated verification with 20/20 truths.

**Gaps closed (4 new):**

1. **shipmentTracking Firestore permission errors for members and providers** — Closed by 06-09 commit 296a242: readers array `[buyerId, sellerId, uid]` written by both CFs on every shipmentTracking document; Firestore rules simplified to `isAuthenticated()` for shipmentTracking and providerQuotes; unused role helper functions removed.

2. **Active Shipments tab empty for providers (secondary cause)** — Closed by 06-09 commit de6c2c1: `where('readers', 'array-contains', uid)` added to both logistics and insurance trackingQ branches in useActiveShipments; composite index readers+timestamp added to firestore.indexes.json. useTradeSummary and DealSidebar now pass currentUserUid to ShipmentRepository.

3. **Browse Marketplace button wrong destination** — Closed by 06-10 commit 4e7b7e9: href corrected from `/marketplace` (non-existent route) to `/products` (actual products listing page); `!text-black` applied with Tailwind important modifier.

4. **Insurance double-click and deal loading edge cases** — Closed by 06-10 commit 4e7b7e9: per-card `confirming` state with finally block in InsuranceCoverageTab CoverageCard; error callback on subscribeToDeal in useDeal.js.

**Regressions: None.** All 18 truths verified in the previous pass remain intact. The only content change is truth #17 which now correctly reads `/products` instead of `/marketplace` — the code was updated and the previous verification record was wrong about the destination.

**Commit hashes verified in git history:** 296a242, de6c2c1, 4e7b7e9 (plans 06-09 and 06-10).

**Deployment note:** Before UAT testing of Active Shipments tab, deploy Firestore rules and indexes:
```
firebase deploy --only firestore:rules
firebase deploy --only firestore:indexes
```
Do NOT use `--force` on firestore:indexes — user has manually-created product indexes not tracked in firestore.indexes.json.

---

_Verified: 2026-04-01T15:45:00Z_
_Verifier: Claude (gsd-verifier)_
