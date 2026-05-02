---
phase: 17-registration-onboarding-and-misc
plan: 02
subsystem: onboarding
tags: [onboarding, tour, overlay, profile-completion, next-dynamic, firestore, sessionStorage]

# Dependency graph
requires:
  - phase: 17-01
    provides: registration flow, user doc structure, role constants
provides:
  - OnboardingTour overlay component (5 steps, role-appropriate, spotlight cutout)
  - ProfileCompletionCard progress bar component (6 fields, gold bar, dismissable)
affects: [homepage, profile-page, first-time-user-experience]

# Tech tracking
tech-stack:
  added: []
  patterns:
    - React Portal via createPortal for overlay components (avoids z-index stacking)
    - requestAnimationFrame deferred getBoundingClientRect for spotlight positioning
    - next/dynamic ssr:false for components using DOM APIs (sessionStorage, createPortal)
    - box-shadow 9999px technique for spotlight cutout overlay effect
    - sessionStorage for session-scoped dismiss (card reappears on next visit)

key-files:
  created:
    - src/presentation/components/features/onboarding/OnboardingTour/OnboardingTour.jsx
    - src/presentation/components/features/onboarding/OnboardingTour/OnboardingTour.css
    - src/presentation/components/features/onboarding/ProfileCompletionCard/ProfileCompletionCard.jsx
  modified:
    - src/app/(main)/page.js
    - src/app/(main)/profile/[userId]/page.jsx

key-decisions:
  - "OnboardingTour uses createPortal to document.body — avoids z-index stacking with navbar and glass-card layers"
  - "requestAnimationFrame defers getBoundingClientRect to after paint — ensures spotlight aligns with rendered DOM"
  - "No target found for step selector falls back to viewport center rect — tour never hard-fails on missing elements"
  - "ProfileCompletionCard uses sessionStorage (not localStorage) for dismiss — card reappears on next page visit per CONTEXT.md spec"
  - "hydrated flag prevents SSR sessionStorage read — avoids hydration mismatch in Next.js app router"
  - "Profile completion at 100% returns null (permanent hide) — no sessionStorage interaction needed"

patterns-established:
  - "Overlay tour pattern: Portal + CSS box-shadow spotlight + positioned panel with getBoundingClientRect"
  - "Client-only state pattern: hydrated flag + useEffect for browser storage reads in SSR-capable pages"

requirements-completed: [REG-05, REG-06]

# Metrics
duration: 4min
completed: 2026-05-02
---

# Phase 17 Plan 02: Onboarding Tour and Profile Completion Card Summary

**Portal-based overlay tour with 5 role-appropriate steps and gold progress bar profile completion card for dashboard and profile pages**

## Performance

- **Duration:** ~4 min
- **Started:** 2026-05-02T09:29:15Z
- **Completed:** 2026-05-02T09:33:20Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments

- Built `OnboardingTour.jsx`: A React Portal overlay with CSS box-shadow spotlight cutout that highlights 5 key platform features on first login, with role-appropriate steps for members vs. providers. Writes `onboardingTourCompleted: true` to Firestore `users/{uid}` on skip or finish.
- Built `OnboardingTour.css`: Fixed overlay (z-9990), spotlight div (z-9991, box-shadow cutout), step panel (z-9992, pointer-events: auto), and smooth transition animation.
- Built `ProfileCompletionCard.jsx`: Shows gold gradient progress bar and 6-field checklist (company name, logo, country, phone, about, website). Hides permanently at 100%; dismissable per session via `sessionStorage`.
- Integrated `OnboardingTour` into homepage via `next/dynamic ssr:false`; shown when `!user.onboardingTourCompleted` after auth resolves.
- Integrated `ProfileCompletionCard` into homepage (above hero, authenticated-only) and profile page (below ProfileCard, own profile only) via `next/dynamic ssr:false`.

## Task Commits

1. **Task 1: Build OnboardingTour overlay component** - `adb0f21` (feat)
2. **Task 2: Build ProfileCompletionCard component** - `375cd88` (feat)

## Files Created/Modified

- `src/presentation/components/features/onboarding/OnboardingTour/OnboardingTour.jsx` - Overlay tour component with spotlight, 5 steps per role, Firestore write
- `src/presentation/components/features/onboarding/OnboardingTour/OnboardingTour.css` - CSS for overlay, spotlight cutout, panel
- `src/presentation/components/features/onboarding/ProfileCompletionCard/ProfileCompletionCard.jsx` - Progress bar card with field checklist
- `src/app/(main)/page.js` - Added OnboardingTour + ProfileCompletionCard with dynamic imports
- `src/app/(main)/profile/[userId]/page.jsx` - Added ProfileCompletionCard below ProfileCard

## Decisions Made

- `OnboardingTour` uses `createPortal(_, document.body)` to guarantee z-index supremacy over all existing glass-card and navbar layers
- `requestAnimationFrame` deferred `getBoundingClientRect` call ensures spotlight aligns with fully painted DOM (avoids 0-rect issue on mount)
- Selector miss falls back to viewport center — tour never breaks if a nav link is hidden for a particular role
- `ProfileCompletionCard` uses `sessionStorage` for dismiss so the card reappears on the next visit (spec: "dismissable but comes back until 100%")
- `hydrated` flag on card prevents reading `sessionStorage` during SSR and avoids React hydration mismatch

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

- [x] `src/presentation/components/features/onboarding/OnboardingTour/OnboardingTour.jsx` — FOUND
- [x] `src/presentation/components/features/onboarding/OnboardingTour/OnboardingTour.css` — FOUND
- [x] `src/presentation/components/features/onboarding/ProfileCompletionCard/ProfileCompletionCard.jsx` — FOUND
- [x] Task 1 commit `adb0f21` — FOUND
- [x] Task 2 commit `375cd88` — FOUND
- [x] `npx next build` — PASSED (✓ Compiled successfully)

## Self-Check: PASSED

---
*Phase: 17-registration-onboarding-and-misc*
*Completed: 2026-05-02*
