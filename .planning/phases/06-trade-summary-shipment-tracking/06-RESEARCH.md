# Phase 6: Trade Summary and Shipment Tracking — Research

**Researched:** 2026-03-29
**Domain:** Firestore real-time data, React component extension, PDF generation, SVG/static map, Cloud Functions
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Trade Summary Access & Visibility**
- New tab/section on the existing deal page (`/deals/[dealId]`), not a separate route
- Visible from CONTRACT_APPROVED onwards — sections fill in progressively as deal advances
- Two-column layout: main content left, tracking status + timeline in right sidebar (matches existing DealPage pattern and S4 mockup)

**Trade Summary Content**
- Status hero banner at top with deal status icon, product name, key stats, and live tracking pill
- Trade info bar — horizontal strip below hero with: Deal No, Product, Total Amount, Incoterms, Container #, Status
- Sections (in order): Deal overview, Parties & providers, Cost breakdown, Documents list, Legal consulting info
- Legal disclaimer footer
- PDF export button

**Shipment Tracking — Data Source**
- Logistics provider submits status updates manually through their portal
- Insurance provider submits a one-time "Coverage Active" confirmation
- No real carrier API integration in v1

**Shipment Tracking — Status Model**
- Fixed predefined status list (dropdown): Preparing, Picked Up, In Transit, At Customs, Out for Delivery, Delivered
- Each update: status, timestamp, optional note
- Provider enters container number and tracking reference number (at first update)
- Provider enters ETA date — displayed as countdown timer on summary page

**Shipment Tracking — Deal Status**
- New `DELIVERED` status added to DEAL_STATUS enum
- State transition: PROVIDERS_SELECTED → DELIVERED (when logistics provider marks "Delivered")
- DELIVERED is the true terminal state

**Shipment Tracking — Map**
- Static map with origin and destination pins from deal's Incoterms locations
- Styled like S4 mockup aesthetic (dark theme, route line between pins)
- Not data-driven / no live GPS — purely visual context

**Shipment Tracking — Notifications**
- Both buyer and seller receive in-app + email notifications when shipment status changes
- Follows existing notification pattern from Phase 2 (Resend email + Firestore in-app)

**Shipment Tracking — Provider UX**
- New "Active Shipments" section/tab on existing `/provider/dashboard`
- Logistics providers see deals where they're the selected provider, with status update form
- Insurance providers see deals where they're selected, with "Confirm Coverage" action button

**Order Timeline — Milestones**
- Deal milestones (auto-generated): Negotiated → Contract Approved → Providers Selected
- Shipment milestones (from logistics provider): Preparing → Picked Up → In Transit → At Customs → Out for Delivery → Delivered
- Insurance milestone: Coverage Active (from insurance provider confirmation)
- Legal milestones excluded from timeline

**Order Timeline — Display**
- Vertical timeline in right sidebar (extends existing ProgressTracker pattern)
- Each milestone: timestamp + actor + optional notes
- Deal milestones are clickable; shipment milestones are not
- Real-time updates via Firestore onSnapshot listener

**Order Timeline — Data Model**
- New `statusHistory` array field on deal document
- Each entry: `{ status, timestamp, actorId, actorName, note }`
- Cloud Functions append to statusHistory on every deal status transition
- Shipment updates stored in a separate tracking document/subcollection under the deal

**Order Timeline — Legacy Deals**
- Infer milestones from existing timestamps (deal.createdAt, contract.approvedAt, etc.)

**Role-Dispatched Dashboards — Member**
- Enhance `/deals` page with: deal status summary cards, active shipments section, recent activity feed, quick actions
- DealCard enhanced with tracking status badge and ETA when available

**Role-Dispatched Dashboards — Provider**
- Logistics provider dashboard: Active Shipments tab with status/ETA and "Update Status" button, delivery stats
- Insurance provider dashboard: Coverage section with "Confirm Coverage" action

**Role-Dispatched Dashboards — Lawyer**
- No changes needed

**Role-Dispatched Dashboards — Admin**
- Platform-wide stats: total deals, active shipments, completed deliveries
- Admin can access any deal's trade summary page (read-only oversight)

