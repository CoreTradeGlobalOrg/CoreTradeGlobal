# Architecture Research

**Domain:** B2B International Trade Platform — Trade Flow Milestone
**Researched:** 2026-02-20
**Confidence:** HIGH (based on direct codebase analysis + verified Firebase documentation patterns)

---

## Standard Architecture

### System Overview

The existing codebase follows a strict Clean Architecture with four concentric rings. All new trade flow features must slot into this same layered model. No layer may skip another.

```
┌─────────────────────────────────────────────────────────────────┐
│                        ROUTES / PAGES LAYER                      │
│  src/app/(main)/deals/        src/app/(main)/dashboard/          │
│  src/app/(main)/deals/[dealId]/[...step]/                        │
│  src/app/admin/                                                   │
│                      (Next.js App Router)                         │
├─────────────────────────────────────────────────────────────────┤
│                      PRESENTATION LAYER                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │  Components  │  │    Hooks     │  │      Contexts        │   │
│  │ (feature UI) │  │(orchestrate  │  │  (global role state) │   │
│  │              │  │ use cases)   │  │                      │   │
│  └──────────────┘  └──────────────┘  └──────────────────────┘   │
├─────────────────────────────────────────────────────────────────┤
│                        DOMAIN LAYER                               │
│  ┌────────────────────────┐  ┌─────────────────────────────┐    │
│  │   Entities             │  │      Use Cases               │    │
│  │  Deal, Offer,          │  │  SubmitOfferUseCase          │    │
│  │  LegalChannel,         │  │  CounterOfferUseCase         │    │
│  │  Quote, TrackingEvent  │  │  HireLawyerUseCase           │    │
│  │                        │  │  SubmitInsuranceQuoteUseCase │    │
│  └────────────────────────┘  └─────────────────────────────┘    │
├─────────────────────────────────────────────────────────────────┤
│                         DATA LAYER                                │
│  ┌──────────────────┐  ┌──────────────────────────────────────┐  │
│  │  Repositories    │  │       Data Sources                    │  │
│  │  DealRepository  │  │  FirestoreDataSource (existing)       │  │
│  │  QuoteRepository │  │  (no new data sources needed)         │  │
│  │  LegalRepository │  │                                       │  │
│  └──────────────────┘  └──────────────────────────────────────┘  │
├─────────────────────────────────────────────────────────────────┤
│                      INFRASTRUCTURE LAYER                         │
│  src/core/di/container.js  (extend with new repositories)        │
│  src/core/constants/collections.js  (add new collections)        │
│  src/core/constants/roles.js  (add role constants)               │
│  Firestore Security Rules  (enforce all access patterns)         │
└─────────────────────────────────────────────────────────────────┘
```

### Component Boundaries

| Component | Responsibility | Communicates With |
|-----------|---------------|-------------------|
| **Deal Entity** | Core trade deal domain model. Holds status state machine, participant IDs (buyer/seller), Incoterms, financial summary. Validates status transitions. | Offer Entity, LegalChannel Entity |
| **Offer Entity** | Single negotiation round. Immutable once submitted. Holds price, Incoterms, terms, submitter role. | Deal Entity |
| **LegalChannel Entity** | Private lawyer-client channel scoped to one side of one deal. Has participants array `[clientId, lawyerId]`. Extends Conversation pattern. | Deal Entity, LegalMessage Entity |
| **Quote Entity** | Provider quote (insurance or logistics). Has type discriminator, validity timer, provider-visible deal fields only. | Deal Entity |
| **TrackingEvent Entity** | Immutable log entry for shipment milestone. Append-only subcollection. | Deal Entity |
| **DealRepository** | CRUD + real-time subscription for deals. Enforces query scoping by participant. | FirestoreDataSource |
| **OfferRepository** | Manages offers subcollection under a deal. Ordered by round number. | FirestoreDataSource |
| **LegalChannelRepository** | Manages lawyer-client channels. Queries scoped to `participants` array. | FirestoreDataSource |
| **QuoteRepository** | Manages provider quotes per deal. Separate insurance vs logistics by `type` field. | FirestoreDataSource |
| **TrackingRepository** | Append-only tracking events subcollection. No updates, only creates. | FirestoreDataSource |
| **DI Container** | Singleton factory for all repositories. Extended with new entries following existing pattern. | All repositories |
| **Firestore Security Rules** | Server-enforced access boundary. `participants` array-contains checks, role custom claims checks. | Firestore |
| **Next.js Middleware** | Route protection by role. New role values checked from session cookie. | Session cookie |

---

## Recommended Project Structure

