---
phase: 05-legal-consulting
plan: 09
subsystem: ui
tags: [legal, firebase, firestore, nextjs, notifications]

# Dependency graph
requires:
  - phase: 05-legal-consulting
    provides: Legal channel page, LegalEngagementRepository, Cloud Function legal notification system
provides:
  - Role-aware pending engagement gate (lawyer redirected to /lawyer/dashboard, client sees waiting screen)
  - hire_request notification link now points to /lawyer/dashboard
  - Real-time risk items subscription with includeMetadataChanges for rapid addition consistency
affects: [05-legal-consulting, UAT, Phase 05 gap closure]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Role-aware gate pattern: check role before rendering role-specific UI state, redirect via router.replace"
    - "includeMetadataChanges: true on onSnapshot for collections with serverTimestamp() on rapid writes"

key-files:
  created: []
  modified:
    - src/app/(main)/deals/[dealId]/legal/page.jsx
    - src/data/repositories/LegalEngagementRepository.js
    - functions/index.js

key-decisions:
  - "Lawyer redirect uses router.replace (not push) to prevent back-button loop to pending screen"
  - "Brief 'Redirecting to dashboard...' state shown while redirect triggers — avoids blank flash"
  - "includeMetadataChanges fires callback on both local optimistic write and server confirmation — solves rapid risk item gap without any data model change"
  - "hire_request notification link is conditionally /lawyer/dashboard — all other legal event links remain /deals/{dealId}/legal"

patterns-established:
  - "Role-aware page gates: isLawyerRole branch before rendering role-specific states"
  - "Rapid write subscriptions: includeMetadataChanges: true when subcollection uses serverTimestamp() and items may be added in bursts"

requirements-completed: [LEGAL-04, LEGAL-06]

# Metrics
duration: 2min
completed: 2026-03-18
---

# Phase 05 Plan 09: UAT Gap Closure — Lawyer Redirect and Risk Items Real-time Fix Summary

**Role-aware pending gate that redirects lawyers to /lawyer/dashboard and reliable real-time risk subscription using includeMetadataChanges for rapid additions**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-18T11:46:21Z
- **Completed:** 2026-03-18T11:47:51Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Lawyer navigating to /deals/{dealId}/legal with a pending engagement now gets router.replace('/lawyer/dashboard') instead of seeing the client-facing "Awaiting Lawyer Acceptance" screen
- hire_request notification link now correctly sends the lawyer to /lawyer/dashboard where accept/decline buttons exist
- subscribeToRiskItems now passes { includeMetadataChanges: true } to onSnapshot, ensuring all rapidly-added risk items appear in real-time even before server timestamps resolve

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix pending engagement gate for lawyer role and notification link** - `4195a25` (fix)
2. **Task 2: Fix risk items real-time subscription for rapid additions** - `28ccde2` (fix)

**Plan metadata:** (docs commit follows)

## Files Created/Modified

- `src/app/(main)/deals/[dealId]/legal/page.jsx` - Added isLawyerRole branch in isPending() gate; lawyer path uses router.replace('/lawyer/dashboard') with redirect state; client path unchanged
- `src/data/repositories/LegalEngagementRepository.js` - Added { includeMetadataChanges: true } as second argument to onSnapshot in subscribeToRiskItems
- `functions/index.js` - Changed hardcoded link in sendLegalNotification to conditional: hire_request -> /lawyer/dashboard, all others -> /deals/${dealId}/legal

## Decisions Made

- `router.replace` chosen over `router.push` for lawyer redirect to prevent back-button loop returning to the pending screen
- `includeMetadataChanges: true` is the correct Firebase pattern for optimistic-write subscriptions — fires once for local write (hasPendingWrites: true) and again on server confirmation with resolved timestamps and correct ordering

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- UAT gap closure plan 09 complete — two UAT issues (tests 4 and 8) are resolved
- Build passes with no errors
- No blockers for remaining phase work

---
*Phase: 05-legal-consulting*
*Completed: 2026-03-18*
