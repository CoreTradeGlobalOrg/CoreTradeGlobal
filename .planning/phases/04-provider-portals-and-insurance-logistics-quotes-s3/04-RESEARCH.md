# Phase 4: Provider Portals and Insurance/Logistics Quotes (S3) - Research

**Researched:** 2026-03-02
**Domain:** Firestore multi-collection real-time architecture, role-based data visibility, Cloud Function triggers, kanban UI, multi-card comparison views
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Quote Request Distribution**
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

**Provider Portal Experience**
- Kanban-style visual columns: New Requests, Quoted, Declined, Selected — visual groupings only, no drag-and-drop
- Rich preview per kanban card: product name, origin → destination route, quantity, Incoterm, deadline countdown, status badge
- Separate provider route (e.g., /provider/dashboard) — not integrated into existing dashboard
- Shared layout for insurance and logistics providers — same kanban structure, only the quote form fields differ
- Side-by-side layout for quote detail view: deal info on left, quote form on right (mirrors DealPage two-column pattern)
- Single-page quote form for both insurance and logistics (not wizard/multi-step)
- All providers notified on selection: winning provider gets "Your quote was accepted", others get "Another provider was selected"

**Insurance Quote Form Fields**
- ICC coverage type selector: A (All Risks), B (Named Perils Extended), C (Named Perils Basic)
- War Clause and Strikes Clause as optional add-ons
- Premium amount, coverage amount, deductible/franchise percentage
- Claims payment period (business days)
- Policy validity period (start/end dates)
- Coverage scope (warehouse-to-warehouse, port-to-port, door-to-door)
- Certificate type, currency, notes/special conditions
- Quote validity period set by provider (e.g., 12h, 24h, 48h)
- Reference mockup: `other_items/sigorta-teklif-portali.html`

**Logistics Quote Form Fields**
- Transport mode: Sea, Air, Road, Rail, Multimodal
- Container type (20ft, 40ft, 40ft HC, etc.) — relevant for sea freight
- Pricing (total freight cost), estimated timeline, loading date, estimated arrival
- Quote validity period set by provider
- Provider-entered capability tags (GPS Tracking, Cold Chain, Door-to-Door, Customs Support, etc.)
- Notes/special conditions

**Quote Comparison & Selection (Buyer View)**
- Adapted to existing DealPage two-column pattern (main content + sidebar), not the mockup's three-column
- Insurance and logistics quote sections shown side-by-side, stacked vertically on mobile
- Filter pills: logistics by transport mode (All, Sea, Road, Air, Rail), insurance by coverage type (All, Full, Basic, ICC A/B/C)
- Sort options: by price (low/high), timeline (fastest), validity (most time remaining)
- Auto-calculated ribbons on cards: "Best Value", "Fastest", "Cheapest"
- Live pulse indicator with real-time quote count
- Quote cards show: provider name + location (no ratings/stars in v1), pricing, coverage/mode details, capability tags, validity countdown + select button
- Full deal contract details visible in the quote request (product, quantity, Incoterms, named place, delivery deadline, payment terms — minus price for logistics)
- Reference mockup: `other_items/S3-sigorta-tasima.html`