The new features slot into the existing folder conventions without introducing new conventions.

```
src/
├── domain/
│   ├── entities/
│   │   ├── Deal.js                  # Core deal: status, participants, Incoterms, approvals
│   │   ├── Offer.js                 # Single negotiation offer/counter-offer
│   │   ├── LegalChannel.js          # Private lawyer-client channel (extends Conversation)
│   │   ├── LegalMessage.js          # Message in a legal channel (extends Message)
│   │   ├── Quote.js                 # Insurance or logistics provider quote
│   │   └── TrackingEvent.js         # Immutable shipment tracking event
│   └── usecases/
│       ├── deal/
│       │   ├── CreateDealUseCase.js
│       │   ├── SubmitOfferUseCase.js
│       │   ├── CounterOfferUseCase.js
│       │   └── ApproveDealUseCase.js
│       ├── legal/
│       │   ├── HireLawyerUseCase.js
│       │   └── SendLegalMessageUseCase.js
│       ├── quote/
│       │   ├── SubmitInsuranceQuoteUseCase.js
│       │   ├── SubmitLogisticsQuoteUseCase.js
│       │   └── SelectProviderUseCase.js
│       └── tracking/
│           └── AddTrackingEventUseCase.js
├── data/
│   └── repositories/
│       ├── DealRepository.js         # Deals + subscribeToUserDeals
│       ├── OfferRepository.js        # Offers subcollection under deals
│       ├── LegalChannelRepository.js # Legal channels scoped to deal+side
│       ├── QuoteRepository.js        # Provider quotes scoped to deal
│       └── TrackingRepository.js     # Append-only tracking events
├── core/
│   ├── di/
│   │   └── container.js             # Extended with getDealRepository(), etc.
│   └── constants/
│       ├── collections.js           # Add DEALS, OFFERS, LEGAL_CHANNELS, QUOTES, TRACKING
│       ├── roles.js                 # MEMBER, LAWYER, INSURANCE_PROVIDER, LOGISTICS_PROVIDER, ADMIN
│       └── dealStatus.js           # NEGOTIATING, AGREED, LEGAL_REVIEW, INSURED, IN_TRANSIT, DELIVERED
├── presentation/
│   ├── hooks/
│   │   ├── deal/
│   │   │   ├── useDeal.js           # Real-time deal subscription
│   │   │   ├── useDeals.js          # List of user's deals
│   │   │   ├── useSubmitOffer.js
│   │   │   ├── useCounterOffer.js
│   │   │   └── useApproveDeal.js
│   │   ├── legal/
│   │   │   ├── useLegalChannel.js   # Real-time lawyer-client channel
│   │   │   └── useHireLawyer.js
│   │   ├── quote/
│   │   │   ├── useQuotes.js         # Real-time quote list for a deal
│   │   │   └── useSubmitQuote.js
│   │   └── tracking/
│   │       └── useTracking.js       # Real-time tracking events
│   ├── contexts/
│   │   └── DealContext.jsx          # Active deal state shared across trade flow steps
│   └── components/
│       └── features/
│           ├── deal/
│           │   ├── OfferTimeline/
│           │   ├── NegotiationPanel/
│           │   ├── AgreementClauses/
│           │   └── DealSummary/
│           ├── legal/
│           │   ├── LegalChannelPanel/
│           │   └── ContractDraftView/
│           ├── quote/
│           │   ├── InsuranceQuoteCard/
│           │   ├── LogisticsQuoteCard/
│           │   └── QuoteComparisonPanel/
│           ├── tracking/
│           │   └── ShipmentTimeline/
│           └── dashboard/
│               ├── MemberDashboard/
│               ├── LawyerDashboard/
│               ├── ProviderDashboard/
│               └── AdminDashboard/
└── app/
    └── (main)/
        ├── deals/
        │   ├── page.jsx             # Deal list
        │   └── [dealId]/
        │       ├── page.jsx         # Deal overview (redirect to current step)
        │       ├── negotiate/       # S1: Offer/counter-offer
        │       ├── agree/           # S2: Agreement & clauses
        │       ├── services/        # S3: Insurance + logistics quotes
        │       └── track/           # S4: Summary + shipment tracking
        └── dashboard/
            └── page.jsx             # Role-dispatched dashboard
```

### Structure Rationale

