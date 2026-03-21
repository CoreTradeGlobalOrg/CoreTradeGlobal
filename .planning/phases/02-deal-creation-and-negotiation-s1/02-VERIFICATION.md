---
phase: 02-deal-creation-and-negotiation-s1
verified: 2026-02-23T04:45:00Z
status: human_needed
score: 5/5 success criteria verified
re_verification: true
  previous_status: gaps_found
  previous_score: 4/5
  gaps_closed:
    - "SC-2: Counter-offer flow — useDealActions.submitCounterOffer now sends { dealId, offer: offerData, expectedRound } matching CF destructuring of request.data.offer"
  gaps_remaining: []
  regressions: []
human_verification:
  - test: "Initiate Deal end-to-end as a member user (not admin)"
    expected: "Member can navigate from /messages/[id] with Initiate Deal button -> /deals/new loads with product context -> form submits -> /deals/[dealId] loads showing offer timeline"
    why_human: "Firestore rules fix (plan 05) cannot be confirmed from code alone; requires a live member-auth session to confirm permissions work"
  - test: "Counter-offer round-trip"
    expected: "Party A submits initial offer, Party B sees it, Party B submits counter-offer with modified price — Party A's view updates in real-time to show Round 2 with changed fields highlighted"
    why_human: "Requires two authenticated sessions; offerData/offer mismatch is now fixed so this runtime test is unblocked"
  - test: "FCM push notification on deal creation for the other party (foreground and background)"
    expected: "User B sees notification titled 'New Deal' (not 'New Message') that navigates to /deals/[dealId] on click"
    why_human: "Requires real FCM tokens and RESEND_API_KEY configured; cannot verify push delivery from code alone"
  - test: "Concurrent accept and counter-offer atomicity"
    expected: "If Party A accepts and Party B submits counter-offer simultaneously, exactly one succeeds and the other receives an HttpsError — deal state is never corrupted"
    why_human: "Race condition requires controlled concurrent requests; cannot verify from code inspection alone"
---

# Phase 02: Deal Creation and Negotiation (S1) Verification Report

**Phase Goal:** A buyer and seller can negotiate a deal through structured offers and counter-offers, with real-time updates and a complete audit trail
**Verified:** 2026-02-23T04:45:00Z
**Status:** human_needed — all 5 automated success criteria verified; 4 items need human/runtime verification
**Re-verification:** Yes — after gap closure (plan 02-07)

---

## Re-Verification Summary

**Previous status:** gaps_found (4/5, 2026-02-23)
**Current status:** human_needed (5/5)

### Gap Closed

The single automated gap from the initial verification is resolved:

- **Gap:** `useDealActions.submitCounterOffer` sent `{ dealId, offerData, expectedRound }` to the Cloud Function, but the CF destructured `{ dealId, offer, expectedRound }` from `request.data`. The CF guard `if (!dealId || !offer)` threw `invalid-argument` immediately, making all counter-offers fail before reaching the transaction.
- **Fix applied:** Plan 02-07, commit `687cd58`. Line 47 of `src/presentation/hooks/deal/useDealActions.js` changed from `fn({ dealId, offerData, expectedRound })` to `fn({ dealId, offer: offerData, expectedRound })`.
- **Verification:** Both sides confirmed — client sends key `offer`, CF reads key `offer`. No other call sites in the codebase use `offerData` as a wire key to any Cloud Function.

### Regressions

None. All previously-verified items confirmed unchanged:
- Firestore rules `get()` fix (lines 260-261) intact
- `deal_event` handling in NotificationListener (line 86) and service worker (line 38) intact
- MessageThread system message rendering (line 177) intact
- UNECE_TO_DEAL_UNIT mapping in dealConstants.js intact

---

## Goal Achievement

### Observable Truths (Success Criteria)

