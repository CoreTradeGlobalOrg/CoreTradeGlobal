---
phase: 01-role-system-and-infrastructure
plan: 03
subsystem: ui
tags: [nextjs, middleware, react, tailwind, lucide-react, role-based-access]

# Dependency graph
requires:
  - phase: 01-01
    provides: ROLES constants, ROLE_BADGE_COLORS, ROLE_CONFIG, ROLE_DISPLAY_NAMES in src/core/constants/roles.js

provides:
  - Role-based route protection in middleware (providerRoutes, lawyerRoutes -> /forbidden)
  - Forbidden page with role context and return-to-dashboard link
  - RoleBadge component: color-coded pill badges for all 5 roles + null fallback
  - Role-filtered Navbar: members/providers/lawyers see different nav items, unauthorized items hidden
  - Provider dashboard placeholder with Quote Requests/Submitted Quotes/History tab structure
  - Lawyer workspace page with Client Channels and Deal Review card links
  - Placeholder /lawyer/channels and /lawyer/deals pages (Phase 5 content)
  - Profile page displays user role via RoleBadge

affects:
  - 01-04 (admin panel — uses same role constants and RoleBadge)
  - 04-provider-portal (fills in provider dashboard tab content)
  - 05-legal (fills in /lawyer/channels and /lawyer/deals pages)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Role-filtered nav: NAV_LINKS with roles property, filtered via .filter() before render"
    - "RoleBadge: reusable pill component driven by ROLE_CONFIG from constants/roles.js"
    - "Middleware role guards: providerRoutes/lawyerRoutes arrays checked after auth, redirect to /forbidden"

key-files:
  created:
    - src/app/(main)/forbidden/page.jsx
    - src/presentation/components/common/RoleBadge/RoleBadge.jsx
    - src/app/(main)/provider/page.jsx
    - src/app/(main)/lawyer/page.jsx
    - src/app/(main)/lawyer/channels/page.jsx
    - src/app/(main)/lawyer/deals/page.jsx
  modified:
    - middleware.js
    - src/presentation/components/homepage/Navbar/Navbar.jsx
    - src/app/(main)/profile/[userId]/page.jsx

key-decisions:
  - "Nav items are hidden completely for unauthorized roles, not greyed out or disabled"
  - "RoleBadge null fallback renders 'Member' badge — handles legacy accounts without role claims"
  - "Admin has access to all role-restricted routes (provider, lawyer) via isAdmin check in middleware"
  - "Middleware redirects unauthorized access to /forbidden (not home) for clear role-aware UX"
  - "/lawyer/channels and /lawyer/deals placeholder pages created to prevent 404s for nav links"

patterns-established:
  - "RoleBadge pattern: import from @/presentation/components/common/RoleBadge/RoleBadge for any role display"
  - "Middleware role check pattern: array.includes(userRole) || isAdmin for multi-role route guards"
  - "Placeholder page pattern: phase-tagged empty state with coming-in-phase-N messaging"

requirements-completed:
  - ROLE-02
  - ROLE-04

# Metrics
duration: 4min
completed: 2026-02-21
---

# Phase 1 Plan 03: Role-Based Navigation and Route Protection Summary

**Middleware role guards for /provider and /lawyer routes, color-coded RoleBadge component, role-filtered Navbar with 10 configurable links, and placeholder pages for provider dashboard and lawyer workspace**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-20T23:00:13Z
- **Completed:** 2026-02-21T23:04:00Z
- **Tasks:** 2
- **Files modified:** 9

## Accomplishments
- Middleware now enforces role restrictions: members redirected to /forbidden on /provider and /lawyer routes
- RoleBadge renders color-coded pill badges (blue/green/orange/purple/red) for all 5 roles with icons and null fallback
- Navbar filters 10 links by user role — providers see Provider Dashboard, lawyers see Client Channels and Deal Review, members see RFQs, all see public links
- Profile page shows role as RoleBadge instead of plain formatted text

## Task Commits

Each task was committed atomically:

1. **Task 1: Update middleware for role-based route protection and create forbidden page** - `3cd3206` (feat)
2. **Task 2: Role-filtered Navbar, RoleBadge component, and provider/lawyer placeholder pages** - `4012a79` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified
- `middleware.js` - Added providerRoutes/lawyerRoutes arrays; unauthorized access redirects to /forbidden; admin bypasses all checks
- `src/app/(main)/forbidden/page.jsx` - Access denied page with ShieldX icon, role display from useAuth, Return to Dashboard link
- `src/presentation/components/common/RoleBadge/RoleBadge.jsx` - Reusable role badge: reads ROLE_CONFIG from constants/roles.js, supports sm/md/lg sizes, role icons via lucide-react
- `src/presentation/components/homepage/Navbar/Navbar.jsx` - Added roles property to NAV_LINKS; visibleLinks computed via filter; mobile menu uses same filter
- `src/app/(main)/provider/page.jsx` - Provider dashboard placeholder: 3-tab structure (Quote Requests, Submitted Quotes, History) with empty states
- `src/app/(main)/lawyer/page.jsx` - Lawyer workspace landing page: two card links to /lawyer/channels and /lawyer/deals
- `src/app/(main)/lawyer/channels/page.jsx` - Placeholder page preventing 404 for Client Channels nav link
- `src/app/(main)/lawyer/deals/page.jsx` - Placeholder page preventing 404 for Deal Review nav link
- `src/app/(main)/profile/[userId]/page.jsx` - Role grid cell now renders RoleBadge instead of formatRole() text

## Decisions Made
- Admin is included in all role checks (provider, lawyer routes) — consistent with existing admin pattern
- Nav items are hidden completely (not greyed out/disabled) per user decision ROLE-04
- RoleBadge null fallback renders "Member" to handle legacy accounts without role claims
- Created /lawyer/channels and /lawyer/deals placeholder pages (with Phase 5 messaging) to prevent nav link 404s

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
- ESLint via `npx next lint` and `node_modules/.bin/eslint` had a pre-existing circular structure error in @eslint/eslintrc (unrelated to this plan's changes). Manual code review confirmed all imports, exports, and logic are correct.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness
- Role enforcement UI is complete: middleware guards, forbidden page, filtered nav, RoleBadge
- Plan 04 (admin panel) can now use RoleBadge for displaying user roles in the admin user list
- Provider dashboard tab structure is ready for Phase 4 content population
- Lawyer workspace pages are ready for Phase 5 content population

## Self-Check: PASSED

All 9 files verified present:
- middleware.js: FOUND
- src/app/(main)/forbidden/page.jsx: FOUND
- src/presentation/components/common/RoleBadge/RoleBadge.jsx: FOUND
- src/presentation/components/homepage/Navbar/Navbar.jsx: FOUND
- src/app/(main)/provider/page.jsx: FOUND
- src/app/(main)/lawyer/page.jsx: FOUND
- src/app/(main)/lawyer/channels/page.jsx: FOUND
- src/app/(main)/lawyer/deals/page.jsx: FOUND
- src/app/(main)/profile/[userId]/page.jsx: FOUND

Commits verified:
- 3cd3206: FOUND
- 4012a79: FOUND

---
*Phase: 01-role-system-and-infrastructure*
*Completed: 2026-02-21*
