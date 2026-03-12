---
phase: 05-legal-consulting
plan: 07
subsystem: ui
tags: [react, nextjs, firebase, useSearchParams, Suspense]

# Dependency graph
requires:
  - phase: 05-legal-consulting
    provides: LegalBanner, LawyerDirectory, LawyerCard, LawyerProfileContent, useLegalActions
provides:
  - Readable "Find a Lawyer" button (black text on gold background)
  - dealId persists through full hire flow: deal page -> /lawyers?dealId -> /profile/{id}?dealId -> hireLawyer CF
  - LawyerProfileContent reads dealId from URL and calls hireLawyer(dealId, lawyerId) Cloud Function
affects:
  - UAT tests 3, 4, 5-10, 14

# Tech tracking
tech-stack:
  added: []
  patterns:
    - useSearchParams + Suspense boundary in page.jsx for Next.js app router compatibility
    - dealId forwarded as query param through multi-hop navigation chain

key-files:
  created: []
  modified:
    - src/presentation/components/features/legal/LegalBanner/LegalBanner.jsx
    - src/app/(main)/lawyers/page.jsx
    - src/presentation/components/features/legal/LawyerDirectory/LawyerDirectory.jsx
    - src/presentation/components/features/legal/LawyerDirectory/LawyerCard.jsx
    - src/presentation/components/features/legal/LawyerProfile/LawyerProfileContent.jsx

key-decisions:
  - "text-black replaces text-[#0F1C2E] on Find a Lawyer button — ensures full contrast on gold #FFD700 background"
  - "useSearchParams requires Suspense boundary in page.jsx (Next.js app router static rendering requirement); no Suspense needed in non-page 'use client' components like LawyerProfileContent"
  - "dealId forwarded as query param at each navigation hop rather than stored in global state — simpler, URL-shareable, no client state sync issues"

patterns-established:
  - "Suspense + useSearchParams pattern: wrap page body in inner component; outer default export provides Suspense with loading spinner fallback"

requirements-completed:
  - LEGAL-01
  - LEGAL-02

# Metrics
duration: 2min
completed: 2026-03-12
---

# Phase 05 Plan 07: Fix Hire-a-Lawyer Flow (dealId Persistence + Button Contrast) Summary

**End-to-end hire flow fixed: dealId propagated via URL query params through LegalBanner -> /lawyers -> LawyerCard -> LawyerProfileContent, which now calls hireLawyer Cloud Function instead of always showing toast**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-12T03:36:03Z
- **Completed:** 2026-03-12T03:38:05Z
- **Tasks:** 2
- **Files modified:** 5

## Accomplishments
- "Find a Lawyer" button text changed to `text-black` for clear readability on gold `#FFD700` background (UAT Test 3 fix)
- dealId flows end-to-end: `LegalBanner` links to `/lawyers?dealId=...`, `/lawyers` page extracts via `useSearchParams` and passes to `LawyerDirectory`, `LawyerDirectory` passes to each `LawyerCard`, `LawyerCard` appends `?dealId=...` to profile link href
- `LawyerProfileContent` now reads dealId from URL and calls `hireLawyer(dealId, lawyerId)` CF; shows informational toast only when dealId is absent (direct navigation); button shows disabled/loading state during request (UAT Test 4 fix, unblocks Tests 5-10 and 14)

## Task Commits

Each task was committed atomically:

1. **Task 1: Fix LegalBanner text contrast and wire dealId through lawyer directory** - `e4d9743` (feat)
2. **Task 2: Wire LawyerProfileContent to read dealId and call hireLawyer CF** - `41aa939` (feat)

## Files Created/Modified
- `src/presentation/components/features/legal/LegalBanner/LegalBanner.jsx` - Changed button text color from `text-[#0F1C2E]` to `text-black`
- `src/app/(main)/lawyers/page.jsx` - Added `useSearchParams` + Suspense boundary; extracts `dealId` and passes to `LawyerDirectory`
- `src/presentation/components/features/legal/LawyerDirectory/LawyerDirectory.jsx` - Accepts `dealId` prop, forwards to each `LawyerCard`
- `src/presentation/components/features/legal/LawyerDirectory/LawyerCard.jsx` - Accepts `dealId` prop, appends `?dealId=...` to profile link href when present
- `src/presentation/components/features/legal/LawyerProfile/LawyerProfileContent.jsx` - Reads dealId via `useSearchParams`, calls `hireLawyer(dealId, id)` from `useLegalActions`; button shows loading/disabled state

## Decisions Made
- `text-black` used instead of `text-[#0F1C2E]` — the navy color has insufficient contrast against `#FFD700` gold; black ensures WCAG-compliant readability
- Suspense boundary only needed in `page.jsx` (Next.js app router static rendering requirement for `useSearchParams`); LawyerProfileContent is a `use client` component that is NOT a page route and does not need a Suspense boundary
- dealId passed as URL query param at each hop rather than stored in global state — URL-shareable, no sync needed, matches existing pattern for `dealId` in other flows

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None - straightforward implementation following the exact plan specifications.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- UAT Tests 3 and 4 are now unblocked
- UAT Tests 5-10 and 14 are unblocked (all dependent on successful hire from Test 4)
- Full hire flow is end-to-end functional: deal page -> Find a Lawyer -> lawyer directory -> lawyer card -> lawyer profile -> Hire This Lawyer -> engagement created via CF

---
*Phase: 05-legal-consulting*
*Completed: 2026-03-12*

## Self-Check: PASSED

- FOUND: src/presentation/components/features/legal/LegalBanner/LegalBanner.jsx
- FOUND: src/app/(main)/lawyers/page.jsx
- FOUND: src/presentation/components/features/legal/LawyerDirectory/LawyerDirectory.jsx
- FOUND: src/presentation/components/features/legal/LawyerDirectory/LawyerCard.jsx
- FOUND: src/presentation/components/features/legal/LawyerProfile/LawyerProfileContent.jsx
- FOUND commit: e4d9743 (Task 1)
- FOUND commit: 41aa939 (Task 2)
