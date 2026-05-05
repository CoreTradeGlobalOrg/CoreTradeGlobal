---
phase: 17-registration-onboarding-and-misc
plan: "08"
subsystem: ui
tags: [react, nextjs, tailwind, onboarding, turkish, tour, fab]

# Dependency graph
requires:
  - phase: 17-registration-onboarding-and-misc
    provides: page.js with ProfileCompletionCard overlay (17-07)

provides:
  - 3-part OnboardingTour with Turkish content (Profile 4 steps, Product 3 steps, RFQ 3 steps)
  - Intro screen and transition screens between parts
  - TourHelpButton "?" FAB exported from OnboardingTour module
  - TourHelpButton wired on homepage, FAQ, About Us, and Settings pages

affects:
  - onboarding flow
  - homepage UX
  - FAQ page
  - About Us page
  - Settings page

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Flat TOUR_SEQUENCE array with type (intro|step|transition) field — simpler than nested part objects for linear navigation"
    - "TourLauncher client wrapper component for server pages with metadata exports — avoids 'use client' + metadata conflict"
    - "TourHelpButton hidden while tour is active (showTour && !showTourManual guard) to avoid stacking two FABs"

key-files:
  created:
    - src/app/(main)/about-us/TourLauncher.jsx
  modified:
    - src/presentation/components/features/onboarding/OnboardingTour/OnboardingTour.jsx
    - src/presentation/components/features/onboarding/OnboardingTour/OnboardingTour.css
    - src/app/(main)/page.js
    - src/app/(main)/faq/page.js
    - src/app/(main)/about-us/page.js
    - src/app/(main)/settings/page.jsx

key-decisions:
  - "Flat TOUR_SEQUENCE array with type/part/partStep/partTotal/isLastInPart fields — single index walk, no nested state machine needed"
  - "TourLauncher client component for about-us/page.js — server page retains metadata export; client component owns useAuth + tour state"
  - "faq/page.js converted from server to client component — lightweight enough, simpler than TourLauncher wrapper approach"
  - "TourHelpButton hidden while tour is active (!showTour guard) — prevents two FABs visible simultaneously"
  - "OnboardingTour CSS overlay background changed from transparent to rgba(0,0,0,0.6) — intro/transition modal screens need visible darkening without spotlight"

patterns-established:
  - "TourLauncher pattern: client wrapper for server pages that need tour functionality but cannot add 'use client'"

requirements-completed: [REG-02, REG-05]

# Metrics
duration: 10min
completed: 2026-05-01
---

# Phase 17 Plan 08: OnboardingTour Redesign and Multi-Page Tour Launch Summary

**3-part Turkish onboarding tour with intro/transition screens and '?' FAB on 4 pages, closing GAP-3 from UAT**

## Performance

- **Duration:** 10 min
- **Started:** 2026-05-05T12:58:07Z
- **Completed:** 2026-05-05T13:08:31Z
- **Tasks:** 2
- **Files modified:** 7

## Accomplishments

### Task 1: Redesign OnboardingTour
- Completely rewrote OnboardingTour.jsx using a flat `TOUR_SEQUENCE` array (12 entries: 1 intro + 10 steps + 2 transitions)
- Part 1 (Profil Oluşturma): 4 steps with Adım N/4 counter, Sonraki/Atla buttons, Bitir on final step
- Part 2 (Ürün Ekleme): 3 steps, centered panels for informational steps (no spotlight)
- Part 3 (RFQ Oluşturma): 3 steps, centered panels for informational steps
- Intro screen: "CoreTG Kullanma Rehberine Hoşgeldiniz" with Başla button
- Transition 1→2: "Profiliniz tamamlandı!" with Devam Et
- Transition 2→3: "Harika!" with Devam Et
- Exported `TourHelpButton`: fixed `bottom-6 left-6` gold "?" circular FAB
- Updated CSS overlay to include background color for modal screens

### Task 2: Wire tour on 4 pages
- **Homepage**: added `showTourManual` state; TourHelpButton hidden while tour is active; auto-start behavior preserved
- **FAQ**: converted server component to client component; added TourHelpButton + OnboardingTour with tour state
- **About Us**: created `TourLauncher.jsx` client wrapper (server page keeps metadata export); renders TourHelpButton + OnboardingTour
- **Settings**: added useAuth + tour state to existing client component; TourHelpButton + OnboardingTour for authenticated users

## Task Commits

Each task was committed atomically:

1. **Task 1: Redesign OnboardingTour with 3-part Turkish content and TourHelpButton** - `83871f9` (feat)
2. **Task 2: Wire TourHelpButton and OnboardingTour on homepage, FAQ, About Us, Settings** - `c105a2e` (feat)

## Files Created/Modified

- `src/presentation/components/features/onboarding/OnboardingTour/OnboardingTour.jsx` - Full rewrite: 3-part Turkish tour, TourHelpButton export
- `src/presentation/components/features/onboarding/OnboardingTour/OnboardingTour.css` - Added background to overlay
- `src/app/(main)/page.js` - showTourManual state, TourHelpButton render, tour condition update
- `src/app/(main)/faq/page.js` - Converted to client, added tour integration
- `src/app/(main)/about-us/TourLauncher.jsx` - New client wrapper component
- `src/app/(main)/about-us/page.js` - Import + render TourLauncher
- `src/app/(main)/settings/page.jsx` - useAuth + tour state + TourHelpButton + OnboardingTour

## Decisions Made

- Flat `TOUR_SEQUENCE` array with type/part/partStep fields — single index navigation, no nested state machine
- `TourLauncher` client wrapper for About Us (server page with metadata) — preserves metadata export
- FAQ page converted to client component — simple page, no metadata export conflict
- TourHelpButton hidden while tour is active — prevents simultaneous FAB + tour render
- CSS overlay background added — modal intro/transition screens require visible darkening without spotlight cutout

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- GAP-3 from UAT (tour redesign) is now closed
- TourHelpButton visible on homepage, FAQ, About Us, and Settings for authenticated users
- Tour auto-starts on first login (existing behavior preserved)
- Tour can be relaunched at any time via the "?" FAB

## Self-Check: PASSED

All files confirmed present. Both task commits verified in git log.

---
*Phase: 17-registration-onboarding-and-misc*
*Completed: 2026-05-05*
