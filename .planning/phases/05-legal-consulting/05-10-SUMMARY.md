---
phase: 05-legal-consulting
plan: 10
subsystem: legal-channel
tags: [bug-fix, duplicate-prevention, review-ui, cloud-functions, gap-closure]
dependency_graph:
  requires: [05-05, 05-08]
  provides: [duplicate-hire-guard, review-prompt-ui, reviewedAt-dedup]
  affects: [LawyerProfileContent, LegalChannel, ChannelCenter, functions/hireLayyer, functions/submitLawyerReview]
tech_stack:
  added: []
  patterns: [runTransaction-existence-guard, reviewedAt-idempotency, client-loading-guard]
key_files:
  created:
    - src/presentation/components/features/legal/LegalChannel/ReviewPromptBanner.jsx
  modified:
    - src/presentation/components/features/legal/LawyerProfile/LawyerProfileContent.jsx
    - src/presentation/components/features/legal/LegalChannel/LegalChannel.jsx
    - src/presentation/components/features/legal/LegalChannel/ChannelCenter.jsx
    - functions/index.js
decisions:
  - "hireLayyer CF uses db.runTransaction for atomic existence check + set — prevents concurrent duplicate docs even when client guard is bypassed"
  - "Side effects (dealRef.update, sendLegalNotification) remain OUTSIDE the transaction to prevent duplicate sends on Firestore retry"
  - "submitLawyerReview CF sets reviewedAt on engagement doc — client-side banner checks engagement.reviewedAt to self-hide without refetch"
  - "ReviewPromptBanner uses amber-400 star icons matching project gold accent theme; submit button uses black text on amber for contrast"
metrics:
  duration: 3 minutes
  completed_date: "2026-03-18"
  tasks_completed: 2
  files_modified: 5
---

# Phase 05 Plan 10: Duplicate Hire Guard + Review Prompt UI Summary

**One-liner:** Firestore transaction-wrapped hire dedup and amber star-rating ReviewPromptBanner wired into completed engagement channel via reviewedAt idempotency.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Fix duplicate engagement creation — client guard + server transaction | 87a29e8 | LawyerProfileContent.jsx, functions/index.js |
| 2 | Build ReviewPromptBanner and wire into completed engagement channel | 7594ccd | ReviewPromptBanner.jsx (new), ChannelCenter.jsx, LegalChannel.jsx, functions/index.js |

## What Was Built

### Task 1: Duplicate Engagement Prevention

**Client-side guard:** Added `if (hireLoading) return;` at the top of `handleHireClick` in `LawyerProfileContent.jsx`. The button already had `disabled={hireLoading}` but that only blocks button click events — the early return also prevents programmatic calls and race conditions where the loading state flips mid-click.

**Server-side transaction:** Wrapped the existence check + set in `hireLayyer` CF inside `db.runTransaction`. Previously, a standalone `get()` followed by a standalone `set()` meant two concurrent requests could both pass the existence check and both write. The transaction makes the existence check + write atomic. Side effects (`dealRef.update` for lawyerIds, `sendLegalNotification`) remain outside the transaction following the established project pattern for non-duplicate notification sends.

### Task 2: Review Prompt UI

**ReviewPromptBanner.jsx:** New component with 5-star interactive rating (amber-400 filled/outline stars using lucide `Star`), hover state tracking, optional comment textarea (max 1000 chars with char counter), and a "Submit Review" button disabled when no rating or while loading. Styled in the project's dark theme (#1A283B background, amber-400 accents).

**submitLawyerReview CF update:** After writing to `users/{lawyerId}/reviews`, the CF now also writes `reviewedAt: Timestamp.now()` to the engagement document. This creates an idempotency guard — the client banner checks `engagement.reviewedAt` and hides itself once set, preventing duplicate submissions without needing a separate duplicate-check gate.

**Wiring:** `LegalChannel.jsx` destructures `submitReview` from `useLegalActions`, creates `handleSubmitReview` handler, and passes `onSubmitReview` + `reviewLoading` to `ChannelCenter`. `ChannelCenter` renders `ReviewPromptBanner` above the read-only notice when `isReadOnly && !isLawyer && !engagement?.reviewedAt`.

## Verification

- [x] `hireLoading` early-return guard in `handleHireClick`
- [x] `hireLayyer` CF uses `db.runTransaction` with `t.get(engagementRef)` + `t.set(engagementRef)`
- [x] `ReviewPromptBanner.jsx` exists with star rating UI
- [x] `ChannelCenter` conditionally renders `ReviewPromptBanner` for client on completed, unreviewed engagement
- [x] `submitLawyerReview` CF writes `reviewedAt` to engagement document
- [x] `submitReview` wired in `LegalChannel` and passed to `ChannelCenter`
- [x] `npm run build` passes

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check: PASSED

- ReviewPromptBanner.jsx: FOUND
- LawyerProfileContent.jsx hireLoading guard: FOUND
- functions/index.js runTransaction wraps engagementRef: FOUND
- functions/index.js reviewedAt on submitLawyerReview: FOUND
- ChannelCenter ReviewPromptBanner conditional render: FOUND
- Commits 87a29e8, 7594ccd: FOUND