### Claude's Discretion
- Loading skeleton and empty state designs
- Exact spacing, typography, and component styling within the dark theme
- Shipment tracking subcollection structure vs fields on deal doc
- PDF generation library choice
- Map rendering approach (SVG, image, or lightweight map library)
- Error state handling across all new components

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| TRACK-01 | Buyer and seller can view trade summary dashboard with deal overview | New tab on `/deals/[dealId]` with hero banner, trade info bar, sections. Reads from deal doc + quoteRequests subcollections. |
| TRACK-02 | Shipment tracking with provider-submitted status updates | New `shipmentTracking` subcollection under deal. `submitShipmentUpdate` and `confirmInsuranceCoverage` Cloud Functions. |
| TRACK-03 | Order timeline showing all completed milestones with timestamps | `statusHistory` array on deal doc + shipment subcollection events. Vertical timeline component in right sidebar. |
| TRACK-04 | Role-dispatched dashboard showing relevant view per role (member, lawyer, provider) | Member `/deals` page enhanced with stats/activity/ETA. Provider `/provider/dashboard` enhanced with Active Shipments tab. Admin stats panel. |
</phase_requirements>

---

## Summary

Phase 6 is an additive phase — it introduces new UI surfaces that read from data already created by Phases 1–5 while adding a new shipment tracking data layer on top. The core challenge is not raw data access (all deal, contract, and quote data already exists in Firestore) but orchestrating multi-source data reads (deal + contract + quotes + new shipment subcollection) efficiently without N+1 queries, and presenting it cohesively in the trade summary tab.

The second major challenge is the provider-facing write side: logistics providers need a new form to submit shipment status updates, and insurance providers need a single-action "Confirm Coverage" flow. Both write via new Cloud Functions that also trigger notifications to deal parties. The `DELIVERED` status extends the existing state machine, requiring updates to `dealConstants.js`, `functions/index.js` (CJS duplicate), `Deal.isTerminal()`, `DealPage` terminal banner config, and `VALID_DEAL_TRANSITIONS`.

PDF generation is a discrete sub-problem. The project has no existing PDF library. `@react-pdf/renderer` (React-native-like JSX → PDF) is the standard choice for React/Next.js but requires `use client` and carries a ~250KB bundle cost. A lightweight alternative is `window.print()` with `@media print` CSS (already present in the S4 mockup as the print button). The mockup itself uses `window.print()` with hidden-on-print nav elements — this pattern is zero-dependency and already demonstrated in `other_items/S4-ticaret-ozeti-takip.html`.

**Primary recommendation:** Implement the print/PDF export using `window.print()` + `@media print` CSS first (zero dependency, works immediately). If rich PDF styling is needed in a later iteration, add `@react-pdf/renderer`. For the static map, use an inline SVG with the world map outline as a background image and positioned CSS dots for origin/destination — mirrors the S4 mockup exactly and adds zero dependencies.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| firebase (Firestore) | ^12.4.0 | onSnapshot real-time subscriptions | Already installed; used across all phases |
| lucide-react | ^0.560.0 | Icons throughout the UI | Already installed; project standard |
| date-fns | ^4.1.0 | Date formatting for timestamps, ETA countdown | Already installed |
| framer-motion | ^12.33.0 | Animations (if needed for timeline/hero) | Already installed |

### Supporting (Discretion — no new installs required)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `window.print()` + CSS | browser built-in | PDF/print export | Use first; zero dependency |
| Inline SVG | browser built-in | Static trade route map | Use for dark-theme map with pins |
| `@react-pdf/renderer` | (not installed) | Rich PDF generation | Only if print CSS is insufficient |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `window.print()` | `@react-pdf/renderer` | react-pdf gives precise PDF control but adds ~250KB and complexity |
| Inline SVG map | Leaflet or react-map-gl | Map libs add >100KB; static visual needs no real maps |
| Firestore subcollection for shipment | Array field on deal doc | Array has 1MB doc limit risk over many updates; subcollection scales correctly |

**Installation (only if `@react-pdf/renderer` chosen):**
```bash
npm install @react-pdf/renderer
```
No new installs needed for the `window.print()` + SVG approach.

---

## Architecture Patterns

