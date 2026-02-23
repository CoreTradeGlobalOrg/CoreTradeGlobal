# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-20)

**Core value:** A member can complete an entire international trade deal -- negotiate, get legal advice, insure cargo, arrange shipping, and track delivery -- without leaving the platform.
**Current focus:** Phase 2: Deal Creation and Negotiation (S1)

## Current Position

Phase: 2 of 7 (Deal Creation and Negotiation S1)
Plan: 6 of 6 in current phase -- Phase 02 COMPLETE
Status: Phase complete
Last activity: 2026-02-23 -- Completed 02-07 (Fix submitCounterOffer parameter name mismatch)

Progress: [████████░░] 40%

## Performance Metrics

**Velocity:**
- Total plans completed: 4
- Average duration: 5 minutes
- Total execution time: 0.30 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-role-system-and-infrastructure | 3 | 16 min | 5 min |
| 02-deal-creation-and-negotiation-s1 | 2 | 25 min | 13 min |

**Recent Trend:**
- Last 5 plans: 01-01, 01-03, 01-02, 02-01, 02-02
- Trend: Consistent 5 min per plan

*Updated after each plan completion*
| Phase 01 P04 | 8 | 2 tasks | 4 files |
| Phase 02 P01 | 5 | 2 tasks | 12 files |
| Phase 02 P02 | 20 | 2 tasks | 12 files |
| Phase 02 P03 | 10 | 2 tasks | 11 files |
| Phase 02 P04 | 3 | 2 tasks | 3 files |
| Phase 02 P05 | 2 | 2 tasks | 3 files |
| Phase 02 P06 | 2 | 2 tasks | 5 files |
| Phase 02 P07 | 1 | 1 tasks | 1 files |

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Roadmap]: 7-phase structure derived from 45 requirements across 8 categories
- [Roadmap]: Phase 5 (Legal) depends on Phase 2 only -- can run parallel with Phases 3-4
- [Roadmap]: Platform Hardening is final phase (Phase 7) -- sweeps all built features
- [01-01]: Custom claims (not Firestore reads) are the source of truth for role enforcement in rules and session
- [01-01]: isMember() includes null fallback for legacy accounts without claims -- no forced migration required for existing users
- [01-01]: Session API security fix -- role read from verified JWT claims, not client request body
- [01-01]: invites TTL uses expireAt field -- configure Firebase Console TTL policy manually
- [01-03]: Nav items hidden completely for unauthorized roles (not greyed out) per user decision ROLE-04
- [01-03]: RoleBadge null fallback renders Member badge -- handles legacy accounts without role claims
- [01-03]: Admin bypasses all role-specific route guards (provider, lawyer) via isAdmin check
- [01-03]: Middleware redirects unauthorized role access to /forbidden (not home) for clear role-aware UX
- [01-02]: resendInvite is a dedicated CF separate from inviteUser -- avoids email-already-exists race conditions
- [01-02]: UsersTable uses tab pattern (Users/Invites) -- cleaner UX than stacked sections at scale
- [01-02]: handleToggleAdmin replaced with setUserRole CF call -- claims updated atomically with Firestore
- [01-02]: Force getIdToken(true) twice in onboarding -- after sign-in and after completion for fresh claims
- [Phase 01]: connectFunctionsEmulator enabled in dev mode -- httpsCallable routes to local emulator, fixing CORS errors
- [Phase 01]: cors:true removed from all onCall definitions -- it is onRequest-only and misleading on onCall
- [Phase 01]: Admin navbar override: ROLES.ADMIN check in visibleLinks filter so admin sees all role-restricted nav links
- [Phase 01]: Session body sends only idToken (not role) -- role read from verified JWT claims server-side
- [02-01]: Two-query merge for My Deals list (buyerId + sellerId queries merged client-side) -- Firestore cannot OR across different field names
- [02-01]: DEAL_STATUS/OFFER_STATUS constants duplicated in functions/index.js -- Cloud Functions are CJS and cannot import ESM from Next.js app
- [02-01]: System message in createDeal uses a separate runTransaction after deal transaction -- side effects must not be inside the deal transaction (prevents duplicate sends on retry)
- [02-01]: isDealParticipant() is local to the deals match block -- reads resource.data which is document-context-specific
- [02-01]: withdrawOffer sets deal.status to withdrawn -- sender can withdraw at any time before receiver responds; terminates the deal
- [Phase 02]: NamedPlaceInput uses /api/locode/search Next.js API route — @geoapify/un-locode uses Node.js fs and cannot run client-side
- [Phase 02]: Suspense boundary required around useSearchParams in /deals/new — Next.js app router requires this for static rendering compatibility
- [Phase 02]: Web Audio API used for offer notification chime — zero deployment friction vs external .mp3 file
- [Phase 02]: useDealPresence uses Firestore heartbeat (30s interval) + 60s staleness window — handles browser crash edge case without RTDB
- [Phase 02-04]: Resend uses onboarding@resend.dev sender in Phase 2 dev -- custom domain switch deferred to pre-production
- [Phase 02-04]: sendDealEmail is non-blocking -- email failure never fails Cloud Function (try/catch, log, continue)
- [Phase 02-04]: Smart FCM suppression: viewingDealId + viewingDealSince 60s staleness from useDealPresence heartbeat
- [Phase 02-04]: All deal notification side effects called OUTSIDE Firestore transactions -- prevents duplicate sends on retry
- [Phase 02-04]: remindersSet uses arrayUnion for race-condition-safe expiry reminder dedup
- [Phase 02]: deal_event type detection in both foreground and background FCM handlers -- single dispatch point for both contexts
- [Phase 02]: clickUrl stored in notification.data at show time, read at notificationclick -- avoids reconstructing URL in service worker context
- [Phase 02]: Duplicate system message removed from createDeal; onDealOfferCreated trigger is sole owner of system message posting for new_deal events
- [Phase 02]: system message branch returns early in messages.map() before isOwn check -- clean separation for system vs regular messages
- [02-05]: Offers subcollection rule uses get() on parent deal document -- resource.data in /offers/{offerId} context refers to offer doc, not deal doc; isDealParticipant() was reading wrong resource
- [02-05]: UNECE_TO_DEAL_UNIT mapping in dealConstants.js -- products store UNECE codes, deal form uses simplified units; mapping at form pre-fill time with fallback to raw unit code
- [Phase 02-07]: Only the wire key name changes (offerData -> offer); the local variable remains offerData for function signature clarity

### Pending Todos

None yet.

### Blockers/Concerns

- [Research]: Verify Next.js 16.1.4 patch status for CVE-2025-29927 before provider portals ship (Phase 4)
- [Research]: Price-separation data model needs concrete schema decision before Phase 4 implementation
- [Research]: E2E encryption key management lifecycle needs decision before Phase 5 implementation
- [Research]: Legal channel collection placement (top-level vs subcollection) needs resolution before Phase 5

## Session Continuity

Last session: 2026-02-23
Stopped at: Completed 02-07-PLAN.md (Fix submitCounterOffer parameter name mismatch - counter-offer flow unblocked)
Resume file: None
