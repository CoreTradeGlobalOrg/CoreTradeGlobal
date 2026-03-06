---
phase: quick-3
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - src/data/repositories/QuoteRequestRepository.js
  - src/presentation/hooks/quote/useQuoteRequest.js
  - src/app/(main)/provider/quotes/[requestId]/page.jsx
  - src/presentation/components/features/provider/ProviderDashboard/ProviderDashboard.jsx
  - src/presentation/components/features/provider/RequestKanbanCard/RequestKanbanCard.jsx
  - src/presentation/components/features/provider/QuoteDetailView/QuoteDetailView.jsx
autonomous: true
must_haves:
  truths:
    - "Clicking a kanban card navigates to /provider/quotes/{requestId} with URL change"
    - "Quote detail page loads the correct QuoteRequest by ID and renders QuoteDetailView"
    - "Back button on QuoteDetailView navigates to /provider/dashboard"
    - "Browser back button returns to /provider/dashboard"
    - "Provider dashboard always shows the kanban board (no conditional QuoteDetailView render)"
  artifacts:
    - path: "src/app/(main)/provider/quotes/[requestId]/page.jsx"
      provides: "New route page for individual quote request detail"
    - path: "src/presentation/hooks/quote/useQuoteRequest.js"
      provides: "Hook to subscribe to a single QuoteRequest by ID"
    - path: "src/data/repositories/QuoteRequestRepository.js"
      provides: "subscribeToRequest method for single doc subscription"
  key_links:
    - from: "RequestKanbanCard"
      to: "/provider/quotes/[requestId]"
      via: "router.push with request.id"
      pattern: "router\\.push.*provider/quotes"
    - from: "src/app/(main)/provider/quotes/[requestId]/page.jsx"
      to: "useQuoteRequest hook"
      via: "hook call with requestId from params"
      pattern: "useQuoteRequest\\(requestId"
    - from: "useQuoteRequest"
      to: "QuoteRequestRepository.subscribeToRequest"
      via: "container DI"
      pattern: "subscribeToRequest\\("
---

<objective>
Extract QuoteDetailView from ProviderDashboard's inline conditional render into its own route at `/provider/quotes/[requestId]`.

Purpose: Enable deep-linking to quote requests, proper browser back button behavior, and URL-based navigation instead of React state toggling.

Output: New route page, single-request subscription hook, cleaned-up ProviderDashboard that always shows kanban.
</objective>

<execution_context>
@/Users/wenubey/.claude/get-shit-done/workflows/execute-plan.md
@/Users/wenubey/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@src/data/repositories/QuoteRequestRepository.js
@src/presentation/hooks/quote/useQuoteRequests.js
@src/presentation/hooks/quote/useQuoteForRequest.js
@src/presentation/components/features/provider/ProviderDashboard/ProviderDashboard.jsx
@src/presentation/components/features/provider/QuoteDetailView/QuoteDetailView.jsx
@src/presentation/components/features/provider/RequestKanbanCard/RequestKanbanCard.jsx
@src/app/(main)/provider/dashboard/page.jsx
@src/domain/entities/QuoteRequest.js

<interfaces>
<!-- QuoteRequest is a top-level Firestore collection: quoteRequests/{requestId} -->
<!-- Firestore rules allow provider read: request.auth.uid == resource.data.providerUid -->
<!-- Single doc read via doc(db, 'quoteRequests', requestId) is rules-compliant for the assigned provider -->

From src/domain/entities/QuoteRequest.js:
```javascript
export class QuoteRequest {
  constructor(id, dealId, providerUid, providerType, dealSnapshot, buyerId, sellerId, status, deadline, createdAt, updatedAt)
  static fromFirestore(data) // Converts Firestore doc to QuoteRequest entity
  isPending() / isQuoted() / isDeclined() / isSelected() / isExpiredDeadline()
  getKanbanColumn() // returns 'newRequests'|'quoted'|'declined'|'selected'
}
```

