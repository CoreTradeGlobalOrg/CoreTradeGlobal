---
phase: 02-deal-creation-and-negotiation-s1
plan: "02"
subsystem: ui-layer
tags: [react, next-js, firebase, cloud-functions, incoterms, un-locode, real-time]
dependency_graph:
  requires:
    - 02-01 (Deal entities, DealRepository, OfferRepository, Cloud Functions, offerSchema, DI container)
  provides:
    - "Initiate Deal" button in product-based chat conversations
    - Deal creation page (/deals/new) with pre-fill from product
    - DealForm with all 12 offer fields and Incoterms + named place UX
    - IncotermsSelector (11 pills with tooltips)
    - NamedPlaceInput (UN/LOCODE autocomplete via API route)
    - My Deals page (/deals) with real-time Firestore subscription
    - DealCard with status, turn indicator, latest offer summary
    - DealList grid layout
    - useCreateDeal and useDeals hooks
    - /api/locode/search API route (server-side LOCODE search)
  affects:
    - src/app/(main)/messages/[conversationId]/page.jsx (Initiate Deal button added)
    - src/presentation/components/homepage/Navbar/Navbar.jsx (My Deals link added)
tech_stack:
  added:
    - "@geoapify/un-locode@1.0.3 (server-side UN/LOCODE dataset, Node.js fs)"
  patterns:
    - react-hook-form + Zod resolver (offerSchema) for DealForm validation
    - Controller wrapper for IncotermsSelector and NamedPlaceInput (uncontrolled → controlled)
    - useEffect auto-set insurance preference on incoterm change (watch → setValue)
    - Next.js API route for server-side Node.js library access (fs-dependent locode)
    - Suspense boundary for useSearchParams in /deals/new page
    - Two-parallel onSnapshot merge pattern (useDeals → DealRepository.subscribeToDeals)
    - Debounced fetch for NamedPlaceInput autocomplete (200ms)
key_files:
  created:
    - src/presentation/hooks/deal/useCreateDeal.js
    - src/presentation/hooks/deal/useDeals.js
    - src/app/(main)/deals/new/page.jsx
    - src/app/(main)/deals/page.jsx
    - src/app/api/locode/search/route.js
    - src/presentation/components/features/deal/DealForm/DealForm.jsx
    - src/presentation/components/features/deal/IncotermsSelector/IncotermsSelector.jsx
    - src/presentation/components/features/deal/NamedPlaceInput/NamedPlaceInput.jsx
    - src/presentation/components/features/deal/DealCard/DealCard.jsx
    - src/presentation/components/features/deal/DealList/DealList.jsx
  modified:
    - src/app/(main)/messages/[conversationId]/page.jsx (Initiate Deal button)
    - src/presentation/components/homepage/Navbar/Navbar.jsx (My Deals link)
decisions:
  - "NamedPlaceInput uses /api/locode/search Next.js API route for UN/LOCODE lookup — @geoapify/un-locode uses Node.js fs and cannot run client-side; API route is the correct architecture boundary"
  - "Suspense boundary required around useSearchParams in /deals/new — Next.js app router requires this for static rendering compatibility"
  - "IncotermsSelector uses CSS group-hover tooltips (no JS tooltip state) — simpler, no extra library, keyboard-accessible via title attribute"
  - "Insurance preference auto-set via useEffect watching selectedIncoterm — updates only when user changes Incoterm, can still be manually overridden"
  - "DealCard turn indicator shows pulsing green dot for 'Your turn' — immediate visual cue without heavy notification UI"
metrics:
  duration: "~20 min"
  completed: "2026-02-22"
  tasks_completed: 2
  files_created: 10
  files_modified: 2
---

# Phase 2 Plan 2: Deal Creation and Negotiation UI Summary

**One-liner:** Deal creation flow (chat Initiate Deal button → /deals/new pre-filled offer form with 11 Incoterms pills + UN/LOCODE autocomplete via API route) and My Deals real-time list page with tab filtering and color-coded status cards.

## What Was Built

### Task 1: Initiate Deal Button + Deal Creation Page + Full Offer Form

**`src/app/(main)/messages/[conversationId]/page.jsx`** — Added "Initiate Deal" Link button to the conversation header:
- Visible only when `conversation.metadata?.productId && conversation.type === 'direct'`
- Links to `/deals/new?conversationId=...&productId=...`
- Uses Lucide `Handshake` icon with "Initiate Deal" label (hidden on mobile)
- Styled as outline gold button matching the existing conversation header design

**`src/presentation/hooks/deal/useCreateDeal.js`** — Hook for calling the `createDeal` Cloud Function:
- Returns `{ createDeal, loading, error }`
- Calls `httpsCallable(functions, 'createDeal')` with `{ conversationId, productId, initialOffer }`
- On success, calls `router.push('/deals/${dealId}')` for navigation

**`src/app/(main)/deals/new/page.jsx`** — Deal creation page:
- Splits into `NewDealContent` (uses `useSearchParams`) + `NewDealPage` (Suspense wrapper) — required by Next.js app router
- Auth-protected; redirects to login with return URL
- Fetches product + conversation from DI container in parallel (`Promise.all`)
- Validates required query params (`conversationId`, `productId`); shows error state if missing
- Shows product image/name + other party's company name in header card
- Renders `<DealForm>` pre-filled from product data

