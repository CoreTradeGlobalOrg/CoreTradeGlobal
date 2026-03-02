---
phase: 04-provider-portals-and-insurance-logistics-quotes-s3
plan: "02"
subsystem: api
tags: [firebase, cloud-functions, firestore, quotes, insurance, logistics, provider-portal]

# Dependency graph
requires:
  - phase: 03-contract-agreement-s2
    provides: contract_approved deal status transition that triggers broadcastQuoteRequests
provides:
  - broadcastQuoteRequests helper: creates per-provider quoteRequest docs with price-separated dealSnapshots
  - submitQuote Cloud Function: insurance/logistics quote creation and editing
  - acceptQuote Cloud Function: server-side expiry-validated quote acceptance
  - declineQuoteRequest Cloud Function: provider decline of pending requests
  - withdrawQuote Cloud Function: provider withdrawal of active quotes
  - confirmProviderSelection Cloud Function: buyer confirms selections, advances deal to providers_selected
  - checkExpiredQuotes scheduled function: expires overdue requests and quotes every 30 minutes
  - Firestore security rules: quoteRequests and providerQuotes read restricted to participants; all writes CF-only
  - Composite indexes: all query patterns for provider portal, buyer quotes page, and scheduled functions
affects:
  - 04-03: provider portal UI will use submitQuote, declineQuoteRequest, withdrawQuote
  - 04-04: buyer quotes UI will use acceptQuote, confirmProviderSelection

# Tech tracking
tech-stack:
  added: []
  patterns:
    - broadcastQuoteRequests is a private helper (not exported) called outside transactions — same pattern as sendDealNotifications
    - Logistics dealSnapshot uses explicit field allowlist — price/estimatedTotal never included even via spread (PORTAL-05)
    - acceptQuote uses runTransaction with server-side validUntil check — client-side timers are display-only (QUOTE-04)
    - Denormalized buyerId/sellerId on providerQuotes docs — avoids get() in Firestore rules
    - confirmProviderSelection: transaction advances deal status, then batch updates non-selected requests post-transaction

key-files:
  created: []
  modified:
    - functions/index.js
    - firestore.rules
    - firestore.indexes.json

key-decisions:
  - "PROVIDERS_SELECTED added to DEAL_STATUS CJS constants — enables confirmProviderSelection transition"
  - "QUOTE_REQUEST_STATUS and QUOTE_STATUS constants defined as CJS objects in functions/index.js (cannot import ESM from Next.js app)"
  - "broadcastQuoteRequests uses explicit allowlist for logistics dealSnapshot (not spread-then-delete) — eliminates any risk of price leakage"
  - "acceptQuote server-side expiry check: quote.validUntil.toMillis() <= Timestamp.now().toMillis() inside runTransaction — QUOTE-04 compliance"
  - "Firestore rules for providerQuotes use denormalized buyerId/sellerId on quote doc — avoids get() calls per security rule best practices"
  - "checkExpiredQuotes treats deadline-passed pending requests as 'declined' (not a separate status) — keeps status space clean"

patterns-established:
  - "Price separation pattern: insurance gets full dealSnapshot with price; logistics uses explicit allowlist without price/estimatedTotal"
  - "Server-side validity enforcement: all expiry/deadline checks inside runTransaction, never trust client timers"
  - "Notification side effects always outside transactions — non-fatal try/catch, never blocks main flow"

requirements-completed: [QUOTE-04, QUOTE-05, PORTAL-02, PORTAL-04, PORTAL-05]

# Metrics
duration: 4min
completed: 2026-03-02
---

# Phase 4 Plan 02: Quote Request Broadcasting and Provider Quote Lifecycle Summary

**Server-side quote request broadcasting with price-separated dealSnapshots, full quote CRUD lifecycle (submit/accept/decline/withdraw/confirm), and scheduled expiry via 7 Cloud Functions + Firestore rules + 5 composite indexes**

## Performance

- **Duration:** 4 min
- **Started:** 2026-03-02T16:09:58Z
- **Completed:** 2026-03-02T16:13:41Z
- **Tasks:** 2
- **Files modified:** 3

## Accomplishments

- Implemented broadcastQuoteRequests with price-separated dealSnapshots — logistics providers never receive price/estimatedTotal (PORTAL-05)
- Implemented acceptQuote with server-side validUntil expiry check inside runTransaction (QUOTE-04) — client timers are display-only
- Implemented full provider lifecycle: submit, decline, withdraw, plus buyer confirmation advancing deal to providers_selected (QUOTE-05)
- Implemented checkExpiredQuotes scheduled function expiring overdue requests and quotes every 30 minutes
- Added Firestore security rules denying all client writes to quoteRequests/providerQuotes; reads restricted to participants using denormalized fields
- Added 5 composite indexes covering all provider portal, buyer quotes, and scheduler query patterns

## Task Commits

Each task was committed atomically:

1. **Task 1: Cloud Functions — broadcast trigger, quote submission, and acceptance** - `cafc4a2` (feat)
2. **Task 2: Cloud Functions — decline, withdraw, confirm selection, scheduled expiry + Firestore rules and indexes** - `3995d5b` (feat)

**Plan metadata:** (docs commit — see below)

## Files Created/Modified

- `/Users/wenubey/Desktop/CTG/core-trade-global/functions/index.js` - Added PROVIDERS_SELECTED/QUOTE_REQUEST_STATUS/QUOTE_STATUS constants; broadcastQuoteRequests helper; submitQuote, acceptQuote, declineQuoteRequest, withdrawQuote, confirmProviderSelection exports; checkExpiredQuotes scheduled function; broadcastQuoteRequests hook in onDealStatusChanged
- `/Users/wenubey/Desktop/CTG/core-trade-global/firestore.rules` - Added quoteRequests and providerQuotes subcollection rules (participant-only reads, all writes CF-only)
- `/Users/wenubey/Desktop/CTG/core-trade-global/firestore.indexes.json` - Added 5 composite indexes for quoteRequests (providerUid+createdAt, dealId+createdAt, status+deadline) and providerQuotes collectionGroup (dealId+createdAt, status+validUntil)

## Decisions Made

- `broadcastQuoteRequests` uses an explicit field allowlist (not spread-then-delete) for the logistics dealSnapshot — eliminates any risk of price leakage even through future field additions
- Server-side expiry check in `acceptQuote` uses `quote.validUntil.toMillis() <= Timestamp.now().toMillis()` inside `runTransaction` — QUOTE-04 compliance; client countdown timers are display-only
- `checkExpiredQuotes` transitions deadline-passed pending requests to 'declined' — reuses existing status value to keep status space minimal
- Notifications (buyer quote received, provider quote accepted/not-selected) use simple in-app notification writes — avoids coupling to sendDealNotifications which is deal-centric; all are non-blocking with try/catch
- `confirmProviderSelection` requires at least one selected provider (insurance OR logistics) before advancing — partial selection is allowed by design

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- All server-side quote logic is complete and ready for provider portal UI (Plan 03)
- Buyer quote review UI (Plan 04) can use acceptQuote and confirmProviderSelection
- Firestore indexes must be deployed (`firebase deploy --only firestore:indexes`) before provider portal queries will work
- Cloud Functions must be deployed (`firebase deploy --only functions`) to enable broadcastQuoteRequests and all new exports

---
*Phase: 04-provider-portals-and-insurance-logistics-quotes-s3*
*Completed: 2026-03-02*
