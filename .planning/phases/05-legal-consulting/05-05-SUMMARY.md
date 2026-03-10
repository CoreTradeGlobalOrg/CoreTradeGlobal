---
phase: 05-legal-consulting
plan: 05
subsystem: ui
tags: [react, next-js, tailwind, lucide-react, firestore, date-fns, legal-channel, real-time]

# Dependency graph
requires:
  - phase: 05-legal-consulting-01
    provides: LegalEngagementRepository (subscribeToEngagement, subscribeToContractDrafts, subscribeToRiskItems, addContractDraft, addRiskItem, updateRiskItem, getMaxDraftVersion), LegalMessageRepository (subscribeToMessages, sendMessage, uploadAttachment, uploadDraftFile), LegalEngagement entity, LegalMessage entity, QUICK_ACTIONS, LEGAL_MESSAGE_TYPE, RISK_SEVERITY, RISK_STATUS, ALLOWED_LEGAL_FILE_TYPES constants
  - phase: 05-legal-consulting-04
    provides: useLegalEngagement hook, useLegalActions hook (closeLegalEngagement), LegalBanner (engagement.id for channel subscription), /lawyer/dashboard
provides:
  - /deals/[dealId]/legal route with auth guard, member/lawyer access paths, pending/no-engagement/access-denied states
  - useLegalMessages hook — real-time message subscription + sendMessage + uploadAndSendAttachment with file type validation
  - useLegalChannel hook — orchestrates contract drafts + risk items subscriptions + uploadDraft (auto-version) + addRisk + toggleRiskStatus
  - LegalChannel 3-panel layout component (responsive, mobile-toggleable panels, encrypted badge, engagement status header)
  - ChannelLeft — collapsible sections: lawyer profile, deal info, documents (attachments + drafts merged, date sorted), consulting status with close button
  - ChannelCenter — 4-message-type rendering (text/attachment/system/quick_action), date separators, 5-min grouping, auto-scroll to bottom, file attachment, read-only mode
  - QuickActionToolbar — role-filtered buttons (client vs lawyer), inline risk form popup, draft file picker
  - ChannelRight — 3-tab panel: Contract (latest draft with download/upload), Revisions (version timeline), Risks (cards with severity, CRUD, toggle status)
affects: []

# Tech tracking
tech-stack:
  added: []
  patterns:
    - date-fns format/isSameDay/differenceInMinutes used for message date separators and grouping
    - useRef for textarea auto-resize and file input triggers (avoiding controlled inputs for file pickers)
    - Nested subscription pattern with closure flags (draftsLoaded/risksLoaded) to gate loading state until both subscriptions fire
    - Role-filtered action rendering pattern (roleKey === 'lawyer' | 'client' filter on QUICK_ACTIONS constant)

key-files:
  created:
    - src/app/(main)/deals/[dealId]/legal/page.jsx
    - src/presentation/hooks/legal/useLegalMessages.js
    - src/presentation/hooks/legal/useLegalChannel.js
    - src/presentation/components/features/legal/LegalChannel/LegalChannel.jsx
    - src/presentation/components/features/legal/LegalChannel/ChannelLeft.jsx
    - src/presentation/components/features/legal/LegalChannel/ChannelCenter.jsx
    - src/presentation/components/features/legal/LegalChannel/ChannelRight.jsx
    - src/presentation/components/features/legal/LegalChannel/QuickActionToolbar.jsx
  modified: []

key-decisions:
  - "useLegalChannel uses closure flags (draftsLoaded/risksLoaded) to set loading=false only when both parallel subscriptions have fired — prevents UI flickering from partial data"
  - "QuickActionToolbar inline risk form uses an absolute-positioned overlay above the toolbar — keeps the form contextual without a modal, avoids layout shift in the center panel"
  - "LegalChannel page uses subscribeToEngagementsForLawyer (filtered by dealId) for lawyers vs subscribeToEngagementForDeal for clients — different query paths since lawyers don't have a deterministic clientId-based engagement ID"
  - "ChannelRight Revisions tab sorts drafts descending by version for timeline display — most recent at top, latest badge on first entry"
  - "useLegalMessages sends attachment content as 'Attached: {filename}' — provides meaningful message content for any plain-text fallback while attachments array carries the real data"

patterns-established:
  - "useLegalMessages/useLegalChannel follow the exact useEffect+cleanup pattern of useLegalEngagement from Plan 04 — container.getRepo().subscribe(..., callback); return () => unsub()"
  - "Role-aware rendering: isLawyer boolean prop propagated from page.jsx through LegalChannel to all panels — single source of truth from engagement.isLawyer(uid)"
  - "isReadOnly propagated from engagement.isCompleted() — all panels/toolbar/inputs check this flag to suppress write UI"

requirements-completed: [LEGAL-03, LEGAL-04, LEGAL-05, LEGAL-06, LEGAL-07]

# Metrics
duration: 7min
completed: 2026-03-10
---

# Phase 05 Plan 05: Legal Channel UI Summary

**3-panel legal channel at /deals/[dealId]/legal: encrypted private chat, contract draft versioning with version history timeline, risk analysis CRUD, and role-aware quick-action toolbar for both lawyer and client**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-10T15:13:30Z
- **Completed:** 2026-03-10T15:20:30Z
- **Tasks:** 2
- **Files modified:** 8 (all created, none modified)

