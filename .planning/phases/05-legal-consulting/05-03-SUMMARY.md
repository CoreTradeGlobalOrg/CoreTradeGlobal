---
phase: 05-legal-consulting
plan: 03
subsystem: ui
tags: [react, next-js, tailwind, lucide-react, firestore, lawyer-directory, profile]

# Dependency graph
requires:
  - phase: 05-legal-consulting-01
    provides: UserRepository base class, SUBCOLLECTIONS.REVIEWS constant, DI container pattern
  - phase: 01-role-system-and-infrastructure
    provides: useAuth hook, role-aware routing, RoleBadge component
provides:
  - LawyerDirectory component with search, specialization/availability/language filters, skeleton loading, empty state
  - LawyerCard with initials avatar, specialization pills, availability badge, star rating, $200/deal pricing
  - useLawyerDirectory hook with client-side filter+sort (available first, then rating, then alphabetical)
  - LawyerProfileContent with 4 stat cards, about section, availability/pricing, reviews subcollection fetch
  - UserRepository.getLawyers() — queries users by role='lawyer' with limit 50
  - UserRepository.getLawyerReviews() — reads reviews subcollection ordered by createdAt desc
  - /lawyers route (src/app/(main)/lawyers/page.jsx) with auth guard
  - Profile page adaptation: renders LawyerProfileContent when profileUser.role === 'lawyer'
affects:
  - 05-04 (legal chat UI - links from LawyerProfileContent Hire CTA)
  - 05-05 (risk and contract draft UI)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Client-side filtering with useMemo for small collections (lawyer directory)
    - Role-adapted profile page: conditional render by profileUser.role with React fragment guard
    - Initials avatar fallback for missing profile photos (split displayName by space, take first 2 chars)
    - UserRepository subcollection query via querySubcollection (USERS/{id}/reviews)

key-files:
  created:
    - src/presentation/hooks/legal/useLawyerDirectory.js
    - src/app/(main)/lawyers/page.jsx
    - src/presentation/components/features/legal/LawyerDirectory/LawyerDirectory.jsx
    - src/presentation/components/features/legal/LawyerDirectory/LawyerCard.jsx
    - src/presentation/components/features/legal/LawyerProfile/LawyerProfileContent.jsx
  modified:
    - src/data/repositories/UserRepository.js
    - src/app/(main)/profile/[userId]/page.jsx

key-decisions:
  - "Client-side filter for lawyer directory: Firestore cannot combine array-contains (specializations) + array-contains (languages) in one query; lawyer population is small enough to fetch all and filter client-side"
  - "Profile page wraps member-specific sections (documents, products, requests, account settings) in {role !== 'lawyer'} fragment — clean separation without modifying the shared profile header"
  - "querySubcollection used for getLawyerReviews (USERS/lawyerId/reviews) — follows existing querySubcollection pattern in FirestoreDataSource"
  - "Hire button shows informational toast 'Select a deal first' — actual hire flow is Plan 05-04 scope"

patterns-established:
  - "useLawyerDirectory: fetch-all + useMemo filter pattern for small collections; DEFAULT_FILTERS object for clean reset"
  - "LawyerCard: entire card is a Link to /profile/[userId] — card-as-link pattern for directory grids"
  - "LawyerProfileContent: self-contained reviews fetch via useEffect + container — no prop drilling required"

requirements-completed: [LEGAL-01, LEGAL-02]

# Metrics
duration: 5min
completed: 2026-03-10
---

# Phase 05 Plan 03: Lawyer Directory and Profile Summary

**Lawyer directory at /lawyers with search/filter cards and role-adapted profile page showing LawyerProfileContent (stats, specializations, pricing, reviews) for lawyer users**

## Performance

- **Duration:** 5 min
- **Started:** 2026-03-10T14:56:01Z
- **Completed:** 2026-03-10T15:01:00Z
- **Tasks:** 2
- **Files modified:** 7 (5 created, 2 updated)

## Accomplishments

