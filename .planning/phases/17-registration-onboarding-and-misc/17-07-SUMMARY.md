---
phase: 17-registration-onboarding-and-misc
plan: 07
subsystem: ui
tags: [react, nextjs, tailwind, onboarding, profile, sessionStorage]

# Dependency graph
requires:
  - phase: 17-registration-onboarding-and-misc
    provides: ProfileCompletionCard component with sessionStorage dismiss (17-02)

provides:
  - ProfileCompletionCard fixed-positioned in right top corner below ticker and navbar
  - Card no longer auto-hides at 100% completion — always visible until session dismiss
  - Skip button (text + icon) replaces X-only dismiss
  - CTA shows "View Profile" at 100%, "Complete Profile" otherwise

affects:
  - homepage UX
  - onboarding flow
  - profile completion tracking

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Fixed overlay card: hidden lg:block fixed top-[Npx] right-4 z-[50] w-[320px] for right-side floating UI elements"
    - "Conditional CTA label: ternary on percent === 100 for contextual button text"

key-files:
  created: []
  modified:
    - src/app/(main)/page.js
    - src/presentation/components/features/onboarding/ProfileCompletionCard/ProfileCompletionCard.jsx

key-decisions:
  - "top-[116px] hardcoded (ticker ~40px + navbar ~64px + 12px gap) rather than CSS variables — layout heights are stable and well-known"
  - "hidden lg:block hides card on mobile to avoid blocking content — desktop-only overlay pattern"
  - "Skip text added alongside X icon for clarity per UAT spec; aria-label updated to describe per-session behavior"

patterns-established:
  - "Conditional CTA: percent === 100 ternary for context-aware button text in profile completion card"

requirements-completed: [REG-06]

# Metrics
duration: 1min
completed: 2026-05-01
---

# Phase 17 Plan 07: ProfileCompletionCard Reposition and Behavior Fix Summary

**ProfileCompletionCard moved to fixed right-top corner (below ticker+navbar), removing permanent 100% hide so card always shows until session Skip**

## Performance

- **Duration:** 1 min
- **Started:** 2026-05-01T07:10:52Z
- **Completed:** 2026-05-01T07:11:52Z
- **Tasks:** 1
- **Files modified:** 2

## Accomplishments

- Removed `if (percent === 100) return null;` — card no longer permanently hides at full completion
- Repositioned card from `max-w-sm mx-auto` above hero to `fixed top-[116px] right-4 z-[50] w-[320px]` in top-right corner
- Card hidden on mobile (`hidden lg:block`) to avoid blocking page content on small screens
- Dismiss button updated from X-only to "Skip" text + X icon for clearer per-session behavior
- CTA button dynamically shows "View Profile" at 100% and "Complete Profile" below 100%

## Task Commits

Each task was committed atomically:

1. **Task 1: Reposition ProfileCompletionCard and fix hide behavior** - `2e38af5` (feat)

## Files Created/Modified

- `src/app/(main)/page.js` - Moved ProfileCompletionCard from above-hero centered div to fixed right-top overlay with mobile hide
- `src/presentation/components/features/onboarding/ProfileCompletionCard/ProfileCompletionCard.jsx` - Removed 100% auto-hide, added Skip text to dismiss button, conditional CTA label, updated JSDoc

## Decisions Made

- `top-[116px]` hardcoded (ticker ~40px + navbar ~64px + 12px gap) rather than CSS custom properties — layout heights are stable
- `hidden lg:block` hides card on mobile to avoid content blocking — desktop-only floating card pattern
- Kept sessionStorage key pattern unchanged (`profileCardDismissed_${user.uid}`) — no data migration needed

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- GAP-4 from UAT is now closed — card is correctly positioned and behaves per spec
- Ready for remaining phase 17 plans

---
*Phase: 17-registration-onboarding-and-misc*
*Completed: 2026-05-01*
