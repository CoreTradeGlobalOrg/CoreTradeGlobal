---
phase: quick-3
plan: 01
type: quick-task
subsystem: provider-portal
tags: [routing, navigation, deep-link, provider, kanban]
dependency_graph:
  requires: [Phase 04 complete]
  provides: [/provider/quotes/[requestId] route, useQuoteRequest hook, subscribeToRequest method]
  affects: [ProviderDashboard, RequestKanbanCard, QuoteDetailView]
tech_stack:
  added: []
  patterns: [Next.js app router dynamic route, React.use(params) for async params]
key_files:
  created:
    - src/app/(main)/provider/quotes/[requestId]/page.jsx
    - src/presentation/hooks/quote/useQuoteRequest.js
  modified:
    - src/data/repositories/QuoteRequestRepository.js
    - src/presentation/components/features/provider/ProviderDashboard/ProviderDashboard.jsx
    - src/presentation/components/features/provider/RequestKanbanCard/RequestKanbanCard.jsx
decisions:
  - "useQuoteRequest hook sets error state on null doc (not found) after loading — explicit 'Quote request not found' message"
  - "React.use(params) used in QuoteDetailContent for async params unwrapping per Next.js app router convention"
  - "ProviderDashboard providerUid prop retained in signature — not used directly after refactor but left for future extensibility"
metrics:
  duration: "5 minutes"
  completed: "2026-03-06T15:12:40Z"
  tasks_completed: 2
  files_changed: 5
---

# Quick Task 3: Separate Provider Quote Detail into Its Own Route — Summary

**One-liner:** Extracted QuoteDetailView from ProviderDashboard's inline conditional render into a dedicated `/provider/quotes/[requestId]` URL route with real-time data loading, enabling deep linking and proper browser back navigation.

## What Was Built

### Task 1: Repository method + hook

- `QuoteRequestRepository.subscribeToRequest(requestId, callback)` — single-document `onSnapshot` on `quoteRequests/{requestId}` using `doc()` reference. Calls `callback(null)` when document does not exist.
- `useQuoteRequest(requestId)` hook — subscribes via the repository, returns `{ request, loading, error }`. Sets `error: 'Quote request not found'` when the document is absent.

### Task 2: Route and navigation cleanup

- **New page** `src/app/(main)/provider/quotes/[requestId]/page.jsx`:
  - Auth guard: redirects to `/login?redirect=/provider/quotes/${requestId}` if unauthenticated
  - Role guard: redirects to `/forbidden` if not INSURANCE_PROVIDER, LOGISTICS_PROVIDER, or ADMIN
  - Calls `useQuoteRequest(requestId)` and `useQuoteForRequest(requestId, uid)`
  - Derives `providerType` from `user.role`
  - Renders `DetailSkeleton` during loading, `RequestNotFound` on error, `QuoteDetailView` on success
  - `onBack` navigates to `/provider/dashboard` via `router.push`

- **ProviderDashboard cleaned up**:
  - Removed: `useState`, `selectedRequest` state, `QuoteDetailWithExistingQuote` component, `QuoteDetailView` import, `useQuoteForRequest` import, `if (selectedRequest)` conditional render block
  - Dashboard now always renders the kanban board unconditionally

- **RequestKanbanCard updated**:
  - Removed `onClick` prop
  - Added `useRouter` import
  - Card button `onClick` now calls `router.push('/provider/quotes/${request.id}')` directly

## Verification

- `npx next build` passes cleanly
- `/provider/quotes/[requestId]` registered as `ƒ (Dynamic)` route in build output
- ProviderDashboard: no conditional render — always shows kanban
- Kanban card click: URL changes to `/provider/quotes/{requestId}`
- Back button on detail view: navigates to `/provider/dashboard`
- Browser back button: works via native browser history
- Direct URL access: loads correctly (deep link works)

## Deviations from Plan

None — plan executed exactly as written.

## Commits

| Hash | Message |
|------|---------|
| b0c9e4c | feat(quick-3): add subscribeToRequest to QuoteRequestRepository and useQuoteRequest hook |
| 1d0d858 | feat(quick-3): extract QuoteDetailView to dedicated /provider/quotes/[requestId] route |

## Self-Check

- [x] `src/app/(main)/provider/quotes/[requestId]/page.jsx` — FOUND
- [x] `src/presentation/hooks/quote/useQuoteRequest.js` — FOUND
- [x] `QuoteRequestRepository.subscribeToRequest` — FOUND in repository file
- [x] Commit b0c9e4c — FOUND
- [x] Commit 1d0d858 — FOUND
- [x] Build passes (Dynamic route registered in build output)

## Self-Check: PASSED
