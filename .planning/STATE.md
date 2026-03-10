---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: unknown
last_updated: "2026-03-10T15:11:40.385Z"
progress:
  total_phases: 5
  completed_phases: 4
  total_plans: 25
  completed_plans: 23
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-20)

**Core value:** A member can complete an entire international trade deal -- negotiate, get legal advice, insure cargo, arrange shipping, and track delivery -- without leaving the platform.
**Current focus:** Phase 5: Legal Consulting

## Current Position

Phase: 5 of 7 (Legal Consulting)
Plan: 4 of 5 in current phase (05-04 complete — LegalBanner on DealPage, LawyerDashboard, legal hooks)
Status: In progress
Last activity: 2026-03-10 - Completed 05-04: LegalBanner on DealPage at all stages, LawyerDashboard at /lawyer/dashboard, useLegalEngagement/useLegalEngagements/useLegalActions hooks

Progress: [██████████] 64%

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
| Phase 03 P01 | 7 | 2 tasks | 8 files |
| Phase 03 P02 | 6 | 2 tasks | 11 files |
| Phase 04 P01 | 4 | 2 tasks | 10 files |
| Phase 04 P02 | 4 | 2 tasks | 3 files |
| Phase 04 P03 | 5 | 2 tasks | 11 files |
| Phase 04 P04 | 6 | 2 tasks | 6 files |
| Phase 04 P06 | 10 | 2 tasks | 8 files |
| Phase 04 P05 | 5 | 1 tasks | 2 files |
| Phase 05 P02 | 8 | 2 tasks | 1 files |
| Phase 05-legal-consulting P03 | 5 | 2 tasks | 7 files |
| Phase 05-legal-consulting P04 | 8 | 2 tasks | 8 files |

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
- [Phase 01]: Admin navbar override: ROLES.ADMIN check in visibleLinks filter so admin sees all role-restricted nav links — SUPERSEDED by quick-2: admin now sees member-equivalent links only via explicit roles array
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
- [Phase 03-01]: CONTRACT_APPROVED added to DEAL_STATUS; ACCEPTED is transitional (not terminal) — enables contract approval flow before deal completion
- [Phase 03-01]: dealBuyerId/dealSellerId denormalized on contract doc — saveDraftApprovals determines isBuyer without extra Firestore read (follows Phase 2 denormalization pattern)
- [Phase 03-01]: deadline stored as null on contract doc — enforcement (scheduled CF, auto-expiry) deferred to future phase; field is forward-compatible placeholder
- [Phase 03-01]: submitContractApproval uses runTransaction — prevents race condition where both parties submit simultaneously and both see otherHasSubmitted=false
- [Phase 03-02]: isTerminal fallback in DealPage updated — ACCEPTED removed, CONTRACT_APPROVED added to match Deal.isTerminal() entity from Plan 01
- [Phase 03-02]: CounterOfferForm guard changed to deal.status === NEGOTIATING — ACCEPTED is non-terminal but must not show counter-offer form
- [Phase 03-02]: hasExpanded restored from server approvedClauses on load — prevents Pitfall 6 (checkbox disable after page refresh)
- [Phase 04-01]: providerQuotes subcollection name (not quotes) avoids collision with existing requests/{id}/quotes subcollection
- [Phase 04-01]: PROVIDERS_SELECTED is terminal for full deal lifecycle; CONTRACT_APPROVED is now a Phase 4 gateway (not the final terminal state)
- [Phase 04-01]: Deal.isAwaitingQuotes() is a semantic alias for isContractApproved() — improves Phase 4 UI code readability without behavior change
- [Phase 04-01]: Quote entity uses null defaults for type-specific fields — single class covers both insurance and logistics shapes
- [Phase 04-01]: collectionGroup(providerQuotes) with dealId filter enables buyer view; requires composite Firestore index on providerQuotes: dealId + createdAt
- [Phase 04-02]: broadcastQuoteRequests uses explicit allowlist for logistics dealSnapshot — eliminates price leakage risk (PORTAL-05)
- [Phase 04-02]: acceptQuote server-side expiry check inside runTransaction — client timers are display-only (QUOTE-04)
- [Phase 04-02]: Firestore providerQuotes rules use denormalized buyerId/sellerId — avoids get() calls in security rules
- [Phase 04]: [04-03]: useQuoteActions imported in QuoteDetailView — no prop drilling through ProviderDashboard to forms
- [Phase 04]: [04-03]: QuotesPage placeholder in Plan 03 fixed empty scaffold preventing build — full implementation in Plan 04-04
- [Phase 04]: useQuotesForDeal uses quotesMapRef for two-level subscription aggregation — avoids stale closures when per-request subscriptions fire asynchronously
- [Phase 04]: Ribbon assignment uses no-duplicate guard: Cheapest set first, then Fastest if different card, then Best Value — prevents same card getting multiple ribbons
- [Phase 04]: Partial provider selection allowed on QuotesSidebar confirm button — buyer does not need to select both insurance and logistics to proceed
- [Phase 04]: QuoteDetailWithExistingQuote extracted as wrapper component — React hooks rules forbid conditional hook calls; wrapper ensures useQuoteForRequest is always called unconditionally
- [Phase 04]: existingQuote passes null during quoteLoading to render form immediately in new-quote mode; populates within milliseconds via Firestore real-time
- [Phase 04-05]: CONTRACT_APPROVED remains in isTerminal fallback in DealPage — user directed to /quotes page, not deal forms
- [Phase 04-05]: ACCEPTED and CONTRACT_APPROVED banners fully split — each status owns its own JSX block for clarity and independent control
- [Phase 04-05]: ProgressTracker getActiveStep: extensible function returning step id string covering negotiation -> agreement -> quotes -> tracking
- [05-01]: participants array [clientId, lawyerId] stored on engagement doc enables array-contains queries and security rule isolation without get() calls at the collection level
- [05-01]: contractDrafts and riskItems returned as plain objects (not entities) — no behavior methods needed, just data display; timestamps converted inline in repository callbacks
- [05-01]: lawyerIds array on deal document (with resource.data.get('lawyerIds', []) safe default) lets lawyers read deal context without forced migration of older deal documents
- [05-01]: Storage paths use legal/attachments/ and legal/drafts/ prefixes to namespace legal files from conversation attachments
- [Phase 05-02]: ENGAGEMENT_STATUS constant duplicated in functions/index.js (CJS) — same pattern as DEAL_STATUS/QUOTE_STATUS; cannot import ESM from Cloud Functions
- [Phase 05-02]: Deterministic engagement ID (dealId_clientId) prevents duplicate active/pending engagements; re-hire allowed after completed/declined
- [Phase 05-02]: /deals/[dealId]/legal intentionally NOT in middleware lawyerRoutes — Firestore rules handle participant-only access; members must reach legal channel page
- [Phase 05-legal-consulting]: Client-side filter for lawyer directory: Firestore cannot combine multiple array-contains filters; fetch-all + useMemo is correct for small lawyer population
- [Phase 05-legal-consulting]: Profile page role-gate: member sections wrapped in role \!== 'lawyer' fragment; LawyerProfileContent replaces body while shared header stays unchanged
- [Phase 05-04]: LegalBanner localStorage dismiss uses per-deal key (dealId_legal_banner_dismissed) — prevents one dismissed deal from hiding banner on other deals
- [Phase 05-04]: LegalBanner loading guard returns null — prevents flash of promotional content while subscription resolves
- [Phase 05-04]: LawyerDashboard completed section collapsed by default — keeps dashboard focused on actionable pending/active items

