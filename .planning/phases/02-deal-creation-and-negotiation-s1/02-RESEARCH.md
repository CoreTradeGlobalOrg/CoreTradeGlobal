# Phase 2: Deal Creation and Negotiation (S1) - Research

**Researched:** 2026-02-22
**Domain:** Firestore state machines, atomic transactions, real-time listeners, scheduled Cloud Functions, email notifications (Resend), presence indicators
**Confidence:** HIGH (core patterns), MEDIUM (Resend CJS, presence approach)

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Deal Creation Flow**
- Deal initiated via "Initiate Deal" button in existing chat (chat was started from product detail page)
- Either party (buyer or seller) can initiate a deal — product owner is always the seller
- Deal creation navigates to a separate page (not modal/drawer over chat)
- Initial offer form includes: price per unit, quantity, unit selection, Incoterms, delivery deadline, payment terms, currency, and optional notes
- Form pre-fills from product listing (price, quantity, etc.) — buyer can modify
- Seller can counter-offer on ALL fields (price, quantity, Incoterms, delivery, payment, currency)
- Only the receiver of the latest offer can accept, reject, or counter — not the sender
- Sender can withdraw their offer anytime before the receiver responds
- Offers have expiration: system default (e.g., 72h) with sender override for custom deadline
- Offer expiry checked by scheduled Cloud Function (runs periodically)
- After expiry, sender can renew/extend the deadline or create a new offer
- Acceptance immediately triggers contract generation (Phase 3) — no intermediate "accepted" state
- System auto-message sent in chat thread when deal is initiated (with link to deal) + email notification
- Product has a base currency; buyer can offer in a different currency with conversion rate
- Quantity includes unit selection (kg, ton, pieces, metre, m², containers)
- Optional file attachments on offers (product specs, certifications)
- Optional freeform notes field on each offer/counter-offer
- Multiple active deals allowed for the same product-seller pair simultaneously
- Incoterms named place covers delivery location — no separate destination field needed

