---
phase: 02-deal-creation-and-negotiation-s1
plan: "04"
subsystem: notifications, scheduling
tags: [resend, firebase-cloud-functions, fcm, firestore-triggers, scheduled-functions, deal-negotiation]

# Dependency graph
requires:
  - phase: 02-deal-creation-and-negotiation-s1/02-01
    provides: deal CF infrastructure (createDeal, submitCounterOffer, acceptOffer, rejectOffer, withdrawOffer, DEAL_STATUS/OFFER_STATUS constants)
  - phase: 02-deal-creation-and-negotiation-s1/02-02
    provides: My Deals list UI, DealCard, DealList, Navbar My Deals link
  - phase: 02-deal-creation-and-negotiation-s1/02-03
    provides: DealPage, offer timeline, counter-offer UI, useDealPresence (viewingDealId/viewingDealSince heartbeat)
provides:
  - onDealOfferCreated trigger: sends in-app + FCM + email notifications on new offers
  - onDealStatusChanged trigger: sends notifications on accepted/rejected/withdrawn/expired
  - sendDealNotifications helper: 3-channel notification orchestrator with smart FCM suppression
  - sendDealEmail helper: Resend SDK wrapper (non-blocking, dev sender)
  - renewOffer CF: reactivates expired offers with new deadline
  - checkExpiredOffers scheduler: every 30 min batch transition of expired offers/deals
  - sendExpiryReminders scheduler: 24h/4h/1h expiry warnings via in-app + email
affects:
  - 02-05 (if exists): full notification system available
  - Phase 03 (contract generation): onDealStatusChanged already fires on 'accepted' — Phase 3 can independently trigger contract generation

# Tech tracking
tech-stack:
  added:
    - resend@6.9.2 (transactional email SDK, installed in functions/)
  patterns:
    - All notification side effects called OUTSIDE Firestore transactions (prevents duplicate sends on retry)
    - sendDealEmail is non-blocking — email failure never fails the Cloud Function
    - Smart FCM suppression: check viewingDealId + viewingDealSince (60s staleness) before sending push
    - remindersSet arrayUnion for dedup on expiry reminders (prevents race conditions)
    - Batched writes for bulk expiry transitions (not transactions — multiple documents)
    - onDocumentUpdated used for deal status change detection (before/after comparison)

key-files:
  created: []
  modified:
    - functions/index.js (Resend integration, onDealOfferCreated, onDealStatusChanged, renewOffer, checkExpiredOffers, sendExpiryReminders)
    - functions/package.json (resend dependency added)
    - functions/package-lock.json (lock file updated)

key-decisions:
  - "Resend uses onboarding@resend.dev sender in Phase 2 dev — custom domain not required yet, switch before production"
  - "sendDealEmail is non-blocking (try/catch, log error, continue) — email failure never fails CF"
  - "Smart FCM suppression: viewingDealId === dealId AND viewingDealSince > now - 60000ms — from useDealPresence heartbeat"
  - "All notification side effects called OUTSIDE Firestore transactions — prevents duplicate sends on retry"
  - "checkExpiredOffers uses batched writes (not transactions) for bulk multi-document expiry transitions"
  - "remindersSet uses arrayUnion for dedup — prevents race conditions when two scheduler invocations overlap"
  - "onDealStatusChanged uses before.currentTurnUid as actorUid for accepted/rejected — that's who made the move"
  - "sendExpiryReminders runs as a separate scheduled function every 30 min — keeps checkExpiredOffers single-purpose"

patterns-established:
  - "Pattern: All deal side effects (notifications, system messages) run OUTSIDE transactions"
  - "Pattern: Resend email integration — non-blocking wrapper, dev sender, HTML template with CTG branding"
  - "Pattern: remindersSet array field on offer doc tracks which reminder levels have been sent"

requirements-completed:
  - NEGO-05
  - NEGO-06

# Metrics
duration: 3min
completed: 2026-02-22
---

# Phase 2 Plan 04: Deal Notifications and Expiry Automation Summary

**Resend email + FCM push + Firestore in-app notifications for all deal events, with smart suppression, 30-min expiry scheduler, and 24h/4h/1h reminder system**

## Performance

- **Duration:** 3 min
- **Started:** 2026-02-22T20:39:38Z
- **Completed:** 2026-02-22T20:42:38Z
- **Tasks:** 2 of 3 (Task 3 is checkpoint:human-verify — awaiting verification)
- **Files modified:** 3

