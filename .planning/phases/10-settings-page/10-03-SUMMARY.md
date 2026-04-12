---
phase: 10-settings-page
plan: 03
subsystem: ui
tags: [settings, notifications, email-subscriptions, danger-zone, profile-cleanup, firestore, api-route]

requires:
  - phase: 10-settings-page
    plan: 01
    provides: SettingsPage shell with section placeholders
  - phase: 10-settings-page
    plan: 02
    provides: SecuritySection (password change + 2FA)
  - phase: 09-cold-email-unsubscribe
    provides: /api/unsubscribe and /api/resubscribe routes, unsubscribes Firestore collection

provides:
  - 5-category notification preference grid with Email + Push toggles persisted to Firestore
  - Marketing email subscription toggle via Phase 9 unsubscribe API routes
  - Logout and account deletion with DELETE confirmation in DangerSection
  - GET /api/subscription-status endpoint for checking unsubscribe state
  - Profile page cleaned of Account Settings section (~130 lines removed)

affects: []

tech-stack:
  added: []
  patterns:
    - "useNotificationPreferences: onSnapshot + updateDoc with dotted path notation for preferences.category.channel"
    - "useEmailSubscriptions: fetch on mount pattern with optimistic state toggle"
    - "Toggle button uses aria-pressed + translate-x for accessible switch UI"
    - "subscription-status API route: SHA-256 email hash matching Phase 9 unsubscribe CF pattern"

key-files:
  created:
    - src/app/api/subscription-status/route.js
    - src/presentation/hooks/settings/useNotificationPreferences.js
    - src/presentation/hooks/settings/useEmailSubscriptions.js
    - src/presentation/components/features/settings/SettingsPage/NotificationsSection.jsx
    - src/presentation/components/features/settings/SettingsPage/EmailSubscriptionsSection.jsx
    - src/presentation/components/features/settings/SettingsPage/DangerSection.jsx
  modified:
    - src/presentation/components/features/settings/SettingsPage/SettingsPage.jsx
    - src/app/(main)/profile/[userId]/page.jsx

key-decisions:
  - "subscription-status GET endpoint uses same SHA-256 hash pattern as Phase 9 CF — consistent identity resolution across server and client"
  - "useNotificationPreferences merges Firestore prefs with DEFAULT_PREFERENCES to ensure all 5 categories always have email+push keys — prevents undefined toggle states"
  - "EmailSubscriptionsSection is a single global toggle (not 3 categories) — Phase 9 data model stores one unsubscribes doc per email; deal notifications covered by NotificationsSection"
  - "DangerSection self-contains useLogout + useDeleteAccount — no prop drilling from SettingsPage"
  - "Profile page cleanup removes ~130 lines: all account settings JSX, password state, delete modal state, and related handlers"
  - "Settings link added to profile header for own-profile view using Link + Settings icon from lucide-react"

patterns-established:
  - "Toggle switch component pattern: aria-pressed, bg-[#FFD700] for on, bg-[rgba(255,255,255,0.2)] for off, translate-x-6/translate-x-1 knob"
  - "SkeletonToggle: animate-pulse rounded-full placeholder while Firestore prefs load"

requirements-completed: [SET-04, SET-05, SET-07]

duration: 5min
completed: 2026-04-12
---

# Phase 10 Plan 03: Notifications, Email Subscriptions, and Danger Zone Summary

**5-category notification preference toggles persisted to Firestore, marketing email subscription toggle via Phase 9 unsubscribe API routes, logout/delete account in DangerSection, and profile page cleaned of ~130 lines of migrated account settings**

## Performance

- **Duration:** ~5 min
- **Started:** 2026-04-12T18:09:48Z
- **Completed:** 2026-04-12T18:14:28Z
- **Tasks:** 2
- **Files modified:** 8 (6 created, 2 modified)

## Accomplishments

- Created GET `/api/subscription-status` route that checks the `unsubscribes` Firestore collection using the same SHA-256 email hash pattern as Phase 9
- Created `useNotificationPreferences(uid)` hook with Firestore `onSnapshot` subscription and `updateDoc` with dotted path notation for per-field updates
- Created `useEmailSubscriptions(email)` hook that fetches initial state on mount and toggles via `/api/unsubscribe` / `/api/resubscribe`
- Built `NotificationsSection` with 5 category rows (Deals, Messages, Legal, Providers, System) × 2 columns (Email, Push) — skeleton toggles while loading
- Built `EmailSubscriptionsSection` with a single "Marketing & Product Updates" global toggle — consistent with Phase 9 single-doc-per-email model
- Built `DangerSection` with Log Out button and Delete Account (DELETE confirmation modal)
- Updated `SettingsPage` to render all 4 sections in order: Security, Notifications, Email Subscriptions, Danger Zone
- Cleaned `profile/[userId]/page.jsx`: removed ~130 lines including Account Settings JSX block, password form state, delete modal, 5 handlers, and 3 unused imports
- Added Settings link in profile header for own-profile view

## Task Commits

1. **Task 1: Create hooks, API route, and section components** - `65a7a66` (feat)
2. **Task 2: Wire sections into SettingsPage and clean up profile page** - `c0749fa` (feat)

## Files Created/Modified

- `src/app/api/subscription-status/route.js` — GET endpoint checking unsubscribes collection by SHA-256 hashed email
- `src/presentation/hooks/settings/useNotificationPreferences.js` — Firestore real-time hook for 5-category email/push toggles
- `src/presentation/hooks/settings/useEmailSubscriptions.js` — Fetch-on-mount hook for marketing email subscription state
- `src/presentation/components/features/settings/SettingsPage/NotificationsSection.jsx` — 5×2 toggle grid with skeleton loading
- `src/presentation/components/features/settings/SettingsPage/EmailSubscriptionsSection.jsx` — Single marketing email toggle
- `src/presentation/components/features/settings/SettingsPage/DangerSection.jsx` — Logout + delete account with ConfirmDialog
- `src/presentation/components/features/settings/SettingsPage/SettingsPage.jsx` — Replaced placeholders with real components
- `src/app/(main)/profile/[userId]/page.jsx` — Removed account settings section; added Settings link

## Decisions Made

- `subscription-status` GET endpoint uses same SHA-256 hash as Phase 9 CF — consistent email identity resolution without coordination cost
- `useNotificationPreferences` deep-merges loaded preferences with `DEFAULT_PREFERENCES` — ensures all 5 categories always have both email/push keys, preventing undefined toggle states after partial Firestore writes
- `EmailSubscriptionsSection` implements a single toggle (not per-category) — Phase 9 data model stores one `unsubscribes` document per email; deal/message notifications are already covered by `NotificationsSection`
- `DangerSection` is fully self-contained with hooks inside — avoids prop-drilling `user`, `logout`, and `deleteAccount` down from the SettingsPage orchestrator
- Profile page cleanup removes exactly the JSX/state/handlers that moved to settings; product/request/company editing functionality is untouched

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required. All functionality works with existing Firebase project and Phase 9 API routes.

## Self-Check: PASSED

All 7 artifacts verified to exist on disk. Both commits (65a7a66, c0749fa) verified in git log. Build passes with zero errors and zero unused import warnings.

---
*Phase: 10-settings-page*
*Completed: 2026-04-12*