### Recommended Project Structure
```
src/
├── domain/entities/
│   └── ShipmentUpdate.js         # New entity (status, timestamp, actorId, actorName, note, containerNumber, trackingRef, etaDate)
├── data/repositories/
│   └── ShipmentRepository.js     # New repository — subscribe/write shipment tracking subcollection
├── core/di/
│   └── container.js              # Add getShipmentRepository() singleton
├── core/constants/
│   └── dealConstants.js          # Add DEAL_STATUS.DELIVERED + VALID_DEAL_TRANSITIONS update
├── presentation/
│   ├── hooks/deal/
│   │   └── useShipment.js        # New hook — subscribe to shipmentTracking subcollection
│   └── components/features/
│       ├── deal/
│       │   ├── DealPage/DealPage.jsx         # Add "Summary" tab + DELIVERED terminal banner
│       │   ├── DealSidebar/DealSidebar.jsx   # Add OrderTimeline section (replaces/extends ProgressTracker)
│       │   └── TradeSummary/                 # New component directory
│       │       ├── TradeSummaryTab.jsx        # Main container orchestrating sub-sections
│       │       ├── SummaryHeroBanner.jsx      # Status hero with live tracking pill
│       │       ├── TradeInfoBar.jsx            # Deal No, Product, Total, Incoterms, Container, Status
│       │       ├── DealOverviewSection.jsx    # Product, price, Incoterms, quantities
│       │       ├── PartiesProvidersSection.jsx # Buyer/seller + selected provider details
│       │       ├── CostBreakdownSection.jsx    # Product + insurance + logistics = total
│       │       ├── DocumentsSection.jsx        # Contract PDF + placeholder slots
│       │       ├── LegalConsultingSection.jsx  # Lawyer info (privacy-aware per party)
│       │       ├── TradeRouteMap.jsx            # Static SVG map with origin/destination pins
│       │       ├── ETACountdown.jsx            # Countdown timer from etaDate
│       │       └── OrderTimeline.jsx           # Vertical milestone timeline
│       └── provider/
│           ├── ActiveShipmentsTab.jsx          # Logistics: deals where selected + update form
│           ├── ShipmentUpdateForm.jsx           # Status dropdown + note + container/tracking fields
│           └── InsuranceCoverageTab.jsx         # Insurance: deals where selected + confirm button
```

### Pattern 1: Trade Summary Tab on Existing Deal Page
**What:** Add a "Summary" tab alongside the existing deal page content. The tab is visible from `CONTRACT_APPROVED` onwards; each section fills in as data becomes available.
**When to use:** Per locked decision — no new route, extends `/deals/[dealId]`.

The deal page currently has no explicit tab routing. The simplest approach is a `useState` tab switcher inside the existing deal page route, rendering either the current negotiation view or the `TradeSummaryTab` component.

```jsx
// Source: existing DealPage.jsx pattern
// In /deals/[dealId]/page.jsx — add tab state
const [activeTab, setActiveTab] = useState('negotiation'); // 'negotiation' | 'summary'

// Tab is only shown when deal is past negotiation stage
const showSummaryTab = [
  DEAL_STATUS.CONTRACT_APPROVED,
  DEAL_STATUS.PROVIDERS_SELECTED,
  DEAL_STATUS.DELIVERED,
  DEAL_STATUS.ACCEPTED,
].includes(deal?.status);
```

### Pattern 2: Shipment Tracking Subcollection
**What:** New `shipmentTracking` subcollection under `deals/{dealId}` for shipment status updates. Separate from `statusHistory` (which lives on the deal document).
**When to use:** Any write of a shipment update or insurance coverage confirmation.

Firestore path: `deals/{dealId}/shipmentTracking/{updateId}`

```js
// Source: existing Phase 2/3/4 Cloud Function patterns
// Each document in shipmentTracking subcollection:
{
  status: 'in_transit',           // SHIPMENT_STATUS enum value
  timestamp: Timestamp,
  actorId: 'provider_uid',
  actorName: 'FastShip Logistics',
  providerType: 'logistics',      // 'logistics' | 'insurance'
  note: 'Cleared customs in Rotterdam',
  containerNumber: 'MSCU1234567', // null after first update
  trackingRef: 'MSC-TRK-99212',   // null after first update
  etaDate: Timestamp,             // null if not set
  dealBuyerId: 'buyer_uid',       // denormalized for security rules
  dealSellerId: 'seller_uid',     // denormalized for security rules
}
```

### Pattern 3: statusHistory Array on Deal Document
**What:** Cloud Functions append an entry to `deal.statusHistory` on every deal status transition. This drives the "deal milestones" portion of the OrderTimeline.
**When to use:** Every `onDealStatusChanged` trigger call + new `DELIVERED` transition.

```js
// Source: existing onDealStatusChanged pattern in functions/index.js
// Append to statusHistory on every deal transition:
t.update(dealRef, {
  status: newStatus,
  statusHistory: FieldValue.arrayUnion({
    status: newStatus,
    timestamp: Timestamp.now(),
    actorId: uid,
    actorName: actorName,   // looked up from user doc
    note: '',
  }),
});
```