From src/data/repositories/QuoteRequestRepository.js:
```javascript
export class QuoteRequestRepository {
  constructor(firestoreDataSource)
  subscribeToRequestsForProvider(providerUid, callback) // returns unsubscribe
  subscribeToRequestsForDeal(dealId, userId, callback) // returns unsubscribe
}
```

From src/presentation/hooks/quote/useQuoteForRequest.js:
```javascript
export function useQuoteForRequest(requestId, providerUid)
// returns { quote: Quote|null, loading: boolean }
```

From src/presentation/components/features/provider/QuoteDetailView/QuoteDetailView.jsx:
```javascript
export function QuoteDetailView({ request, providerType, onBack, existingQuote })
// request: QuoteRequest entity
// providerType: 'insurance'|'logistics'
// onBack: Function callback
// existingQuote: Quote|null
```

From src/core/constants/roles.js:
```javascript
ROLES.INSURANCE_PROVIDER, ROLES.LOGISTICS_PROVIDER, ROLES.ADMIN
```

From src/app/(main)/provider/dashboard/page.jsx:
```javascript
// Pattern: 'use client', useAuth() for auth/role guard, Suspense wrapper
// providerType derived from user.role
```
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add single-request repository method and useQuoteRequest hook</name>
  <files>
    src/data/repositories/QuoteRequestRepository.js,
    src/presentation/hooks/quote/useQuoteRequest.js
  </files>
  <action>
1. **QuoteRequestRepository.js** -- Add a `subscribeToRequest(requestId, callback)` method that subscribes to a single quoteRequests document by ID using `onSnapshot(doc(db, 'quoteRequests', requestId), ...)`. Convert the snapshot to a QuoteRequest entity via `QuoteRequest.fromFirestore({ id: snap.id, ...snap.data() })`. If the document does not exist (`!snap.exists()`), call `callback(null)`. Import `doc` from `firebase/firestore` (add to existing import). Follow the exact pattern of existing `subscribeToRequestsForProvider` for error handling and return-unsubscribe pattern.

2. **useQuoteRequest.js** (NEW FILE) -- Create a hook `useQuoteRequest(requestId)` that:
   - Uses `container.getQuoteRequestRepository().subscribeToRequest(requestId, callback)` to get a real-time QuoteRequest entity
   - Returns `{ request, loading, error }` where `request` is a `QuoteRequest|null`
   - Follows the exact pattern of `useQuoteForRequest.js`: useState for request/loading, useEffect with unsubscribeRef cleanup, guard on `!requestId`
   - Sets error state if subscription returns null (document not found) after loading completes -- set `error: 'Quote request not found'`
  </action>
  <verify>
    <automated>cd /Users/wenubey/Desktop/CTG/core-trade-global && npx next build 2>&1 | tail -5</automated>
  </verify>
  <done>QuoteRequestRepository has subscribeToRequest(requestId, callback) method. useQuoteRequest hook exports and returns { request, loading, error }.</done>
</task>

<task type="auto">
  <name>Task 2: Create quote detail route and update navigation flow</name>
  <files>
    src/app/(main)/provider/quotes/[requestId]/page.jsx,
    src/presentation/components/features/provider/ProviderDashboard/ProviderDashboard.jsx,
    src/presentation/components/features/provider/RequestKanbanCard/RequestKanbanCard.jsx,
    src/presentation/components/features/provider/QuoteDetailView/QuoteDetailView.jsx
  </files>
  <action>