- **domain/entities/ additions:** Each new concept (Deal, Offer, LegalChannel, Quote, TrackingEvent) becomes its own entity file. Matches the existing pattern: `Product.js`, `Conversation.js`, `Message.js`.
- **domain/usecases/deal/ etc.:** Grouped by feature subdomain, matching existing `usecases/messaging/`, `usecases/product/` pattern.
- **data/repositories/ additions:** One repository per aggregate root. DealRepository owns the deal document; OfferRepository owns the offers subcollection. Matches existing ConversationRepository + MessageRepository split.
- **presentation/hooks/deal/ etc.:** One hook per action, following existing `useSubmitQuote.js`, `useConversations.js` naming.
- **presentation/contexts/DealContext:** The trade flow has multiple steps sharing one deal document. DealContext holds the active deal + real-time subscription, eliminating prop drilling across S1–S4 pages.
- **app/(main)/deals/[dealId]/[step]/:** URL structure maps directly to trade flow steps. Step is a string segment, not a query parameter, enabling direct linking and middleware-based protection.

---

## Architectural Patterns

### Pattern 1: Status Field as State Machine on the Deal Entity

**What:** The Deal entity owns a `status` field with a fixed set of allowed transitions. The entity validates that a transition is legal before the use case persists it. No transition can skip a state.

**When to use:** Whenever business logic depends on what stage a deal is in. Status determines which actions are available to each role.

**Trade-offs:** Simple to implement in Firestore (single field update). No external state machine library needed. Downside: transition rules live in application code, not Firestore rules — must trust the use case layer.

**Example:**
```javascript
// src/core/constants/dealStatus.js
export const DEAL_STATUS = {
  NEGOTIATING:    'negotiating',   // S1 — offer/counter-offer active
  AGREED:         'agreed',        // S2 — both parties accepted terms
  LEGAL_REVIEW:   'legal_review',  // Optional — lawyer engaged
  INSURING:       'insuring',      // S3 — awaiting provider quotes/selection
  IN_TRANSIT:     'in_transit',    // S4 — shipment underway
  DELIVERED:      'delivered',     // S4 — complete
  CANCELLED:      'cancelled',     // Terminal — either party cancelled
};

const VALID_TRANSITIONS = {
  [DEAL_STATUS.NEGOTIATING]:  [DEAL_STATUS.AGREED, DEAL_STATUS.CANCELLED],
  [DEAL_STATUS.AGREED]:       [DEAL_STATUS.LEGAL_REVIEW, DEAL_STATUS.INSURING, DEAL_STATUS.CANCELLED],
  [DEAL_STATUS.LEGAL_REVIEW]: [DEAL_STATUS.INSURING, DEAL_STATUS.CANCELLED],
  [DEAL_STATUS.INSURING]:     [DEAL_STATUS.IN_TRANSIT, DEAL_STATUS.CANCELLED],
  [DEAL_STATUS.IN_TRANSIT]:   [DEAL_STATUS.DELIVERED],
  [DEAL_STATUS.DELIVERED]:    [],
  [DEAL_STATUS.CANCELLED]:    [],
};

// src/domain/entities/Deal.js
export class Deal {
  canTransitionTo(newStatus) {
    return VALID_TRANSITIONS[this.status]?.includes(newStatus) ?? false;
  }

  isParticipant(userId) {
    return this.buyerId === userId || this.sellerId === userId;
  }

  getBuyerApproval() { return this.approvals?.buyer ?? false; }
  getSellerApproval() { return this.approvals?.seller ?? false; }
  isBothApproved() { return this.getBuyerApproval() && this.getSellerApproval(); }
}
```

### Pattern 2: Immutable Offer Subcollection (Append-Only Negotiation Log)

**What:** Each offer round is a new document in `deals/{dealId}/offers`. Offers are never updated or deleted — only appended. The current offer is queried by `roundNumber desc, limit 1`. The previous rounds form the timeline.

**When to use:** Negotiation history — every round of offer/counter-offer must be preserved for audit, legal review, and the offer history timeline UI.

**Trade-offs:** Read cost for full history increases linearly with rounds (acceptable: B2B deals rarely exceed 10–20 rounds). No update conflicts. Clean audit log.