**Legacy deals without statusHistory:** Infer milestones in the `OrderTimeline` component from `deal.createdAt` (Negotiated), `contract.approvedAt` (Contract Approved), and `deal.updatedAt` when status is `PROVIDERS_SELECTED` (Providers Selected).

### Pattern 4: New DELIVERED State Machine Entry
**What:** `DELIVERED` is the true terminal state. Must be added in two places: `src/core/constants/dealConstants.js` (ESM) and `functions/index.js` CJS duplicate block (the existing comment on line 980 documents this requirement).

```js
// Source: dealConstants.js — existing pattern
export const DEAL_STATUS = {
  // ... existing statuses ...
  PROVIDERS_SELECTED: 'providers_selected',
  DELIVERED: 'delivered',           // NEW — true terminal state
};

export const VALID_DEAL_TRANSITIONS = {
  // ... existing transitions ...
  [DEAL_STATUS.PROVIDERS_SELECTED]: [DEAL_STATUS.DELIVERED], // NEW
  [DEAL_STATUS.DELIVERED]: [],                                // NEW — terminal
};
```

### Pattern 5: Cloud Function — submitShipmentUpdate
**What:** `onCall` CF called by logistics provider to submit a new shipment status update. Transitions deal to `DELIVERED` when status is `'delivered'`.

```js
// Source: existing acceptQuote / hireLayyer onCall pattern
exports.submitShipmentUpdate = onCall(async (request) => {
  const { dealId, status, note, containerNumber, trackingRef, etaDate } = request.data;
  const uid = request.auth?.uid;

  // Auth: must be a logistics provider
  // Authorization: must be the selectedLogisticsProvider for this deal
  // Validate: status must be in SHIPMENT_STATUS enum
  // Write: add to deals/{dealId}/shipmentTracking subcollection
  // Conditional: if status === 'delivered', transition deal.status to DELIVERED + update statusHistory
  // Notify: buyer + seller via existing sendDealNotifications pattern
});
```

### Pattern 6: Cloud Function — confirmInsuranceCoverage
**What:** `onCall` CF called by insurance provider to confirm coverage is active. Adds a single entry to `shipmentTracking` with `providerType: 'insurance'` and a `status: 'coverage_active'` marker.

```js
exports.confirmInsuranceCoverage = onCall(async (request) => {
  const { dealId } = request.data;
  const uid = request.auth?.uid;

  // Auth: must be insurance provider
  // Authorization: must be deal.selectedInsuranceProvider (looked up via quoteRequest)
  // Idempotency: check if coverage_active entry already exists — reject if so
  // Write: add to deals/{dealId}/shipmentTracking
  // Notify: buyer + seller
});
```

### Pattern 7: Provider Active Shipments Query
**What:** Logistics providers need to see deals where they are the selected logistics provider. The deal doc stores `selectedLogisticsQuoteId` and `selectedLogisticsRequestId`. The quoteRequest document stores `providerUid`.

**Query approach:** Query `quoteRequests` where `providerUid == uid AND providerType == 'logistics' AND status == 'selected'`, then enrich with deal data. This is the same pattern used by `useQuoteRequests` already.

```js
// Source: QuoteRequestRepository.js pattern
const q = query(
  collection(db, 'quoteRequests'),
  where('providerUid', '==', uid),
  where('providerType', '==', 'logistics'),
  where('status', '==', 'selected')
);
```

### Pattern 8: Static SVG Map
**What:** A dark-themed world map outline (SVG background) with two positioned CSS dots and a route line between them — mirroring the S4 mockup's `map-container` exactly.

