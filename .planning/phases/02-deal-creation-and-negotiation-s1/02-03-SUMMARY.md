---
phase: 02-deal-creation-and-negotiation-s1
plan: "03"
subsystem: negotiation-ui
tags: [deal, negotiation, real-time, firestore, onSnapshot, hooks, components, presence, web-audio]
dependency_graph:
  requires:
    - 02-01 (DEALS + OFFERS data model, DealRepository, OfferRepository, Cloud Functions)
    - 02-02 (IncotermsSelector, NamedPlaceInput, DealForm reused in CounterOfferForm)
  provides:
    - Deal negotiation page at /deals/[dealId]
    - OfferTimeline with buyer (green) / seller (gold) / system (dashed) cards
    - CounterOfferForm with turn-based visibility and pre-fill from latest offer
    - DealSidebar with party info, progress tracker, current offer summary
    - CountdownTimer with color-coded urgency thresholds
    - useDeal hook with dual onSnapshot subscriptions + Web Audio notification chime
    - useDealActions hook wrapping 4 Cloud Functions (submit/accept/reject/withdraw)
    - useDealPresence hook with Firestore heartbeat presence detection
  affects:
    - src/app/(main)/deals/[dealId]/page.jsx
    - src/presentation/components/features/deal/** (8 new components)
    - src/presentation/hooks/deal/useDeal.js
    - src/presentation/hooks/deal/useDealActions.js
    - src/presentation/hooks/deal/useDealPresence.js
tech_stack:
  added: []
  patterns:
    - Dual onSnapshot subscriptions (deal doc + offers subcollection) mirroring MessagesContext
    - Web Audio API two-tone chime (no external file) for offer notifications
    - Firestore heartbeat presence (30s interval + viewingDealSince timestamp)
    - 60-second staleness window for presence stale detection (avoids browser crash false positives)
    - react-hook-form + zodResolver(offerSchema) for counter-offer form validation
    - Changed-field diff highlighting (compare each offer to previous round)
    - Collapse toggle for >4 offers (show last 3, "Show earlier offers (N)" toggle)
    - Confirmation step before destructive actions (accept/reject/withdraw)
key_files:
  created:
    - src/presentation/hooks/deal/useDeal.js
    - src/presentation/hooks/deal/useDealActions.js
    - src/presentation/hooks/deal/useDealPresence.js
    - src/app/(main)/deals/[dealId]/page.jsx
    - src/presentation/components/features/deal/DealPage/DealPage.jsx
    - src/presentation/components/features/deal/ProductHero/ProductHero.jsx
    - src/presentation/components/features/deal/OfferTimeline/OfferTimeline.jsx
    - src/presentation/components/features/deal/OfferCard/OfferCard.jsx
    - src/presentation/components/features/deal/CounterOfferForm/CounterOfferForm.jsx
    - src/presentation/components/features/deal/DealSidebar/DealSidebar.jsx
    - src/presentation/components/features/deal/CountdownTimer/CountdownTimer.jsx
  modified: []
decisions:
  - "Web Audio API used for notification chime instead of external .mp3 file — zero deployment friction, no asset management, works in all modern browsers, respects autoplay policy via try/catch"
  - "Changed-field highlighting uses yellow highlight background + old-value strikethrough + arrow indicator — clearly shows what changed between rounds without overwhelming the card"
  - "Confirmation step before accept/reject/withdraw — inline confirmation within card avoids accidental destructive actions (deal cannot be undone)"
  - "Offer collapse threshold set at 4 with last 3 visible — matches plan spec (>4 offers = collapse, show last 3 expanded)"
  - "useDealPresence writes viewingDealId + viewingDealSince per 02-RESEARCH.md Pattern 7 — staleness window 60s handles browser crash edge case (Pitfall 4)"
  - "DealSidebar fetches both party user docs via UserRepository.getById — lazy fetch on mount, not real-time subscription (party names rarely change during negotiation)"
  - "CounterOfferForm reuses IncotermsSelector + NamedPlaceInput from Plan 02-02 — consistent UX with deal creation form"
metrics:
  duration: "10 min (562 seconds)"
  completed: "2026-02-22"
  tasks_completed: 2
  files_created: 11
  files_modified: 0
---

# Phase 2 Plan 3: Deal Negotiation Page Summary

**One-liner:** Complete deal negotiation page at /deals/[dealId] with real-time offer timeline (buyer=green/seller=gold/system=dashed cards), turn-based counter-offer form, party sidebar, countdown timer, Web Audio chime on new offers, and Firestore heartbeat presence detection.

## What Was Built

### Task 1: Deal Page Layout with Offer Timeline, Counter-Offer Form, Sidebar, and Countdown Timer

**`src/presentation/hooks/deal/useDeal.js`** — Dual onSnapshot subscriptions following MessagesContext pattern:
- `dealRepository.subscribeToDeal(dealId, ...)` + `offerRepository.subscribeToOffers(dealId, ...)` running in parallel
- Tracks previous offer IDs via `useRef` to detect new offers from the other party
- Web Audio API two-tone chime (A5 + E5 oscillators, 0.15s gap, gentle fade-out) plays when new offer arrives from other party while tab is visible
- First-load flag prevents chime on initial subscription

**`src/presentation/hooks/deal/useDealActions.js`** — 4 Cloud Function actions via `httpsCallable`:
- `submitCounterOffer(dealId, offerData, expectedRound)` — includes `expectedRound` for stale write prevention
- `acceptOffer(dealId, offerId)`, `rejectOffer(dealId, offerId)`, `withdrawOffer(dealId, offerId)`
- Each action: setLoading(true) → CF call → toast.success/toast.error → setLoading(false)

**`src/app/(main)/deals/[dealId]/page.jsx`** — Route page:
- Auth guard: `useEffect` redirect to `/login` if not authenticated
- Participant check: if `deal.buyerId !== uid && deal.sellerId !== uid` → "Access Denied" screen
- 404 handling: when deal loaded (not loading, no error) but null
- Loading skeleton with full layout shimmer
- Passes `currentUserUid` to `useDeal` for notification sound exclusion

**`src/presentation/components/features/deal/DealPage/DealPage.jsx`** — Layout orchestrator:
- Two-column desktop (flex-1 main + w-80/96 sidebar), single-column mobile via flex-col
- Terminal state banner (green=accepted, red=rejected, gray=expired/withdrawn) shown when deal closed
- Hides CounterOfferForm when `isTerminal`
- Shows `CountdownTimer` only when `latestOffer.expiresAt` exists and deal is not terminal

**`src/presentation/components/features/deal/ProductHero/ProductHero.jsx`** — Compact product context:
- Product image (or Package icon fallback), name, category badge
- Full card and chevron are links to `/product/${productId}`

**`src/presentation/components/features/deal/OfferTimeline/OfferTimeline.jsx`** — Chronological offer cards:
- Collapse: if `offers.length > 4`, shows last 3 expanded; earlier collapsed behind "Show earlier offers (N)" toggle
- System cards: "Deal Initiated" at the top with `createdAt` timestamp
- Terminal state card: rendered after last offer when deal is closed (accepted/rejected/expired/withdrawn)
- Connector lines (`w-px h-3`) between consecutive visible cards

**`src/presentation/components/features/deal/OfferCard/OfferCard.jsx`** — Single offer card:
- Color accent: `role === 'buyer'` → emerald/green; `role === 'seller'` → yellow/gold; system cards → dashed neutral
- Changed field highlighting: compares each field to `previousOffer`; changed fields show yellow background + strikethrough old value + `→` arrow + new value in bold yellow
- Estimated total shown prominently at top of card body
- Action buttons: accept/reject for `currentTurnUid === currentUserUid && isLatest && status === 'open'`; withdraw for `offer.submittedBy === currentUserUid && isLatest && status === 'open'`
- Confirmation step: clicking action sets `confirmAction` state → shows inline confirm/cancel

**`src/presentation/components/features/deal/CounterOfferForm/CounterOfferForm.jsx`** — Turn-based form:
- Visibility: `deal.status === 'negotiating' && deal.currentTurnUid === currentUserUid` → shows form; otherwise shows waiting message with `Clock` icon and "Waiting for [Party]..." + last offer timestamp
- Pre-fills all fields from `latestOffer` via `useForm({ defaultValues: ... })`
- Reuses `<IncotermsSelector>` and `<NamedPlaceInput>` from Plan 02-02
- Auto-sets `insurancePreference` when incoterm changes (via `useEffect` + `setValue`)
- Zod validation via `zodResolver(offerSchema)` + `react-hook-form`
- Submit: `actions.submitCounterOffer(deal.id, data, deal.round)` with loading spinner

**`src/presentation/components/features/deal/DealSidebar/DealSidebar.jsx`** — Three sections:
1. **Party Info Cards**: Fetches buyer + seller user docs via `UserRepository.getById` on mount. Shows company name, country, member since year, verified badge. Highlights current user's card in gold.
2. **Progress Tracker**: Vertical step indicator with filled circle (active=gold, past=emerald, future=gray). Steps: Negotiation → Agreement → Quotes → Tracking. "Negotiation" step is active; others are upcoming.
3. **Current Offer Summary**: Price × qty = total, Incoterm, namedPlace, payment terms, round number. Live "whose turn" indicator with pulsing dot.

**`src/presentation/components/features/deal/CountdownTimer/CountdownTimer.jsx`** — Live countdown:
- `setInterval` every 1 second, cleared on unmount
- Color thresholds: `remaining < 1h` → red, `remaining < 4h` → yellow, otherwise → emerald green
- Format: `Xd Xh Xm Xs` if ≥ 24h, `Xh Xm Xs` if < 24h
- Expired: shows red "Expired" badge

### Task 2: Online Presence Indicator and Notification Sound

**`src/presentation/hooks/deal/useDealPresence.js`** — Firestore heartbeat presence:
- On mount: `updateDoc(users/{uid}, { viewingDealId: dealId, viewingDealSince: serverTimestamp() })`
- Heartbeat: `setInterval` every 30 seconds refreshes `viewingDealSince`
- Cleanup: `updateDoc(users/{uid}, { viewingDealId: null, viewingDealSince: null })` on unmount
- Other party subscription: `onSnapshot` on `users/{otherUid}` to detect `viewingDealId === dealId`
- Staleness check: `viewingDealSince.toMillis() > Date.now() - 60000` (60s window handles browser crash)
- Returns `{ otherPartyViewing: boolean }`

**Notification sound** (in `useDeal.js`):
- `playNotificationChime()` uses Web Audio API: two oscillators (A5 at t=0, E5 at t+0.15s)
- Amplitude fade using `exponentialRampToValueAtTime` to avoid audio click
- Guards: `document.hidden` check, `try/catch` for autoplay policy rejection
- AudioContext closed after 600ms to avoid resource leak
- Only plays for offers NOT submitted by `currentUserUid` (excludes own offers)

**DealSidebar presence display**: `{otherPartyViewing && <green dot + "[Name] is viewing">}` shown at top of sidebar (only when true — no "offline" state shown).

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Reuse existing] CounterOfferForm uses existing IncotermsSelector + NamedPlaceInput**
- **Found during:** Task 1 (CounterOfferForm implementation)
- **Issue:** Plan said to "reuse `<IncotermsSelector>` and `<NamedPlaceInput>` from Plan 02" — these existed from Plan 02-02 commits
- **Fix:** Imported from `../IncotermsSelector/IncotermsSelector` and `../NamedPlaceInput/NamedPlaceInput`; fixed prop signature: `NamedPlaceInput` expects full incoterm object (not code string) and `error` as boolean
- **Files modified:** CounterOfferForm.jsx
- **Commit:** f1c128b (part of 02-02 implementation)

**2. [Rule 3 - Blocking] Removed duplicate `currentUid` variable in route page**
- **Found during:** Task 1 (deal page route)
- **Issue:** Variable declared twice after refactoring auth guard
- **Fix:** Removed duplicate declaration
- **Files modified:** src/app/(main)/deals/[dealId]/page.jsx
- **Commit:** f1c128b

**3. [Rule 1 - Bug] Removed unused `Loader2` import from route page**
- **Found during:** Task 1 (deal page route)
- **Issue:** `Loader2` imported but not used (skeleton uses CSS animation)
- **Fix:** Removed from import statement
- **Files modified:** src/app/(main)/deals/[dealId]/page.jsx
- **Commit:** f1c128b

**4. [Rule 1 - Bug] Removed `TrendingRight` non-existent icon from DealSidebar**
- **Found during:** Task 1 (DealSidebar implementation)
- **Issue:** `TrendingRight` is not a valid lucide-react icon export
- **Fix:** Removed from imports
- **Files modified:** DealSidebar.jsx
- **Commit:** f1c128b

## Note on Prior Plan Overlap

The `f1c128b` commit (Plan 02-02: Initiate Deal form) included ahead-of-schedule stubs for the deal negotiation page components. When Plan 02-03 executed, these files on disk matched the implementations Plan 02-03 generated. The `useDealPresence.js` hook was the only new file requiring a dedicated Plan 02-03 commit (`2f13123`).

## Self-Check: PASSED

All 11 files confirmed present on disk:
- src/presentation/hooks/deal/useDeal.js — FOUND
- src/presentation/hooks/deal/useDealActions.js — FOUND
- src/presentation/hooks/deal/useDealPresence.js — FOUND
- src/app/(main)/deals/[dealId]/page.jsx — FOUND
- src/presentation/components/features/deal/DealPage/DealPage.jsx — FOUND
- src/presentation/components/features/deal/ProductHero/ProductHero.jsx — FOUND
- src/presentation/components/features/deal/OfferTimeline/OfferTimeline.jsx — FOUND
- src/presentation/components/features/deal/OfferCard/OfferCard.jsx — FOUND
- src/presentation/components/features/deal/CounterOfferForm/CounterOfferForm.jsx — FOUND
- src/presentation/components/features/deal/DealSidebar/DealSidebar.jsx — FOUND
- src/presentation/components/features/deal/CountdownTimer/CountdownTimer.jsx — FOUND

Relevant commits confirmed in git history:
- f1c128b: feat(02-02) — contained all Task 1 files
- 2f13123: feat(02-03): useDealPresence hook — Task 2 dedicated commit
