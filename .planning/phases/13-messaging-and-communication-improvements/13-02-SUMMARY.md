---
phase: 13-messaging-and-communication-improvements
plan: 02
subsystem: ui
tags: [messaging, notifications, next-navigation, usePathname, FAB]

# Dependency graph
requires:
  - phase: 13-messaging-and-communication-improvements
    provides: MessagesWidget FAB and NotificationCenterPage built in plan 01
provides:
  - FAB widget hidden on /messages and all sub-routes
  - Message notification routing is context-aware (inline on /messages, FAB on other pages)
affects: [13-messaging-and-communication-improvements]

# Tech tracking
tech-stack:
  added: []
  patterns: [usePathname-based conditional rendering for route-aware components]

key-files:
  created: []
  modified:
    - src/presentation/components/common/MessagesWidget/MessagesWidget.jsx
    - src/presentation/components/features/notifications/NotificationCenterPage/NotificationCenterPage.jsx
    - src/presentation/components/common/NotificationBell/NotificationBell.jsx

key-decisions:
  - "MessagesWidget early-returns null after isAuthenticated guard on pathname?.startsWith('/messages') — both button and panel hidden, not just the button"
  - "NotificationCenterPage uses router.push('/messages?conversation=ID') when on /messages to select conversation inline; falls back to /messages for other pages"
  - "NotificationBell applies same pathname-aware routing: openConversation() on other pages, router.push with query param on /messages"

patterns-established:
  - "Route-aware component rendering: usePathname early-return pattern for components that duplicate UI on specific routes"
  - "Pathname-aware action routing: check current pathname before deciding between FAB open vs page navigation"

requirements-completed: [MSG-04, MSG-05]

# Metrics
duration: 1min
completed: 2026-04-25
---

# Phase 13 Plan 02: Messaging Communication Improvements Summary

**FAB widget hidden on /messages routes and notification click routing made context-aware using usePathname across MessagesWidget, NotificationBell, and NotificationCenterPage**

## Performance

- **Duration:** 1 min
- **Started:** 2026-04-25T17:37:07Z
- **Completed:** 2026-04-25T17:37:35Z
- **Tasks:** 1
- **Files modified:** 3

## Accomplishments
- MessagesWidget no longer renders on /messages or /messages/* — eliminates the dual chat panel bug entirely
- Message notification clicks on /messages page navigate inline via query param instead of opening the hidden FAB
- NotificationBell applies the same fix so clicks from the navbar dropdown are also routed correctly

## Task Commits

Each task was committed atomically:

1. **Task 1: Hide FAB on /messages routes and fix notification routing** - `3526a04` (feat)

**Plan metadata:** (docs commit follows)

## Files Created/Modified
- `src/presentation/components/common/MessagesWidget/MessagesWidget.jsx` - Added `usePathname` import; early return null when `pathname?.startsWith('/messages')`
- `src/presentation/components/features/notifications/NotificationCenterPage/NotificationCenterPage.jsx` - Added `usePathname`; message notification click routes to `/messages?conversation=ID` when already on /messages
- `src/presentation/components/common/NotificationBell/NotificationBell.jsx` - Added `usePathname`; same conditional: `openConversation()` on other pages, inline nav on /messages

## Decisions Made
- MessagesWidget early-return placed after the `isAuthenticated` guard (not before hooks) — hooks cannot be conditional in React; guards use early return after all hooks fire
- Used `router.push('/messages?conversation=ID')` for inline selection — requires the /messages page to read and act on the `?conversation` query param (existing or future feature)
- Applied the fix to all three notification entry points (MessagesWidget early return, NotificationCenterPage handler, NotificationBell handler) to ensure consistency regardless of which UI the user clicks from

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Applied pathname-aware routing to NotificationBell in addition to NotificationCenterPage**
- **Found during:** Task 1 (reviewing affected files)
- **Issue:** Plan only specified NotificationCenterPage and NotificationFilterTabs as candidates to check; NotificationBell also calls `openConversation()` for message notifications and would exhibit the same bug when user is on /messages
- **Fix:** Applied identical pathname guard to NotificationBell.handleNotificationClick
- **Files modified:** src/presentation/components/common/NotificationBell/NotificationBell.jsx
- **Verification:** Build passes, same pattern as NotificationCenterPage
- **Committed in:** 3526a04 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical — scope extension within intent of plan)
**Impact on plan:** Fix is strictly additive and covers the same bug pattern the plan was addressing. No scope creep.

## Issues Encountered
None — build passed on first attempt.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- FAB/messages dual-panel bug resolved; /messages page can now safely be used without floating widget interference
- The `/messages?conversation=ID` query param navigation requires the /messages page to read `?conversation` and auto-select that conversation for the inline routing to fully work — if that is not yet implemented, it will degrade gracefully to just navigating to /messages without auto-selection

---
*Phase: 13-messaging-and-communication-improvements*
*Completed: 2026-04-25*
