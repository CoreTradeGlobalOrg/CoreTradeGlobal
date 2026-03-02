---
phase: 04-provider-portals-and-insurance-logistics-quotes-s3
plan: "03"
subsystem: provider-portal-ui
tags: [provider, kanban, quote-forms, real-time, react-hook-form, zod]
dependency_graph:
  requires: [04-01, 04-02]
  provides: [provider-dashboard-route, kanban-ui, insurance-quote-form, logistics-quote-form, quote-hooks]
  affects: [04-04, buyer-quotes-comparison]
tech_stack:
  added: []
  patterns: [react-hook-form-zod, real-time-subscription, kanban-layout, server-redirect]
key_files:
  created:
    - src/presentation/hooks/quote/useQuoteRequests.js
    - src/presentation/hooks/quote/useQuoteActions.js
    - src/app/(main)/provider/dashboard/page.jsx
    - src/presentation/components/features/provider/ProviderDashboard/ProviderDashboard.jsx
    - src/presentation/components/features/provider/RequestKanbanCard/RequestKanbanCard.jsx
    - src/presentation/components/features/provider/QuoteDetailView/QuoteDetailView.jsx
    - src/presentation/components/features/provider/QuoteFormInsurance/QuoteFormInsurance.jsx
    - src/presentation/components/features/provider/QuoteFormLogistics/QuoteFormLogistics.jsx
  modified:
    - src/app/(main)/provider/page.jsx
    - src/presentation/components/homepage/Navbar/Navbar.jsx
    - src/presentation/components/features/quote/QuotesPage/QuotesPage.jsx
decisions:
  - "[04-03]: useQuoteActions uses separate loading/error state per hook instance — each QuoteDetailView gets independent loading state"
  - "[04-03]: QuoteDetailView imports useQuoteActions internally — removes prop-drilling and simplifies ProviderDashboard"
  - "[04-03]: ProviderDashboard handles selectedRequest state internally — single state owner for kanban-to-detail navigation"
  - "[04-03]: QuotesPage placeholder added to fix empty scaffold — prevents build failure until Plan 04-04 implements it"
metrics:
  duration_minutes: 5
  completed_date: "2026-03-02"
  tasks_completed: 2
  files_created: 10
  files_modified: 3
---

# Phase 4 Plan 03: Provider Portal UI Summary

**One-liner:** Kanban dashboard at /provider/dashboard with 4-column request grouping, type-specific quote forms (insurance/logistics) using react-hook-form + zod, and real-time Firestore subscriptions.

## Tasks Completed

| # | Task | Commit | Status |
|---|------|--------|--------|
| 1 | Provider hooks and route setup | 75972ca | Done |
| 2 | Provider dashboard kanban, kanban cards, and quote forms | 59a3114 | Done |

## What Was Built

### Task 1: Provider Hooks and Route Setup

**useQuoteRequests.js** (`src/presentation/hooks/quote/useQuoteRequests.js`)
- Real-time Firestore subscription via `QuoteRequestRepository.subscribeToRequestsForProvider`
- Follows `useDeals.js` pattern with `useRef` cleanup on unmount
- `useMemo` computes kanban columns from `request.getKanbanColumn()` entity method
- Returns `{ requests, columns, loading, error }`

**useQuoteActions.js** (`src/presentation/hooks/quote/useQuoteActions.js`)
- Follows `useDealActions.js` pattern exactly
- 5 Cloud Function wrappers: `submitQuote`, `acceptQuote`, `declineRequest`, `withdrawQuote`, `confirmSelection`
- `acceptQuote` handles `functions/failed-precondition` (expired quote) with specific user message
- All actions use `toast.success/error` for immediate feedback

**Provider dashboard route** (`src/app/(main)/provider/dashboard/page.jsx`)
- `'use client'` with `Suspense` boundary (Next.js app router pattern)
- Auth guard: redirect to `/login?redirect=/provider/dashboard` if not authenticated
- Role guard: redirect to `/forbidden` if not `insurance_provider`, `logistics_provider`, or `admin`
- Passes `user.uid` to `useQuoteRequests` and derived `providerType` to `ProviderDashboard`

**Provider redirect** (`src/app/(main)/provider/page.jsx`)
- Replaced placeholder with server-side `redirect('/provider/dashboard')` via `next/navigation`

**Navbar update** (`src/presentation/components/homepage/Navbar/Navbar.jsx`)
- Changed `href: '/provider'` to `href: '/provider/dashboard'` for provider nav link

### Task 2: Kanban Dashboard and Quote Forms

**ProviderDashboard.jsx** (`src/presentation/components/features/provider/ProviderDashboard/ProviderDashboard.jsx`)
- 4-column responsive grid (1 col mobile → 2 col tablet → 4 col desktop)
- Column headers: New Requests (yellow dot), Quoted (blue dot), Declined (gray dot), Selected (green dot) with count badges
- Loading state: skeleton cards per column
- Empty state: dashed border placeholder per column
- Provider type badge in header (orange for insurance, green for logistics)
- `selectedRequest` state toggles between kanban view and `QuoteDetailView`

**RequestKanbanCard.jsx** (`src/presentation/components/features/provider/RequestKanbanCard/RequestKanbanCard.jsx`)
- Displays: product name (truncated), origin/named place with MapPin icon, quantity + unit, Incoterm badge pill
- `CountdownTimer` reused for deadline display
- Status badge: color-coded per `QUOTE_REQUEST_STATUS` enum
- Provider type icon: Shield (insurance) or Truck (logistics)
- Hover: `border-blue-500/30` transition with dark theme card