- Created `useLawyerDirectory` hook with client-side filtering (search, specialization, availability, language), sort (available first, then rating, then alphabetical), and memoized results
- Added `UserRepository.getLawyers()` and `UserRepository.getLawyerReviews()` methods following existing repository patterns
- Built full lawyer directory UI: search bar, 5 specialization pills, "Available Now" toggle, language dropdown, active filter tags with X removal, result count, 3-col responsive grid, skeleton loading (6 cards), empty state with clear filters CTA
- Created `LawyerCard` with initials avatar fallback, first 2 specialization pills, availability badge (CheckCircle/Clock icons), star rating, and `$200/deal` pricing — entire card is a Next.js Link to `/profile/{id}`
- Created `LawyerProfileContent` with 4 stat cards (experience, deals, rating, response time), about section (education, specializations, languages), availability/pricing card with Hire CTA, and reviews section loading from subcollection
- Adapted `/profile/[userId]` page to conditionally render `LawyerProfileContent` when `profileUser.role === 'lawyer'`, hiding member-specific sections (documents, products, requests, account settings)

## Task Commits

Each task was committed atomically:

1. **Task 1: Add getLawyers/getLawyerReviews to UserRepository and create useLawyerDirectory hook** - `85156da` (feat)
2. **Task 2: Create lawyer directory page, cards, and profile adaptation** - `2ff5dca` (feat)

## Files Created/Modified

- `src/data/repositories/UserRepository.js` - Added getLawyers() and getLawyerReviews() methods; added SUBCOLLECTIONS import
- `src/presentation/hooks/legal/useLawyerDirectory.js` - Hook with fetch, client-side filtering, sorting, and clearFilters
- `src/app/(main)/lawyers/page.jsx` - /lawyers route with auth guard, renders LawyerDirectory
- `src/presentation/components/features/legal/LawyerDirectory/LawyerDirectory.jsx` - Full directory with search, filters, responsive grid, loading/empty states
- `src/presentation/components/features/legal/LawyerDirectory/LawyerCard.jsx` - Compact lawyer card with star rating helper and initials avatar fallback
- `src/presentation/components/features/legal/LawyerProfile/LawyerProfileContent.jsx` - Role-adapted profile body with stats, about, availability, pricing, and reviews
- `src/app/(main)/profile/[userId]/page.jsx` - Added LawyerProfileContent import and role conditional render

## Decisions Made

- **Client-side filtering in useLawyerDirectory**: Firestore cannot combine multiple `array-contains` filters in a single query. Since the lawyer population is small (directory-grade), fetching all lawyers once and filtering client-side with `useMemo` is the correct approach.
- **Profile page structure**: Member-specific sections (CompanyDocuments, Products, Requests, Account Settings) wrapped in `{profileUser?.role !== 'lawyer' && (<>...</>)}` — keeps the shared profile header (name, photo, company info) unchanged while cleanly swapping the body content.
- **Hire CTA placeholder**: The "Hire This Lawyer" button shows an informational toast ("Select a deal first") rather than opening a modal — the actual hire flow requires selecting a deal, which is Plan 05-04 scope.
- **querySubcollection for reviews**: Used `firestoreDataSource.querySubcollection(USERS, lawyerId, REVIEWS, ...)` — follows the existing subcollection query pattern already established in FirestoreDataSource.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- ESLint reported a broken configuration (circular structure to JSON) but this is a pre-existing issue unrelated to this plan. The build (`npx next build`) succeeded cleanly, confirming no compilation issues with the new code.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- /lawyers directory page is live and ready for testing with real lawyer user accounts
- LawyerProfileContent "Hire This Lawyer" button is a placeholder — Plan 05-04 will implement the actual engagement creation flow (CF call + hire modal)
- UserRepository.getLawyerReviews() is ready for Plan 05-05 (post-engagement review submission)

## Self-Check: PASSED

- FOUND: src/presentation/hooks/legal/useLawyerDirectory.js
- FOUND: src/app/(main)/lawyers/page.jsx
- FOUND: src/presentation/components/features/legal/LawyerDirectory/LawyerDirectory.jsx
- FOUND: src/presentation/components/features/legal/LawyerDirectory/LawyerCard.jsx
- FOUND: src/presentation/components/features/legal/LawyerProfile/LawyerProfileContent.jsx
- FOUND: .planning/phases/05-legal-consulting/05-03-SUMMARY.md
- FOUND commit: 85156da (feat(05-03): add getLawyers, getLawyerReviews to UserRepository and create useLawyerDirectory hook)
- FOUND commit: 2ff5dca (feat(05-03): create lawyer directory page, cards, and profile adaptation)

---
*Phase: 05-legal-consulting*
*Completed: 2026-03-10*