**Example:**
```javascript
// src/domain/entities/Offer.js
export class Offer {
  constructor(id, dealId, submitterId, submitterRole, roundNumber,
              price, currency, incoterms, terms, status, createdAt) {
    this.id = id;
    this.dealId = dealId;
    this.submitterId = submitterId;
    this.submitterRole = submitterRole; // 'buyer' | 'seller' (contextual per deal)
    this.roundNumber = roundNumber;
    this.price = price;
    this.currency = currency;
    this.incoterms = incoterms; // 'EXW' | 'FOB' | 'CIF' etc.
    this.terms = terms;
    this.status = status; // 'pending' | 'accepted' | 'countered' | 'rejected'
    this.createdAt = createdAt || new Date();
  }

  static fromFirestore(data) { /* ... */ }
  toFirestore() { /* ... */ }

  isPending() { return this.status === 'pending'; }
  isFromBuyer() { return this.submitterRole === 'buyer'; }
}

// src/domain/usecases/deal/SubmitOfferUseCase.js
export class SubmitOfferUseCase {
  constructor(dealRepository, offerRepository, notificationRepository) { /* ... */ }

  async execute({ dealId, submitterId, price, currency, incoterms, terms }) {
    const deal = await this.dealRepository.getById(dealId);
    if (!deal || !deal.isParticipant(submitterId)) throw new Error('Unauthorized');
    if (deal.status !== DEAL_STATUS.NEGOTIATING) throw new Error('Deal not in negotiation');

    const lastOffer = await this.offerRepository.getLatest(dealId);
    const roundNumber = (lastOffer?.roundNumber ?? 0) + 1;
    const submitterRole = deal.buyerId === submitterId ? 'buyer' : 'seller';

    // Mark previous offer as 'countered'
    if (lastOffer && lastOffer.isPending()) {
      await this.offerRepository.updateStatus(dealId, lastOffer.id, 'countered');
    }

    const offer = await this.offerRepository.create(dealId, {
      submitterId, submitterRole, roundNumber,
      price, currency, incoterms, terms, status: 'pending',
    });

    // Notify the other party
    const otherPartyId = deal.buyerId === submitterId ? deal.sellerId : deal.buyerId;
    await this.notificationRepository.create(otherPartyId, /* ... */);

    return offer;
  }
}
```

### Pattern 3: Participants Array for Private Channel Access

**What:** Every document that needs access-scoped reading (deals, legal channels, provider quote requests) carries a `participants` array of user IDs. Firestore security rules use `request.auth.uid in resource.data.participants` to enforce that only listed parties can read. This is the same pattern already used by the `Conversation` entity in the existing codebase.

**When to use:** Any time a document must be visible to a fixed set of users and hidden from all others — deals, lawyer-client channels, quote request details.

**Trade-offs:** Array membership check is O(1) in Firestore rules. Array max size is 10,000 items (irrelevant here: deals have 2–3 participants). Cannot query across all deals without being a participant — correct behavior. Firestore rules cannot be queried to list "all deals I'm in" using `array-contains` from rules alone — must query from the client using `where('participants', 'array-contains', userId)` which the existing FirestoreDataSource already supports.

**Example:**
```javascript
// Firestore security rules (firestore.rules)
match /deals/{dealId} {
  allow read: if request.auth.uid in resource.data.participants;
  allow create: if request.auth != null && request.auth.token.role == 'member';
  allow update: if request.auth.uid in resource.data.participants;

  match /offers/{offerId} {
    allow read: if request.auth.uid in get(/databases/$(database)/documents/deals/$(dealId)).data.participants;
    allow create: if request.auth.uid in get(/databases/$(database)/documents/deals/$(dealId)).data.participants;
    allow update: if false; // Offers are immutable once created
  }

  match /legalChannels/{channelId} {
    // Only the specific lawyer-client pair can access their channel
    allow read, write: if request.auth.uid in resource.data.participants;
  }

  match /quotes/{quoteId} {
    // Provider who submitted it, or deal participants (buyer sees all)
    allow read: if request.auth.uid == resource.data.providerId
                || request.auth.uid in get(/databases/$(database)/documents/deals/$(dealId)).data.participants;
    allow create: if request.auth.token.role == 'insurance_provider'
                  || request.auth.token.role == 'logistics_provider';
    allow update: if request.auth.uid == resource.data.providerId;
  }
}
```

### Pattern 4: Role-Dispatched Dashboard via Single Route

**What:** A single `/dashboard` page reads the authenticated user's role and renders the appropriate dashboard component. Navigation items are also role-filtered in the Navbar. No separate `/lawyer-dashboard` or `/provider-dashboard` routes.

**When to use:** Role-based UIs where the same URL should show different content. Avoids route proliferation. Matches the existing admin pattern where `src/app/admin/page.jsx` is a single entry point.

**Trade-offs:** Single page is simpler. If dashboards diverge significantly (they will), extract role-specific components into feature-specific folders. Do not put all role logic into one enormous component — dispatch immediately to dedicated sub-components.

