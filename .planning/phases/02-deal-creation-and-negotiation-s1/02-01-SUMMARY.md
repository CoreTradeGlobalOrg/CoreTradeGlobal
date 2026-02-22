---
phase: 02-deal-creation-and-negotiation-s1
plan: "01"
subsystem: data-layer
tags: [firestore, cloud-functions, state-machine, repositories, entities, validation]
dependency_graph:
  requires: []
  provides:
    - DEALS collection + OFFERS subcollection data model
    - Deal and Offer entities (fromFirestore/toFirestore)
    - DealRepository and OfferRepository (CRUD + real-time subscriptions)
    - 5 Cloud Functions enforcing the deal state machine atomically
    - offerSchema Zod validation
    - Firestore rules (participant-only read, CF-only writes)
    - Composite indexes for all planned queries
  affects:
    - functions/index.js (added 5 Cloud Functions + constants)
    - firestore.rules (added deals + offers rules)
    - firestore.indexes.json (added 3 composite indexes)
    - src/core/di/container.js (getDealRepository, getOfferRepository)
tech_stack:
  added: []
  patterns:
    - Firestore runTransaction (Admin SDK pessimistic locking) for all deal state changes
    - Two-query merge pattern for buyerId + sellerId participant queries (no array-contains on deals)
    - onSnapshot subscriptions following MessagesContext pattern
    - Zod validation schema following productSchema.js pattern
    - Lazy singleton registration in DI container following existing repository pattern
key_files:
  created:
    - src/core/constants/dealConstants.js
    - src/core/constants/incoterms.js
    - src/core/validation/offerSchema.js
    - src/domain/entities/Deal.js
    - src/domain/entities/Offer.js
    - src/data/repositories/DealRepository.js
    - src/data/repositories/OfferRepository.js
  modified:
    - src/core/constants/collections.js
    - src/core/di/container.js
    - functions/index.js
    - firestore.rules
    - firestore.indexes.json
decisions:
  - "Two-query merge for My Deals list (buyerId query + sellerId query, merge client-side) — Firestore does not support OR across different fields in a single query"
  - "DEAL_STATUS and OFFER_STATUS constants duplicated in functions/index.js (plain JS objects) — Cloud Functions are CommonJS and cannot import ESM from Next.js app"
  - "System message in createDeal uses a second runTransaction (not inside the deal transaction) — avoids any email/side-effect-in-transaction pitfall; failure is non-fatal and logged"
  - "isDealParticipant() is a local function inside the deals match block (not top-level) — reads resource.data which is document-context-specific and not usable at file scope"
  - "withdrawOffer sets deal.status to withdrawn — aligns with CONTEXT.md: sender can withdraw offer anytime before receiver responds; deal is terminated"
metrics:
  duration: "5 min (323 seconds)"
  completed: "2026-02-22"
  tasks_completed: 2
  files_created: 7
  files_modified: 5
---

# Phase 2 Plan 1: Deal Data Foundation Summary

**One-liner:** Complete data layer for deal negotiation with 5 atomic Cloud Functions (state machine), 11 Incoterms 2020 constants, Zod offer validation, Deal/Offer entities, DealRepository/OfferRepository, participant-only Firestore rules, and composite indexes.

## What Was Built

### Task 1: Constants, Entities, Validation, Repositories, DI Container

**`src/core/constants/collections.js`** - Added `DEALS: 'deals'` to COLLECTIONS and `OFFERS: 'offers'` to SUBCOLLECTIONS.

**`src/core/constants/dealConstants.js`** - Complete deal state machine constants:
- `DEAL_STATUS` enum: 5 values (negotiating, accepted, rejected, expired, withdrawn)
- `OFFER_STATUS` enum: 6 values (open, countered, accepted, rejected, expired, withdrawn)
- `PAYMENT_TERMS` array: 6 options (cash, 30_days, 60_days, 90_days, lc, dap)
- `DEAL_UNITS` array: 6 options (kg, ton, pieces, metre, m², containers)
- `INSURANCE_PREFERENCE` enum: 3 values (seller_provides, buyer_provides, none)
- `EXPIRY_DEFAULT_HOURS = 72`
- `VALID_DEAL_TRANSITIONS` and `VALID_OFFER_TRANSITIONS` maps

**`src/core/constants/incoterms.js`** - All 11 Incoterms 2020 with metadata (namedPlaceLabel, namedPlacePlaceholder, insuranceDefault, description). Includes `getIncotermByCode()` helper.