1. **Create `/provider/quotes/[requestId]/page.jsx`** -- New route page following the exact pattern of `/provider/dashboard/page.jsx`:
   - `'use client'` with Suspense wrapper
   - Auth guard: redirect to `/login?redirect=/provider/quotes/${requestId}` if not authenticated
   - Role guard: redirect to `/forbidden` if user is not INSURANCE_PROVIDER, LOGISTICS_PROVIDER, or ADMIN
   - Extract `requestId` from `params` (Next.js dynamic route params -- use `React.use(params)` since this project uses Next.js app router with async params)
   - Call `useQuoteRequest(requestId)` to get the QuoteRequest entity
   - Call `useQuoteForRequest(requestId, user.uid)` to get the existing quote
   - Derive `providerType` from `user.role` (same logic as dashboard page: insurance_provider -> 'insurance', else 'logistics')
   - Render `<QuoteDetailView>` with `request`, `providerType`, `onBack={() => router.push('/provider/dashboard')}`, and `existingQuote`
   - Show loading skeleton while auth/request is loading
   - Show error state if request not found (request is null after loading)
   - Create a simple `DetailSkeleton` component (similar to DashboardSkeleton but single-column)

2. **Update ProviderDashboard.jsx** -- Remove ALL QuoteDetailView-related code:
   - Remove `useState` import (no longer needed -- if no other state, remove entirely; keep if other hooks use it)
   - Remove `selectedRequest` state
   - Remove `QuoteDetailWithExistingQuote` component entirely
   - Remove `QuoteDetailView` import
   - Remove `useQuoteForRequest` import
   - Remove the `if (selectedRequest)` conditional render block
   - The component now ALWAYS renders the kanban board
   - Keep the `onClick` prop on `RequestKanbanCard` but do NOT handle it here -- remove the `onClick={() => setSelectedRequest(request)}` (the card itself will handle navigation in step 3)

3. **Update RequestKanbanCard.jsx** -- Change from callback-based click to URL navigation:
   - Add `import { useRouter } from 'next/navigation'`
   - Inside the component, add `const router = useRouter()`
   - Remove the `onClick` prop from the component interface entirely
   - Change the button's `onClick` to: `onClick={() => router.push(\`/provider/quotes/${request.id}\`)}`
   - Update JSDoc to remove the `@param {Function} props.onClick` line

4. **Update ProviderDashboard.jsx (second pass)** -- Remove the `onClick` prop passed to `RequestKanbanCard`:
   - Change `<RequestKanbanCard key={request.id} request={request} onClick={() => setSelectedRequest(request)} />` to just `<RequestKanbanCard key={request.id} request={request} />`

5. **Update QuoteDetailView.jsx** -- Change `onBack` to use router navigation as default:
   - The `onBack` prop is still accepted (the route page passes `() => router.push('/provider/dashboard')`)
   - No structural changes needed to QuoteDetailView itself -- it already uses `onBack` as a callback
   - This is a no-op for QuoteDetailView; the behavior change comes from the caller passing router-based onBack
  </action>
  <verify>
    <automated>cd /Users/wenubey/Desktop/CTG/core-trade-global && npx next build 2>&1 | tail -20</automated>
  </verify>
  <done>
    - `/provider/quotes/[requestId]` route renders QuoteDetailView with real-time data
    - ProviderDashboard always shows kanban (no QuoteDetailView conditional)
    - RequestKanbanCard navigates via router.push (no onClick prop)
    - Back button on detail view navigates to /provider/dashboard
    - Build passes with no errors
  </done>
</task>

</tasks>

<verification>
1. `npx next build` completes without errors
2. Navigate to `/provider/dashboard` -- kanban always visible, no conditional render
3. Click a kanban card -- URL changes to `/provider/quotes/{requestId}`
4. Quote detail page loads with correct deal info and quote form
5. Click "Back to Dashboard" -- navigates to `/provider/dashboard`
6. Browser back button from quote detail returns to dashboard
7. Direct URL access to `/provider/quotes/{requestId}` loads correctly (deep link works)
</verification>

<success_criteria>
- QuoteDetailView renders at its own URL route, not inline in ProviderDashboard
- Browser back/forward navigation works correctly
- Deep linking to a specific quote request works
- All existing quote form functionality (submit, decline, withdraw) works from the new route
- Build passes cleanly
</success_criteria>

<output>
After completion, create `.planning/quick/3-separate-provider-quote-detail-into-its-/3-SUMMARY.md`
</output>
