---
phase: 12-notifications-and-email-system
plan: 01
subsystem: ui
tags: [notifications, firestore, infinite-scroll, intersection-observer, react, next.js]

# Dependency graph
requires:
  - phase: 07-platform-hardening
    provides: IntersectionObserver infinite scroll pattern used for sentinel-based pagination
  - phase: 02-deal-creation-and-negotiation-s1
    provides: NotificationBell, NotificationRepository, MessagesContext with real-time notification subscription
provides:
  - Full-page /notifications route with filter tabs, infinite scroll, and bulk actions
  - Cursor-based pagination via getByUserIdAfter in NotificationRepository
  - Bell dropdown extended to 10 items with "View all" link to /notifications
  - startAfter support added to querySubcollection in FirestoreDataSource
affects:
  - 12-02 (push notifications extend notification types shown in center)
  - 12-03 (email templates may reference notification center URL)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Cursor-based Firestore pagination via _snapshot field on querySubcollection results
    - Real-time + paginated history merge with Set-based deduplication by ID
    - IntersectionObserver sentinel div inside notification list for infinite scroll

key-files:
  created:
    - src/app/(main)/notifications/page.jsx
    - src/presentation/components/features/notifications/NotificationCenterPage/NotificationCenterPage.jsx
    - src/presentation/components/features/notifications/NotificationCenterPage/NotificationFilterTabs.jsx
    - src/presentation/components/features/notifications/NotificationCenterPage/NotificationCenterItem.jsx
    - src/presentation/components/features/notifications/NotificationCenterPage/NotificationBulkActions.jsx
  modified:
    - src/data/repositories/NotificationRepository.js
    - src/data/datasources/firebase/FirestoreDataSource.js
    - src/presentation/components/common/NotificationBell/NotificationBell.jsx
    - src/presentation/components/common/NotificationBell/NotificationBell.css
    - src/middleware.js

key-decisions:
  - "querySubcollection now returns _snapshot (raw DocumentSnapshot) on each result — enables cursor-based pagination without bypassing the data source abstraction"
  - "deleteNotification/deleteAllNotifications aliases added to NotificationRepository for consistent public API naming (plan referenced these names; existing delete/deleteAll remain)"
  - "NotificationCenterPage uses useMessages() for page-1 real-time window; getByUserIdAfter for subsequent pages — avoids duplicate subscriptions"
  - "View all link appears in both non-empty and empty bell dropdown states — users can always navigate to center"

patterns-established:
  - "Cursor pagination pattern: querySubcollection returns _snapshot alongside data; callers store lastResult._snapshot as cursor for next getByUserIdAfter call"
  - "Notification tab mapping: TYPE_TO_TAB constant maps notification.type -> tab id; defined inline in orchestrator"

requirements-completed:
  - NOTIF-01
  - NOTIF-02

# Metrics
duration: 3min
completed: 2026-04-22
---

# Phase 12 Plan 01: Notification Center Page Summary

**Full-page /notifications route with real-time + paginated history, filter tabs (All/Deals/Messages/Legal/Providers/System), IntersectionObserver infinite scroll, and batch mark-read/delete actions**

## Performance

- **Duration:** 3 min
- **Started:** 2026-04-22T07:55:25Z
- **Completed:** 2026-04-22T07:58:30Z
- **Tasks:** 2
- **Files modified:** 10

## Accomplishments
- Extended NotificationBell from 5 to 10 items with a "View all /notifications" link at the bottom
- Added `getByUserIdAfter` cursor-based pagination to NotificationRepository (uses `startAfter` now supported in `querySubcollection`)
- Built full /notifications page: real-time context stream + paginated history merged and deduplicated, filter tabs, IntersectionObserver sentinel for infinite scroll, empty state
- Bulk actions bar: mark all read, delete all (with confirm), mark selected read (N), delete selected (N) — all with react-hot-toast feedback

## Task Commits

1. **Task 1: Cursor pagination, extend bell, middleware** - `11e8c08` (feat)
2. **Task 2: /notifications page, filter tabs, infinite scroll, bulk actions** - `8d81ad7` (feat)

## Files Created/Modified
- `src/app/(main)/notifications/page.jsx` - Route shell with next/dynamic ssr:false
- `src/presentation/components/features/notifications/NotificationCenterPage/NotificationCenterPage.jsx` - Orchestrator (real-time + paginated data, state, bulk ops)
- `src/presentation/components/features/notifications/NotificationCenterPage/NotificationFilterTabs.jsx` - Six filter tabs with gold underline active state
- `src/presentation/components/features/notifications/NotificationCenterPage/NotificationCenterItem.jsx` - Row with checkbox, type icon, bold/dim read state, unread dot, navigation
- `src/presentation/components/features/notifications/NotificationCenterPage/NotificationBulkActions.jsx` - Sticky action bar with global and batch operations
- `src/data/repositories/NotificationRepository.js` - Added getByUserIdAfter, deleteNotification/deleteAllNotifications aliases
- `src/data/datasources/firebase/FirestoreDataSource.js` - Added startAfter support and _snapshot passthrough in querySubcollection
- `src/presentation/components/common/NotificationBell/NotificationBell.jsx` - Slice from 5 to 10, added Link import, "View all" link
- `src/presentation/components/common/NotificationBell/NotificationBell.css` - Added .notification-view-all style
- `src/middleware.js` - Added /notifications to protectedRoutes

## Decisions Made
- `querySubcollection` now includes `_snapshot` (raw Firestore DocumentSnapshot) on each result object — allows callers to use it as a cursor for `startAfter` without bypassing the data source abstraction layer. Future callers should strip `_snapshot` before storing/displaying data.
- `deleteNotification` and `deleteAllNotifications` method aliases added alongside existing `delete`/`deleteAll` — plan specification used these names in NotificationBulkActions callbacks.
- `View all notifications` link appears in both non-empty footer AND a standalone empty-state footer so users can always navigate to the center page regardless of notification count.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added startAfter support to querySubcollection in FirestoreDataSource**
- **Found during:** Task 1 (cursor pagination)
- **Issue:** Plan referenced `querySubcollection` with `startAfter` support (per RESEARCH.md interface note), but the actual implementation did not have it
- **Fix:** Added `startAfter` option handling in `querySubcollection` and added `_snapshot: doc` to returned results so callers can use it as a cursor
- **Files modified:** src/data/datasources/firebase/FirestoreDataSource.js
- **Verification:** Build passes; getByUserIdAfter calls querySubcollection with startAfter correctly
- **Committed in:** 11e8c08 (Task 1 commit)

---

**Total deviations:** 1 auto-fixed (1 missing critical infrastructure)
**Impact on plan:** Required for cursor pagination correctness. No scope creep.

## Issues Encountered
None beyond the startAfter gap documented above.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- /notifications page is live and protected; bell dropdown links to it
- Cursor pagination is in place for any future notification volume growth
- Ready for 12-02 (push notification coverage extensions)

---
*Phase: 12-notifications-and-email-system*
*Completed: 2026-04-22*

## Self-Check: PASSED
- All 5 component files created and verified present
- All 5 modified files updated
- Task 1 commit 11e8c08 found in git log
- Task 2 commit 8d81ad7 found in git log
- `npx next build` completed without errors; /notifications appears in route list