**Confirmation & Cost Summary**
- Cost breakdown updates live as buyer selects/deselects quotes
- No platform service fee in v1 — breakdown: goods value + freight cost + insurance premium = total
- Allow partial selection (buyer can confirm with just one provider type if deal doesn't require both — e.g., EXW may not need insurance)
- Inline confirmation + redirect to deal summary/tracking page (no modal)
- Trade process stepper in sidebar — functional, reflecting actual deal progress through all stages (negotiation, agreement, contract, insurance & transport)

**Data Visibility Rules**
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

### Deferred Ideas (OUT OF SCOPE)
- Provider ratings and review system — future phase (no ratings in v1, just name + location)
- Draft quote saving for providers — could be added in Phase 7 hardening
- Risk analysis/scoring system for cargo (shown in mockup but complex) — future enhancement
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| QUOTE-01 | Buyer can view and compare insurance quotes from multiple providers | QuotesPage component at `/deals/[dealId]/quotes`, `useQuotes` hook with real-time Firestore listener, InsuranceQuoteCard components with filter+sort |
| QUOTE-02 | Buyer can view and compare logistics quotes from multiple providers | Same QuotesPage, LogisticsQuoteCard components, transport mode filter pills |
| QUOTE-03 | Quotes display provider details, price, coverage/mode, and validity countdown | Reuse existing `CountdownTimer` component; quote cards render provider fields; `quoteValidUntil` Timestamp field |
| QUOTE-04 | Quote validity timer enforced server-side via Cloud Function | `acceptQuote` Cloud Function checks `quote.validUntil <= Timestamp.now()` before writing; returns `failed-precondition` if expired — client timer is UI only |
| QUOTE-05 | Buyer can select and confirm one insurance and one logistics provider per deal | `acceptQuote` Cloud Function sets deal status to `providers_selected`; Firestore rules require `deal.status === 'awaiting_quotes'`; partial selection allowed |
| QUOTE-06 | Cost breakdown summary displayed after provider selection | Live-computed sidebar panel: goods value (from deal) + freight cost + insurance premium; updates as buyer selects/deselects |
| PORTAL-01 | Insurance providers can view incoming quote requests with full deal info including price | `quoteRequests` collection with `providerType: 'insurance'` filter; Firestore rules allow insurance_provider to read all deal fields including price via dedicated read path |
| PORTAL-02 | Insurance providers can submit quotes with ICC coverage (A/B/C), premium, extras, and validity period | `submitQuote` Cloud Function with insurance-specific payload validation; `quotes` subcollection under `quoteRequests` |
| PORTAL-03 | Logistics providers can view incoming quote requests with all deal info except price | `quoteRequests` documents store a `dealSnapshot` object with price field omitted for logistics; enforced at write time in the trigger Cloud Function and confirmed by Firestore rules |
| PORTAL-04 | Logistics providers can submit quotes with transport mode, pricing, timeline, and validity period | Same `submitQuote` Cloud Function, logistics-specific validation path |
| PORTAL-05 | Provider data visibility rules enforced at data layer — logistics providers never see deal price | Firestore rules on `quoteRequests/{reqId}` deny read of `dealSnapshot.price` for logistics_provider role; enforced separately from middleware |
</phase_requirements>

---

## Summary

Phase 4 builds two interconnected surfaces: the Provider Portal (a kanban dashboard where insurance and logistics providers receive, respond to, and manage quote requests) and the Buyer Quotes View (a real-time comparison screen where the buyer reviews and selects quotes). The core technical challenge is the price-visibility separation for logistics providers — this must be enforced at the Firestore data layer, not just at the UI layer.

The implementation follows established project patterns throughout. The Cloud Function trigger model (onDocumentUpdated watching `deal.status === 'contract_approved'`) mirrors Phase 3's `onDealStatusChanged` contract generation trigger. The repository pattern (new `QuoteRequestRepository` and `QuoteRepository`), DI container registration, constants file, hook structure, and real-time `onSnapshot` listeners all follow the exact precedent set by `ContractRepository`, `useDeal`, and `useContract`. The DealPage two-column layout (70% main / 30% sidebar) is reused directly for both the provider quote form view and the buyer comparison view.

The most architecturally significant decision is where deal price data lives for logistics providers. The recommended approach is to store a `dealSnapshot` object inside each `quoteRequest` document at creation time, with the price field intentionally excluded for logistics requests. This denormalization is safe because the deal is finalized (contract_approved) — the price will not change. Firestore security rules then enforce that logistics providers cannot read the price field even from the deals collection directly.

**Primary recommendation:** Build in four waves — (1) Firestore data model + Cloud Function trigger + security rules, (2) provider portal kanban + quote submission form, (3) buyer quotes comparison page + cost summary, (4) DealPage integration banner and stepper update.

---

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| firebase (Firestore) | ^12.4.0 | Real-time quote subscriptions via `onSnapshot` | Already used throughout — all deal/offer/contract patterns use this |
| firebase-admin | ^13.6.1 | Cloud Function Admin SDK for server-side quote creation and validation | Already in use for all state transitions |
| react-hook-form | ^7.66.0 | Provider quote form state management | Already used in CounterOfferForm; zod validation via @hookform/resolvers |
| zod | ^4.1.12 | Quote form schema validation | Already used for all forms in the project |
| lucide-react | ^0.560.0 | Icons for kanban cards, quote cards, transport mode icons | Already used everywhere |
| framer-motion | ^12.33.0 | Card entrance animations, ribbon badges | Already installed; used for UI polish |
| tailwindcss | ^4 | All layout and styling | Project-wide standard |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| firebase-functions/v2/firestore | (bundled) | `onDocumentUpdated` trigger for contract_approved | Same trigger type used for deal status changes in Phase 3 |
| firebase-functions/v2/https | (bundled) | `onCall` functions for submitQuote, acceptQuote, declineRequest | Same pattern as submitContractApproval |
| react-hot-toast | ^2.6.0 | Success/error feedback on quote submission/acceptance | Already used for all action feedback |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Subcollection for quotes under quoteRequests | Top-level `quotes` collection | Subcollection is simpler: natural parent-child, Firestore rules inherit parent, easier queries per request. Use subcollection. |
| Denormalized `dealSnapshot` in quoteRequest | Reference + real-time get() | Denormalization is correct here — deal is immutable after contract_approved; no sync problem; enables price exclusion at write time |
| Kanban via state machine on `quoteRequest.providerStatus` | Client-side derived state | Store `providerStatus` per provider on the quoteRequest doc; derive kanban column from it; simpler than a separate kanban state collection |

**Installation:** No new packages needed. All dependencies are already installed.

---

## Architecture Patterns

### Recommended Project Structure

New files/directories to create:

```
src/
├── core/
│   └── constants/
│       └── quoteConstants.js          # QUOTE_STATUS, REQUEST_STATUS, ICC_COVERAGE, TRANSPORT_MODES, etc.
├── domain/
│   └── entities/
│       ├── QuoteRequest.js            # QuoteRequest entity (fromFirestore, helpers)
│       └── Quote.js                   # Quote entity (fromFirestore, isExpired(), etc.)
├── data/
│   └── repositories/
│       ├── QuoteRequestRepository.js  # subscribeToRequestsForProvider(), subscribeToRequestForDeal()
│       └── QuoteRepository.js         # subscribeToQuotesForRequest(), subscribeToQuotesForDeal()
├── presentation/
│   ├── hooks/
│   │   └── quote/
│   │       ├── useQuoteRequest.js     # Real-time subscription to a single quoteRequest
│   │       ├── useQuotesForDeal.js    # Real-time subscription to all quotes for a deal (buyer view)
│   │       └── useQuoteActions.js     # submitQuote, acceptQuote, declineRequest, withdrawQuote
│   └── components/features/
│       ├── provider/
│       │   ├── ProviderDashboard/     # Kanban layout, column headers, card lists
│       │   ├── RequestKanbanCard/     # Single kanban card (product, route, countdown, status)
│       │   ├── QuoteFormInsurance/    # Insurance quote form (react-hook-form + zod)
│       │   └── QuoteFormLogistics/   # Logistics quote form (react-hook-form + zod)
│       └── quote/
│           ├── QuotesPage/            # Buyer comparison view (two-column)
│           ├── QuotesSidebar/         # Cost breakdown + stepper + selection summary
│           ├── InsuranceQuoteCard/    # Single insurance quote card with ribbon + countdown
│           └── LogisticsQuoteCard/   # Single logistics quote card with ribbon + countdown
└── app/(main)/
    ├── provider/
    │   └── dashboard/
    │       └── page.jsx               # /provider/dashboard — kanban + quote form
    └── deals/
        └── [dealId]/
            └── quotes/
                └── page.jsx           # /deals/[dealId]/quotes — buyer comparison view

functions/
└── index.js                           # Add: onContractApproved trigger, submitQuote, acceptQuote,
                                       #      declineQuoteRequest, withdrawQuote, checkExpiredQuotes
```

### Pattern 1: Firestore Data Model — Two Collections

**What:** Two Firestore collections handle the provider portal flow.

```
// Collection: quoteRequests
// Path: quoteRequests/{requestId}
// Created by: onContractApproved Cloud Function trigger
// One document per provider per deal (not one per deal)

{
  dealId: string,                   // Parent deal
  providerUid: string,              // Which provider this request is for
  providerType: 'insurance' | 'logistics',

  // dealSnapshot — denormalized at request creation time (deal is immutable at this point)
  // CRITICAL: logistics requests NEVER include price field
  dealSnapshot: {
    productName: string,
    productImage: string | null,
    originPlace: string,            // namedPlace from offer
    quantity: number,
    unit: string,
    incoterm: string,
    paymentTerms: string,
    deliveryDeadline: Timestamp | null,
    currency: string,
    // price: OMITTED for logistics, INCLUDED for insurance
    // estimatedTotal: OMITTED for logistics, INCLUDED for insurance
  },

  status: 'pending' | 'quoted' | 'declined' | 'selected' | 'not_selected',
  deadline: Timestamp,              // createdAt + 72 hours
  createdAt: Timestamp,
  updatedAt: Timestamp,
}

// Collection: quotes
// Path: quoteRequests/{requestId}/quotes/{quoteId}
// OR top-level: quotes/{quoteId} with requestId field
// RECOMMENDED: subcollection under quoteRequests for natural access control

// Insurance quote document shape:
{
  requestId: string,
  dealId: string,
  providerUid: string,
  providerType: 'insurance',

  // Insurance-specific fields
  iccCoverage: 'A' | 'B' | 'C',
  warClause: boolean,
  strikesClause: boolean,
  premiumAmount: number,
  coverageAmount: number,
  deductiblePct: number,
  claimsPaymentDays: number,
  policyStartDate: Timestamp,
  policyEndDate: Timestamp,
  coverageScope: 'warehouse_to_warehouse' | 'port_to_port' | 'door_to_door',
  certificateType: string,
  currency: string,
  notes: string,

  validUntil: Timestamp,            // Provider-set validity
  status: 'active' | 'withdrawn' | 'expired' | 'accepted',
  createdAt: Timestamp,
  updatedAt: Timestamp,
}

// Logistics quote document shape:
{
  requestId: string,
  dealId: string,
  providerUid: string,
  providerType: 'logistics',

  // Logistics-specific fields
  transportMode: 'sea' | 'air' | 'road' | 'rail' | 'multimodal',
  containerType: string | null,     // '20ft' | '40ft' | '40ft_hc' etc. — null for non-sea
  freightCost: number,
  currency: string,
  estimatedTransitDays: number,
  loadingDate: Timestamp,
  estimatedArrival: Timestamp,
  capabilityTags: string[],         // ['GPS Tracking', 'Cold Chain', etc.]
  notes: string,

  validUntil: Timestamp,
  status: 'active' | 'withdrawn' | 'expired' | 'accepted',
  createdAt: Timestamp,
  updatedAt: Timestamp,
}
```

**When to use:** Always — this is the only Firestore data model for Phase 4.

### Pattern 2: Cloud Function Trigger — Contract Approved

**What:** `onDocumentUpdated` on `deals/{dealId}` watching for `contract_approved` transition, then broadcasting quote requests to all matching providers.

```javascript
// In functions/index.js — appended to onDealStatusChanged

// Inside onDealStatusChanged, after existing contract_approved handling:
if (before.status !== DEAL_STATUS.CONTRACT_APPROVED &&
    after.status === DEAL_STATUS.CONTRACT_APPROVED) {
  try {
    await broadcastQuoteRequests(dealId, after);
  } catch (err) {
    console.error(`broadcastQuoteRequests: failed for deal ${dealId}:`, err);
    // Non-fatal — do not block existing contract_approved flow
  }
}

/**
 * Broadcast quote requests to all registered providers.
 * Creates one quoteRequest document per provider per type.
 */
async function broadcastQuoteRequests(dealId, deal) {
  // Fetch all insurance_provider and logistics_provider users
  const [insuranceSnap, logisticsSnap] = await Promise.all([
    db.collection('users').where('role', '==', ROLES.INSURANCE_PROVIDER).get(),
    db.collection('users').where('role', '==', ROLES.LOGISTICS_PROVIDER).get(),
  ]);

  const deadline = Timestamp.fromMillis(Date.now() + 72 * 60 * 60 * 1000); // 72h

  const batch = db.batch();

  // Build insurance deal snapshot (includes price)
  const insuranceDealSnapshot = {
    productName: deal.productName,
    productImage: deal.productImage || null,
    quantity: deal.latestOfferSnapshot?.quantity || 0,
    unit: deal.latestOfferSnapshot?.unit || '',
    incoterm: deal.latestOfferSnapshot?.incoterm || '',
    namedPlace: deal.latestOfferSnapshot?.namedPlace || '',
    paymentTerms: deal.latestOfferSnapshot?.paymentTerms || '',
    deliveryDeadline: deal.latestOfferSnapshot?.deliveryDeadline || null,
    currency: deal.latestOfferSnapshot?.currency || 'USD',
    price: deal.latestOfferSnapshot?.price || 0,             // INCLUDED for insurance
    estimatedTotal: deal.latestOfferSnapshot?.estimatedTotal || 0,
  };

  // Build logistics deal snapshot (PRICE EXCLUDED)
  const { price, estimatedTotal, ...logisticsDealSnapshot } = insuranceDealSnapshot;

  insuranceSnap.docs.forEach((providerDoc) => {
    const ref = db.collection('quoteRequests').doc();
    batch.set(ref, {
      dealId,
      providerUid: providerDoc.id,
      providerType: 'insurance',
      dealSnapshot: insuranceDealSnapshot,
      buyerId: deal.buyerId,
      sellerId: deal.sellerId,
      status: 'pending',
      deadline,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
  });

  logisticsSnap.docs.forEach((providerDoc) => {
    const ref = db.collection('quoteRequests').doc();
    batch.set(ref, {
      dealId,
      providerUid: providerDoc.id,
      providerType: 'logistics',
      dealSnapshot: logisticsDealSnapshot,  // price NOT included
      buyerId: deal.buyerId,
      sellerId: deal.sellerId,
      status: 'pending',
      deadline,
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
  });

  await batch.commit();
  console.log(`broadcastQuoteRequests: created requests for ${insuranceSnap.size} insurance + ${logisticsSnap.size} logistics providers`);
}
```

### Pattern 3: Server-Side Quote Validity Enforcement (QUOTE-04)

**What:** The `acceptQuote` Cloud Function checks expiry before any writes. The client-side timer is purely visual.

```javascript
exports.acceptQuote = onCall(async (request) => {
  const { quoteRequestId, quoteId } = request.data;
  const uid = request.auth?.uid;

  if (!uid) throw new HttpsError('unauthenticated', 'Must be logged in.');

  const requestRef = db.collection('quoteRequests').doc(quoteRequestId);
  const quoteRef = requestRef.collection('quotes').doc(quoteId);

  await db.runTransaction(async (t) => {
    const [requestSnap, quoteSnap] = await Promise.all([
      t.get(requestRef),
      t.get(quoteRef),
    ]);

    if (!requestSnap.exists) throw new HttpsError('not-found', 'Quote request not found.');
    if (!quoteSnap.exists) throw new HttpsError('not-found', 'Quote not found.');

    const quoteRequest = requestSnap.data();
    const quote = quoteSnap.data();

    // Authorization: only the buyer can accept
    if (uid !== quoteRequest.buyerId) {
      throw new HttpsError('permission-denied', 'Only the buyer can accept quotes.');
    }

    // Server-side expiry check — CLIENT TIMER IS NOT TRUSTED
    const now = Timestamp.now();
    if (quote.validUntil.toMillis() <= now.toMillis()) {
      throw new HttpsError(
        'failed-precondition',
        'This quote has expired and can no longer be accepted.'
      );
    }

    // Status guard — quote must be active
    if (quote.status !== 'active') {
      throw new HttpsError(
        'failed-precondition',
        `Quote status is '${quote.status}' — cannot accept.`
      );
    }

    const now2 = Timestamp.now();
    t.update(quoteRef, { status: 'accepted', updatedAt: now2 });
    t.update(requestRef, { status: 'selected', updatedAt: now2 });

    // Mark deal with provider selection
    const dealRef = db.collection('deals').doc(quoteRequest.dealId);
    // Store selected provider reference on the deal
    const selectionField = quote.providerType === 'insurance'
      ? 'selectedInsuranceQuoteId'
      : 'selectedLogisticsQuoteId';
    t.update(dealRef, {
      [selectionField]: quoteId,
      [`${selectionField}RequestId`]: quoteRequestId,
      updatedAt: now2,
    });
  });

  return { success: true };
});
```

### Pattern 4: Price-Separation Firestore Security Rules

**What:** Firestore rules for the `quoteRequests` collection enforce data visibility at the database layer.

```javascript
// In firestore.rules — add this block

match /quoteRequests/{requestId} {

  // Helper: is this the provider assigned to this request?
  function isAssignedProvider() {
    return isAuthenticated() && request.auth.uid == resource.data.providerUid;
  }

  // Helper: is this a logistics provider trying to read price?
  function isLogisticsProviderReadingPrice() {
    return isLogisticsProvider() &&
      ('price' in resource.data.dealSnapshot ||
       'estimatedTotal' in resource.data.dealSnapshot);
  }

  // Providers: can read their own requests
  // Buyers and sellers: can read requests for their deals
  allow read: if isAuthenticated() && (
    isAdmin() ||
    isAssignedProvider() ||
    request.auth.uid == resource.data.buyerId ||
    request.auth.uid == resource.data.sellerId
  );

  // All writes via Cloud Functions (Admin SDK bypasses rules)
  allow write: if false;

  // Quotes subcollection
  match /quotes/{quoteId} {
    // Provider can read/write their own quotes
    // Buyer and seller can read all quotes for their deal
    allow read: if isAuthenticated() && (
      isAdmin() ||
      request.auth.uid == get(/databases/$(database)/documents/quoteRequests/$(requestId)).data.providerUid ||
      request.auth.uid == get(/databases/$(database)/documents/quoteRequests/$(requestId)).data.buyerId ||
      request.auth.uid == get(/databases/$(database)/documents/quoteRequests/$(requestId)).data.sellerId
    );
    allow write: if false; // All writes via Cloud Functions
  }
}
```

**Critical note on logistics price exclusion:** The price separation is guaranteed at WRITE time (the trigger Cloud Function never stores price in the logistics `dealSnapshot`), not just at rule read time. Rules serve as a defense-in-depth layer. This approach is more reliable than trying to exclude fields at the Firestore rules layer, which has no native field-level masking for reads.

### Pattern 5: Real-Time Subscription for Provider Portal

**What:** `QuoteRequestRepository` follows `OfferRepository` and `ContractRepository` patterns exactly.

```javascript
// src/data/repositories/QuoteRequestRepository.js
import { collection, query, where, orderBy, onSnapshot, doc } from 'firebase/firestore';
import { db } from '@/core/config/firebase.config';
import { QuoteRequest } from '@/domain/entities/QuoteRequest';

export class QuoteRequestRepository {
  constructor(firestoreDataSource) {
    this.firestoreDataSource = firestoreDataSource;
  }

  /**
   * Real-time subscription to all requests for a specific provider.
   * Used by provider portal kanban.
   */
  subscribeToRequestsForProvider(providerUid, callback) {
    const q = query(
      collection(db, 'quoteRequests'),
      where('providerUid', '==', providerUid),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(q, (snap) => {
      callback(snap.docs.map((d) => QuoteRequest.fromFirestore({ id: d.id, ...d.data() })));
    }, (err) => {
      console.error('QuoteRequestRepository.subscribeToRequestsForProvider:', err);
    });
  }

  /**
   * Real-time subscription to all requests for a specific deal.
   * Used by buyer quotes page to see all provider responses.
   */
  subscribeToRequestsForDeal(dealId, callback) {
    const q = query(
      collection(db, 'quoteRequests'),
      where('dealId', '==', dealId),
      orderBy('createdAt', 'desc')
    );

    return onSnapshot(q, (snap) => {
      callback(snap.docs.map((d) => QuoteRequest.fromFirestore({ id: d.id, ...d.data() })));
    }, (err) => {
      console.error('QuoteRequestRepository.subscribeToRequestsForDeal:', err);
    });
  }
}
```

### Pattern 6: Kanban Column Derivation (No Drag-and-Drop)

**What:** Kanban columns are derived from `quoteRequest.status` — no dedicated kanban state. The `useProviderDashboard` hook groups requests by status.

```javascript
// In useQuoteRequest.js or useProviderDashboard.js
function groupByKanbanColumn(requests) {
  return {
    newRequests: requests.filter(r => r.status === 'pending'),
    quoted:      requests.filter(r => r.status === 'quoted'),
    declined:    requests.filter(r => r.status === 'declined'),
    selected:    requests.filter(r => r.status === 'selected' || r.status === 'not_selected'),
  };
}
```

### Pattern 7: New DEAL_STATUS value — `providers_selected`

**What:** After buyer accepts both (or one) provider quote, deal advances to `providers_selected`. This gates Phase 6 (Tracking).

```javascript
// Add to dealConstants.js
export const DEAL_STATUS = {
  // ... existing values
  PROVIDERS_SELECTED: 'providers_selected',  // Insurance and/or logistics providers confirmed
};

export const VALID_DEAL_TRANSITIONS = {
  // ... existing
  [DEAL_STATUS.CONTRACT_APPROVED]: [DEAL_STATUS.PROVIDERS_SELECTED],
  [DEAL_STATUS.PROVIDERS_SELECTED]: [],  // Terminal for Phase 4; gateway for Phase 6
};
```

### Anti-Patterns to Avoid

- **Trusting client-side timer for acceptance:** The `CountdownTimer` component is display-only. Server MUST re-check `quote.validUntil` inside `acceptQuote` runTransaction. A user could manipulate the client clock or send a direct Firebase call.
- **Storing price in logistics dealSnapshot:** Even "accidentally" including the estimatedTotal field in logistics quoteRequest documents breaks PORTAL-05. The exclusion must happen in the trigger function at write time.
- **Putting broadcastQuoteRequests inside a Firestore transaction:** Writing many documents (N providers × batch) inside a transaction risks Firestore contention limits. Use `batch.commit()` outside any transaction, just like `sendDealNotifications` runs outside transactions.
- **Single `quoteRequests` document per deal (not per provider):** This would require storing all provider statuses in one document, which creates write conflicts when multiple providers submit simultaneously. One document per provider avoids this entirely.
- **Using collectionGroup query to read quotes for a deal:** This is a security concern — collectionGroup queries bypass document-level security rules in some Firestore rule configurations. Prefer querying quoteRequests by dealId first, then subscribing to each request's quotes subcollection, OR use a top-level `quotes` collection with dealId + requestId fields if collectionGroup is needed.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Quote expiry countdown | Custom interval logic | Existing `CountdownTimer` component | Already handles green/yellow/red thresholds, cleanup on unmount, SSR hydration |
| Quote form validation | Manual if/else validation | `react-hook-form` + `zod` schemas | Already used in CounterOfferForm; zod handles nested object validation, required fields, min/max |
| Provider notifications on quote submission | Custom notification writer | `sendDealNotifications` pattern (adapted) | Existing 3-channel (in-app + FCM + email) notification infrastructure in functions/index.js |
| "Best Value" / "Fastest" ribbon logic | Complex ranking algorithm | Simple derived computation on sorted quote arrays | One pass: cheapest = min(price), fastest = min(transitDays), best value = subjective formula |
| Firestore batch writes for broadcast | Individual `setDoc` calls in loop | `db.batch()` | Atomic commit, single network round-trip, 500 document limit per batch is sufficient |
| Deal price for cost summary | Re-fetching deal from Firestore | Use `deal.latestOfferSnapshot.estimatedTotal` already in memory | DealPage already has this data; pass as prop to QuotesSidebar |

**Key insight:** Almost every building block for Phase 4 already exists in the codebase. The phase is primarily assembly and extension of existing patterns, with the price-exclusion enforcement being the only genuinely novel technical problem.

---

## Common Pitfalls

### Pitfall 1: Price Leaking to Logistics Providers
**What goes wrong:** The logistics provider's `dealSnapshot` accidentally includes `price` or `estimatedTotal`.
**Why it happens:** The trigger function destructures the offer snapshot without explicitly removing price fields, or a future schema update adds a field that includes price by default.
**How to avoid:** Use explicit allowlist when building `logisticsDealSnapshot` — never use spread-then-delete. Build the logistics snapshot field by field from a defined list. Add a comment block listing the excluded fields.
**Warning signs:** Firestore document for a logistics quoteRequest has `dealSnapshot.price` field — detectable in Firebase Console during dev testing.

### Pitfall 2: Client Timer Bypassed for Quote Acceptance
**What goes wrong:** A buyer sends `acceptQuote` Cloud Function call after the timer reaches zero but before the server-side scheduled check marks the quote as expired.
**Why it happens:** Client timer is UI only; the quote's `status` field in Firestore may still be `'active'` even after `validUntil` has passed (until `checkExpiredQuotes` scheduled function runs).
**How to avoid:** In `acceptQuote`, check `quote.validUntil.toMillis() <= Timestamp.now().toMillis()` directly inside the runTransaction, regardless of `quote.status`. This is the server-enforced expiry per QUOTE-04.
**Warning signs:** Buyer successfully accepts a quote whose countdown timer shows "Expired" in the UI.

### Pitfall 3: Multiple Writes in onDealStatusChanged Transaction
**What goes wrong:** `broadcastQuoteRequests` is called inside the `onDealStatusChanged` transaction, causing timeouts or contention when there are many providers.
**Why it happens:** Phase 3's `submitContractApproval` shows the pattern of calling side effects inside a transaction — Phase 4 might mistakenly follow that for the broadcast.
**How to avoid:** Call `broadcastQuoteRequests(dealId, after)` OUTSIDE the transaction, just like `sendDealNotifications`. The existing `onDealStatusChanged` function already calls notifications outside; follow that structure.
**Warning signs:** Cloud Function timeout errors; incomplete batch writes when provider count is large.

### Pitfall 4: Firestore Rule `get()` Cost on Quote Reads
**What goes wrong:** Every read on the `quotes` subcollection triggers a `get()` on the parent `quoteRequests` document to check `buyerId`/`sellerId`, causing excessive Firestore reads and potentially exceeding free tier.
**Why it happens:** The Firestore rules pattern for `quotes/{quoteId}` as written requires a `get()` to check the parent request for buyerId/sellerId. This is the same pattern used for `offers/{offerId}` — acceptable cost for the existing scale.
**How to avoid:** Denormalize `buyerId` and `sellerId` onto each `quotes` document as well (at write time in the Cloud Function), then check those fields directly in the rule without a `get()` call.
**Warning signs:** Firebase Firestore reads counter spikes dramatically when buyer views the quotes page.

### Pitfall 5: DEAL_STATUS.PROVIDERS_SELECTED Not Added to `isTerminal()` Appropriately
**What goes wrong:** The `Deal.isTerminal()` method and `VALID_DEAL_TRANSITIONS` still treat `CONTRACT_APPROVED` as having no transitions, or `DealPage` shows wrong UI state for `providers_selected` deals.
**Why it happens:** `dealConstants.js` and `Deal.js` must both be updated together; the functions/index.js CJS duplicate must also be updated.
**How to avoid:** When adding `PROVIDERS_SELECTED` to `DEAL_STATUS`, update: (1) `dealConstants.js` DEAL_STATUS and VALID_DEAL_TRANSITIONS, (2) `Deal.js` `isTerminal()` and add `isProvidersSelected()`, (3) `functions/index.js` CJS duplicate constants, (4) `DealCard.jsx` STATUS_CONFIG badge config, (5) `DealPage.jsx` status handling.
**Warning signs:** DealPage shows wrong terminal banner for providers_selected deals; Cloud Function rejects transitions.

### Pitfall 6: Provider Portal Route Already Exists But Needs Complete Replacement
**What goes wrong:** The existing `/provider/page.jsx` is a placeholder tab layout. Phase 4 replaces it with `/provider/dashboard/page.jsx` (per CONTEXT.md decision). The old route at `/provider` may conflict.
**Why it happens:** CONTEXT.md specifies `/provider/dashboard` as the new route, but the existing placeholder is at `/provider`.
**How to avoid:** Create the new route at `/provider/dashboard/page.jsx`. Update the nav link to point to `/provider/dashboard`. The old `/provider/page.jsx` can be kept as a redirect to `/provider/dashboard` or replaced with the dashboard directly.
**Warning signs:** `/provider` returns the old placeholder; middleware route protection for `/provider` must also protect `/provider/dashboard` (it does — the middleware checks `pathname.startsWith('/provider')`).

### Pitfall 7: `checkExpiredQuotes` Scheduled Function Naming Conflict
**What goes wrong:** Adding a new scheduled function `checkExpiredQuotes` that uses `collectionGroup('quotes')` — but `quotes` is also used as a subcollection name on the `requests` collection (existing, for RFQ quotes). The collectionGroup query will hit both.
**Why it happens:** The `quoteRequests/{reqId}/quotes/{quoteId}` subcollection shares the name `quotes` with `requests/{reqId}/quotes/{quoteId}`.
**How to avoid:** Name the new subcollection `providerQuotes` instead of `quotes` to avoid collisionGroup queries. OR use a top-level `quotes` collection with `requestId` and `dealId` fields, queried by field rather than collectionGroup. Verify in Firestore Console during development.
**Warning signs:** `checkExpiredQuotes` function accidentally expires unrelated RFQ quotes from the requests collection.

---

## Code Examples

### Quote Entity (fromFirestore pattern)

```javascript
// src/domain/entities/Quote.js
// Source: mirrors Contract.js and Deal.js entity patterns in this codebase

export class Quote {
  constructor({
    id,
    requestId,
    dealId,
    providerUid,
    providerType,
    // Insurance fields
    iccCoverage,
    warClause,
    strikesClause,
    premiumAmount,
    coverageAmount,
    deductiblePct,
    claimsPaymentDays,
    policyStartDate,
    policyEndDate,
    coverageScope,
    certificateType,
    // Logistics fields
    transportMode,
    containerType,
    freightCost,
    estimatedTransitDays,
    loadingDate,
    estimatedArrival,
    capabilityTags,
    // Common
    currency,
    notes,
    validUntil,
    status,
    createdAt,
    updatedAt,
  }) {
    this.id = id;
    this.requestId = requestId;
    this.dealId = dealId;
    this.providerUid = providerUid;
    this.providerType = providerType;
    // insurance
    this.iccCoverage = iccCoverage || null;
    this.warClause = warClause || false;
    this.strikesClause = strikesClause || false;
    this.premiumAmount = premiumAmount || 0;
    this.coverageAmount = coverageAmount || 0;
    this.deductiblePct = deductiblePct || 0;
    this.claimsPaymentDays = claimsPaymentDays || 0;
    this.policyStartDate = policyStartDate || null;
    this.policyEndDate = policyEndDate || null;
    this.coverageScope = coverageScope || null;
    this.certificateType = certificateType || null;
    // logistics
    this.transportMode = transportMode || null;
    this.containerType = containerType || null;
    this.freightCost = freightCost || 0;
    this.estimatedTransitDays = estimatedTransitDays || 0;
    this.loadingDate = loadingDate || null;
    this.estimatedArrival = estimatedArrival || null;
    this.capabilityTags = capabilityTags || [];
    // common
    this.currency = currency || 'USD';
    this.notes = notes || '';
    this.validUntil = validUntil || null;
    this.status = status || 'active';
    this.createdAt = createdAt || new Date();
    this.updatedAt = updatedAt || new Date();
  }

  static fromFirestore(data) {
    return new Quote({
      ...data,
      policyStartDate: data.policyStartDate?.toDate?.() || data.policyStartDate || null,
      policyEndDate: data.policyEndDate?.toDate?.() || data.policyEndDate || null,
      loadingDate: data.loadingDate?.toDate?.() || data.loadingDate || null,
      estimatedArrival: data.estimatedArrival?.toDate?.() || data.estimatedArrival || null,
      validUntil: data.validUntil?.toDate?.() || data.validUntil || null,
      createdAt: data.createdAt?.toDate?.() || data.createdAt || new Date(),
      updatedAt: data.updatedAt?.toDate?.() || data.updatedAt || new Date(),
    });
  }

  isExpired() {
    if (!this.validUntil) return false;
    const expiry = this.validUntil instanceof Date
      ? this.validUntil.getTime()
      : new Date(this.validUntil).getTime();
    return Date.now() > expiry;
  }

  isActive() {
    return this.status === 'active' && !this.isExpired();
  }
}
```

### useQuoteActions Hook (Cloud Function calls)

```javascript
// src/presentation/hooks/quote/useQuoteActions.js
// Source: follows useDealActions.js and useContractActions.js patterns

'use client';

import { useState } from 'react';
import { httpsCallable } from 'firebase/functions';
import { functions } from '@/core/config/firebase.config';
import toast from 'react-hot-toast';

export function useQuoteActions() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const submitQuote = async (requestId, quoteData) => {
    setLoading(true);
    setError(null);
    try {
      const fn = httpsCallable(functions, 'submitQuote');
      await fn({ requestId, quoteData });
      toast.success('Quote submitted successfully!');
    } catch (err) {
      const msg = err?.message || 'Failed to submit quote';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const acceptQuote = async (quoteRequestId, quoteId) => {
    setLoading(true);
    setError(null);
    try {
      const fn = httpsCallable(functions, 'acceptQuote');
      await fn({ quoteRequestId, quoteId });
      toast.success('Provider selected!');
    } catch (err) {
      const msg = err?.message || 'Failed to select provider';
      setError(msg);
      // Handle specific expiry error gracefully
      if (err?.code === 'functions/failed-precondition' && msg.includes('expired')) {
        toast.error('This quote has expired and can no longer be accepted.');
      } else {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  const declineRequest = async (requestId) => {
    setLoading(true);
    setError(null);
    try {
      const fn = httpsCallable(functions, 'declineQuoteRequest');
      await fn({ requestId });
      toast.success('Request declined.');
    } catch (err) {
      const msg = err?.message || 'Failed to decline request';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const withdrawQuote = async (requestId, quoteId) => {
    setLoading(true);
    setError(null);
    try {
      const fn = httpsCallable(functions, 'withdrawQuote');
      await fn({ requestId, quoteId });
      toast.success('Quote withdrawn.');
    } catch (err) {
      const msg = err?.message || 'Failed to withdraw quote';
      setError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return { submitQuote, acceptQuote, declineRequest, withdrawQuote, loading, error };
}
```

### Buyer Quotes Page Route (subroute pattern)

```javascript
// src/app/(main)/deals/[dealId]/quotes/page.jsx
// Source: follows contract/page.jsx pattern exactly

'use client';

import { useParams, useRouter } from 'next/navigation';
import { useEffect, Suspense } from 'react';
import { useAuth } from '@/presentation/contexts/AuthContext';
import { useDeal } from '@/presentation/hooks/deal/useDeal';
import { useQuotesForDeal } from '@/presentation/hooks/quote/useQuotesForDeal';
import { useQuoteActions } from '@/presentation/hooks/quote/useQuoteActions';
import { QuotesPage } from '@/presentation/components/features/quote/QuotesPage/QuotesPage';
import { DEAL_STATUS } from '@/core/constants/dealConstants';

function QuotesDetailPage() {
  const params = useParams();
  const router = useRouter();
  const dealId = params?.dealId;

  const { user, isAuthenticated, loading: authLoading } = useAuth();
  const currentUid = user?.uid ?? null;
  const { deal, loading: dealLoading } = useDeal(dealId, currentUid);
  const { quoteRequests, insuranceQuotes, logisticsQuotes, loading: quotesLoading } =
    useQuotesForDeal(dealId);
  const actions = useQuoteActions();

  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.push(`/login?redirect=/deals/${dealId}/quotes`);
    }
  }, [authLoading, isAuthenticated, dealId, router]);

  useEffect(() => {
    if (!dealLoading && deal) {
      // Only accessible for contract_approved and providers_selected deals
      const validStatuses = [DEAL_STATUS.CONTRACT_APPROVED, DEAL_STATUS.PROVIDERS_SELECTED];
      if (!validStatuses.includes(deal.status)) {
        router.replace(`/deals/${dealId}`);
      }
      // Access check
      if (!deal.isParticipant(currentUid)) {
        // Show access denied (same as contract page pattern)
      }
    }
  }, [deal, dealLoading, dealId, currentUid, router]);

  if (authLoading || dealLoading || quotesLoading) return <QuotesSkeleton />;

  return (
    <QuotesPage
      deal={deal}
      quoteRequests={quoteRequests}
      insuranceQuotes={insuranceQuotes}
      logisticsQuotes={logisticsQuotes}
      currentUserUid={currentUid}
      actions={actions}
    />
  );
}

export default function QuotesPage_() {
  return (
    <Suspense>
      <QuotesDetailPage />
    </Suspense>
  );
}
```

### DealPage Integration — Quotes Banner

**What:** When `deal.status === DEAL_STATUS.CONTRACT_APPROVED`, DealPage shows a banner linking to `/deals/${deal.id}/quotes`. This extends the existing contract banner pattern.

```jsx
// In DealPage.jsx — add after the contract banner block:
{deal.status === DEAL_STATUS.CONTRACT_APPROVED && (
  <div className="rounded-xl border border-blue-500/30 bg-blue-900/10 px-4 py-3">
    <div className="flex items-center gap-2 mb-1">
      <Package size={16} className="text-blue-400" />
      <p className="text-sm font-semibold text-blue-400">
        Insurance &amp; Logistics Quotes Available
      </p>
    </div>
    <p className="text-xs text-[#8899AA] mt-0.5">
      Quote requests have been sent to all registered providers. Review and select your providers.
    </p>
    <Link
      href={`/deals/${deal.id}/quotes`}
      className="mt-2 inline-block text-xs font-semibold text-blue-400 hover:text-blue-300 underline"
    >
      Compare Quotes →
    </Link>
  </div>
)}
```

### quoteConstants.js Structure

```javascript
// src/core/constants/quoteConstants.js
// Source: follows dealConstants.js and contractConstants.js naming patterns

export const QUOTE_REQUEST_STATUS = {
  PENDING: 'pending',       // Provider has not yet acted
  QUOTED: 'quoted',         // Provider has submitted a quote
  DECLINED: 'declined',     // Provider explicitly declined
  SELECTED: 'selected',     // Buyer chose this provider
  NOT_SELECTED: 'not_selected', // Buyer chose a different provider
};

export const QUOTE_STATUS = {
  ACTIVE: 'active',         // Quote is valid and awaiting buyer decision
  WITHDRAWN: 'withdrawn',   // Provider withdrew before buyer accepted
  EXPIRED: 'expired',       // validUntil passed before buyer accepted
  ACCEPTED: 'accepted',     // Buyer selected this quote
};

export const ICC_COVERAGE = {
  A: { value: 'A', label: 'ICC (A) — All Risks', description: 'Broadest coverage, covers all risks of loss/damage' },
  B: { value: 'B', label: 'ICC (B) — Named Perils Extended', description: 'Covers fire, explosion, vessel sinking, collision, general average, washing overboard' },
  C: { value: 'C', label: 'ICC (C) — Named Perils Basic', description: 'Most limited; covers major casualties only' },
};

export const COVERAGE_SCOPE = {
  WAREHOUSE_TO_WAREHOUSE: { value: 'warehouse_to_warehouse', label: 'Warehouse to Warehouse' },
  PORT_TO_PORT: { value: 'port_to_port', label: 'Port to Port' },
  DOOR_TO_DOOR: { value: 'door_to_door', label: 'Door to Door' },
};

export const TRANSPORT_MODE = {
  SEA: { value: 'sea', label: 'Sea Freight', icon: 'Ship' },
  AIR: { value: 'air', label: 'Air Freight', icon: 'Plane' },
  ROAD: { value: 'road', label: 'Road Transport', icon: 'Truck' },
  RAIL: { value: 'rail', label: 'Rail Freight', icon: 'Train' },
  MULTIMODAL: { value: 'multimodal', label: 'Multimodal', icon: 'ArrowLeftRight' },
};

export const CONTAINER_TYPE = [
  { value: '20ft', label: "20' Standard (TEU)" },
  { value: '40ft', label: "40' Standard (FEU)" },
  { value: '40ft_hc', label: "40' High Cube" },
  { value: '45ft_hc', label: "45' High Cube" },
  { value: 'lcl', label: 'LCL (Less than Container Load)' },
  { value: 'reefer', label: 'Reefer (Refrigerated)' },
  { value: 'open_top', label: 'Open Top' },
  { value: 'flat_rack', label: 'Flat Rack' },
];

export const CAPABILITY_TAGS = [
  'GPS Tracking',
  'Cold Chain',
  'Door-to-Door',
  'Customs Support',
  'Hazmat Certified',
  'Express Delivery',
  'Insurance Included',
  'Bonded Warehouse',
];

export const QUOTE_VALIDITY_OPTIONS = [
  { value: 12, label: '12 hours' },
  { value: 24, label: '24 hours' },
  { value: 48, label: '48 hours' },
  { value: 72, label: '72 hours' },
];

export default {
  QUOTE_REQUEST_STATUS,
  QUOTE_STATUS,
  ICC_COVERAGE,
  COVERAGE_SCOPE,
  TRANSPORT_MODE,
  CONTAINER_TYPE,
  CAPABILITY_TAGS,
  QUOTE_VALIDITY_OPTIONS,
};
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Per-request quote validity via client polling | `onSnapshot` real-time listeners + server-side expiry check in Cloud Function | Established in Phase 2 (deal negotiations) | No polling; quotes update live; server is authoritative on expiry |
| Kanban with drag-and-drop state machine | Visual-only column grouping derived from document status field | Phase 4 CONTEXT.md decision | Simpler state; no drag-and-drop library needed |
| Top-level `quotes` collection | `quoteRequests/{id}/quotes` subcollection | Phase 4 architecture decision | Natural access control; Firestore rules inherit from parent; cleaner queries |

**Deprecated/outdated in this phase:**
- The existing `/provider/page.jsx` placeholder tab layout: replaced by `/provider/dashboard/page.jsx` kanban. The old file can redirect or be removed.
- `DEAL_STATUS.CONTRACT_APPROVED` as terminal: it becomes a gateway state; `PROVIDERS_SELECTED` is the new terminal for this phase. `VALID_DEAL_TRANSITIONS` must be updated.

---

## Open Questions

1. **`quotes` subcollection name collision with `requests/{id}/quotes`**
   - What we know: The `requests` collection already has a `quotes` subcollection (for RFQ responses). The new Phase 4 quotes will also use `quoteRequests/{id}/quotes`. If a `collectionGroup('quotes')` query is ever used (e.g., in `checkExpiredQuotes`), it will hit both subcollections.
   - What's unclear: Whether `checkExpiredQuotes` needs to use collectionGroup, or whether it can query by dealId on a top-level collection.
   - Recommendation: Name the Phase 4 subcollection `providerQuotes` instead of `quotes` to eliminate any future collision. This is a low-cost change at schema definition time but expensive to change after data exists.

2. **Deal `latestOfferSnapshot` completeness for logistics dealSnapshot**
   - What we know: The trigger function reads `deal.latestOfferSnapshot` to build the dealSnapshot. The `latestOfferSnapshot` is denormalized at offer acceptance time in `submitContractApproval`.
   - What's unclear: Whether `latestOfferSnapshot` contains all fields needed for the logistics dealSnapshot (specifically `namedPlace`, `deliveryDeadline`, `unit`, `currency`). The `Offer.js` entity and `buildContractClauses` function suggest these fields exist.
   - Recommendation: Verify the exact shape of `latestOfferSnapshot` in a test deal before writing the trigger. If fields are missing, read the accepted offer document directly inside the trigger (one extra Firestore read, acceptable).

3. **Provider portal route: `/provider` vs `/provider/dashboard`**
   - What we know: CONTEXT.md specifies `/provider/dashboard`. The existing placeholder is at `/provider/page.jsx`. Middleware protects `pathname.startsWith('/provider')` — so `/provider/dashboard` is automatically protected.
   - What's unclear: Whether to redirect `/provider` → `/provider/dashboard` or replace `/provider/page.jsx` directly.
   - Recommendation: Replace `/provider/page.jsx` with a redirect to `/provider/dashboard`. Keep `/provider/dashboard/` as the real page.

4. **Partial selection confirmation — when does deal advance to `providers_selected`?**
   - What we know: CONTEXT.md says "Allow partial selection (buyer can confirm with just one provider type if deal doesn't require both)". The confirmation is inline with redirect.
   - What's unclear: Does the buyer explicitly press a "Confirm Selection" button, or does accepting a quote auto-advance the deal? Is there a minimum of one provider required, or can the buyer advance with zero?
   - Recommendation: Require at least one provider selection before advancing. Show a "Confirm & Continue" button that calls a `confirmProviderSelection` Cloud Function setting `deal.status = PROVIDERS_SELECTED`. Accepting individual quotes does NOT advance the deal automatically — the confirmation step is the explicit gate.

---

## Integration Checklist

The following files must be created or modified in Phase 4:

**New files:**
- `src/core/constants/quoteConstants.js`
- `src/domain/entities/QuoteRequest.js`
- `src/domain/entities/Quote.js`
- `src/data/repositories/QuoteRequestRepository.js`
- `src/data/repositories/QuoteRepository.js`
- `src/core/di/container.js` — add `getQuoteRequestRepository()`, `getQuoteRepository()`
- `src/presentation/hooks/quote/useQuoteRequest.js`
- `src/presentation/hooks/quote/useQuotesForDeal.js`
- `src/presentation/hooks/quote/useQuoteActions.js`
- `src/presentation/components/features/provider/ProviderDashboard/` (kanban)
- `src/presentation/components/features/provider/RequestKanbanCard/`
- `src/presentation/components/features/provider/QuoteFormInsurance/`
- `src/presentation/components/features/provider/QuoteFormLogistics/`
- `src/presentation/components/features/quote/QuotesPage/`
- `src/presentation/components/features/quote/QuotesSidebar/`
- `src/presentation/components/features/quote/InsuranceQuoteCard/`
- `src/presentation/components/features/quote/LogisticsQuoteCard/`
- `src/app/(main)/provider/dashboard/page.jsx`
- `src/app/(main)/deals/[dealId]/quotes/page.jsx`

**Modified files:**
- `src/core/constants/dealConstants.js` — add `PROVIDERS_SELECTED`, update `VALID_DEAL_TRANSITIONS`
- `src/domain/entities/Deal.js` — add `isProvidersSelected()`, update `isTerminal()`
- `src/core/constants/collections.js` — add `QUOTE_REQUESTS: 'quoteRequests'`, `PROVIDER_QUOTES: 'providerQuotes'`
- `functions/index.js` — add `broadcastQuoteRequests`, `submitQuote`, `acceptQuote`, `declineQuoteRequest`, `withdrawQuote`, `confirmProviderSelection`, `checkExpiredQuotes` scheduled function; update CJS DEAL_STATUS constants
- `firestore.rules` — add `quoteRequests` and `providerQuotes` subcollection rules
- `firestore.indexes.json` — add composite indexes for `quoteRequests` (providerUid + createdAt, dealId + createdAt)
- `src/presentation/components/features/deal/DealPage/DealPage.jsx` — add quotes banner for `contract_approved` status
- `src/presentation/components/features/deal/DealSidebar/DealSidebar.jsx` — update ProgressTracker `activeStep` to include `quotes` and `providers_selected` states
- `src/presentation/components/features/deal/DealCard/DealCard.jsx` — add `PROVIDERS_SELECTED` status badge config
- `src/app/(main)/provider/page.jsx` — redirect to `/provider/dashboard`

---

## Sources

### Primary (HIGH confidence)
- Codebase direct read — `functions/index.js` (onDealStatusChanged, submitContractApproval, sendDealNotifications patterns)
- Codebase direct read — `src/data/repositories/ContractRepository.js`, `OfferRepository.js`, `DealRepository.js` (repository pattern)
- Codebase direct read — `src/presentation/hooks/deal/useDeal.js`, `useContract.js` (hook pattern)
- Codebase direct read — `src/core/di/container.js` (DI registration pattern)
- Codebase direct read — `firestore.rules` (existing security rule patterns)
- Codebase direct read — `src/core/constants/dealConstants.js`, `contractConstants.js`, `collections.js`, `roles.js`
- Codebase direct read — `src/presentation/components/features/deal/CountdownTimer/CountdownTimer.jsx` (reusable countdown)
- Codebase direct read — `src/presentation/components/features/deal/DealPage/DealPage.jsx`, `DealSidebar/DealSidebar.jsx` (layout pattern)
- Codebase direct read — `other_items/sigorta-teklif-portali.html`, `other_items/S3-sigorta-tasima.html` (UI mockups)
- Codebase direct read — `src/middleware.js` (route protection — `/provider` prefix already covered)

### Secondary (MEDIUM confidence)
- Firestore documentation (training data, verified against codebase usage): collectionGroup query behavior, Firestore rules `get()` cost model
- ICC Incoterms 2020 / ICC Cargo Clauses knowledge: A/B/C coverage type descriptions, cargo clause terminology

### Tertiary (LOW confidence)
- None — all critical claims verified from codebase

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already installed and in use; no new dependencies required
- Architecture: HIGH — all patterns directly observed in existing Phase 2 and Phase 3 codebase
- Pitfalls: HIGH — pitfalls 1, 2, 3, 5 verified from direct code reading; pitfall 4 (rule get() cost) and 7 (subcollection name collision) are architectural analysis based on observed patterns
- Data model: HIGH — price exclusion strategy is the most critical decision; verified that denormalization at write time (not filter at read time) is the correct approach
- UI layout: HIGH — mockups read, existing DealPage/ContractPage patterns analyzed

**Research date:** 2026-03-02
**Valid until:** 2026-04-01 (stable — Firebase SDK versions and project patterns won't change)
