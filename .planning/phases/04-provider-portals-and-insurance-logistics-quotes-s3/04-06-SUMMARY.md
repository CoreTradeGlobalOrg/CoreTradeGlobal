---
phase: 04-provider-portals-and-insurance-logistics-quotes-s3
plan: "06"
subsystem: quote-system
tags: [gap-closure, providerType-normalization, withdraw-quote, real-time-subscription]
dependency_graph:
  requires:
    - 04-01 (Quote/QuoteRequest entities)
    - 04-02 (Cloud Functions: broadcastQuoteRequests, submitQuote, withdrawQuote)
    - 04-03 (ProviderDashboard, QuoteDetailView, QuoteDetailWithExistingQuote)
    - 04-04 (useQuotesForDeal, InsuranceQuoteCard, LogisticsQuoteCard, QuotesPage)
  provides:
    - providerType normalization in all entity fromFirestore methods
    - useQuoteForRequest hook for real-time provider quote subscription
    - ProviderDashboard passes real existingQuote to QuoteDetailView
    - Withdraw button visible for quoted requests
  affects:
    - Buyer quotes comparison page (gaps 7-9: quote cards now visible)
    - Provider dashboard detail view (gap 10: withdraw button visible)
tech_stack:
  added: []
  patterns:
    - useRef subscription cleanup (same as useQuoteRequests)
    - Wrapper component extraction for React hooks rules compliance
    - normalizeProviderType helper in entity fromFirestore methods
key_files:
  created:
    - src/presentation/hooks/quote/useQuoteForRequest.js
  modified:
    - functions/index.js
    - src/domain/entities/Quote.js
    - src/domain/entities/QuoteRequest.js
    - src/data/repositories/QuoteRepository.js
    - src/data/repositories/QuoteRequestRepository.js
    - src/presentation/hooks/quote/useQuotesForDeal.js
    - src/presentation/components/features/provider/ProviderDashboard/ProviderDashboard.jsx
decisions:
  - "[04-06]: QuoteDetailWithExistingQuote extracted as wrapper component — React hooks rules forbid conditional hook calls; wrapper ensures useQuoteForRequest is always called unconditionally"
  - "[04-06]: existingQuote passes null during quoteLoading to render form immediately in new-quote mode; populates within milliseconds via Firestore real-time"
  - "[04-06]: backfillQuoteParticipants remote-only migration function deleted before functions deploy — one-off migration was complete, no longer needed in codebase"
metrics:
  duration: "10 minutes"
  completed_date: "2026-03-03"
  tasks_completed: 2
  files_created: 1
  files_modified: 7
---

# Phase 4 Plan 6: UAT Gap Closure (providerType + Withdraw) Summary

One-liner: Closed UAT gaps 7-10 by normalizing providerType across entities/functions and wiring real existingQuote subscription into ProviderDashboard.

## What Was Built

This plan closed the four remaining UAT gaps from Phase 4 testing:

**Gaps 7-9 (Quote cards invisible on buyer comparison page):** All quote cards were invisible because providerType stored in Firestore as `insurance_provider`/`logistics_provider` (the user role) never matched the `insurance`/`logistics` filter used by `useQuotesForDeal`. Fixed by adding `normalizeProviderType()` helpers in both `Quote.fromFirestore` and `QuoteRequest.fromFirestore`, and normalizing at write-time in `broadcastQuoteRequests` Cloud Function.

**Gap 10 (Withdraw button hidden):** `ProviderDashboard` hardcoded `existingQuote={null}` when rendering `QuoteDetailView`. `QuoteDetailView` shows the Withdraw button only when `existingQuote?.isActive()` is true. Fixed by extracting `QuoteDetailWithExistingQuote` wrapper component that calls `useQuoteForRequest` to load the real quote from Firestore, then passes it as `existingQuote` to `QuoteDetailView`.

## Tasks Completed

| # | Task | Commits | Status |
|---|------|---------|--------|
| 1 | Commit providerType normalization fix and create useQuoteForRequest hook | 92828e3, 0e7e735 | Done |
| 2 | Wire useQuoteForRequest into ProviderDashboard and deploy functions | e663e41 + deploy | Done |

## Commits

- `92828e3` fix(04-06): normalize providerType in entities and broadcastQuoteRequests
- `0e7e735` feat(04-06): add useQuoteForRequest hook for provider quote subscription
- `e663e41` feat(04-06): wire useQuoteForRequest into ProviderDashboard for gap 10 fix

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking Issue] Remote-only `backfillQuoteParticipants` function prevented deploy**
- **Found during:** Task 2, Cloud Functions deploy
- **Issue:** `firebase deploy --only functions` aborted because `backfillQuoteParticipants` exists in remote but not in local code. This was a one-off migration function used during the debugging phase.
- **Fix:** Ran `firebase functions:delete backfillQuoteParticipants --region us-central1 --force` to remove the remote-only function, then re-ran the deploy successfully.
- **Files modified:** None (remote Firebase state only)
- **Commit:** N/A (deployment operation)

## Verification

- normalizeProviderType exists in `Quote.fromFirestore` and `QuoteRequest.fromFirestore`
- `functions/index.js` `broadcastQuoteRequests` normalizes providerType via isInsurance/isLogistics checks
- `useQuoteForRequest.js` created with real-time subscription to `QuoteRepository.subscribeToQuotesForRequest`
- `ProviderDashboard` no longer hardcodes `existingQuote={null}`
- `QuoteDetailWithExistingQuote` wrapper loads real quote via hook
- Cloud Functions deployed successfully (all functions updated)
- Firestore rules deployed (already up to date)
- `npm run build` passes with zero errors (Compiled successfully in 6.4s)

## Self-Check: PASSED

Files verified:
- FOUND: src/presentation/hooks/quote/useQuoteForRequest.js
- FOUND: src/presentation/components/features/provider/ProviderDashboard/ProviderDashboard.jsx (contains QuoteDetailWithExistingQuote)

Commits verified:
- FOUND: 92828e3 fix(04-06): normalize providerType in entities and broadcastQuoteRequests
- FOUND: 0e7e735 feat(04-06): add useQuoteForRequest hook for provider quote subscription
- FOUND: e663e41 feat(04-06): wire useQuoteForRequest into ProviderDashboard for gap 10 fix
