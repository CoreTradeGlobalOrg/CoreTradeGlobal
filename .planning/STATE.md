# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-20)

**Core value:** A member can complete an entire international trade deal -- negotiate, get legal advice, insure cargo, arrange shipping, and track delivery -- without leaving the platform.
**Current focus:** Phase 1: Role System and Infrastructure

## Current Position

Phase: 1 of 7 (Role System and Infrastructure)
Plan: 4 of 6 in current phase
Status: In progress
Last activity: 2026-02-20 -- Completed 01-02 (Admin Invite Flow and Onboarding Wizard)

Progress: [██░░░░░░░░] 10%

## Performance Metrics

**Velocity:**
- Total plans completed: 3
- Average duration: 5 minutes
- Total execution time: 0.25 hours

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-role-system-and-infrastructure | 3 | 16 min | 5 min |

**Recent Trend:**
- Last 5 plans: 01-01, 01-03, 01-02
- Trend: Baseline established

*Updated after each plan completion*

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

### Pending Todos

None yet.

### Blockers/Concerns

- [Research]: Verify Next.js 16.1.4 patch status for CVE-2025-29927 before provider portals ship (Phase 4)
- [Research]: Price-separation data model needs concrete schema decision before Phase 4 implementation
- [Research]: E2E encryption key management lifecycle needs decision before Phase 5 implementation
- [Research]: Legal channel collection placement (top-level vs subcollection) needs resolution before Phase 5

## Session Continuity

Last session: 2026-02-20
Stopped at: Completed 01-02-PLAN.md (Admin Invite Flow and Onboarding Wizard)
Resume file: None