**Example:**
```javascript
// src/app/(main)/dashboard/page.jsx
import { MemberDashboard } from '@/presentation/components/features/dashboard/MemberDashboard';
import { LawyerDashboard } from '@/presentation/components/features/dashboard/LawyerDashboard';
import { ProviderDashboard } from '@/presentation/components/features/dashboard/ProviderDashboard';

export default function DashboardPage() {
  const { user } = useAuth();
  if (user.role === 'lawyer') return <LawyerDashboard />;
  if (user.role === 'insurance_provider' || user.role === 'logistics_provider') return <ProviderDashboard />;
  return <MemberDashboard />;
}
```

### Pattern 5: Real-Time Subscription in useDeal Hook via useEffect + onSnapshot

**What:** The `useDeal` hook subscribes to a deal document via `DealRepository.subscribeToDeal()`, which delegates to `FirestoreDataSource.subscribeToDocument()`. The existing `subscribeToDocument` and `subscribeToQuery` methods on FirestoreDataSource are already implemented and handle cleanup. No new infrastructure needed — just new repository methods calling into the existing data source.

**When to use:** Any feature where multiple parties need to see state changes in real time without polling — negotiation rounds, agreement approvals, quote arrivals, tracking events. This is the primary real-time mechanism for the entire trade flow.

**Trade-offs:** Each active subscription counts against Firestore's concurrent connections per client. For a trade flow with S1–S4 active, a user might have 3–4 listeners (deal, offers, legal channel, quotes). This is within normal limits for a single user session. Clean up via `useEffect` return function.

**Example:**
```javascript
// src/presentation/hooks/deal/useDeal.js
'use client';

import { useState, useEffect } from 'react';
import { container } from '@/core/di/container';
import { Deal } from '@/domain/entities/Deal';

export function useDeal(dealId) {
  const [deal, setDeal] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!dealId) return;

    const dealRepository = container.getDealRepository();
    setLoading(true);

    const unsubscribe = dealRepository.subscribeToDeal(
      dealId,
      (data) => {
        setDeal(data ? Deal.fromFirestore(data) : null);
        setLoading(false);
      },
      (err) => {
        setError(err.message);
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, [dealId]);

  return { deal, loading, error };
}
```

---

## Data Flow

### Trade Negotiation Flow (S1)

```
Buyer submits offer
    |
    v
NegotiationPanel component (UI)
    |
    v
useSubmitOffer hook
    |
    v
SubmitOfferUseCase.execute()
    |-- validates deal status === 'negotiating'
    |-- validates buyer is participant
    |-- fetches last offer via OfferRepository.getLatest()
    |-- marks last offer status='countered'
    |-- creates new offer document in deals/{dealId}/offers/
    |-- creates notification for seller via NotificationRepository
    |
    v
Firestore: deals/{dealId}/offers/{newOfferId} written

                    [REAL-TIME — Seller side]
                            |
                            v
                    DealRepository.subscribeToOffers()
                    (onSnapshot on offers subcollection)
                            |
                            v
                    useOffers hook detects new document
                            |
                            v
                    OfferTimeline component re-renders
                    NotificationBell shows badge
```

### Legal Channel Flow

```
Buyer decides to hire a lawyer
    |
    v
useHireLawyer hook
    |
    v
HireLawyerUseCase.execute()
    |-- verifies user is deal participant
    |-- verifies target user has role === 'lawyer'
    |-- creates LegalChannel document:
    |     { dealId, side: 'buyer', participants: [buyerId, lawyerId],
    |       participantDetails: {...}, type: 'legal' }
    |-- creates notification for lawyer
    |
    v
Firestore: deals/{dealId}/legalChannels/{channelId} written

                    [REAL-TIME — Lawyer side]
                            |
                            v
                    LawyerDashboard subscribes to
                    legalChannels where participants array-contains lawyerId
                            |
                            v
                    New channel appears in lawyer's dashboard
                    Lawyer can read full deal info (read-only)
                    Lawyer can send messages in the channel
```

### Provider Quote Flow (S3)

```
Deal reaches 'insuring' status
    |
    v
Platform notifies all registered providers (Firebase Function)
    |
    v
Provider portal: ProviderDashboard
    |
    v
useQuotes hook (provider side): subscribes to deals where
  quoteRequests array-contains providerId (or all deals in insuring status)
    |
    v
Provider views deal info (filtered by role):
  Insurance provider: sees full deal including price
  Logistics provider: sees deal EXCEPT price field
    |
    v
useSubmitQuote hook
    |
    v
SubmitInsuranceQuoteUseCase OR SubmitLogisticsQuoteUseCase
    |-- validates provider role matches quote type
    |-- validates deal is in 'insuring' status
    |-- creates quote document: { type, providerId, dealId, premium/price,
    |     coverage, validUntil, status: 'pending' }
    |
    v
Firestore: deals/{dealId}/quotes/{quoteId} written

                    [REAL-TIME — Buyer side]
                            |
                            v
                    useQuotes hook (buyer side)
                    subscribed to deals/{dealId}/quotes
                            |
                            v
                    QuoteComparisonPanel re-renders with new quote
                    Validity timer countdown starts (client-side)
```