**`src/presentation/components/features/deal/DealForm/DealForm.jsx`** — Full offer form:
- `react-hook-form` with `zodResolver(offerSchema)` for all 12 fields
- Live estimated total (price × quantity) displayed in a gold callout box
- Conditional conversion rate field (shown only when offer currency ≠ product base currency)
- Named place input disabled until Incoterm is selected (with helper text)
- Insurance preference auto-sets via `useEffect` watching `selectedIncoterm` (uses `getIncotermByCode().insuranceDefault`)
- Explanatory notes for CIF/CIP insurance obligations
- Character counter for notes textarea (max 2000)
- Hour/day display for expiry field

**`src/presentation/components/features/deal/IncotermsSelector/IncotermsSelector.jsx`** — 11 Incoterm pills:
- Imports all 11 entries from `INCOTERMS_2020` constants
- Selected pill: gold fill + glow shadow; unselected: outline, hover to gold
- Tooltip on hover via CSS `group-hover` (no JS state needed) — shows full label + description + arrow
- Controlled component: `value` prop + `onChange(code)` callback
- Shows selected label below pill grid

**`src/presentation/components/features/deal/NamedPlaceInput/NamedPlaceInput.jsx`** — UN/LOCODE autocomplete:
- Debounced (200ms) fetch to `/api/locode/search?q=...`
- Dropdown with up to 10 results — keyboard navigable (ArrowUp/Down, Enter, Escape)
- Label and placeholder change dynamically based on `incoterm` prop (`namedPlaceLabel`, `namedPlacePlaceholder`)
- Allows freeform text (no forced selection) — graceful fallback on API failure
- Outside-click closes dropdown

**`src/app/api/locode/search/route.js`** — Server-side UN/LOCODE search:
- Reads per-country JSON files from `@geoapify/un-locode/dist/json-data/`
- In-memory cache per country (Map) to avoid re-reading on every request
- Iterates all country files, searches by `nameWoDiacritics` OR location code — stops at 10 results
- Returns array of `{ code, name, country, location, label }` objects

### Task 2: My Deals List Page with Real-time Updates

**`src/presentation/hooks/deal/useDeals.js`** — Real-time deals subscription:
- Gets `user.uid` from `useAuth()`
- Calls `DealRepository.subscribeToDeals(uid, callback)` which runs two parallel `onSnapshot` listeners (buyer + seller queries)
- Stores unsubscribe function in `useRef` — cleans up on unmount and on uid change
- Returns `{ deals, loading, error }`

**`src/app/(main)/deals/page.jsx`** — My Deals page:
- Auth-protected; redirects to login
- Loading skeleton (4 gray placeholder cards) while `dealsLoading`
- Tab filter: All / Active (negotiating) / Completed (accepted/rejected/expired/withdrawn)
- Active badge count on the "Active" tab button
- Empty state varies by tab: "All" shows link to Messages; filtered tabs show contextual message
- Uses `<DealList>` for the grid

**`src/presentation/components/features/deal/DealList/DealList.jsx`** — Simple list wrapper:
- Responsive grid: `grid-cols-1 md:grid-cols-2`
- Maps deals array to `<DealCard>` components

**`src/presentation/components/features/deal/DealCard/DealCard.jsx`** — Deal card:
- Product image (or gold Package icon fallback)
- Status badge with color coding:
  - negotiating → green, accepted → blue, rejected → red, expired/withdrawn → gray
- Latest offer snapshot: total price, unit price × quantity, Incoterm code
- Turn indicator: pulsing green dot + "Your turn" OR "Waiting for [role]..."
- Relative timestamp (Xm/Xh/Xd ago)
- Hover: gold border + right arrow reveal
- Keyboard accessible (tabIndex, Enter key handler)

**`src/presentation/components/homepage/Navbar/Navbar.jsx`** — Added My Deals nav link:
- Inserted after RFQs in `NAV_LINKS` array
- `roles: [ROLES.MEMBER, ROLES.ADMIN]` — hidden for guests, providers, lawyers

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Added Suspense boundary around useSearchParams in /deals/new**
- **Found during:** Task 1 (build output)
- **Issue:** Next.js app router requires `useSearchParams()` to be wrapped in a Suspense boundary for static rendering. Build failed with "useSearchParams() should be wrapped in a suspense boundary at page /deals/new".
- **Fix:** Split the page into `NewDealContent` (inner, uses `useSearchParams`) and `NewDealPage` (outer default export, wraps with `<Suspense fallback={<LoadingFallback />}>`).
- **Files modified:** `src/app/(main)/deals/new/page.jsx`
- **Commit:** f1c128b

**2. [Rule 2 - Missing] UN/LOCODE via API route instead of direct client import**
- **Found during:** Task 1 (planning NamedPlaceInput)
- **Issue:** `@geoapify/un-locode` uses Node.js `fs` to read CSV/JSON files at runtime — it cannot run in the browser. The plan said "Import UN/LOCODE dataset and filter as user types" which implies client-side bundling, but that's not possible with this package.
- **Fix:** Created `/api/locode/search` Next.js API route that runs the LOCODE search server-side. NamedPlaceInput fetches from this route with debounced requests. Falls back to freeform text on failure.
- **Files created:** `src/app/api/locode/search/route.js`
- **Commit:** f1c128b

## Self-Check: PASSED
