---
phase: 06-trade-summary-shipment-tracking
plan: 03
subsystem: provider-dashboard
tags: [shipment-tracking, logistics, insurance, provider-ux, firebase-functions]
dependency_graph:
  requires: [06-01]
  provides: [provider-shipment-update-ux, insurance-coverage-confirmation]
  affects: [provider/dashboard, ActiveShipmentsTab, InsuranceCoverageTab]
tech_stack:
  added: [date-fns/formatDistanceToNow]
  patterns: [httpsCallable-action-hook, real-time-multi-subscription, forward-only-status-form, embedded-component-prop]
key_files:
  created:
    - src/presentation/hooks/provider/useActiveShipments.js
    - src/presentation/components/features/provider/ShipmentUpdateForm.jsx
    - src/presentation/components/features/provider/ActiveShipmentsTab.jsx
    - src/presentation/components/features/provider/InsuranceCoverageTab.jsx
  modified:
    - src/app/(main)/provider/dashboard/page.jsx
    - src/presentation/components/features/provider/ProviderDashboard/ProviderDashboard.jsx
decisions:
  - "[06-03]: useActiveShipments queries both logistics and insurance types via normalizeProviderType — handles both short-form ('logistics') and role-form ('logistics_provider') inputs"
  - "[06-03]: subscribeForQuoteRequest uses qr.id as map key (not dealId) — avoids collision if same deal has multiple requests"
  - "[06-03]: flushShipments pattern drains mutable ref map to React state — same pattern as useQuotesForDeal quotesMapRef"
  - "[06-03]: ProviderDashboard embedded prop separates inline-tab render from standalone full-page render — no duplicate <main> wrapper"
  - "[06-03]: InsuranceCoverageTab checks shipmentUpdates for COVERAGE_ACTIVE to determine idempotent button state — real-time via tracking subscription"
metrics:
  duration: 5 min
  completed_date: "2026-03-29"
  tasks_completed: 2
  files_created: 4
  files_modified: 2
---

# Phase 6 Plan 03: Provider Shipment Update UX Summary

**One-liner:** Logistics providers submit shipment status updates and insurance providers confirm coverage via httpsCallable-backed hooks wired into a tabbed provider dashboard.

## What Was Built

### Task 1: useActiveShipments hook and ShipmentUpdateForm

**useActiveShipments.js** — Multi-subscription hook for providers:
- Queries `quoteRequests` where `providerUid == uid`, `status == 'selected'`, `providerType == normalizedType`
- For each result, subscribes to the parent `deals/{dealId}` doc and `shipmentTracking` subcollection
- Mutable ref pattern (`shipmentsMapRef`) batches concurrent snapshot updates into a single React state flush (same as `useQuotesForDeal`)
- Returns `submitUpdate` (logistics) and `confirmCoverage` (insurance) — both delegate to Cloud Functions via `httpsCallable` with loading state and toast on success/error

**ShipmentUpdateForm.jsx** — Status progression form:
- Status dropdown shows logistics-only statuses (COVERAGE_ACTIVE excluded)
- Forward-only: options at or before current status are disabled
- Container number and tracking ref required on first update (transitioning to PICKED_UP or beyond for the first time)
- ETA date picker, optional note textarea
- Dark theme consistent with provider dashboard

### Task 2: ActiveShipmentsTab, InsuranceCoverageTab, and provider dashboard integration

**ActiveShipmentsTab.jsx** — Logistics provider view:
- Delivery stats bar (in-transit count, delivered-this-month count computed from shipments list)
- Each deal card shows product name, buyer→seller names, current status badge, container number, tracking ref, ETA countdown via `date-fns/formatDistanceToNow`
- Expand/collapse to reveal `ShipmentUpdateForm`
- Loading skeleton, empty state with truck icon

**InsuranceCoverageTab.jsx** — Insurance provider view:
- Each deal card shows product name, buyer→seller, deal status
- "Confirm Coverage" button calls `confirmCoverage(dealId)` with loading spinner
- After confirmation (shipmentUpdates includes COVERAGE_ACTIVE entry), button changes to "Coverage Active" (green checkmark, disabled) — idempotent
- Loading skeleton, empty state with shield icon

**Provider dashboard page.jsx** — Tab integration:
- "Quote Requests" tab (default) and "Active Shipments" tab
- Insurance providers see InsuranceCoverageTab; logistics providers see ActiveShipmentsTab
- Tab state is local (no URL param needed for this use case)

**ProviderDashboard.jsx** — Embedded prop:
- `embedded=true` renders just the kanban grid with subtitle (no duplicate `<main>`, header, or provider badge)
- Legacy `embedded=false` (default) preserves existing standalone full-page layout

## Verification

- `npx next build` passes cleanly (no errors, no new warnings introduced)

## Deviations from Plan

### Auto-fixed Issues

None — plan executed exactly as written with one minor enhancement:

**Enhancement: Insurance providers also get shipmentTracking subscription**
The plan only mentioned logistics providers subscribe to the shipmentTracking subcollection. However, the InsuranceCoverageTab needs to check for COVERAGE_ACTIVE entries in shipmentUpdates to determine the idempotent button state. Both provider types now subscribe to shipmentTracking to support this real-time check.

## Self-Check: PASSED

Files confirmed:
- src/presentation/hooks/provider/useActiveShipments.js — exists
- src/presentation/components/features/provider/ShipmentUpdateForm.jsx — exists
- src/presentation/components/features/provider/ActiveShipmentsTab.jsx — exists
- src/presentation/components/features/provider/InsuranceCoverageTab.jsx — exists
- src/app/(main)/provider/dashboard/page.jsx — modified
- src/presentation/components/features/provider/ProviderDashboard/ProviderDashboard.jsx — modified

Commits:
- e96f606 — feat(06-03): add useActiveShipments hook and ShipmentUpdateForm
- b697188 — feat(06-03): add ActiveShipmentsTab, InsuranceCoverageTab, and dashboard tabs