### Role-Based Access Data Flow

```
Admin creates provider/lawyer account
    |
    v
Admin SDK sets custom claim: { role: 'insurance_provider' }
    |
    v
User logs in → Firebase Auth ID token contains role claim
    |
    v
Next.js API route /api/auth/session:
  verifies ID token (firebase-admin)
  reads role from token.role
  sets HTTP-only session cookie (with role embedded)
    |
    v
Next.js middleware.js:
  reads session cookie
  checks role for route protection
  /dashboard → any authenticated role
  /deals/[dealId]/* → member role only
    |
    v
Navbar renders role-filtered navigation items
DashboardPage renders role-appropriate component
Firestore security rules enforce data access by role + participants
```

### State Management

```
AuthContext (existing)
    ↓ user.role available globally
DealContext (new — trade flow only)
    ↓ active deal document + real-time subscription
    ↓ shared across S1 → S2 → S3 → S4 pages without refetching

Page-level state: useState inside hooks for loading/error/form inputs
Global state: AuthContext (user), DealContext (active deal)
No new global state stores needed — React Context is sufficient
```

---

## Firestore Collection Architecture

All new collections follow the same pattern as existing ones: top-level collections for independently-queried entities, subcollections for entities only accessed in the context of a parent.

```
Firestore Root
├── deals/                           # Top-level — queried by participants
│   └── {dealId}/
│       ├── [deal fields]            # status, buyerId, sellerId, Incoterms, etc.
│       ├── offers/                  # Subcollection — queried only within a deal
│       │   └── {offerId}/           # roundNumber, price, incoterms, submitterId, status
│       ├── legalChannels/           # Subcollection — one per lawyer engagement per side
│       │   └── {channelId}/
│       │       ├── [channel fields] # participants [clientId, lawyerId], side
│       │       └── messages/        # Subcollection — reuses existing Message pattern
│       │           └── {messageId}/
│       ├── quotes/                  # Subcollection — one per provider submission
│       │   └── {quoteId}/           # type (insurance|logistics), providerId, premium
│       └── tracking/                # Subcollection — append-only events
│           └── {eventId}/           # status, location, timestamp
├── users/                           # Existing — add role field variants
├── conversations/                   # Existing — unchanged
└── [existing collections...]
```

**Key decisions:**
- Deals are a top-level collection (not nested under users) because they must be queried from both buyer and seller perspectives using `where('participants', 'array-contains', userId)`.
- Offers, quotes, legal channels, and tracking are subcollections because they are only meaningful in the context of a specific deal and are never queried across multiple deals at once.
- Legal channel messages reuse the existing message pattern (subcollection under legalChannels) to avoid duplication of message infrastructure.

---

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0–100 active deals | Current architecture handles this fully. Single Firestore instance. Queries are participant-scoped (low fan-out). |
| 100–10k active deals | Add Firestore composite indexes: `(participants array-contains, status, createdAt desc)` and `(participants array-contains, updatedAt desc)`. Monitor onSnapshot connection count per user session. |
| 10k+ active deals | Introduce deal archive collection for closed deals. Move notification fan-out to Firebase Functions (already planned for email notifications). Consider pagination on deal lists. |

### Scaling Priorities

1. **First bottleneck:** Firestore read costs from multiple concurrent real-time listeners per user. Fix by: combining deal + offers into a single `DealContext` subscription, deactivating listeners when user navigates away from deal page.
2. **Second bottleneck:** Provider notification fan-out when deals reach 'insuring' status. Fix by: using a Firebase Function triggered on deal status change to notify providers, rather than each provider polling.

---

## Anti-Patterns

### Anti-Pattern 1: Embedding Offers as an Array on the Deal Document

**What people do:** Store `deal.offers = [{ price, terms, round: 1 }, ...]` as an array field on the deal document itself.

**Why it's wrong:** Firestore documents have a 1MB size limit. A long negotiation (20+ rounds with detailed terms) can approach this limit. Array updates require reading and rewriting the entire array. Real-time listeners on the deal document fire on every offer, making UI diffing complex. The offers array is not independently queryable.