**`src/core/validation/offerSchema.js`** - Zod schema covering all 12 offer form fields: price, quantity, unit, currency, conversionRate, incoterm, namedPlace, deliveryDeadline, paymentTerms, insurancePreference, notes, expiryHours.

**`src/domain/entities/Deal.js`** - Deal entity with `fromFirestore()`, `toFirestore()`, and 7 helper methods: `isNegotiating()`, `isAccepted()`, `isTerminal()`, `isParticipant(uid)`, `isBuyer(uid)`, `isSeller(uid)`, `isCurrentTurn(uid)`.

**`src/domain/entities/Offer.js`** - Offer entity with `fromFirestore()`, `toFirestore()`, and 3 helpers: `isOpen()`, `isExpired()`, `getTimeSinceSubmission()`.

**`src/data/repositories/DealRepository.js`** - Read-only deal access:
- `getById(dealId)` - returns Deal entity
- `getByParticipant(uid)` - two-query merge (buyerId + sellerId), merged and sorted
- `subscribeToDeal(dealId, callback)` - single deal real-time subscription
- `subscribeToDeals(uid, callback)` - My Deals list with two parallel onSnapshot listeners

**`src/data/repositories/OfferRepository.js`** - Subcollection read access:
- `getByDealId(dealId)` - returns Offer[] ordered by round asc
- `subscribeToOffers(dealId, callback)` - real-time offer timeline

**`src/core/di/container.js`** - Added `getDealRepository()` and `getOfferRepository()` singleton registrations following existing lazy instantiation pattern.

### Task 2: Cloud Functions, Firestore Rules, Indexes

**`functions/index.js`** - 5 new `onCall` Cloud Functions, all using `db.runTransaction()`:

- **`createDeal`**: Fetches product (seller ID, denormalized data), determines buyer/seller, atomically creates `deals/{autoId}` + `deals/{dealId}/offers/{autoId}` in a single transaction. Post-transaction sends system message to conversation (non-fatal on error).
- **`submitCounterOffer`**: Guards: deal.status=negotiating, currentTurnUid===uid, deal.round===expectedRound (stale write prevention). Marks old offer as countered, creates new offer with round+1, flips currentTurnUid.
- **`acceptOffer`**: Guards: deal.status=negotiating, currentTurnUid===uid, offer.status=open, offer not expired. Sets offer=accepted, deal=accepted.
- **`rejectOffer`**: Same guards as acceptOffer. Sets offer=rejected, deal=rejected.
- **`withdrawOffer`**: Guards: offer.submittedBy===uid (sender only), offer.status=open, deal.status=negotiating. Sets offer=withdrawn, deal=withdrawn.

**`firestore.rules`** - Added deals collection rules:
```
match /deals/{dealId} {
  allow read: if isAuthenticated() && (isDealParticipant() || isAdmin());
  allow create/update/delete: if false;
  match /offers/{offerId} {
    allow read: if isAuthenticated() && isDealParticipant();
    allow write: if false;
  }
}
```

**`firestore.indexes.json`** - Added 3 composite indexes:
1. `offers` collectionGroup: `status ASC + expiresAt ASC` (for checkExpiredOffers scheduled CF in Plan 04)
2. `deals` collection: `buyerId ASC + updatedAt DESC` (My Deals buyer query)
3. `deals` collection: `sellerId ASC + updatedAt DESC` (My Deals seller query)

## Deviations from Plan

### Auto-fixed Issues

None — plan executed exactly as written with one minor clarification:

**1. [Rule 2 - Missing feature] System message uses separate transaction**
- **Found during:** Task 2 (createDeal implementation)
- **Issue:** The plan specified "Post-transaction: sends system message to conversation" without specifying isolation. Per research (Pitfall 3), side effects must never go inside the primary transaction to prevent duplicates on retry.
- **Fix:** Wrapped the system message write in its own separate `db.runTransaction()` call after the deal transaction resolves. Marked non-fatal with `try/catch` so a messaging failure does not fail the deal creation.
- **Files modified:** functions/index.js
- **Commit:** d5a625c

## Self-Check: PASSED

All 7 created files confirmed present on disk.
Both task commits confirmed in git history (a7b74c2, d5a625c).
All 5 Cloud Functions exports confirmed in functions/index.js.
JSON validation passed for firestore.indexes.json (7 indexes total).
