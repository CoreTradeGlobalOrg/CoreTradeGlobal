---
phase: 13-messaging-and-communication-improvements
plan: 04
subsystem: ui
tags: [react, provider-dashboard, kanban, dynamic-labels]

# Dependency graph
requires: []
provides:
  - getTabs(providerType) function in provider/dashboard/page.jsx for dynamic tab labels
  - getColumns(providerType) function in ProviderDashboard.jsx for dynamic kanban column labels
affects: [provider-dashboard, insurance-provider, logistics-provider]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Provider-type-aware label functions: getTabs/getColumns return insurance or logistics labels based on providerType prop/derived value"
    - "columnDefs variable name avoids shadowing the data columns prop in ProviderDashboard"

key-files:
  created: []
  modified:
    - src/app/(main)/provider/dashboard/page.jsx
    - src/presentation/components/features/provider/ProviderDashboard/ProviderDashboard.jsx

key-decisions:
  - "getTabs and getColumns default to logistics labels for both logistics providers and admin (preserves existing admin behavior)"
  - "columnDefs used as variable name for label config inside ProviderDashboard to avoid shadowing the data columns prop"

patterns-established:
  - "Provider-type label functions: pure functions outside component returning config arrays keyed on providerType string"

requirements-completed: [MSG-09, MSG-10, MSG-11]

# Metrics
duration: 5min
completed: 2026-04-22
---

# Phase 13 Plan 04: Provider Dashboard Provider-Type Labels Summary

**Dynamic tab and kanban column labels in provider dashboard — insurance sees 'Insurance Requests'/'Active Policies'/'New Inquiries'/'Policy Active'; logistics/admin sees 'Logistics Requests'/'Active Shipments'/'New Requests'/'Shipment Active'**

## Performance

- **Duration:** 5 min
- **Started:** 2026-04-22T00:00:00Z
- **Completed:** 2026-04-22T00:05:00Z
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments

- Replaced static `TABS` constant with `getTabs(providerType)` function — insurance providers now see "Insurance Requests" and "Active Policies" tab labels
- Replaced static `COLUMNS` constant with `getColumns(providerType)` function — insurance kanban shows "New Inquiries" / "Policy Active"; logistics shows "New Requests" / "Shipment Active"
- Updated page subtitle to match provider type ("Manage your insurance requests and active policies" vs logistics equivalent)
- Admin falls through to logistics labels preserving existing behavior

## Task Commits

Each task was committed atomically:

1. **Task 1: Replace static TABS and COLUMNS with provider-type-aware functions** - `f29f7cc` (feat)

**Plan metadata:** (docs commit below)

## Files Created/Modified

- `src/app/(main)/provider/dashboard/page.jsx` - Added getTabs(providerType), derive tabs after providerType, dynamic subtitle, replaced TABS.map with tabs.map
- `src/presentation/components/features/provider/ProviderDashboard/ProviderDashboard.jsx` - Added getColumns(providerType), compute columnDefs inside component, replaced COLUMNS.map with columnDefs.map

## Decisions Made

- getTabs and getColumns both use an `if (providerType === 'insurance')` guard with logistics as the default — admin falls through to logistics which preserves existing behavior without an explicit admin branch
- Variable named `columnDefs` (not `columns_config`) to match the plan's preferred option and avoid shadowing the `columns` data prop

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Provider dashboard now shows domain-appropriate terminology per provider type
- Insurance and logistics providers have fully distinct label sets for tabs and kanban columns
- No blockers for subsequent phase 13 plans

---
*Phase: 13-messaging-and-communication-improvements*
*Completed: 2026-04-22*