| # | Truth | Status | Evidence |
|---|-------|--------|---------|
| 1 | Buyer can create a deal and submit an initial offer with all Incoterms and terms — seller sees it in real-time without refreshing | VERIFIED | `createDeal` CF uses `db.runTransaction` atomically creating deal+offer; `useDeal` subscribes via `onSnapshot`; Initiate Deal button in chat confirmed in page.jsx lines 184-191 |
| 2 | Seller can submit a counter-offer — both parties see full offer history timeline | VERIFIED | `useDealActions.js` line 47 now sends `{ dealId, offer: offerData, expectedRound }` matching CF destructuring `const { dealId, offer, expectedRound } = request.data` at functions/index.js line 1078; CF guard `if (!dealId \|\| !offer)` now passes with real offer data; commit 687cd58 confirmed |
| 3 | Offer follows valid state transitions only — invalid transitions rejected at data layer | VERIFIED | All 5 CFs (`createDeal`, `submitCounterOffer`, `acceptOffer`, `rejectOffer`, `withdrawOffer`) use `db.runTransaction` with explicit status guards: `deal.status !== 'negotiating'` throws HttpsError; `offer.status !== 'open'` throws HttpsError; `deal.currentTurnUid !== uid` throws HttpsError |
| 4 | Both parties receive in-app and email notifications when a counter-offer is received | VERIFIED (code) / human for delivery | `onDealOfferCreated` trigger fires on new offers; writes Firestore notification docs; sends FCM with smart suppression; sends Resend email; NotificationListener handles `deal_event` at line 86; service worker handles `deal_event` at line 38 |
| 5 | All deal state transitions are atomic — concurrent accept and counter-offer cannot corrupt deal state | VERIFIED (code) / human for concurrency | Every state-changing CF uses `db.runTransaction` with status guards as first check; `submitCounterOffer` additionally has `deal.round === expectedRound` stale-write guard |

**Score: 5/5 truths verified** (SC-2 gap now closed by plan 02-07)

---

### Required Artifacts

#### Plan 02-01 Artifacts

| Artifact | Status | Evidence |
|----------|--------|---------|
| `src/core/constants/dealConstants.js` | VERIFIED | Exports DEAL_STATUS, OFFER_STATUS, PAYMENT_TERMS, DEAL_UNITS, UNECE_TO_DEAL_UNIT (21 mappings), INSURANCE_PREFERENCE, EXPIRY_DEFAULT_HOURS=72, VALID_DEAL_TRANSITIONS, VALID_OFFER_TRANSITIONS |
| `src/core/constants/incoterms.js` | VERIFIED | Exports INCOTERMS_2020 array with all 11 terms (EXW, FCA, CPT, CIP, DAP, DPU, DDP, FAS, FOB, CFR, CIF); each with namedPlaceLabel, insuranceDefault, description; exports getIncotermByCode() |
| `src/core/validation/offerSchema.js` | VERIFIED | Zod schema covering all required fields: price, quantity, unit, currency, conversionRate, incoterm, namedPlace, deliveryDeadline, paymentTerms, insurancePreference, notes, expiryHours |
| `src/domain/entities/Deal.js` | VERIFIED | Class with fromFirestore(), toFirestore(), isNegotiating(), isAccepted(), isTerminal(), isParticipant(), isBuyer(), isSeller(), isCurrentTurn() |
| `src/domain/entities/Offer.js` | VERIFIED | Class with fromFirestore(), toFirestore(), isOpen(), isExpired(), getTimeSinceSubmission() |
| `src/data/repositories/DealRepository.js` | VERIFIED | getById(), getByParticipant() (two-query merge), subscribeToDeal() (onSnapshot), subscribeToDeals() (two parallel onSnapshot listeners with merge) |
| `src/data/repositories/OfferRepository.js` | VERIFIED | getByDealId(), subscribeToOffers() (onSnapshot on offers subcollection ordered by round asc) |
| `functions/index.js` (createDeal) | VERIFIED | Atomic transaction creating deal+offer; buyer/seller determination from product ownership; latestOfferSnapshot denormalization |
| `functions/index.js` (submitCounterOffer) | VERIFIED | Function exists; correct transaction structure and guards; client now sends `offer` key matching CF destructuring — gap closed by plan 02-07 commit 687cd58 |
| `functions/index.js` (acceptOffer, rejectOffer, withdrawOffer) | VERIFIED | All three use db.runTransaction with status guards; acceptOffer additionally checks expiresAt |
| `firestore.rules` (deals collection) | VERIFIED | Match /deals/{dealId} with participant read; offers subcollection uses `get(/databases/$(database)/documents/deals/$(dealId))` at lines 260-261 correctly |
| `firestore.indexes.json` | VERIFIED | collectionGroup "offers" with status+expiresAt (COLLECTION_GROUP), deals+buyerId+updatedAt (COLLECTION), deals+sellerId+updatedAt (COLLECTION) |
| `src/core/di/container.js` | VERIFIED | getDealRepository() and getOfferRepository() registered as lazy singletons |

#### Plan 02-02 Artifacts

