---
phase: 05-legal-consulting
plan: 04
subsystem: ui
tags: [react, next-js, tailwind, lucide-react, firestore, date-fns, legal-banner, lawyer-dashboard]

# Dependency graph
requires:
  - phase: 05-legal-consulting-01
    provides: LegalEngagementRepository with subscribeToEngagementForDeal, subscribeToEngagementsForLawyer, ENGAGEMENT_STATUS constants
  - phase: 05-legal-consulting-02
    provides: hireLayyer, respondToHireRequest, closeLegalEngagement Cloud Functions
  - phase: 05-legal-consulting-03
    provides: /lawyers directory page for hire CTA link target
provides:
  - useLegalEngagement hook — real-time subscription to a single engagement for a specific deal+client
  - useLegalEngagements hook — real-time subscription to all engagements for a lawyer with pending/active/completed splits
  - useLegalActions hook — hireLawyer, respondToHireRequest, closeLegalEngagement, submitReview CF wrappers
  - LegalBanner component — renders on DealPage at all stages; promotional hire CTA or compact engagement badge
  - LawyerDashboard component — lawyer engagement list grouped by status with stats and accept/decline actions
  - EngagementCard component — individual engagement card with status badge, client info, and action buttons
  - /lawyer/dashboard route — replaces Phase 1 placeholder, renders LawyerDashboard with auth+role guard
affects:
  - 05-05 (legal chat UI — uses useLegalEngagement and engagement.id for channel subscription)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - LegalBanner localStorage dismiss pattern — `${dealId}_legal_banner_dismissed` key prevents cross-party Firestore reads
    - Collapsible section pattern — useState toggle for completed engagements section in LawyerDashboard
    - useMemo status splits — filter pendingEngagements/activeEngagements/completedEngagements from raw array

key-files:
  created:
    - src/presentation/hooks/legal/useLegalEngagement.js
    - src/presentation/hooks/legal/useLegalEngagements.js
    - src/presentation/hooks/legal/useLegalActions.js
    - src/presentation/components/features/legal/LegalBanner/LegalBanner.jsx
    - src/presentation/components/features/legal/LawyerDashboard/LawyerDashboard.jsx
    - src/presentation/components/features/legal/LawyerDashboard/EngagementCard.jsx
    - src/app/(main)/lawyer/dashboard/page.jsx
  modified:
    - src/presentation/components/features/deal/DealPage/DealPage.jsx

key-decisions:
  - "LegalBanner localStorage dismiss key is `${dealId}_legal_banner_dismissed` (not a global flag) — per-deal dismiss prevents one dismissed deal from hiding banner on another deal"
  - "LegalBanner loading guard returns null — avoids flash of promotional content before subscription resolves, preventing brief incorrect state"
  - "LawyerDashboard completed section is collapsible (closed by default) — keeps dashboard focused on actionable items; completed history is secondary"
  - "/lawyer/dashboard page uses ROLES.LAWYER + ROLES.ADMIN in role guard — admin can review lawyer dashboard for support purposes"

patterns-established:
  - "useLegalEngagement: same useEffect+cleanup pattern as useContract — container.getLegalEngagementRepository().subscribeToEngagementForDeal"
  - "useLegalEngagements: adds useMemo splits on top of subscription — three derived arrays from single subscription"
  - "LegalBanner: manages show/hide internally — DealPage renders unconditionally, banner handles all its own state logic"

requirements-completed: [LEGAL-01, LEGAL-02, LEGAL-08, LEGAL-04]

# Metrics
duration: 8min
completed: 2026-03-10
---

# Phase 05 Plan 04: Legal Hiring UX Summary

**LegalBanner on DealPage (promotional hire CTA or active engagement badge), LawyerDashboard at /lawyer/dashboard, and 3 hooks wiring real-time Firestore subscriptions and Cloud Function calls for the full engagement lifecycle**

## Performance

- **Duration:** 8 min
- **Started:** 2026-03-10T15:05:00Z
- **Completed:** 2026-03-10T15:13:00Z
- **Tasks:** 2
- **Files modified:** 8 (7 created, 1 updated)

## Accomplishments