**Negotiation UI & Offer Display**
- Adapt mockup layout to existing app patterns and design system (don't replicate mockup CSS verbatim)
- Key sections from mockup to implement: product hero, offer timeline, counter-offer form, sidebar with parties/progress/summary
- Product hero section at top showing product image, name, category, key specs
- Offer timeline with card-based display — buyer cards (green accent), seller cards (gold accent), system event cards (dashed border)
- Changed fields between rounds visually highlighted (color, arrow, or badge) to show what changed
- Counter-offer form pre-fills from the most recent offer — party modifies only what they want to change
- Form visible only when it's the current user's turn to respond
- When waiting for other party: clear "Waiting for [Party] to respond..." message with timestamp
- Older offer rounds (5+) collapsed with "Show earlier offers" toggle — last 2-3 expanded
- Each offer card shows estimated total (price x quantity)
- System events (deal started, expired, withdrawn) shown as inline system cards in timeline (per mockup)
- Terminal states (accepted/rejected/expired) shown as status change in timeline — no separate banner
- Right sidebar always visible: party info cards (company, location, contact, member since, transactions, rating, verified), progress tracker (vertical steps: negotiation -> agreement -> quotes -> tracking), current offer summary (latest terms, round number, estimated total)
- No separate chat panel on deal page — parties use existing messaging system
- Countdown timer on deal page (not navbar) — changes color when running low
- Deal has direct URL (/deals/[dealId]) — bookmarkable and shareable between parties
- Online presence indicator showing when other party is viewing the deal
- Mobile responsive layout — panels stack vertically on small screens

**Incoterms Experience**
- All 11 Incoterms 2020 available: EXW, FCA, CPT, CIP, DAP, DPU, DDP, FAS, FOB, CFR, CIF
- Displayed as selectable pills (per mockup)
- Tooltips on hover explaining what each term means and who bears risk/cost
- No transport mode distinction in UI — tooltip explains applicability
- Named place label and placeholder dynamically change based on selected Incoterm (FOB -> "Port of Loading", CIF -> "Port of Destination", DAP -> "Place of Destination", etc.)
- Named place input uses autocomplete with static UN/LOCODE dataset (bundled, free, no API cost)
- Insurance preference captured as deal term: seller provides / buyer provides / no insurance
- Insurance preference auto-set based on Incoterm semantics (e.g., CIF -> seller provides) with explanatory note

**Notifications & Real-time**
- Use existing notification bell + FCM push notifications for deal events
- All major events trigger notifications: new deal, new offer, counter-offer, accepted, rejected, expired, withdrawn
- All events also trigger email notifications via Resend (100 emails/day free tier)
- Email service: Resend — needs to be set up as part of this phase
- Expiry reminders at 24h, 4h, and 1h before deadline — push + email
- Real-time updates via Firestore listeners — new offers appear automatically in timeline
- Subtle notification sound when new offer arrives while on deal page
- My Deals list page also uses Firestore listeners — real-time status updates
- Smart push suppression: skip FCM push if user is currently viewing the deal page
- General unread count in notification bell (deals + all other types together)
- Clicking a deal notification navigates directly to the deal page
- Firestore ID used for deals (no human-readable ID format)

### Claude's Discretion
- Exact layout adaptation from mockup to existing design system
- Loading skeleton and spinner patterns
- Error state handling and edge cases
- Exact spacing, typography, and component choices
- Scheduled function interval for expiry checks
- Expiry default duration (e.g., 72h)
- Sound file/pattern for notification alert
- Mobile responsive breakpoints and stacking behavior

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| NEGO-01 | Buyer and seller can exchange offers and counter-offers on a deal | Firestore `deals` collection + `offers` subcollection; `runTransaction` for counter-offer writes; turn-based logic enforced via `currentTurnUid` field |
| NEGO-02 | Offers include Incoterms 2020 selection (EXW, FOB, CIF, CFR, DAP, DDP, FCA, CPT) | All 11 Incoterms 2020 stored as enum constant; pill UI; `@geoapify/un-locode` for named place autocomplete |
| NEGO-03 | Offer history timeline shows all rounds with timestamps, amounts, and terms | `offers` subcollection ordered by `round` or `createdAt`; Firestore `onSnapshot` for real-time timeline rendering |
| NEGO-04 | Real-time updates via Firestore listeners — no page refresh needed | `onSnapshot` on `deals/{dealId}` + `deals/{dealId}/offers` subcollection; same pattern as existing MessagesContext |
| NEGO-05 | In-app and email notification when counter-offer received | Existing FCM/notification infrastructure; new `onDocumentCreated` CF trigger on offers subcollection; Resend SDK for email |
| NEGO-06 | Offer state machine enforces valid transitions (open → countered → accepted/rejected/expired) | `runTransaction` with status check before write; throw `HttpsError` on invalid transition; Cloud Functions for expiry transition |
| NEGO-07 | All deal state transitions use atomic Firestore transactions | `runTransaction` in Cloud Functions (Admin SDK uses pessimistic locking, server-side); client SDK uses optimistic concurrency with auto-retry |
</phase_requirements>

---

## Summary

Phase 2 builds a real-time deal negotiation system on top of the existing Firestore + Cloud Functions infrastructure. The project already has all the core patterns needed: `onSnapshot` listeners (MessagesContext), FCM push notifications (sendMessageNotification CF), subcollections (notifications), scheduled functions (updateFairStatuses), and Zod validation schemas. This phase extends those patterns rather than introducing new ones.

The most complex technical piece is the **state machine**: ensuring that concurrent operations (e.g., simultaneous acceptance and counter-offer) cannot corrupt deal state. Firestore `runTransaction` — called from a Cloud Function using the Admin SDK — provides the required atomicity with pessimistic locking on the server side. Client-side direct writes are insufficient for critical state transitions; all state-changing operations (accept, reject, withdraw, counter) must go through Cloud Functions.

The second major integration is **Resend** for transactional email. The functions/index.js is CommonJS (`require()`), and Resend v3+ ships with a CJS-compatible export. The Resend SDK must be added to `functions/package.json` (not the Next.js app's package.json) and called from inside Cloud Function triggers/callables.

**Primary recommendation:** All state-changing operations (submit offer, counter, accept, reject, withdraw) must go through `onCall` Cloud Functions that use `runTransaction` with the Admin SDK. Client-side reads and real-time subscriptions use `onSnapshot` directly as in the existing pattern. Do not allow clients to write to `deals` or `deals/offers` directly for state transitions.

---

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `firebase` (client SDK) | ^12.4.0 (already installed) | `onSnapshot` real-time listeners, `runTransaction` for non-critical client reads | Already in use; `onSnapshot` drives MessagesContext pattern |
| `firebase-admin` | ^13.6.1 (already installed) | Server-side `runTransaction` with pessimistic locking inside Cloud Functions | Used in all existing CFs; Admin SDK transactions are serializable |
| `firebase-functions/v2` | ^5.0.0 (already in functions/) | `onCall`, `onDocumentCreated`, `onSchedule` CF triggers | Already in use for all Phase 1 functions |
| `resend` | ^4.x (install in functions/) | Transactional email for deal events | Free tier 100 emails/day; simple API; React Email compatible |
| `zod` | ^4.1.12 (already installed) | Offer form validation schema | Already used in productSchema, requestSchema |
| `react-hook-form` | ^7.66.0 (already installed) | Counter-offer form with pre-fill and partial updates | Already used for product/request forms |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@geoapify/un-locode` | latest (install in Next.js app) | Static UN/LOCODE dataset for named place autocomplete | Used in offer form for Incoterms named place input |
| `firebase/database` (Realtime Database SDK) | included in firebase ^12 | Presence detection via `onDisconnect` | Only if RTDB is provisioned; see pitfall below |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `resend` | Nodemailer + SMTP | Resend is purpose-built for transactional email with better deliverability; no SMTP server to manage |
| `@geoapify/un-locode` | Open ports/places API | Static bundle = no API cost, no latency, works offline |
| RTDB for presence | Firestore field `viewingDeal: { [uid]: timestamp }` | Firestore-only approach is simpler (no new service to provision); trade-off is no native disconnect hook but a heartbeat write pattern works for deal page |
| Cloud Function transactions | Client-side `runTransaction` | CF transactions use Admin SDK = pessimistic locking = guaranteed; client SDK = optimistic = may miss edge cases in concurrent accept race |

**Installation (functions/ directory):**
```bash
cd functions && npm install resend
```

**Installation (Next.js app):**
```bash
npm install @geoapify/un-locode
```

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── app/(main)/deals/
│   ├── page.jsx                    # My Deals list (Firestore listener)
│   └── [dealId]/
│       └── page.jsx                # Deal negotiation page
├── core/
│   ├── constants/
│   │   ├── collections.js          # Add DEALS, OFFERS subcollection keys
│   │   ├── incoterms.js            # New: 11 Incoterms 2020 with metadata
│   │   └── dealConstants.js        # New: DEAL_STATUS, OFFER_STATUS enums
│   └── validation/
│       └── offerSchema.js          # New: Zod schema for offer form
├── domain/entities/
│   ├── Deal.js                     # New: Deal entity with fromFirestore()
│   └── Offer.js                    # New: Offer entity with fromFirestore()
├── data/repositories/
│   ├── DealRepository.js           # New: CRUD + subscriptions for deals
│   └── OfferRepository.js          # New: subcollection access for offers
├── presentation/
│   ├── components/features/deal/
│   │   ├── DealPage/               # Main deal page layout
│   │   ├── ProductHero/            # Product context banner
│   │   ├── OfferTimeline/          # Card-based offer history
│   │   ├── OfferCard/              # Single offer card (buyer/seller/system)
│   │   ├── CounterOfferForm/       # Form for submitting counter-offer
│   │   ├── DealSidebar/            # Party info, progress, current summary
│   │   └── CountdownTimer/         # Expiry countdown with color change
│   └── hooks/deal/
│       └── useDeal.js              # Firestore subscription hook
functions/
└── index.js                        # Add: submitOffer, acceptOffer, rejectOffer,
                                    # withdrawOffer, renewOffer, checkExpiredOffers,
                                    # sendDealNotification
```

### Pattern 1: Firestore Data Model

**Deal document (`deals/{dealId}`):**
```javascript
{
  // Participants
  buyerId: string,           // uid of buyer
  sellerId: string,          // uid of seller (product owner)
  initiatedBy: string,       // uid of party who created the deal

  // Product context (denormalized at creation time)
  productId: string,
  productName: string,
  productImage: string,
  productCategory: string,

  // Deal source
  conversationId: string,    // originating chat conversation

  // State machine
  status: 'negotiating' | 'accepted' | 'rejected' | 'expired' | 'withdrawn',
  currentTurnUid: string,    // uid of party who must respond next
  round: number,             // current round count

  // Current offer summary (denormalized for list page performance)
  latestOfferSnapshot: {
    price: number,
    quantity: number,
    unit: string,
    currency: string,
    incoterm: string,
    namedPlace: string,
    estimatedTotal: number,
    expiresAt: Timestamp,
    submittedBy: string,
  },

  // Timestamps
  createdAt: Timestamp,
  updatedAt: Timestamp,
}
```

**Offer document (`deals/{dealId}/offers/{offerId}`):**
```javascript
{
  round: number,             // 1, 2, 3 ...
  submittedBy: string,       // uid (buyer or seller)
  role: 'buyer' | 'seller',  // role at time of submission

  // Offer terms
  price: number,
  quantity: number,
  unit: string,
  currency: string,
  conversionRate: number | null,  // if currency differs from product base
  incoterm: string,          // 'FOB', 'CIF', etc.
  namedPlace: string,
  deliveryDeadline: Timestamp,
  paymentTerms: string,      // 'cash' | '30_days' | '60_days' | '90_days' | 'lc' | 'dap'
  insurancePreference: 'seller_provides' | 'buyer_provides' | 'none',
  notes: string | null,

  // Attachments
  attachments: Array<{ name: string, url: string, size: number }>,

  // State
  status: 'open' | 'countered' | 'accepted' | 'rejected' | 'expired' | 'withdrawn',
  expiresAt: Timestamp,

  // Computed
  estimatedTotal: number,    // price * quantity

  // Timestamps
  createdAt: Timestamp,
  updatedAt: Timestamp,
}
```

### Pattern 2: State Machine via Cloud Function Transaction

**What:** All state transitions go through `onCall` Cloud Functions that use `db.runTransaction()` with the Admin SDK. This provides serializable transactions (pessimistic locking on the server).

**When to use:** Any write that changes `deal.status`, `offer.status`, or `deal.currentTurnUid`.

**Example — acceptOffer CF:**
```javascript
// functions/index.js
exports.acceptOffer = onCall(async (request) => {
  const { dealId, offerId } = request.data;
  const uid = request.auth?.uid;

  if (!uid) throw new HttpsError('unauthenticated', 'Must be logged in');

  await db.runTransaction(async (transaction) => {
    const dealRef = db.collection('deals').doc(dealId);
    const offerRef = dealRef.collection('offers').doc(offerId);

    const [dealSnap, offerSnap] = await Promise.all([
      transaction.get(dealRef),
      transaction.get(offerRef),
    ]);

    if (!dealSnap.exists) throw new HttpsError('not-found', 'Deal not found');
    if (!offerSnap.exists) throw new HttpsError('not-found', 'Offer not found');

    const deal = dealSnap.data();
    const offer = offerSnap.data();

    // State machine guard: only current turn holder can accept
    if (deal.currentTurnUid !== uid) {
      throw new HttpsError('permission-denied', 'Not your turn');
    }
    // State guard: only open offers can be accepted
    if (offer.status !== 'open') {
      throw new HttpsError('failed-precondition', `Offer is ${offer.status}, cannot accept`);
    }

    const now = Timestamp.now();

    transaction.update(offerRef, {
      status: 'accepted',
      updatedAt: now,
    });
    transaction.update(dealRef, {
      status: 'accepted',
      updatedAt: now,
    });
  });

  // Post-transaction: send notifications, trigger Phase 3 contract creation
  // (done outside transaction since they don't need atomicity with the state change)
  await sendDealEventNotifications(dealId, 'accepted', uid);

  return { success: true };
});
```

**Source:** Firebase docs on Transactions and batched writes + project pattern from Phase 1 CFs.

### Pattern 3: Real-Time Subscription (Client Side)

**What:** `onSnapshot` on the deal document and its offers subcollection for live updates.

**When to use:** Deal page component mounts; unsubscribe on unmount.

```javascript
// src/presentation/hooks/deal/useDeal.js
export function useDeal(dealId) {
  const [deal, setDeal] = useState(null);
  const [offers, setOffers] = useState([]);

  useEffect(() => {
    if (!dealId) return;

    const dealRef = doc(db, 'deals', dealId);
    const offersRef = collection(db, 'deals', dealId, 'offers');

    // Subscribe to deal document
    const unsubDeal = onSnapshot(dealRef, (snap) => {
      if (snap.exists()) setDeal({ id: snap.id, ...snap.data() });
    });

    // Subscribe to offers ordered by round
    const offersQuery = query(offersRef, orderBy('round', 'asc'));
    const unsubOffers = onSnapshot(offersQuery, (snap) => {
      setOffers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => { unsubDeal(); unsubOffers(); };
  }, [dealId]);

  return { deal, offers };
}
```

**Source:** Mirrors `MessagesContext.jsx` subscription pattern already in use.

### Pattern 4: Offer Expiry via Scheduled Cloud Function

**What:** Periodic Cloud Function that queries open offers past their `expiresAt` and transitions them to `expired`.

**When to use:** Offer expiry is not client-triggered; background job catches missed expirations.

```javascript
// functions/index.js
exports.checkExpiredOffers = onSchedule(
  {
    schedule: 'every 30 minutes',  // Claude's discretion: interval
    timeZone: 'UTC',
    retryCount: 3,
  },
  async () => {
    const now = Timestamp.now();

    // Query open offers past expiry
    const expiredOffers = await db.collectionGroup('offers')
      .where('status', '==', 'open')
      .where('expiresAt', '<=', now)
      .get();

    const batch = db.batch();

    for (const offerDoc of expiredOffers.docs) {
      const dealId = offerDoc.ref.parent.parent.id;
      const dealRef = db.collection('deals').doc(dealId);

      batch.update(offerDoc.ref, { status: 'expired', updatedAt: now });
      batch.update(dealRef, { status: 'expired', updatedAt: now });
    }

    if (!expiredOffers.empty) await batch.commit();
  }
);
```

**Note:** `collectionGroup('offers')` queries across ALL deals' offers subcollections. Requires a Firestore composite index on `status` + `expiresAt` in `firestore.indexes.json`.

### Pattern 5: Resend Email in Cloud Functions (CJS)

**What:** Resend SDK called from inside Cloud Function triggers/callables (CommonJS environment).

**When to use:** On any deal event notification trigger.

```javascript
// functions/index.js
const { Resend } = require('resend');

const resend = new Resend(process.env.RESEND_API_KEY);

async function sendDealEmail(to, subject, html) {
  try {
    const { data, error } = await resend.emails.send({
      from: 'CoreTradeGlobal <deals@yourdomain.com>',
      to: [to],
      subject,
      html,
    });
    if (error) console.error('Resend error:', error);
    return data;
  } catch (err) {
    console.error('Failed to send email:', err);
    // Non-blocking — email failure should not fail the Cloud Function
  }
}
```

**Resend requires:** Domain verification in Resend dashboard + DNS records. The `onboarding@resend.dev` sandbox domain can be used for testing without domain setup.

### Pattern 6: Expiry Reminder Notifications (24h, 4h, 1h)

**What:** Reminder check runs alongside the expiry check — same scheduled function or a separate one.

**When to use:** Offers approaching expiry.

```javascript
// Inside checkExpiredOffers or a separate checkExpiryReminders CF

// 24h reminder window: expiresAt between now+23h and now+24h
// 4h window:           expiresAt between now+3h  and now+4h
// 1h window:           expiresAt between now+0h  and now+1h
// Use a `remindersSet` array field on the offer to track which reminders already sent.

const soon24h = Timestamp.fromDate(new Date(Date.now() + 24 * 60 * 60 * 1000));
const window = 30 * 60 * 1000; // 30 min window to match schedule interval

const needsReminder = await db.collectionGroup('offers')
  .where('status', '==', 'open')
  .where('expiresAt', '<=', soon24h)
  .get();
```

### Pattern 7: Smart Push Suppression (Deal Page Viewing)

**What:** Skip FCM push if recipient is currently viewing the deal page.

**Simplest approach (no RTDB needed):** Store a `viewingDealId` field on the user's Firestore document, updated via heartbeat while on the deal page. Cloud Function checks this field before sending push.

```javascript
// Client: heartbeat while on deal page
useEffect(() => {
  if (!dealId || !user?.uid) return;
  const userRef = doc(db, 'users', user.uid);
  updateDoc(userRef, { viewingDealId: dealId });
  return () => updateDoc(userRef, { viewingDealId: null });
}, [dealId, user?.uid]);

// Cloud Function: check before FCM push
const recipientDoc = await db.collection('users').doc(recipientId).get();
const isViewingThisDeal = recipientDoc.data()?.viewingDealId === dealId;
if (!isViewingThisDeal) {
  // send FCM push
}
```

**Note:** Firestore heartbeat approach is simpler than RTDB presence and avoids provisioning a new service. Firebase Realtime Database is NOT currently in `firebase.json`. The heartbeat has a 1-2 second delay before cleanup runs on unmount (not instant like `onDisconnect`). This is acceptable for deal-page suppression.

### Pattern 8: Incoterms Named Place Autocomplete

**What:** Static UN/LOCODE dataset bundled with the app, filtered as user types.

```javascript
// src/core/constants/incoterms.js
export const INCOTERMS_2020 = [
  {
    code: 'EXW', label: 'EXW — Ex Works',
    namedPlaceLabel: 'Place of Delivery',
    namedPlacePlaceholder: 'e.g., Factory, Warehouse',
    insuranceDefault: 'buyer_provides',
    description: 'Seller makes goods available at their premises. Buyer bears all costs and risk.',
  },
  {
    code: 'FCA', label: 'FCA — Free Carrier',
    namedPlaceLabel: 'Named Place',
    namedPlacePlaceholder: 'e.g., Airport, Terminal',
    insuranceDefault: 'buyer_provides',
    description: 'Seller delivers goods to carrier at named place. Risk transfers at delivery to carrier.',
  },
  {
    code: 'CPT', label: 'CPT — Carriage Paid To',
    namedPlaceLabel: 'Place of Destination',
    namedPlacePlaceholder: 'e.g., Port of Destination',
    insuranceDefault: 'buyer_provides',
    description: 'Seller pays freight to named destination. Risk transfers when goods handed to carrier.',
  },
  {
    code: 'CIP', label: 'CIP — Carriage and Insurance Paid To',
    namedPlaceLabel: 'Place of Destination',
    namedPlacePlaceholder: 'e.g., Port of Destination',
    insuranceDefault: 'seller_provides',
    description: 'Seller pays freight and insurance to named destination.',
  },
  {
    code: 'DAP', label: 'DAP — Delivered at Place',
    namedPlaceLabel: 'Place of Destination',
    namedPlacePlaceholder: 'e.g., Buyer\'s address',
    insuranceDefault: 'seller_provides',
    description: 'Seller delivers to named destination. Buyer handles import customs and duties.',
  },
  {
    code: 'DPU', label: 'DPU — Delivered at Place Unloaded',
    namedPlaceLabel: 'Place of Destination',
    namedPlacePlaceholder: 'e.g., Port terminal, Warehouse',
    insuranceDefault: 'seller_provides',
    description: 'Seller delivers and unloads goods at named destination.',
  },
  {
    code: 'DDP', label: 'DDP — Delivered Duty Paid',
    namedPlaceLabel: 'Place of Destination',
    namedPlacePlaceholder: 'e.g., Buyer\'s premises',
    insuranceDefault: 'seller_provides',
    description: 'Maximum seller obligation. Seller pays all costs including duties.',
  },
  {
    code: 'FAS', label: 'FAS — Free Alongside Ship',
    namedPlaceLabel: 'Port of Shipment',
    namedPlacePlaceholder: 'e.g., Port of Istanbul',
    insuranceDefault: 'buyer_provides',
    description: 'Sea/inland waterway only. Seller delivers alongside vessel at named port.',
  },
  {
    code: 'FOB', label: 'FOB — Free on Board',
    namedPlaceLabel: 'Port of Loading',
    namedPlacePlaceholder: 'e.g., Port of Izmir',
    insuranceDefault: 'buyer_provides',
    description: 'Sea/inland waterway only. Risk transfers when goods loaded on vessel.',
  },
  {
    code: 'CFR', label: 'CFR — Cost and Freight',
    namedPlaceLabel: 'Port of Destination',
    namedPlacePlaceholder: 'e.g., Port of Rotterdam',
    insuranceDefault: 'buyer_provides',
    description: 'Sea only. Seller pays freight to destination port. Risk transfers at loading.',
  },
  {
    code: 'CIF', label: 'CIF — Cost, Insurance and Freight',
    namedPlaceLabel: 'Port of Destination',
    namedPlacePlaceholder: 'e.g., Port of Hamburg',
    insuranceDefault: 'seller_provides',
    description: 'Sea only. Seller pays freight and insurance to destination port.',
  },
];
```

For UN/LOCODE autocomplete, `@geoapify/un-locode` ships with the UNECE 2024-2 release. Alternatively, the `datasets/un-locode` GitHub repo provides raw CSV files that can be pre-processed into a static JSON file bundled in the app (zero dependency option).

### Pattern 9: "Initiate Deal" Button in Chat

**What:** A new button in the existing conversation page that triggers deal creation navigation.

**When to use:** Chat was started from a product detail page (`conversation.metadata.productId` is set).

```javascript
// In src/app/(main)/messages/[conversationId]/page.jsx
// Add button in conversation header area:
{conversation.metadata?.productId && conversation.type === 'direct' && (
  <Link
    href={`/deals/new?conversationId=${conversationId}&productId=${conversation.metadata.productId}`}
    className="btn-primary"
  >
    Initiate Deal
  </Link>
)}

// /deals/new?conversationId=...&productId=...
// Pre-fills offer form from product data, creates deal on form submit
```

### Anti-Patterns to Avoid

- **Client writing directly to deal/offer status fields:** Never allow client-side writes to `deal.status`, `offer.status`, or `deal.currentTurnUid`. These must go through Cloud Functions with `runTransaction`. Firestore rules must block direct client writes to these fields.
- **Optimistic UI before CF confirmation:** Do not update offer state in UI until the Cloud Function returns success. A spinner on the submit button is the right pattern.
- **collectionGroup without index:** The `checkExpiredOffers` function uses `collectionGroup('offers')` with filters. This requires a composite index in `firestore.indexes.json`. Missing index = function failure.
- **Sending emails synchronously in transaction:** Never call Resend inside `db.runTransaction()`. Transactions can retry; this would send duplicate emails. Always send emails after the transaction resolves.
- **Missing turn check in CF:** Every state-change CF must verify `deal.currentTurnUid === request.auth.uid` before proceeding, or the sender could accept their own offer.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| State machine atomicity | Custom "lock" document pattern | `db.runTransaction()` in Cloud Functions | Admin SDK transactions are serializable; custom locks require cleanup logic |
| Offer expiry detection | Client-side timer that deletes expired offers | `onSchedule` Cloud Function with batch update | Client may be offline; server-side is authoritative |
| Email delivery | Direct SMTP via nodemailer | Resend SDK | Deliverability, SPF/DKIM handled, free tier sufficient |
| UN/LOCODE port search | Hardcoded list of ports | `@geoapify/un-locode` or static dataset | 100k+ locations; constantly updated; free |
| Presence detection | Custom WebSocket | Firebase RTDB `onDisconnect` OR Firestore heartbeat | See Pattern 7 — Firestore heartbeat is simpler given no RTDB is currently provisioned |
| Concurrent accept race condition | Client lock flag | `runTransaction` with status guard | Transaction retries and throws on invalid state; no manual lock needed |

**Key insight:** Firestore `runTransaction` on the Admin SDK (server-side) provides all the state machine guarantees needed. Do not attempt to replicate this with client-side writes or Firestore rules alone — rules cannot check "previous state" in a race-condition-safe way for write-then-read-then-write patterns.

---

## Common Pitfalls

### Pitfall 1: Missing Composite Index for collectionGroup Queries

**What goes wrong:** `checkExpiredOffers` calls `db.collectionGroup('offers').where('status', '==', 'open').where('expiresAt', '<=', now)` — this requires a composite index. Without it, the function throws `FAILED_PRECONDITION: The query requires an index`.

**Why it happens:** Firestore composite indexes are not auto-created; they must be declared in `firestore.indexes.json`.

**How to avoid:** Add to `firestore.indexes.json` before deploying the scheduled function:
```json
{
  "indexes": [
    {
      "collectionGroup": "offers",
      "queryScope": "COLLECTION_GROUP",
      "fields": [
        { "fieldPath": "status", "order": "ASCENDING" },
        { "fieldPath": "expiresAt", "order": "ASCENDING" }
      ]
    }
  ]
}
```

**Warning signs:** Error in Cloud Functions logs with `The query requires an index`.

### Pitfall 2: Firestore Rules Blocking CF Admin SDK Writes

**What goes wrong:** Cloud Functions using the Admin SDK bypass Firestore security rules entirely — this is intentional and correct. However, the rules must still allow client reads of deals (for the deal page). If rules are too restrictive (e.g., deny-all), the client can't read real-time updates.

**Why it happens:** Rules are written for client access, but developers forget that CF Admin SDK bypasses them.

**How to avoid:** Rules for `deals` collection should allow: read by participants, write only if admin (since all writes go through CFs). Example:
```javascript
match /deals/{dealId} {
  function isDealParticipant() {
    return request.auth.uid == resource.data.buyerId ||
           request.auth.uid == resource.data.sellerId;
  }
  allow read: if isAuthenticated() && isDealParticipant();
  allow write: if false; // All writes via Cloud Functions (Admin SDK bypasses)

  match /offers/{offerId} {
    allow read: if isAuthenticated() && isDealParticipant();
    allow write: if false;
  }
}
```

**Warning signs:** Client `onSnapshot` returns permission-denied; real-time updates stop working.

### Pitfall 3: Sending Duplicate Emails on Transaction Retry

**What goes wrong:** If Resend email is called inside `db.runTransaction()` and the transaction retries (due to concurrent modification), the email sends multiple times.

**Why it happens:** Firestore transactions can retry their function body up to 5 times (client SDK). Admin SDK retries are managed differently but also possible.

**How to avoid:** All side effects (FCM push, Resend email) must be called AFTER `runTransaction` resolves. Use a separate helper function called outside the transaction.

**Warning signs:** Users receive multiple copies of the same email for a single deal event.

### Pitfall 4: `viewingDealId` Heartbeat Stale on Crash

**What goes wrong:** The Firestore heartbeat approach (Pattern 7) relies on `useEffect` cleanup to null out `viewingDealId`. If the browser crashes or the tab closes abruptly, the cleanup never runs, leaving `viewingDealId` set for hours.

**Why it happens:** Unlike Firebase RTDB `onDisconnect`, Firestore writes have no server-side disconnect hook.

**How to avoid:** Treat `viewingDealId` as best-effort — add a `viewingDealSince` timestamp alongside it. In the CF, check both the field AND that `viewingDealSince` is recent (< 60 seconds). If stale, treat as not viewing.
```javascript
const isViewingThisDeal = (
  recipientDoc.data()?.viewingDealId === dealId &&
  recipientDoc.data()?.viewingDealSince?.toMillis() > Date.now() - 60000
);
```

**Warning signs:** Push notifications are suppressed for users who last viewed a deal hours ago.

### Pitfall 5: Round Number Race Condition

**What goes wrong:** Two clients submit a counter-offer simultaneously (unlikely but possible). Both read `round: 3`, both try to write `round: 4`.

**Why it happens:** The `round` counter is incremented by the CF after reading the current value.

**How to avoid:** Include `round` check in the transaction: throw if `deal.round` has changed since the CF started. The `runTransaction` pattern handles this automatically since it reads `deal` in the transaction and retries if the document changed.

```javascript
// Inside runTransaction:
const expectedRound = requestData.expectedRound; // sent from client
if (deal.round !== expectedRound) {
  throw new HttpsError('aborted', 'Deal has been updated. Please refresh.');
}
```

**Warning signs:** Duplicate offers in the timeline with the same round number.

### Pitfall 6: Resend Free Tier Limit

**What goes wrong:** 100 emails/day is the Resend free tier. Expiry reminders (3 per deal × active deals) can exhaust this quickly once the platform has real users.

**Why it happens:** Reminder emails at 24h, 4h, and 1h per offer per party = 6 emails per offer per round.

**How to avoid:** For Phase 2, this limit is acceptable. Log all sent emails to Firestore so the scheduled function can check `remindersSet` before sending duplicates. Consider batching reminder emails if multiple offers expire in the same window.

**Warning signs:** Resend dashboard shows rate limit errors in logs.

---

## Code Examples

### Verified patterns from official sources and project codebase:

### Creating a Deal (client navigates to /deals/new)

```javascript
// Cloud Function: createDeal
exports.createDeal = onCall(async (request) => {
  const { conversationId, productId, initialOffer } = request.data;
  const uid = request.auth?.uid;

  if (!uid) throw new HttpsError('unauthenticated', 'Must be logged in');

  // Fetch product to get seller + denormalized data
  const productDoc = await db.collection('products').doc(productId).get();
  if (!productDoc.exists) throw new HttpsError('not-found', 'Product not found');
  const product = productDoc.data();

  const sellerId = product.userId;
  const buyerId = uid === sellerId
    ? initialOffer.counterpartyId  // seller initiated
    : uid;                          // buyer initiated
  const actualSellerId = uid === sellerId ? uid : sellerId;

  const now = Timestamp.now();
  const expiresAt = Timestamp.fromDate(
    new Date(Date.now() + (initialOffer.expiryHours || 72) * 60 * 60 * 1000)
  );

  const dealRef = db.collection('deals').doc(); // auto-ID
  const offerRef = dealRef.collection('offers').doc();

  await db.runTransaction(async (transaction) => {
    transaction.set(dealRef, {
      buyerId,
      sellerId: actualSellerId,
      initiatedBy: uid,
      productId,
      productName: product.name,
      productImage: product.images?.[0] || null,
      productCategory: product.categoryName || null,
      conversationId,
      status: 'negotiating',
      currentTurnUid: actualSellerId === uid ? buyerId : actualSellerId,  // other party responds
      round: 1,
      latestOfferSnapshot: {
        ...initialOffer,
        expiresAt,
        submittedBy: uid,
      },
      createdAt: now,
      updatedAt: now,
    });

    transaction.set(offerRef, {
      round: 1,
      submittedBy: uid,
      role: uid === actualSellerId ? 'seller' : 'buyer',
      ...initialOffer,
      expiresAt,
      status: 'open',
      estimatedTotal: initialOffer.price * initialOffer.quantity,
      createdAt: now,
      updatedAt: now,
    });
  });

  // Post-transaction: system message in chat + notifications
  // ...

  return { success: true, dealId: dealRef.id };
});
```

### Real-time Subscription with Firestore (mirrors MessagesContext pattern)

```javascript
// Source: MessagesContext.jsx pattern + Firebase onSnapshot docs

// Subscribe to deal + offers simultaneously
const dealRef = doc(db, 'deals', dealId);
const offersRef = query(
  collection(db, 'deals', dealId, 'offers'),
  orderBy('round', 'asc')
);

const unsubDeal = onSnapshot(dealRef, (snap) => {
  if (snap.exists()) setDeal({ id: snap.id, ...snap.data() });
});

const unsubOffers = onSnapshot(offersRef, (snap) => {
  setOffers(snap.docs.map(d => ({ id: d.id, ...d.data() })));
});
```

### Existing FCM Pattern (extend, don't rewrite)

```javascript
// Source: functions/index.js sendMessageNotification pattern — reuse for deal notifications

// Collect FCM tokens for deal participants (same pattern as messaging)
const dealParticipants = [deal.buyerId, deal.sellerId].filter(id => id !== senderUid);

for (const participantId of dealParticipants) {
  const userDoc = await db.collection('users').doc(participantId).get();
  const userData = userDoc.data();

  // Smart push suppression: check viewingDealId
  const isViewing = (
    userData?.viewingDealId === dealId &&
    userData?.viewingDealSince?.toMillis() > Date.now() - 60000
  );

  if (!isViewing && userData?.fcmToken) {
    await messaging.send({
      token: userData.fcmToken,
      data: {
        type: 'deal_event',
        dealId,
        eventType: eventType, // 'counter_offer', 'accepted', 'rejected', etc.
        click_action: `/deals/${dealId}`,
      },
    }).catch(handleTokenError);
  }

  // Always create Firestore notification (for notification bell)
  await db.collection('users').doc(participantId)
    .collection('notifications')
    .add({
      type: 'deal',
      title: notificationTitle,
      body: notificationBody,
      dealId,
      isRead: false,
      createdAt: Timestamp.now(),
    });
}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| firebase-functions v1 `functions.pubsub.schedule` | firebase-functions v2 `onSchedule` | v2 GA 2023 | Already using v2; no change needed |
| Client-side `runTransaction` for critical state | Server-side CF `db.runTransaction` | Ongoing best practice | Required for NEGO-07 atomicity guarantee |
| Hand-rolled presence | RTDB `onDisconnect` or Firestore heartbeat | N/A | Project doesn't use RTDB; heartbeat pattern is simpler |
| Sendgrid/Mailgun | Resend | 2023+ | Lower cost, simpler API, React Email templates |

**Deprecated/outdated:**
- Firebase Functions v1 `onCall` signatures: v2 uses `request.auth` not `context.auth` — already correctly using v2 pattern in functions/index.js.

---

## Open Questions

1. **Resend domain verification**
   - What we know: Resend requires DNS record setup for custom domain email sending. The `onboarding@resend.dev` sandbox works for testing.
   - What's unclear: Is the project's domain configured for production email? This needs to happen before launch.
   - Recommendation: Use `onboarding@resend.dev` for Phase 2 implementation; add a task note to configure custom domain before go-live.

2. **File attachments on offers**
   - What we know: CONTEXT.md says "optional file attachments on offers (product specs, certifications)". Firebase Storage is already used for product images.
   - What's unclear: Should attachment upload be to the same `products/{userId}/` Storage path or a new `deals/{dealId}/` path?
   - Recommendation: Use `deals/{dealId}/offers/{offerId}/attachments/` for clean separation. The existing `FirebaseStorageDataSource` pattern handles this.

3. **Firestore indexes for deal queries**
   - What we know: The "My Deals" list page needs to query `deals` by `buyerId` or `sellerId` ordered by `updatedAt`.
   - What's unclear: Whether a single composite index (`buyerId + updatedAt` and `sellerId + updatedAt`) suffices, or if an array-contains pattern is needed.
   - Recommendation: Use two separate queries (one for buyerId, one for sellerId) and merge/sort client-side — matches the existing `participants array-contains` pattern in ConversationRepository. Alternatively, add `participantIds: [buyerId, sellerId]` array field to deals for a single `array-contains` query.

4. **Contract generation trigger (Phase 3 handoff)**
   - What we know: "Acceptance immediately triggers contract generation (Phase 3)". Phase 3 is not yet built.
   - What's unclear: Should `acceptOffer` CF set `deal.status = 'accepted'` and Phase 3 independently trigger on that status change? Or should Phase 2 CF directly call Phase 3 CF?
   - Recommendation: Use a Firestore `onDocumentUpdated` trigger in Phase 3 that fires when `deal.status` transitions to `'accepted'`. This decouples phases cleanly. Phase 2's `acceptOffer` only sets the deal status; Phase 3 owns the contract creation logic.

---

## Sources

### Primary (HIGH confidence)
- Firebase Firestore — Transactions and batched writes docs (https://firebase.google.com/docs/firestore/manage-data/transactions)
- Firebase Cloud Functions v2 — onSchedule docs (https://firebase.google.com/docs/functions/schedule-functions)
- Firebase Firestore — Presence solution (https://firebase.google.com/docs/firestore/solutions/presence)
- Project codebase — `functions/index.js` existing CF patterns (onCall, onDocumentCreated, onSchedule)
- Project codebase — `MessagesContext.jsx` onSnapshot subscription pattern
- Project codebase — `ConversationRepository.js`, `NotificationRepository.js` data layer patterns
- Project codebase — `firestore.rules` participant-based security pattern
- Project codebase — `FirestoreDataSource.js` generic query/subscribe patterns

### Secondary (MEDIUM confidence)
- Resend Node.js docs (https://resend.com/docs/send-with-nodejs) — CJS compatibility not explicitly documented but v4+ ships dual CJS/ESM exports
- `@geoapify/un-locode` npm package — includes UNECE 2024-2 dataset as of Jan 2025 (https://www.npmjs.com/package/@geoapify/un-locode)
- Firebase Firestore data contention docs (https://firebase.google.com/docs/firestore/transaction-data-contention) — optimistic concurrency on client, pessimistic on Admin SDK

### Tertiary (LOW confidence)
- Resend v4 CJS require() support — needs validation; test in functions/ before committing to implementation

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all core libraries already in use; Resend and un-locode are straightforward additions
- Architecture patterns: HIGH — Firestore data model and state machine are well-defined; mirrors existing patterns
- Pitfalls: HIGH — all pitfalls verified against project codebase and official Firebase docs
- Resend CJS compatibility: MEDIUM — documented for v3+, should verify in functions/ before implementing
- Presence (heartbeat vs RTDB): MEDIUM — heartbeat is simpler but has stale-state edge case documented

**Research date:** 2026-02-22
**Valid until:** 2026-03-22 (stable stack, 30 days)