| Artifact | Status | Evidence |
|----------|--------|---------|
| `src/app/(main)/deals/new/page.jsx` | VERIFIED | Renders DealForm; fetches product+conversation; pre-fills price, currency, quantity (from stockQuantity), unit (via UNECE_TO_DEAL_UNIT); auth-protected redirect |
| `src/presentation/components/features/deal/DealForm/DealForm.jsx` | VERIFIED | react-hook-form + zodResolver(offerSchema); all required fields rendered; IncotermsSelector and NamedPlaceInput included |
| `src/presentation/components/features/deal/IncotermsSelector/IncotermsSelector.jsx` | VERIFIED | Renders all 11 INCOTERMS_2020 as pills; selected pill in gold; tooltip via title attribute; controlled component |
| `src/presentation/components/features/deal/NamedPlaceInput/NamedPlaceInput.jsx` | VERIFIED | Calls `/api/locode/search` route; label/placeholder changes based on Incoterm prop |
| `src/app/(main)/deals/page.jsx` | VERIFIED | Auth-protected; uses useDeals() hook; renders DealList |
| `src/presentation/hooks/deal/useDeals.js` | VERIFIED | Calls `container.getDealRepository().subscribeToDeals(user.uid, ...)` for real-time; unsubscribes on unmount |

#### Plan 02-03 Artifacts

| Artifact | Status | Evidence |
|----------|--------|---------|
| `src/app/(main)/deals/[dealId]/page.jsx` | VERIFIED | Uses useDeal(), useDealActions(), useDealPresence(); passes all to DealPage; auth check + participant access check |
| `src/presentation/components/features/deal/DealPage/DealPage.jsx` | VERIFIED | Imports and renders OfferTimeline, CounterOfferForm, DealSidebar; two-column layout |
| `src/presentation/components/features/deal/OfferTimeline/OfferTimeline.jsx` | VERIFIED | Renders OfferCard per offer; passes previousOffer for diff; collapse logic for older rounds |
| `src/presentation/components/features/deal/OfferCard/OfferCard.jsx` | VERIFIED | Shows estimatedTotal; isChanged() helper compares fields to previousOffer; changed fields highlighted |
| `src/presentation/components/features/deal/CounterOfferForm/CounterOfferForm.jsx` | VERIFIED | Only renders when `deal.status === 'negotiating' && deal.currentTurnUid === currentUserUid`; pre-fills from latestOffer; calls `actions.submitCounterOffer(deal.id, data, deal.round)` |
| `src/presentation/components/features/deal/DealSidebar/DealSidebar.jsx` | VERIFIED | Renders party info, progress tracker, current offer summary |
| `src/presentation/hooks/deal/useDeal.js` | VERIFIED | Two parallel subscriptions: subscribeToDeal + subscribeToOffers; audio chime on new offer from other party; unsubscribes both on unmount |
| `src/presentation/hooks/deal/useDealActions.js` | VERIFIED | All 4 httpsCallable actions wired; submitCounterOffer now sends `{ dealId, offer: offerData, expectedRound }` — key name mismatch resolved |

#### Plan 02-04 Artifacts

| Artifact | Status | Evidence |
|----------|--------|---------|
| `functions/index.js` (onDealOfferCreated) | VERIFIED | Fires on `deals/{dealId}/offers/{offerId}` creation; sends all 3 channels; posts system message to conversation |
| `functions/index.js` (onDealStatusChanged) | VERIFIED | Fires on deal doc update; detects terminal status changes; sends notifications |
| `functions/index.js` (sendExpiryReminders) | VERIFIED | Scheduled every 30 minutes; 3 reminder windows (24h/4h/1h); arrayUnion for remindersSet; notifies both parties |
| `functions/index.js` (checkExpiredOffers) | VERIFIED | Scheduled every 30 minutes; collectionGroup query on offers; batch update for expired offers and deals |
| `functions/index.js` (renewOffer) | VERIFIED | Auth guard; runTransaction; sender-only + expired-status guard; sets status back to 'open' with new expiresAt |
| `functions/package.json` (resend) | VERIFIED | `"resend": "^6.9.2"` |

#### Plan 02-05 Artifacts (Gap Closure)

| Artifact | Status | Evidence |
|----------|--------|---------|
| `firestore.rules` (offers subcollection) | VERIFIED | Lines 260-261: `get(/databases/$(database)/documents/deals/$(dealId)).data.buyerId` — correct fix confirmed, no regression |
| `src/app/(main)/deals/new/page.jsx` | VERIFIED | Line 163: `product?.stockQuantity`; line 164: `UNECE_TO_DEAL_UNIT[product?.unit] \|\| product?.unit \|\| ''` |
| `src/core/constants/dealConstants.js` | VERIFIED | UNECE_TO_DEAL_UNIT exported with 21 mappings |

#### Plan 02-06 Artifacts (Gap Closure)