**Approach:** Use a React component that accepts `originName` and `destinationName` as props (from deal's Incoterms namedPlace field). The positions of the origin/destination dots are derived from the Incoterms named place UN/LOCODE if available, or fall back to fixed demo positions. Since this is purely visual context with no live GPS, fixed `top`/`left` percentage positions are acceptable.

```jsx
// Pattern from S4-ticaret-ozeti-takip.html
function TradeRouteMap({ originName, destinationName }) {
  return (
    <div className="relative w-full h-[180px] bg-[#0b1626] rounded-xl border border-[#1e2d47] overflow-hidden">
      {/* SVG world map outline as background */}
      {/* Positioned origin dot (gold) */}
      {/* Positioned destination dot (blue) */}
      {/* SVG route line between dots */}
      {/* ETA overlay box (top-right) */}
      {/* Position label boxes */}
    </div>
  );
}
```

### Pattern 9: PDF Export via window.print()
**What:** The S4 mockup already implements `window.print()` with `@media print` CSS that hides nav, buttons, and tracking UI — leaving only the trade summary content. This is the zero-dependency approach.

```jsx
// Pattern from S4-ticaret-ozeti-takip.html (lines 321-328)
// @media print { nav, .btn, .tracking-wrap { display: none !important; } }

// In TradeSummaryTab.jsx:
function handleDownloadPDF() {
  window.print();
}
```

For a proper downloadable PDF (not just browser print dialog), a small script approach can generate a named file. The S4 mockup uses `downloadPDF()` — in the React version this is just `window.print()`. A print-specific stylesheet in `global.css` or inline `<style>` handles the rest.

### Anti-Patterns to Avoid
- **Reading the deal doc inside shipmentTracking rules with get():** Denormalize `dealBuyerId`/`dealSellerId` on each `shipmentTracking` document (same pattern as `providerQuotes`) — avoids extra reads in security rules.
- **Allowing client-side writes to shipmentTracking:** All writes must go through Cloud Functions (same as all other deal subcollections). Client write rules: `allow write: if false`.
- **Rendering the summary tab for all deal statuses:** Only show the summary tab when `deal.status` is `CONTRACT_APPROVED`, `PROVIDERS_SELECTED`, or `DELIVERED`. Before that, the tab does not exist.
- **Importing ESM from Next.js app in Cloud Functions:** New constants (`DEAL_STATUS.DELIVERED`, `SHIPMENT_STATUS`) must be duplicated in the CJS block in `functions/index.js` — this is explicitly documented in the codebase decision log (line 981 of `functions/index.js`).
- **Reading selectedLogisticsProviderUid without looking up the quoteRequest:** The deal doc stores `selectedLogisticsQuoteId` and `selectedLogisticsRequestId`, not the provider UID directly. To validate that a provider is the selected logistics provider in a CF, read the quoteRequest doc: `quoteRequests/{selectedLogisticsRequestId}.providerUid === uid`.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Timestamp formatting | Custom date util | `date-fns` format/formatDistanceToNow | Already installed; handles locale, timezone, relative time edge cases |
| Notification delivery | Custom email/push logic | Existing `sendDealNotifications` + `sendDealEmail` pattern | Already handles FCM suppression, non-blocking Resend, retry patterns |
| Firestore transaction safety | Manual compare-and-set | `db.runTransaction()` | Required for DELIVERED state transition to prevent double-delivery |
| PDF layout | Custom canvas/SVG renderer | `window.print()` + @media print CSS | Sufficient for trade summary; zero deps; already demonstrated in S4 mockup |
| Real-time subscription management | Manual onSnapshot cleanup | Follow existing hook pattern (closure flags, cleanup in useEffect return) | See useLegalChannel closure flag pattern for parallel subscriptions |

**Key insight:** Every new data write in this phase follows the same CF-only write pattern established in Phases 2–5. The planner should not introduce any client-side direct Firestore writes for shipment data.

---

## Common Pitfalls

### Pitfall 1: Forgetting to duplicate DELIVERED in functions/index.js CJS block
**What goes wrong:** The Cloud Function can't see the new `DELIVERED` status constant and the state machine transition check fails silently or throws.
**Why it happens:** `functions/index.js` is CommonJS and cannot import ESM from the Next.js app. Constants are manually duplicated (documented at line 980 of `functions/index.js`).
**How to avoid:** Whenever `dealConstants.js` gains a new constant, immediately update the mirrored CJS block in `functions/index.js`. Same applies to any new `SHIPMENT_STATUS` constant.
**Warning signs:** Cloud Function logs showing `undefined` for status values, or state machine guard logic never matching.

### Pitfall 2: selectedInsuranceProvider authorization in Cloud Functions
**What goes wrong:** CF tries to authorize that a provider is the "selected" provider, but the selected provider UID is not directly on the deal document — it must be looked up from the quoteRequest.
**Why it happens:** `deal.selectedInsuranceQuoteId` / `deal.selectedInsuranceRequestId` store IDs, not UIDs. The provider UID is on `quoteRequests/{requestId}.providerUid`.
**How to avoid:** In `confirmInsuranceCoverage` CF: `const qrSnap = await db.collection('quoteRequests').doc(deal.selectedInsuranceRequestId).get(); if (qrSnap.data().providerUid !== uid) throw permission-denied`.

### Pitfall 3: Multi-source data fetch causing waterfalls in TradeSummaryTab
**What goes wrong:** The summary tab makes sequential Firestore reads: deal → contract → quoteRequests → quotes → shipmentTracking, causing visible loading waterfalls.
**Why it happens:** Each piece of data depends on IDs from the previous document.
**How to avoid:** Start all subscriptions in parallel from the hook. Use closure flags (same pattern as `useLegalChannel`) to gate `loading = false` until all subscriptions have fired at least once.

### Pitfall 4: statusHistory arrayUnion inside a Firestore transaction
**What goes wrong:** `FieldValue.arrayUnion()` cannot be used inside a `runTransaction` — it's a sentinel that only works with `update()` outside transactions.
**Why it happens:** Firestore transactions use `t.update()` which accepts plain objects, not field value sentinels in all SDK versions.
**How to avoid:** Two options: (a) read the current `statusHistory` array inside the transaction, append the new entry, and write the full array back; OR (b) perform `statusHistory` update OUTSIDE the transaction as a follow-up `update()` call (similar to how `sendDealNotifications` is called outside transactions in the existing codebase — line 1664 pattern).
**Note:** Verify with current Firebase Admin SDK version. As of admin SDK v11+, FieldValue sentinels work in transactions via `t.update()`. If the project uses a version where it doesn't work, use approach (a).

### Pitfall 5: Deal page isTerminal() blocking summary tab render
**What goes wrong:** The existing `Deal.isTerminal()` method and `DealPage` terminal banner config both treat `PROVIDERS_SELECTED` as terminal. Adding `DELIVERED` requires updating both.
**Why it happens:** `DealPage.jsx` lines 122–128 have a hardcoded fallback `isTerminal` check listing statuses. `Deal.js` lines 147–154 have the same list.
**How to avoid:** Update `Deal.isTerminal()` to include `DELIVERED`. Update `DealPage` terminal banner `configs` object to include a `DELIVERED` config entry (green "Trade Delivered" banner). Update `COMPLETED_STATUSES` in `/deals/page.jsx`.

### Pitfall 6: Lawyer info section showing opposing party's lawyer
**What goes wrong:** A buyer sees the seller's lawyer information and vice versa — violating the privacy isolation established in Phase 5.
**Why it happens:** Legal engagements are keyed on `(dealId, clientId)`. If the component fetches all engagements for the deal, it may surface both parties' lawyers.
**How to avoid:** `LegalConsultingSection` must only display the engagement where `engagement.clientId === currentUserUid`. Fetch only the current user's engagement for this deal — do not expose the other party's lawyer info.

### Pitfall 7: Insurance "Confirm Coverage" idempotency
**What goes wrong:** Provider clicks "Confirm Coverage" multiple times, creating duplicate `coverage_active` entries in the shipmentTracking subcollection.
**Why it happens:** Double-click, slow network, retry.
**How to avoid:** In `confirmInsuranceCoverage` CF, use a `runTransaction` to check if a `coverage_active` entry already exists before writing. Alternatively, use a deterministic document ID (e.g., `coverage_${dealId}`) for the coverage confirmation entry so second writes are idempotent updates.

---

## Code Examples

Verified patterns from existing codebase:

### onSnapshot real-time subscription with cleanup (from useDeal.js)
```js
// Source: src/presentation/hooks/deal/useDeal.js
useEffect(() => {
  if (!dealId) { setLoading(false); return; }
  let dealLoaded = false;
  let subcollectionLoaded = false;
  function checkLoaded() {
    if (dealLoaded && subcollectionLoaded) setLoading(false);
  }
  const unsubDeal = dealRepository.subscribeToDeal(dealId, (entity) => {
    setData(entity);
    dealLoaded = true;
    checkLoaded();
  });
  const unsubSub = subcollectionRepo.subscribe(dealId, (items) => {
    setItems(items);
    subcollectionLoaded = true;
    checkLoaded();
  });
  return () => { unsubDeal(); unsubSub(); };
}, [dealId]);
```

### In-app notification creation (from functions/index.js line 1679)
```js
// Source: functions/index.js sendDealNotifications function
await db.collection('users').doc(recipientId).collection('notifications').add({
  type: 'deal',
  eventType: 'shipment_update',  // new event type for Phase 6
  title: 'Shipment status updated',
  body: `Your shipment for ${productName} is now ${statusLabel}.`,
  dealId,
  isRead: false,
  createdAt: Timestamp.now(),
  link: `/deals/${dealId}`,
});
```

### Cloud Function onCall authorization pattern (from acceptQuote)
```js
// Source: functions/index.js exports.acceptQuote
exports.submitShipmentUpdate = onCall(async (request) => {
  const { dealId, status } = request.data;
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError('unauthenticated', 'Must be logged in.');
  if (!dealId || !status) throw new HttpsError('invalid-argument', 'dealId and status required.');

  const dealSnap = await db.collection('deals').doc(dealId).get();
  if (!dealSnap.exists) throw new HttpsError('not-found', 'Deal not found.');
  const deal = dealSnap.data();

  // Verify provider is the selected logistics provider
  const qrSnap = await db.collection('quoteRequests').doc(deal.selectedLogisticsRequestId).get();
  if (!qrSnap.exists || qrSnap.data().providerUid !== uid) {
    throw new HttpsError('permission-denied', 'You are not the selected logistics provider.');
  }
  // ... write to shipmentTracking subcollection
});
```

### FieldValue.arrayUnion outside transaction (safe pattern)
```js
// Source: functions/index.js Phase 2 pattern — side effects outside transactions
// AFTER the transaction that changes deal status:
await db.collection('deals').doc(dealId).update({
  statusHistory: FieldValue.arrayUnion({
    status: DEAL_STATUS.DELIVERED,
    timestamp: Timestamp.now(),
    actorId: uid,
    actorName: providerName,
    note: '',
  }),
});
```

### DI container registration (from container.js)
```js
// Source: src/core/di/container.js — existing singleton pattern
let shipmentRepository = null;

export const container = {
  // ... existing methods ...
  getShipmentRepository() {
    if (!shipmentRepository) {
      shipmentRepository = new ShipmentRepository(this.getFirestoreDataSource());
    }
    return shipmentRepository;
  },
};
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| PROVIDERS_SELECTED as terminal | DELIVERED as true terminal | Phase 6 | Deals remain "active" during shipment until delivery confirmed |
| Static ProgressTracker (4 steps) | Extended OrderTimeline with milestone categories | Phase 6 | Replaces/extends DealSidebar ProgressTracker |
| No per-deal activity history | `statusHistory` array on deal doc | Phase 6 | Enables ordered milestone replay for any deal |

**Deprecated/outdated after Phase 6:**
- `PROVIDERS_SELECTED` is no longer the final terminal status. `Deal.isTerminal()` must include `DELIVERED`. All status filters in `/deals/page.jsx` must add `DELIVERED` to `COMPLETED_STATUSES`.
- The `ProgressTracker` component in `DealSidebar` becomes the foundation for `OrderTimeline` — the sidebar tracking section should evolve from the 4-step progress indicator to a full timestamped milestone list.

---

## Data Model Summary

### New Firestore Collection / Subcollection
```
deals/{dealId}/shipmentTracking/{updateId}
  status: string (SHIPMENT_STATUS enum)
  timestamp: Timestamp
  actorId: string (providerUid)
  actorName: string (denormalized)
  providerType: 'logistics' | 'insurance'
  note: string | null
  containerNumber: string | null  (logistics only, set at first update)
  trackingRef: string | null      (logistics only, set at first update)
  etaDate: Timestamp | null       (logistics only, updatable)
  dealBuyerId: string             (denormalized for security rules)
  dealSellerId: string            (denormalized for security rules)
```

### New Field on deals/{dealId}
```
statusHistory: Array<{
  status: string,
  timestamp: Timestamp,
  actorId: string,
  actorName: string,
  note: string
}>
```

### New Field on deals/{dealId} (for ETA display)
```
shipmentEtaDate: Timestamp | null   (denormalized from latest shipment update for DealCard display)
currentShipmentStatus: string | null (denormalized for DealCard badge)
```

### New Constants
```js
// dealConstants.js
DEAL_STATUS.DELIVERED = 'delivered'

// New constant file: src/core/constants/shipmentConstants.js
export const SHIPMENT_STATUS = {
  PREPARING: 'preparing',
  PICKED_UP: 'picked_up',
  IN_TRANSIT: 'in_transit',
  AT_CUSTOMS: 'at_customs',
  OUT_FOR_DELIVERY: 'out_for_delivery',
  DELIVERED: 'delivered',
  COVERAGE_ACTIVE: 'coverage_active',  // insurance-only milestone
};
```

### New Firestore Security Rules Needed
```
match /deals/{dealId}/shipmentTracking/{updateId} {
  allow read: if isAuthenticated() && (
    isAdmin() ||
    request.auth.uid == resource.data.dealBuyerId ||
    request.auth.uid == resource.data.dealSellerId
  );
  allow write: if false; // All writes via Cloud Functions
}
```

### New Firestore Index Needed
```
Collection: deals/{dealId}/shipmentTracking
Fields: timestamp ASC
(For ordered timeline display)
```

---

## Open Questions

1. **`statusHistory` + `FieldValue.arrayUnion` inside transaction**
   - What we know: Existing pattern avoids side effects inside transactions (line 1664 in functions/index.js). The `statusHistory` append can follow the same outside-transaction pattern.
   - What's unclear: Whether Firebase Admin SDK v13 (project uses `firebase-admin ^13.6.1`) supports arrayUnion inside runTransaction.
   - Recommendation: Implement `statusHistory` append OUTSIDE the transaction as a follow-up `update()` call to be safe — consistent with existing pattern.

2. **DealCard ETA and shipment status badge for member dashboard**
   - What we know: `DealCard` currently reads from `deal.latestOfferSnapshot` only. Adding ETA/status would require either a new hook fetch or denormalized fields on the deal doc.
   - What's unclear: Whether to denormalize `shipmentEtaDate` and `currentShipmentStatus` onto the deal doc (easier for DealCard) or have the DealList do a per-deal shipmentTracking query (N+1 problem).
   - Recommendation: Denormalize `shipmentEtaDate` and `currentShipmentStatus` onto the deal document, updated by Cloud Function whenever a new shipment update is submitted. This avoids N+1 queries on the deals list.

3. **Trade route map: named place coordinates**
   - What we know: The deal stores `namedPlace` from the Incoterms selection (a UN/LOCODE city name string like "Istanbul, Turkey"). The project uses `@geoapify/un-locode` for location lookup.
   - What's unclear: Whether to look up actual lat/lng from UN/LOCODE for pin placement, or use a simpler static fallback with representative positions.
   - Recommendation: Use static placeholder positions for the initial implementation (matching S4 mockup approach). Phase 6 decision is "purely visual context" so exact coordinates are not required.

---

## Sources

### Primary (HIGH confidence)
- Codebase: `src/core/constants/dealConstants.js` — deal state machine, DEAL_STATUS enum
- Codebase: `src/core/di/container.js` — DI container registration pattern
- Codebase: `src/data/repositories/DealRepository.js` — subscribeToDeals/subscribeToDeal pattern
- Codebase: `functions/index.js` lines 980–1030 — CJS constants duplication pattern
- Codebase: `functions/index.js` lines 1660–1760 — sendDealNotifications pattern
- Codebase: `functions/index.js` lines 2694–2810 — acceptQuote CF authorization pattern
- Codebase: `src/presentation/hooks/deal/useDeal.js` — parallel subscription with closure flags
- Codebase: `src/presentation/components/features/deal/DealSidebar/DealSidebar.jsx` — ProgressTracker
- Codebase: `src/presentation/components/features/deal/DealPage/DealPage.jsx` — tab/banner integration
- Codebase: `src/presentation/components/features/deal/DealCard/DealCard.jsx` — status config extension
- Codebase: `firestore.rules` — security rules patterns for subcollections
- Codebase: `other_items/S4-ticaret-ozeti-takip.html` — visual reference for hero, trade info bar, map, timeline, PDF print

### Secondary (MEDIUM confidence)
- Firebase Admin SDK v13 changelog — FieldValue.arrayUnion behavior in transactions

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new libraries needed; all existing dependencies cover requirements
- Architecture: HIGH — all patterns directly derived from existing Phase 2–5 codebase
- Pitfalls: HIGH — each pitfall directly observed in existing code or documented in STATE.md
- Data model: HIGH — follows established subcollection + denormalization patterns
- PDF/map approach: MEDIUM — window.print() is confirmed viable (S4 mockup), react-pdf is an alternative if finer control is needed

**Research date:** 2026-03-29
**Valid until:** 2026-05-01 (stable stack; Firebase and Next.js versions pinned in package.json)