**Do this instead:** Use an `offers` subcollection. Each offer is its own document. Subscribe to the subcollection separately with ordering by `roundNumber`. The deal document itself stays small and updates only on status changes.

### Anti-Pattern 2: Giving Providers Access to the Deal Document Directly

**What people do:** Add the provider's ID to `deal.participants` so they can read the deal document for quote submission.

**Why it's wrong:** The deal document contains the negotiated price. Logistics providers must NOT see price. Adding them to `participants` gives them full document access. Field-level security rules in Firestore cannot reliably restrict individual fields for read operations in all client SDK scenarios.

**Do this instead:** Create a `quoteRequests` collection (or subcollection under deals) that contains the fields relevant to each provider type. The insurance quote request includes price; the logistics quote request excludes it. Providers read their tailored request document, not the deal document directly. The `Quote` entity references `dealId` for the deal linkage.

### Anti-Pattern 3: Storing the Lawyer's Role in the Deal Document

**What people do:** Add `deal.lawyerId` or `deal.buyerLawyerId` and `deal.sellerLawyerId` as fields on the deal.

**Why it's wrong:** The lawyer relationship is a channel (has its own state, messages, contract drafts). Reducing it to a single ID on the deal loses the capability to version contract drafts, store legal messages, and track approval history. It also makes the deal document a coupling point for the legal workflow.

**Do this instead:** Use a `legalChannels` subcollection on the deal. Each channel document has `participants`, `side` (`buyer` | `seller`), and its own `messages` subcollection. The deal document holds only `hasLegalReview: bool` or `legalStatus` as a summary field — not the lawyer's ID.

### Anti-Pattern 4: Using Firestore Role Fields Instead of Custom Claims for Route/API Protection

**What people do:** Check `user.role` by fetching the Firestore user document in middleware to determine access.

**Why it's wrong:** Next.js middleware runs on the Edge Runtime. Firestore SDK (client) is not available there. Fetching Firestore in middleware requires Admin SDK, adds latency to every request, and creates a dependency on Firestore availability for route protection.

**Do this instead:** Set `role` as a Firebase Auth custom claim via Admin SDK when admin creates provider/lawyer accounts. The role is then embedded in the ID token and available in the session cookie. The existing middleware already reads from the session cookie — extend it to check `role` from the cookie payload. This is zero-latency (no Firestore read) and consistent with how `adminApproved` and email verification are already checked.

### Anti-Pattern 5: Single Global MessagesContext for Legal Channels

**What people do:** Extend the existing `MessagesContext` to handle legal channels alongside general messages.

**Why it's wrong:** The existing `MessagesContext` subscribes to all conversations for the current user. Adding legal channels to this context would mix confidential lawyer-client communications with general messages in the same subscription query, complicating filtering and potentially causing security leaks in the UI if the filtering logic has a bug.

**Do this instead:** Legal channels use a `DealContext` or a dedicated `useLegalChannel(channelId)` hook that subscribes independently. Legal channels are read from the `deals/{dealId}/legalChannels/` subcollection, not from the top-level `conversations` collection, so they are structurally separated and cannot accidentally appear in the general messages list.

---

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Firebase Auth (existing) | Admin SDK sets custom claims when admin creates provider/lawyer accounts. Client SDK reads claims from ID token. | Role claim embedded in token — zero Firestore reads at auth check time. Existing `api/auth/session` route verifies token; extend to embed role in cookie. |
| Firestore (existing) | All new collections/subcollections use `FirestoreDataSource` (existing generic methods). `subscribeToDocument` and `subscribeToSubcollection` already implemented. | No new Firebase products. No new data source class needed. |
| Firebase Functions (existing) | Email notifications on offer received, quote arrived, deal status changed. Triggered by Firestore document writes. | Already architected for email notifications. Extend with new trigger points for deal events. |
| Firebase Storage (existing) | Legal document uploads (contract drafts, attachments in legal channels). Uses existing `FirebaseStorageDataSource`. | Legal channel messages reuse existing `attachments` pattern from `Message` entity. |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Deal flow ↔ Existing messaging | No direct coupling. Legal channels are a separate subcollection, not conversations. | General `MessagesContext` and `ConversationRepository` are NOT reused for legal channels. Prevents contamination of general inbox. |
| Deal flow ↔ Auth | `DealContext` reads `user.uid` and `user.role` from `AuthContext`. No other coupling. | Role determines which deal actions are available (buyer vs seller context determined per deal, not per role). |
| Deal flow ↔ Notifications | Use cases create notification documents via `NotificationRepository` (existing). Same pattern as `SendMessageUseCase`. | No new notification infrastructure — extend existing `SUBCOLLECTIONS.NOTIFICATIONS` with new notification types. |
| Role system ↔ Middleware | Middleware reads role from session cookie. Admin sets custom claim via Admin SDK. | Extend `middleware.js` to check `role` claim. Providers and lawyers need access to `/dashboard` and `/deals` (as read-only participants). Block self-registration via middleware by redirecting non-invite-only roles. |
| Provider portals ↔ Deal | Providers never write to the deal document. They write to `deals/{dealId}/quotes/`. The deal's `status` field is only updated by deal participants (buyer/seller) via use cases. | Clean boundary: providers can only create quotes, not influence deal state directly. |