| Artifact | Status | Evidence |
|----------|--------|---------|
| `src/presentation/components/common/NotificationListener/NotificationListener.jsx` | VERIFIED | Line 86: `if (dataType === 'deal_event')` branch — no regression |
| `public/firebase-messaging-sw.js` | VERIFIED | Line 38: `if (dataType === 'deal_event')` branch — no regression |
| `src/presentation/components/features/messaging/MessageThread/MessageThread.jsx` | VERIFIED | Line 177: `if (message.type === 'system')` renders system message card — no regression |
| `functions/index.js` (createDeal no duplicate message) | VERIFIED | System message is NOT posted in createDeal; only onDealOfferCreated posts it — no regression |

#### Plan 02-07 Artifacts (Gap Closure — This Re-verification)

| Artifact | Status | Evidence |
|----------|--------|---------|
| `src/presentation/hooks/deal/useDealActions.js` | VERIFIED | Line 47: `await fn({ dealId, offer: offerData, expectedRound })` — wire key is `offer`, matching CF's `const { dealId, offer, expectedRound } = request.data` at functions/index.js line 1078 |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `functions/index.js (createDeal)` | `deals/{dealId} + deals/{dealId}/offers/{offerId}` | `db.runTransaction` | WIRED | Lines 1020-1056: transaction.set(dealRef) + transaction.set(offerRef) |
| `functions/index.js (acceptOffer)` | `deals/{dealId}.status` | `db.runTransaction` with status guard | WIRED | offer.status check + both offerRef and dealRef updated atomically |
| `src/data/repositories/DealRepository.js` | deals collection | `onSnapshot` subscription | WIRED | onSnapshot on buyerId query and sellerId query |
| `src/core/di/container.js` | DealRepository, OfferRepository | container singleton | WIRED | getDealRepository() and getOfferRepository() registered |
| `src/app/(main)/messages/[conversationId]/page.jsx` | `/deals/new?conversationId=...&productId=...` | Link component | WIRED | Lines 184-191: Initiate Deal link with href, Handshake icon |
| `src/presentation/hooks/deal/useCreateDeal.js` | `functions/index.js (createDeal)` | `httpsCallable` | WIRED | httpsCallable(functions, 'createDeal') |
| `src/presentation/hooks/deal/useDeals.js` | DealRepository.subscribeToDeals | DI container | WIRED | container.getDealRepository().subscribeToDeals(user.uid, ...) |
| `src/presentation/hooks/deal/useDeal.js` | deals/{dealId} + offers | subscribeToDeal + subscribeToOffers | WIRED | Both subscriptions active in parallel |
| `useDealActions.submitCounterOffer` | `functions/index.js (submitCounterOffer)` | `httpsCallable` with `{ dealId, offer, expectedRound }` | WIRED | Client line 47: `fn({ dealId, offer: offerData, expectedRound })`; CF line 1078: `const { dealId, offer, expectedRound } = request.data` — key names match; gap closed by commit 687cd58 |
| `useDealActions.acceptOffer/rejectOffer/withdrawOffer` | `functions/index.js` | `httpsCallable` | WIRED | Correct parameter names `{ dealId, offerId }` match CF expectations |
| `functions/index.js (onDealOfferCreated)` | `users/{uid}/notifications` | Firestore write | WIRED | db.collection('users').doc(recipientId).collection('notifications').add(...) |
| `functions/index.js (onDealOfferCreated)` | FCM messaging | `messaging.send` with smart suppression | WIRED | viewingDealId check before messaging.send |
| `functions/index.js (onDealOfferCreated)` | Resend API | `resend.emails.send` | WIRED | sendDealEmail() called with recipient email |
| `functions/index.js (checkExpiredOffers)` | deals/offers collectionGroup | collectionGroup query on status+expiresAt | WIRED | db.collectionGroup('offers').where('status', '==', OFFER_STATUS.OPEN).where('expiresAt', '<=', now) |
| `firestore.rules (offers subcollection)` | deals/{dealId} parent document | `get()` call | WIRED | Lines 260-261: get(/databases/$(database)/documents/deals/$(dealId)).data.buyerId |
| `MessageThread.jsx` | `/deals/[dealId]` | Link using message.dealLink | WIRED | Line 183: `<Link href={message.dealLink}>` |
| `NotificationListener.jsx` | `/deals/[dealId]` | `window.location.href` on deal_event click | WIRED | Lines 86, 100, 123-125: deal_event branch navigates via clickUrl |

---

### Requirements Coverage

