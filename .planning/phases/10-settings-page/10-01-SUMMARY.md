---
phase: 10-settings-page
plan: 01
subsystem: ui
tags: [navbar, settings, middleware, next-auth, lucide-react]

requires:
  - phase: 07-platform-hardening
    provides: Navbar component, glass-card CSS pattern, auth context

provides:
  - Fixed navbar dropdown (click-only, solid dark bg, click-outside handler)
  - Avatar+name dropdown trigger in desktop navbar
  - Settings link in desktop dropdown and mobile menu
  - /settings route protected by middleware
  - SettingsPage shell with compact user header and section placeholders

affects: [10-02, 10-03]

tech-stack:
  added: []
  patterns:
    - "Navbar dropdown uses click-only state control (no group-hover conflict)"
    - "useRef + mousedown click-outside pattern for dropdown dismissal"
    - "next/dynamic with ssr:false wraps settings page orchestrator (same as profile page)"
    - "SettingsPage orchestrator has no own state; pure render tree with auth guard"

key-files:
  created:
    - src/app/(main)/settings/page.jsx
    - src/presentation/components/features/settings/SettingsPage/SettingsPage.jsx
  modified:
    - src/presentation/components/homepage/Navbar/Navbar.jsx
    - middleware.js

key-decisions:
  - "Navbar dropdown switched to click-only control — removed onMouseEnter/onMouseLeave and group-hover classes to eliminate hover/click conflict causing transparent-bg flicker"
  - "dropdownRef + mousedown click-outside closes dropdown reliably without conflicting with internal link clicks"
  - "Avatar trigger shows companyLogo || photoURL image, falls back to gold circle with User icon — consistent with mobile profile avatar pattern already in Navbar"
  - "SettingsPage uses useEffect auth guard (redirect to /login) in addition to middleware — defense in depth"

patterns-established:
  - "Settings route: thin page shell with next/dynamic + ssr:false wrapping orchestrator component"
  - "Settings orchestrator: auth guard via useEffect + router.replace('/login'), compact user header, glass-card section containers"

requirements-completed: [SET-01, SET-06]

duration: 8min
completed: 2026-04-12
---

# Phase 10 Plan 01: Settings Page Shell Summary

**Click-only navbar dropdown with avatar+name trigger, Settings link in desktop and mobile nav, and /settings route shell with glass-card section placeholders**

## Performance

- **Duration:** 8 min
- **Started:** 2026-04-12T18:01:00Z
- **Completed:** 2026-04-12T18:09:00Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- Fixed navbar dropdown bug: removed group-hover/onMouseEnter conflict; dropdown now opens/closes only on click with reliable click-outside dismissal
- Upgraded dropdown trigger from plain "Profile" button to avatar+name (companyLogo/photoURL with gold User icon fallback)
- Added Settings link in both desktop dropdown and mobile hamburger menu
- Created /settings route protected by middleware, with Suspense shell and next/dynamic import
- Created SettingsPage orchestrator with compact user header, Back to Profile link, and placeholder sections for Security, Notifications, and Danger Zone

## Task Commits

1. **Task 1: Fix navbar dropdown and add Settings link** - `cc5232a` (feat)
2. **Task 2: Create settings page route, shell, and middleware protection** - `87485ce` (feat)

## Files Created/Modified
- `src/presentation/components/homepage/Navbar/Navbar.jsx` - Fixed dropdown trigger and visibility logic; added Settings link in desktop dropdown and mobile menu
- `middleware.js` - Added '/settings' to protectedRoutes array
- `src/app/(main)/settings/page.jsx` - Thin page shell with Suspense + next/dynamic ssr:false import
- `src/presentation/components/features/settings/SettingsPage/SettingsPage.jsx` - Orchestrator with auth guard, compact user header, placeholder sections

## Decisions Made
- Navbar dropdown switched to click-only control — removed `onMouseEnter`, `onMouseLeave`, and all `group-hover:*` Tailwind classes to eliminate the hover/click race that caused the transparent background flicker
- `dropdownRef` + `mousedown` click-outside handler added so dropdown closes when user clicks anywhere else on the page
- Avatar trigger uses `companyLogo || photoURL` image with gold circle + User icon fallback, consistent with the mobile avatar pattern already established in the Navbar
- SettingsPage auth guard uses `useEffect` + `router.replace('/login')` in addition to middleware protection — defense in depth

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Plans 02 and 03 can now replace the placeholder sections (Security, Notifications, Danger Zone) with real sub-components
- /settings route is accessible at http://localhost:3000/settings — unauthenticated users are redirected to /login
- Navbar dropdown is stable and ready for production

---
*Phase: 10-settings-page*
*Completed: 2026-04-12*