---

## Build Order Implications

The following dependency graph determines which components must be built before others. This directly informs phase sequencing in the roadmap.

```
Level 0 (no dependencies — build first):
  ├── COLLECTIONS constants extension
  ├── DEAL_STATUS constants
  ├── ROLES constants
  └── Custom claims setup (Admin SDK + admin UI)

Level 1 (depends on Level 0):
  ├── Deal entity + DealRepository
  ├── Offer entity + OfferRepository
  ├── User entity role extension (add isLawyer(), isProvider() methods)
  └── DI container extension

Level 2 (depends on Level 1):
  ├── CreateDealUseCase
  ├── SubmitOfferUseCase
  ├── CounterOfferUseCase
  ├── ApproveDealUseCase
  └── useDeal, useDeals, useSubmitOffer, useCounterOffer hooks

Level 3 (depends on Level 2 — needs working deal):
  ├── S1 Negotiation UI (NegotiationPanel, OfferTimeline)
  ├── S2 Agreement UI (AgreementClauses, approval tracking)
  └── DealContext (wrap S1–S4 pages)

Level 4 (depends on Level 2 deal status; independent of Level 3 UI):
  ├── LegalChannel entity + LegalChannelRepository
  ├── HireLawyerUseCase + SendLegalMessageUseCase
  └── LawyerDashboard + LegalChannelPanel

Level 5 (depends on Level 2 deal status reaching 'insuring'):
  ├── Quote entity + QuoteRepository
  ├── SubmitInsuranceQuoteUseCase + SubmitLogisticsQuoteUseCase
  ├── SelectProviderUseCase
  └── S3 Provider portal UI (QuoteComparisonPanel, InsuranceQuoteCard, LogisticsQuoteCard)

Level 6 (depends on Level 5 + deal status reaching 'in_transit'):
  ├── TrackingEvent entity + TrackingRepository
  ├── AddTrackingEventUseCase
  └── S4 Tracking UI (ShipmentTimeline, DealSummary)

Level 7 (depends on all roles working):
  └── Role-dispatched dashboards (MemberDashboard, LawyerDashboard, ProviderDashboard)
```

**Critical path:** Role system (Level 0) → Deal + Offer (Level 1–2) → S1 Negotiation (Level 3). Everything else can be parallelized after Level 3 is working. Legal consulting (Level 4), insurance/logistics (Level 5), and tracking (Level 6) are independent branches on the same deal foundation.

---

## Sources

- Direct codebase analysis: `/src/domain/entities/`, `/src/data/repositories/`, `/src/core/di/container.js`, `/src/data/datasources/firebase/FirestoreDataSource.js` (HIGH confidence — source of truth for existing patterns)
- [Firebase: Secure data access for users and groups](https://firebase.google.com/docs/firestore/solutions/role-based-access) — RBAC with `participants` array pattern (MEDIUM confidence — page content partially unavailable, pattern confirmed from existing codebase's `Conversation.participants`)
- [Firebase: Custom Claims and Security Rules](https://firebase.google.com/docs/auth/admin/custom-claims) — role embedding in ID token (MEDIUM confidence — confirmed by web search summaries)
- [Firebase: Choose a data structure](https://firebase.google.com/docs/firestore/manage-data/structure-data) — subcollection vs top-level tradeoffs (MEDIUM confidence — confirmed from WebFetch summary)
- [Firebase: Real-time queries at scale](https://firebase.google.com/docs/firestore/real-time_queries_at_scale) — onSnapshot subscription architecture (HIGH confidence — aligns with existing codebase patterns)
- [Firestore Pipeline Operations — InfoQ 2026](https://www.infoq.com/news/2026/02/firestore-enterprise-pipeline/) — new aggregation features (LOW confidence for this project — not yet stable/needed)

---

*Architecture research for: B2B International Trade Platform — Trade Flow Milestone*
*Researched: 2026-02-20*
