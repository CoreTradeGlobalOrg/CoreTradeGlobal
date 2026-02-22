# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-20)

**Core value:** A member can complete an entire international trade deal -- negotiate, get legal advice, insure cargo, arrange shipping, and track delivery -- without leaving the platform.
**Current focus:** Phase 2: Deal Creation and Negotiation (S1)

## Current Position

Phase: 2 of 7 (Deal Creation and Negotiation S1)
Plan: 2 of 4 in current phase
Status: In progress
Last activity: 2026-02-22 -- Completed 02-01 (Deal Data Foundation)

Progress: [███░░░░░░░] 15%

## Performance Metrics

**Velocity:**
- Total plans completed: 4
- Average duration: 5 minutes
- Total execution time: 0.30 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-role-system-and-infrastructure | 3 | 16 min | 5 min |
| 02-deal-creation-and-negotiation-s1 | 1 | 5 min | 5 min |

**Recent Trend:**
- Last 5 plans: 01-01, 01-03, 01-02, 02-01
- Trend: Consistent 5 min per plan

*Updated after each plan completion*
| Phase 01 P04 | 8 | 2 tasks | 4 files |
| Phase 02 P01 | 5 | 2 tasks | 12 files |

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

### Pending Todos

None yet.

### Blockers/Concerns

- [Research]: Verify Next.js 16.1.4 patch status for CVE-2025-29927 before provider portals ship (Phase 4)
- [Research]: Price-separation data model needs concrete schema decision before Phase 4 implementation
- [Research]: E2E encryption key management lifecycle needs decision before Phase 5 implementation
- [Research]: Legal channel collection placement (top-level vs subcollection) needs resolution before Phase 5

## Session Continuity

Last session: 2026-02-22
Stopped at: Completed 02-01-PLAN.md (Deal Data Foundation - Constants, Entities, Repositories, Cloud Functions, Rules, Indexes)
Resume file: None