## Accomplishments

- Built complete 3-panel legal channel at `/deals/[dealId]/legal` with auth guard, separate member/lawyer engagement lookup paths, and states for pending/no-engagement/access-denied
- Created `useLegalMessages` and `useLegalChannel` hooks following existing Phase 04 subscription patterns — real-time Firestore subscriptions with proper cleanup, send/upload actions, and auto-versioning for contract drafts
- Built full-featured `ChannelCenter` with 4 message type rendering (text chat bubbles, attachment cards with download, system messages, quick-action messages), date separators, 5-minute sender grouping, auto-scroll, and textarea auto-resize
- Built `ChannelRight` with Contract/Revisions/Risks tab panel — Contract shows latest draft with download + upload new; Revisions shows version history timeline; Risks shows severity-badged cards with inline add form and toggle resolved/open
- Built `QuickActionToolbar` filtering QUICK_ACTIONS by role (client sees 4 actions, lawyer sees 4 different actions) with inline risk form popup and draft file picker integration
- Built `ChannelLeft` with collapsible sections for lawyer profile, deal info (product/parties/Incoterms/price/status), merged documents list (attachments from messages + contract drafts sorted by date), and consulting status with close engagement button

## Task Commits

Each task was committed atomically:

1. **Task 1: Create legal channel route, hooks, 3-panel layout shell, and ChannelLeft** - `d4dbdc7` (feat)
2. **Task 2: Create ChannelCenter, ChannelRight, and QuickActionToolbar** - `8f2c28f` (feat)

**Plan metadata:** (committed separately)

## Files Created/Modified

- `src/app/(main)/deals/[dealId]/legal/page.jsx` - Route with auth guard, member/lawyer engagement lookup, pending/no-engagement/access-denied states
- `src/presentation/hooks/legal/useLegalMessages.js` - Real-time message subscription + sendMessage + uploadAndSendAttachment (file type validated)
- `src/presentation/hooks/legal/useLegalChannel.js` - Orchestrates contract drafts + risk items subscriptions + uploadDraft (auto-version) + addRisk + toggleRiskStatus
- `src/presentation/components/features/legal/LegalChannel/LegalChannel.jsx` - 3-panel responsive layout with mobile panel toggles, header with encrypted badge + status + close action
- `src/presentation/components/features/legal/LegalChannel/ChannelLeft.jsx` - Collapsible lawyer profile, deal info, merged documents list, consulting status
- `src/presentation/components/features/legal/LegalChannel/ChannelCenter.jsx` - Chat with 4 message types, date separators, 5-min grouping, auto-scroll, file attachment input
- `src/presentation/components/features/legal/LegalChannel/ChannelRight.jsx` - 3-tab panel: Contract (latest draft), Revisions (version timeline), Risks (severity cards + CRUD)
- `src/presentation/components/features/legal/LegalChannel/QuickActionToolbar.jsx` - Role-filtered quick actions with inline risk form and draft file picker

## Decisions Made

- **useLegalChannel dual-subscription loading gate**: Using closure flags `draftsLoaded` and `risksLoaded` that both must be true before setting `loading=false`. Prevents UI from showing a fully-loaded state while one subscription is still pending.
- **Lawyer engagement lookup via subscribeToEngagementsForLawyer + dealId filter**: Lawyers don't have a deterministic engagement ID (unlike clients whose ID is `dealId_clientId`). The lawyer query returns all their engagements and filters by `dealId` client-side.
- **QuickActionToolbar risk form as absolute overlay**: The inline form pops up above the toolbar in an absolute-positioned container, keeping form interaction close to the action button without disrupting the chat layout below.
- **ChannelLeft documents list merges attachments from messages and contract drafts**: Users get a unified view of all legal documents in one scrollable panel — attachments sent in chat appear alongside formal contract drafts, all sorted by date descending.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None. `npx next build` compiled successfully on the first pass after both tasks were complete.

## User Setup Required

None - no external service configuration required. The legal channel reads/writes Firestore via the security rules and repositories established in Plan 01.

## Next Phase Readiness

- Legal channel UI is fully functional at `/deals/[dealId]/legal`
- The `LegalBanner` on `DealPage` (Plan 04) already links to this route via `Open Channel` and `View Channel` buttons
- Phase 05 is now complete (all 5 plans done)
- Phase 06 (Shipment Tracking) or Phase 07 (Platform Hardening) can begin

## Self-Check: PASSED

- FOUND: src/app/(main)/deals/[dealId]/legal/page.jsx
- FOUND: src/presentation/hooks/legal/useLegalMessages.js
- FOUND: src/presentation/hooks/legal/useLegalChannel.js
- FOUND: src/presentation/components/features/legal/LegalChannel/LegalChannel.jsx
- FOUND: src/presentation/components/features/legal/LegalChannel/ChannelLeft.jsx
- FOUND: src/presentation/components/features/legal/LegalChannel/ChannelCenter.jsx
- FOUND: src/presentation/components/features/legal/LegalChannel/ChannelRight.jsx
- FOUND: src/presentation/components/features/legal/LegalChannel/QuickActionToolbar.jsx
- FOUND commit: d4dbdc7
- FOUND commit: 8f2c28f

---
*Phase: 05-legal-consulting*
*Completed: 2026-03-10*