| Requirement | Source Plans | Description | Status | Evidence |
|-------------|-------------|-------------|--------|---------|
| NEGO-01 | 02-01, 02-02, 02-03, 02-07 | Buyer and seller can exchange offers and counter-offers on a deal | SATISFIED | createDeal, submitCounterOffer (wire key now fixed), acceptOffer, rejectOffer all wired; full round-trip unblocked |
| NEGO-02 | 02-01, 02-02, 02-05 | Offers include Incoterms 2020 selection | SATISFIED | All 11 INCOTERMS_2020 in constants + IncotermsSelector + offerSchema validation + CF stores incoterm field |
| NEGO-03 | 02-01, 02-03 | Offer history timeline shows all rounds with timestamps, amounts, and terms | SATISFIED | OfferTimeline renders all offers ordered by round; OfferCard shows estimatedTotal, timestamps, all terms; changed fields highlighted via previousOffer diff |
| NEGO-04 | 02-01, 02-02, 02-03, 02-06 | Real-time updates via Firestore listeners — no page refresh needed | SATISFIED | subscribeToDeals (My Deals), subscribeToDeal + subscribeToOffers (Deal page) all use onSnapshot |
| NEGO-05 | 02-04, 02-06 | In-app and email notification when counter-offer received | SATISFIED (code) | onDealOfferCreated fires on every new offer; writes Firestore notification; sends FCM with smart suppression; sends Resend email; NotificationListener and SW handle deal_event |
| NEGO-06 | 02-01 | Offer state machine enforces valid transitions | SATISFIED | All CFs enforce deal.status=negotiating, offer.status=open, currentTurnUid=uid guards inside runTransaction |
| NEGO-07 | 02-01 | All deal state transitions use atomic Firestore transactions | SATISFIED | createDeal, submitCounterOffer, acceptOffer, rejectOffer, withdrawOffer, renewOffer all use db.runTransaction |

All 7 requirements marked complete in REQUIREMENTS.md (lines 21-27, 122-128).

---

### Anti-Patterns Found

None. The sole blocker anti-pattern from the initial verification (useDealActions.js line 47 parameter name mismatch) is resolved. No new anti-patterns introduced by plan 02-07 (single-character key rename in one file only).

---

### Human Verification Required

#### 1. Member User Permissions — Deal Read Access

**Test:** Log in as a member user (not admin). Navigate to /deals. Click a deal card.
**Expected:** /deals and /deals/[dealId] load without "Missing or insufficient permissions" errors. The offer timeline is visible.
**Why human:** Firestore rules are evaluated at runtime by the Firebase security rules engine. The code change (plan 05) uses `get()` correctly, but confirmation requires a live member auth session. Cannot verify security rule evaluation from code inspection alone.

#### 2. Counter-Offer Round-Trip

**Test:** As Party B, submit a counter-offer modifying price. As Party A, observe the deal page without refreshing.
**Expected:** Party A's offer timeline shows Round 2 card with Party B's modified price highlighted as a changed field (yellow highlight + old value strikethrough).
**Why human:** Requires two authenticated sessions. The offerData/offer mismatch is now fixed so this runtime test is fully unblocked.

#### 3. FCM Push Notification Delivery

**Test:** With RESEND_API_KEY configured and two users with valid FCM tokens, create a deal as User A and observe User B's device.
**Expected:** User B receives a push notification titled "New Deal" (not "New Message"). Tapping it opens /deals/[dealId].
**Why human:** FCM push delivery requires real device tokens and a deployed Cloud Function environment. Cannot verify notification receipt from code.

#### 4. Concurrent State Mutation (Atomicity Proof)

**Test:** Simultaneously have Party A accept an offer and Party B submit a counter-offer on the same deal, timed to arrive within milliseconds of each other.
**Expected:** Exactly one operation succeeds. The other receives a failed-precondition HttpsError. Deal data shows only one terminal state with no corruption.
**Why human:** Race condition requires controlled concurrent HTTP requests. Firestore transaction semantics guarantee this by design but operational confirmation via load test is the standard practice.

---

### Gaps Summary

No automated gaps remain. The one gap from the initial verification (SC-2 counter-offer parameter name mismatch) is closed:

- **Fixed:** `useDealActions.js` line 47 changed from `fn({ dealId, offerData, expectedRound })` to `fn({ dealId, offer: offerData, expectedRound })` by plan 02-07 commit `687cd58`.
- **Effect:** The CF guard `if (!dealId || !offer)` at functions/index.js line 1082 now receives a valid offer object instead of `undefined`, allowing counter-offer transactions to proceed.
- **No regressions** in any of the 5 previously-verified plan closures (02-01 through 02-06).

All 4 human verification items are runtime/concurrency/delivery concerns that cannot be verified from code inspection. Phase 02 automated goal achievement is complete.

---

_Verified: 2026-02-23T04:45:00Z_
_Verifier: Claude (gsd-verifier)_
_Re-verification after: plan 02-07 (gap closure)_
