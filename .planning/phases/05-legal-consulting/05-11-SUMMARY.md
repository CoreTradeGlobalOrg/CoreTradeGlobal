---
phase: 05-legal-consulting
plan: 11
subsystem: ui
tags: [firebase, cloud-functions, legal, contract, approval]

# Dependency graph
requires:
  - phase: 05-legal-consulting
    provides: "Legal channel 3-panel UI, useLegalChannel, useLegalActions, submitLawyerReview CF from plans 09-10"
provides:
  - "approveLegalDraft Cloud Function that copies approved draft to deal.legalContract"
  - "Approve & Apply to Deal button in ContractTab (client-only, active engagement)"
  - "Approved draft badge (green CheckCircle) for already-approved drafts"
  - "draft_approved notification event type in getLegalEventTitle/getLegalEventBody"
affects: [phase-06, phase-07]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "onCall CF copies subcollection data to parent doc (draft -> deal.legalContract)"
    - "Client-only action gated by !isLawyer && !isReadOnly && !latestDraft.approvedAt"

key-files:
  created: []
  modified:
    - functions/index.js
    - src/presentation/hooks/legal/useLegalActions.js
    - src/presentation/components/features/legal/LegalChannel/ChannelRight.jsx
    - src/presentation/components/features/legal/LegalChannel/LegalChannel.jsx

key-decisions:
  - "approveLegalDraft CF reads engagement + specific draft, writes to deal.legalContract, marks draft approvedAt, posts system message, notifies lawyer"
  - "Approve button hidden once approvedAt is set on the draft — prevents double approval"
  - "approveLoading reuses existing actionLoading from useLegalActions — no new loading state needed"

patterns-established:
  - "Approve button pattern: !isLawyer && !isReadOnly && !item.approvedAt controls visibility"
  - "Approved badge pattern: item.approvedAt && <badge> replaces action button after approval"

requirements-completed: [LEGAL-03, LEGAL-06]

# Metrics
duration: 15min
completed: 2026-03-18
---

# Phase 05 Plan 11: Approve Draft Flow Summary

**approveLegalDraft CF + Approve & Apply to Deal button in ContractTab wires client draft approval to deal.legalContract**

## Performance

- **Duration:** ~15 min
- **Started:** 2026-03-18T12:00:00Z
- **Completed:** 2026-03-18T12:15:00Z
- **Tasks:** 1 of 2 complete (Task 2 is human-verify checkpoint)
- **Files modified:** 4

## Accomplishments
- Created `approveLegalDraft` onCall Cloud Function with full permission/status guards
- Added `draft_approved` event type to both notification title and body maps
- Added `approveDraft` action method to `useLegalActions.js` following existing patterns
- Wired approve button and approved badge through ChannelRight -> ContractTab
- Build passes with no errors

## Task Commits

Each task was committed atomically:

1. **Task 1: Build approveLegalDraft CF and client-side approve flow** - `8ad012f` (feat)

**Plan metadata:** pending final commit after Task 2 checkpoint

## Files Created/Modified
- `functions/index.js` - Added approveLegalDraft CF + draft_approved notification event
- `src/presentation/hooks/legal/useLegalActions.js` - Added approveDraft method
- `src/presentation/components/features/legal/LegalChannel/ChannelRight.jsx` - Added Check icon import, onApproveDraft/approveLoading props, Approve button and approved badge in ContractTab
- `src/presentation/components/features/legal/LegalChannel/LegalChannel.jsx` - Destructured approveDraft from hook, added handleApproveDraft handler, passed to ChannelRight

## Decisions Made
- `approveLegalDraft` CF reads the specific draftId (not "latest") to avoid race conditions where a new draft is uploaded between the client seeing the UI and clicking approve
- Approved drafts show a green "Approved & applied to deal" badge instead of the button — visual confirmation without re-approval risk
- `approveLoading` reuses the existing `actionLoading` from `useLegalActions` — consistent with how `reviewLoading` is handled in ChannelCenter

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Task 2 checkpoint: Deploy Cloud Functions to production (`firebase deploy --only functions`) and E2E verify all 4 UAT gaps are resolved
- Once Task 2 checkpoint is cleared, Phase 05 is complete and Phase 06/07 can begin

---
*Phase: 05-legal-consulting*
*Completed: 2026-03-18*