### Pending Todos

None yet.

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 1 | Deal notification click navigates to deal page | 2026-02-23 | 7358c13 | [1-when-user-click-notification-for-deal-i-](./quick/1-when-user-click-notification-for-deal-i-/) |
| 2 | Fix navbar for provider dashboard and admin nav override | 2026-03-06 | 33373f5 | [2-fix-navbar-for-provider-dashboard-and-si](./quick/2-fix-navbar-for-provider-dashboard-and-si/) |
| 3 | Extract QuoteDetailView to /provider/quotes/[requestId] route | 2026-03-06 | 1d0d858 | [3-separate-provider-quote-detail-into-its-](./quick/3-separate-provider-quote-detail-into-its-/) |

### Blockers/Concerns

- [Research]: Verify Next.js 16.1.4 patch status for CVE-2025-29927 before provider portals ship (Phase 4)
- [Research]: Price-separation data model needs concrete schema decision before Phase 4 implementation
- [Research]: Verify Next.js security patch CVE-2025-29927 status before provider portals ship

## Session Continuity

Last session: 2026-03-10
Stopped at: Completed 05-04 — LegalBanner on DealPage, LawyerDashboard at /lawyer/dashboard, useLegalEngagement/useLegalEngagements/useLegalActions hooks
Resume file: None