**QuoteDetailView.jsx** (`src/presentation/components/features/provider/QuoteDetailView/QuoteDetailView.jsx`)
- Two-column layout: `grid-cols-1 lg:grid-cols-2 gap-6` (stacks on mobile)
- Left: Deal info panel with `InfoRow` components — product name, quantity, incoterm, payment terms, delivery deadline, currency
- Price fields (price per unit + estimated total) only rendered when `isInsurance` — logistics `dealSnapshot` has no price field by server-side design
- Deadline countdown for quote submission
- Decline button (pending status only), Withdraw button (quoted + active quote only)
- Right: Renders `QuoteFormInsurance` or `QuoteFormLogistics` based on `providerType`
- `useQuoteActions` imported internally (no prop drilling from parent)

**QuoteFormInsurance.jsx** (`src/presentation/components/features/provider/QuoteFormInsurance/QuoteFormInsurance.jsx`)
- `react-hook-form` + `zod` validation (83 lines schema + form)
- Fields: ICC coverage type (radio group with descriptions from `ICC_COVERAGE`), war/strikes clause checkboxes, premium amount, coverage amount, deductible %, claims payment days, policy start/end dates (with cross-field validation), coverage scope select, certificate type (optional), currency, quote validity, notes
- Edit mode: pre-fills all fields from `existingQuote` (dates converted from Date objects to ISO strings)
- Button: "Submit Quote" or "Update Quote" based on edit mode
- Orange accent color (insurance brand)

**QuoteFormLogistics.jsx** (`src/presentation/components/features/provider/QuoteFormLogistics/QuoteFormLogistics.jsx`)
- `react-hook-form` + `zod` validation
- Fields: transport mode select, container type (conditionally shown via `useWatch` when mode === 'sea'), freight cost, currency, estimated transit days, loading date, estimated arrival (cross-field validation), quote validity, capability tags (multi-checkbox grid from `CAPABILITY_TAGS`), notes
- Edit mode: pre-fills from `existingQuote`
- Button: "Submit Quote" or "Update Quote"
- Green accent color (logistics brand)

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Fixed empty QuotesPage.jsx scaffold**
- **Found during:** Task 2 build verification
- **Issue:** `src/presentation/components/features/quote/QuotesPage/QuotesPage.jsx` was a 1-line empty file. The route `src/app/(main)/deals/[dealId]/quotes/page.jsx` (from an earlier plan's scaffold) imports `QuotesPage` as a named export — this caused `npm run build` to fail with "Export QuotesPage doesn't exist in target module"
- **Fix:** Added a minimal placeholder `QuotesPage` component with a named export. The file clearly documents it's a placeholder for Plan 04-04
- **Files modified:** `src/presentation/components/features/quote/QuotesPage/QuotesPage.jsx`
- **Commit:** 59a3114

### Design Decisions During Implementation

**QuoteDetailView imports useQuoteActions internally (not via prop)**
- Plan suggested passing `onSubmit` callback from parent; implementation imports `useQuoteActions` directly in `QuoteDetailView`
- Rationale: Removes prop-drilling through `ProviderDashboard` → `QuoteDetailView` → `QuoteFormInsurance/Logistics` chain; each detail view has its own loading state which is cleaner

## Verification

- [x] `npm run build` passes
- [x] `/provider` redirects to `/provider/dashboard` (server-side redirect)
- [x] Navbar link updated from `/provider` to `/provider/dashboard`
- [x] `useQuoteRequests` subscribes in real-time, groups into 4 kanban columns
- [x] `useQuoteActions` wraps all 5 Cloud Functions with loading/error/toast
- [x] `/provider/dashboard` route has auth + role guards
- [x] ProviderDashboard shows 4 kanban columns with correct status grouping
- [x] RequestKanbanCard shows product, route, quantity, incoterm, countdown, status badge
- [x] QuoteDetailView side-by-side layout with price shown only for insurance
- [x] QuoteFormInsurance has all required fields with zod validation (ICC coverage, premium, coverage, validity)
- [x] QuoteFormLogistics has conditional container type for sea freight, capability tags, zod validation
- [x] Both forms support edit mode pre-fill from existingQuote

## Self-Check: PASSED

Files verified present:
- FOUND: src/presentation/hooks/quote/useQuoteRequests.js
- FOUND: src/presentation/hooks/quote/useQuoteActions.js
- FOUND: src/app/(main)/provider/dashboard/page.jsx
- FOUND: src/presentation/components/features/provider/ProviderDashboard/ProviderDashboard.jsx
- FOUND: src/presentation/components/features/provider/RequestKanbanCard/RequestKanbanCard.jsx
- FOUND: src/presentation/components/features/provider/QuoteDetailView/QuoteDetailView.jsx
- FOUND: src/presentation/components/features/provider/QuoteFormInsurance/QuoteFormInsurance.jsx
- FOUND: src/presentation/components/features/provider/QuoteFormLogistics/QuoteFormLogistics.jsx

Commits verified:
- FOUND: 75972ca (feat(04-03): provider hooks and route setup)
- FOUND: 59a3114 (feat(04-03): provider kanban dashboard and quote forms)

Build: PASSED (npm run build completed successfully, /provider and /provider/dashboard routes visible in output)
