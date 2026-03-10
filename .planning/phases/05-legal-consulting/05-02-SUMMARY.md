---
phase: 05-legal-consulting
plan: 02
subsystem: cloud-functions
tags: [firebase-functions, cloud-functions, legal-consulting, notifications, transactions]

# Dependency graph
requires:
  - phase: 05-legal-consulting
    plan: 01
    provides: LegalEngagement entity, legalEngagements collection, Firestore rules with participants isolation
  - phase: 02-deal-creation-and-negotiation-s1
    provides: sendDealEmail helper, sendDealNotifications pattern, onCall/runTransaction patterns
provides:
  - hireLayyer Cloud Function: creates pending engagement with deterministic ID (dealId_clientId)
  - respondToHireRequest Cloud Function: accept/decline with runTransaction, system message on accept
  - closeLegalEngagement Cloud Function: marks completed, adds read-only system message
  - submitLawyerReview Cloud Function: validates completed status, writes to users/{lawyerId}/reviews
  - sendLegalNotification helper: in-app + email notifications for all legal event types
  - deal.lawyerIds arrayUnion on hire (enables lawyer deal read access via Firestore rules)
affects:
  - 05-03 (lawyer dashboard will call hireLayyer/respondToHireRequest via httpsCallable)
  - 05-04 (legal chat page calls closeLegalEngagement)
  - 05-05 (review UI calls submitLawyerReview after engagement_completed)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Deterministic Firestore document ID (dealId_clientId) prevents duplicate engagements
    - All notification side effects called OUTSIDE runTransaction (prevents duplicate sends on retry)
    - Non-blocking email via .catch() pattern — email failure never fails Cloud Function
    - Re-hire allowed when previous engagement is completed/declined (overwrite on set())

key-files:
  created: []
  modified:
    - functions/index.js

key-decisions:
  - ENGAGEMENT_STATUS constant duplicated in functions/index.js (CJS) — cannot import ESM from Next.js app; follows same pattern as DEAL_STATUS/QUOTE_STATUS
  - Deterministic engagement ID (dealId_clientId) scoped to client-per-deal — lawyer can be rehired after completion/decline without ID collision
  - respondToHireRequest uses runTransaction — prevents concurrent accept/decline race condition
  - System messages for session start/end written OUTSIDE transaction — follows non-duplicate notification pattern
  - deal.lawyerIds updated via arrayUnion in hireLayyer (not in transaction) — enables lawyer rule-based deal read access
  - /deals/[dealId]/legal route intentionally NOT in middleware lawyerRoutes — Firestore rules enforce participant-only access; members must be able to navigate there
  - Middleware already had complete /lawyer/* protection from Phase 1 (01-03) — no changes required

metrics:
  duration: 8 minutes
  completed_date: "2026-03-10"
  tasks_completed: 2
  files_modified: 1
---

# Phase 5 Plan 02: Legal Cloud Functions Summary

**One-liner:** 4 legal engagement lifecycle Cloud Functions (hire, respond, close, review) with in-app + email notification helper using deterministic ID deduplication.

## What Was Built

### Task 1: Legal Cloud Functions and notification helper (functions/index.js)

Added to `functions/index.js`:

**ENGAGEMENT_STATUS constant** — mirrors `legalConstants.js` in CJS format (cannot import ESM from Cloud Functions):
```javascript
const ENGAGEMENT_STATUS = { PENDING: 'pending', ACTIVE: 'active', COMPLETED: 'completed', DECLINED: 'declined' };
```

**sendLegalNotification helper** — follows `sendDealNotifications` pattern exactly:
- Creates Firestore in-app notification at `users/{recipientId}/notifications` with type: 'legal'
- Sends email via `sendDealEmail()` non-blocking (.catch pattern)
- Event types: hire_request, hire_accepted, hire_declined, engagement_completed, new_message, new_draft, risk_update

**hireLayyer Cloud Function:**
- Validates caller is deal participant (buyerId or sellerId)
- Validates target user has role === 'lawyer'
- Deterministic ID: `${dealId}_${uid}` — prevents duplicate engagements per client per deal
- Allows re-hire if previous engagement is completed or declined
- Updates `deal.lawyerIds` via arrayUnion enabling Firestore rule-based lawyer read access
- Creates engagement doc at `legalEngagements/${dealId}_${uid}` with status: 'pending'
- Returns `{ engagementId, status: 'pending' }`

**respondToHireRequest Cloud Function:**
- Validates caller is engagement.lawyerId
- Uses runTransaction: reads + updates engagement status atomically
- accept → 'active', decline → 'declined' (client can re-hire a different lawyer)
- On accept: adds system message outside transaction ("Legal consulting session started...")
- Notifies client: hire_accepted or hire_declined

**closeLegalEngagement Cloud Function:**
- Validates caller is in engagement.participants array
- Uses runTransaction: validates status === 'active', updates to 'completed'
- Adds read-only system message outside transaction ("...This channel is now read-only.")
- Notifies the OTHER participant: engagement_completed

**submitLawyerReview Cloud Function:**
- Validates caller is engagement.clientId
- Validates status === 'completed'
- Validates rating is integer 1-5, comment is string max 1000 chars
- Writes review to `users/{lawyerId}/reviews/{auto-id}`

### Task 2: Middleware verification (src/middleware.js)

No changes required. Middleware already has complete lawyer route protection from Phase 1 (Plan 01-03):

```javascript
const lawyerRoutes = ['/lawyer'];
// ...
const isLawyer = userRole === 'lawyer' || isAdmin;
if (!isLawyer) return NextResponse.redirect(new URL('/forbidden', request.url));
```

Key design decision: `/deals/[dealId]/legal` is intentionally NOT in `lawyerRoutes` because:
- Members (clients) must be able to navigate to the legal channel page
- Lawyers must also be able to navigate there
- Firestore security rules enforce participant-only data access (engagement.participants array-contains)

## Verification

```
$ node -e "const f = require('./index.js'); console.assert(typeof f.hireLayyer === 'function'); ..."
All 4 legal CFs exported

$ node -e "require('./functions/index.js')"
functions/index.js loads without errors
```

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

- [x] `functions/index.js` loads without errors
- [x] All 4 Cloud Functions exported (hireLayyer, respondToHireRequest, closeLegalEngagement, submitLawyerReview)
- [x] Commit 74d2bc8 exists
- [x] Middleware verified — no changes needed (already correct from Phase 1)