- Created `useLegalEngagement` (deal+client subscription), `useLegalEngagements` (all lawyer engagements with pending/active/completed useMemo splits), and `useLegalActions` (hireLawyer, respondToHireRequest, closeLegalEngagement, submitReview wrapping Cloud Functions) — all follow existing project patterns with loading, error state, and useEffect cleanup
- Built `LegalBanner` with two modes: promotional card (gold gradient, feature list, $200/deal pricing badge, "Find a Lawyer" CTA linking to `/lawyers?dealId=...`, dismiss stored in localStorage) and compact engagement badge (lawyer name, status, Open Channel link) — dismissal uses `${dealId}_legal_banner_dismissed` key per-deal
- Integrated LegalBanner unconditionally into DealPage after terminal banner — renders at all stages, manages show/hide internally (privacy maintained: never queries opposing party's engagement)
- Built `LawyerDashboard` with 4 stat cards (total/active/pending/completed), three status sections (Pending Requests with accept/decline, Active Engagements with Open Channel, Completed collapsible with View Channel), skeleton loading, and empty states per section
- Created `EngagementCard` showing client name, deal product, status badge (colored by status), time since creation via date-fns formatDistanceToNow, and status-appropriate action buttons
- Created `/lawyer/dashboard` page replacing Phase 1 placeholder — auth guard + role guard (ROLES.LAWYER or ROLES.ADMIN), Suspense wrapper for app router compatibility

## Task Commits

Each task was committed atomically:

1. **Task 1: Create legal hooks (useLegalEngagement, useLegalEngagements, useLegalActions)** - `3460b5f` (feat)
2. **Task 2: Create LegalBanner on DealPage and LawyerDashboard** - `fa7b9b1` (feat)

## Files Created/Modified

- `src/presentation/hooks/legal/useLegalEngagement.js` - Real-time subscription to engagement for specific deal+client
- `src/presentation/hooks/legal/useLegalEngagements.js` - Subscription to all lawyer engagements with pending/active/completed derived arrays
- `src/presentation/hooks/legal/useLegalActions.js` - CF wrappers: hireLawyer, respondToHireRequest, closeLegalEngagement, submitReview
- `src/presentation/components/features/legal/LegalBanner/LegalBanner.jsx` - DealPage banner: hire CTA (dismissible via localStorage) or active engagement badge
- `src/presentation/components/features/legal/LawyerDashboard/LawyerDashboard.jsx` - Dashboard with 4 stats, 3 sections, collapsible completed
- `src/presentation/components/features/legal/LawyerDashboard/EngagementCard.jsx` - Engagement card with status, client, deal product, action buttons
- `src/app/(main)/lawyer/dashboard/page.jsx` - /lawyer/dashboard route with auth+role guard, Suspense wrapper
- `src/presentation/components/features/deal/DealPage/DealPage.jsx` - Added LegalBanner import and unconditional render

## Decisions Made

- **Per-deal dismiss key**: localStorage key is `${dealId}_legal_banner_dismissed` — a global dismiss flag would hide the banner across all deals. Per-deal dismiss lets users who don't want legal help on one deal still see the banner on a new deal where they might want it.
- **LegalBanner loading guard returns null**: During the brief loading window while the subscription resolves, returning null prevents a flash of the promotional content that would then disappear — a better experience than showing and hiding the card.
- **Completed section collapsed by default**: The actionable items (pending, active) are shown immediately; completed history is secondary and can be expanded. This keeps the dashboard focused on what needs attention.
- **ROLES.ADMIN in lawyer dashboard role guard**: Admins can access the lawyer dashboard for support/debugging purposes — consistent with the pattern established for provider dashboard.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

- ESLint configuration has a pre-existing circular structure JSON error (noted in Plan 03 SUMMARY as well). `npm run lint` fails but `npm run build` succeeds cleanly — confirms no compilation issues with new code.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- LegalBanner on DealPage is live and ready — members hiring lawyers from the `/lawyers` directory will return to the deal page and see their engagement status update in real time
- LawyerDashboard at `/lawyer/dashboard` is fully functional with real-time Firestore subscriptions
- `useLegalActions.hireLawyer()` is wired to the `hireLayyer` CF — the hire button on LawyerProfileContent (Plan 03) can now call this hook to complete the hire flow
- Plan 05-05 (legal chat UI) can use `useLegalEngagement` to subscribe to the channel and `useLegalActions` for quick actions

## Self-Check: PASSED

- FOUND: src/presentation/hooks/legal/useLegalEngagement.js
- FOUND: src/presentation/hooks/legal/useLegalEngagements.js
- FOUND: src/presentation/hooks/legal/useLegalActions.js
- FOUND: src/presentation/components/features/legal/LegalBanner/LegalBanner.jsx
- FOUND: src/presentation/components/features/legal/LawyerDashboard/LawyerDashboard.jsx
- FOUND: src/presentation/components/features/legal/LawyerDashboard/EngagementCard.jsx
- FOUND: src/app/(main)/lawyer/dashboard/page.jsx
- FOUND commit: 3460b5f (feat(05-04): create useLegalEngagement, useLegalEngagements, useLegalActions hooks)
- FOUND commit: fa7b9b1 (feat(05-04): create LegalBanner, LawyerDashboard, EngagementCard, and lawyer dashboard page)

---
*Phase: 05-legal-consulting*
*Completed: 2026-03-10*