## Accomplishments
- Resend SDK integrated with `sendDealEmail` helper (non-blocking, graceful failure)
- `onDealOfferCreated` Firestore trigger sends 3-channel notifications (in-app, FCM push, email) on every new offer
- `onDealStatusChanged` trigger handles terminal state transitions (accepted/rejected/withdrawn/expired)
- Smart FCM suppression prevents redundant notifications when user is actively viewing the deal page (checks `viewingDealId` + `viewingDealSince` 60s staleness from `useDealPresence`)
- `renewOffer` Cloud Function reactivates expired offers with configurable new deadline
- `checkExpiredOffers` runs every 30 minutes, batch-transitions expired offers and their parent deals
- `sendExpiryReminders` sends 24h/4h/1h warnings to both parties, with `remindersSet` arrayUnion dedup

## Task Commits

Each task was committed atomically:

1. **Task 1: Deal notification trigger (in-app + FCM push + Resend email)** - `8f8798c` (feat)
2. **Task 2: Scheduled expiry checker + reminder notifications** - `674fd62` (feat — note: functions/index.js changes were all in 8f8798c; 674fd62 is a documented completion marker)
3. **Task 3: Verify end-to-end deal negotiation flow** - PENDING (checkpoint:human-verify)

## Files Created/Modified
- `/Users/wenubey/Desktop/CTG/core-trade-global/functions/index.js` - Added: Resend init, sendDealEmail, getDealEventCopy, buildDealEmailHtml, sendDealNotifications, onDealOfferCreated, onDealStatusChanged, renewOffer, checkExpiredOffers, sendExpiryReminders
- `/Users/wenubey/Desktop/CTG/core-trade-global/functions/package.json` - Added resend@6.9.2 dependency
- `/Users/wenubey/Desktop/CTG/core-trade-global/functions/package-lock.json` - Updated lock file

## Decisions Made
- Resend uses `onboarding@resend.dev` sender for Phase 2 dev — custom domain switch deferred to pre-production
- All notification side effects are called OUTSIDE Firestore transactions to prevent duplicate sends on retry
- `sendDealEmail` non-blocking design: try/catch wraps Resend call, logs error, continues — never fails CF
- Smart FCM suppression reads `viewingDealId` and `viewingDealSince` from user doc (written by `useDealPresence`)
- `checkExpiredOffers` uses batched writes (not transactions) for multi-document bulk expiry transitions
- `remindersSet` uses `FieldValue.arrayUnion` for race-condition-safe reminder tracking
- `onDealStatusChanged` uses `before.currentTurnUid` as actorUid — that's who accepted/rejected/withdrew

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 3 - Blocking] Task 2 scheduler functions committed in Task 1 commit**
- **Found during:** Task 2 execution
- **Issue:** Both Task 1 and Task 2 modified only `functions/index.js`; all changes were applied in a single file edit during Task 1
- **Fix:** Task 1 commit (8f8798c) includes all scheduler functions; Task 2 commit (674fd62) is an empty-allow commit documenting the Task 2 completion state
- **Files modified:** None additional
- **Verification:** `grep "exports.checkExpiredOffers"` and `grep "exports.sendExpiryReminders"` both return results
- **Committed in:** 8f8798c

**2. [Rule - No Change] Navbar My Deals link already present**
- **Found during:** Task 2 (Navbar review)
- **Issue:** Plan specified adding "My Deals" to Navbar, but it was already added in plan 02-02
- **Fix:** No change needed; link is at NAV_LINKS line 31 with roles: [ROLES.MEMBER, ROLES.ADMIN]
- **Files modified:** None

---

**Total deviations:** 2 (1 commit ordering, 1 pre-existing feature)
**Impact on plan:** No scope creep. All deliverables present and verified.

## User Setup Required

**External services require manual configuration before email notifications work:**

1. **Resend API Key** — Create account at https://resend.com, generate API key
2. **Set env var:** Add `RESEND_API_KEY=re_xxxxx` to `functions/.env`
   OR run: `firebase functions:config:set resend.api_key='re_xxxxx'`
3. **Verify:** Deploy functions and trigger a deal event — check Resend dashboard for delivery

Note: Without RESEND_API_KEY, the `sendDealEmail` function will fail silently (non-blocking) — all other notification channels (in-app, FCM push) will still work.

## Next Phase Readiness
- Complete deal negotiation system is ready for human verification (Task 3 checkpoint)
- After checkpoint approval, Phase 2 S1 is complete
- Phase 3 (contract generation) can listen to `onDealStatusChanged` for `deal.status === 'accepted'`
- Resend API key must be configured before email notifications work in staging/production

---
*Phase: 02-deal-creation-and-negotiation-s1*
*Completed: 2026-02-22*
