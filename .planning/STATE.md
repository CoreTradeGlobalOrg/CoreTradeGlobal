---
gsd_state_version: 1.0
milestone: v1.0
milestone_name: milestone
status: completed
stopped_at: Completed 09-01-PLAN.md
last_updated: "2026-04-08T13:00:28.483Z"
last_activity: "2026-04-02 - Completed quick task 5: Fix hero not fetching last verified user"
progress:
  total_phases: 9
  completed_phases: 8
  total_plans: 52
  completed_plans: 50
  percent: 71
---

# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-20)

**Core value:** A member can complete an entire international trade deal -- negotiate, get legal advice, insure cargo, arrange shipping, and track delivery -- without leaving the platform.
**Current focus:** Phase 6: Trade Summary and Shipment Tracking

## Current Position

Phase: 6 of 7 (Trade Summary and Shipment Tracking) — IN PROGRESS
Plan: 1 of 4 in current phase (06-01 complete — shipment tracking data layer, CFs, DELIVERED status)
Status: Phase 06 plan 01 complete — ready for 06-02
Last activity: 2026-04-02 - Completed quick task 5: Fix hero not fetching last verified user

Progress: [█████████████] 71%

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
| Phase 05-legal-consulting P05 | 7 | 2 tasks | 8 files |
| Phase 05-legal-consulting P07 | 2 | 2 tasks | 5 files |
| Phase 05-legal-consulting P08 | 8 | 2 tasks | 5 files |
| Phase 05-legal-consulting P06 | 1 | 1 tasks | 0 files |
| Phase 05-legal-consulting P09 | 2 | 2 tasks | 3 files |
| Phase 05-legal-consulting P10 | 3 | 2 tasks | 5 files |
| Phase 06-trade-summary-shipment-tracking P03 | 5 | 2 tasks | 6 files |
| Phase 06-trade-summary-shipment-tracking P02 | 7 | 2 tasks | 12 files |
| Phase 06-trade-summary-shipment-tracking P04 | 6 | 2 tasks | 6 files |
| Phase 06 P05 | 4 | 1 tasks | 1 files |
| Phase 06 P08 | 5 | 1 tasks | 1 files |
| Phase 06 P07 | 2 | 2 tasks | 4 files |
| Phase 06 P06 | 3 | 2 tasks | 8 files |
| Phase 06-trade-summary-shipment-tracking P09 | 8 | 2 tasks | 7 files |
| Phase 06-trade-summary-shipment-tracking P10 | 2 | 1 tasks | 3 files |
| Phase 08 P01 | 4 | 2 tasks | 5 files |
| Phase 08 P02 | 2 | 2 tasks | 3 files |
| Phase 08 P03 | 4 | 2 tasks | 5 files |
| Phase 07-platform-hardening P04 | 5 | 2 tasks | 14 files |
| Phase 07 P02 | 4 | 2 tasks | 13 files |
| Phase 07-platform-hardening P01 | N/A | 2 tasks | 23 files |
| Phase 07-platform-hardening P03 | 12 | 2 tasks | 19 files |
| Phase 07-platform-hardening P05 | 7 | 2 tasks | 28 files |
| Phase 09 P02 | 8 | 1 tasks | 2 files |
| Phase 09 P01 | 30 | 2 tasks | 4 files |

## Accumulated Context

### Roadmap Evolution

- Phase 9 added: Cold email unsubscribe page with signed tokens, Firestore storage, and scheduled Google Sheets sync (urgent — blocks cold email campaign launch via Antigravity)

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- [Roadmap]: 7-phase structure derived from 45 requirements across 8 categories
- [Roadmap]: Phase 5 (Legal) depends on Phase 2 only -- can run parallel with Phases 3-4
- [Roadmap]: Platform Hardening is final phase (Phase 7) -- sweeps all built features
- [Roadmap]: Phase 8 added: Live Currency and Freight Intelligence (client-side Frankfurter + Freightos APIs, no server proxying). Phase 7 dependency updated to Phase 6 + Phase 8
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
- [05-05]: useLegalChannel uses closure flags (draftsLoaded/risksLoaded) — sets loading=false only when both parallel subscriptions have fired, preventing partial data render
- [05-05]: Lawyer engagement lookup uses subscribeToEngagementsForLawyer + dealId filter (not subscribeToEngagementForDeal) — lawyers don't have deterministic clientId-based engagement ID
- [05-05]: QuickActionToolbar risk form uses absolute-positioned overlay above toolbar — contextual form without modal or layout shift in center panel
- [Phase 05-legal-consulting]: text-black replaces text-[#0F1C2E] on Find a Lawyer button for contrast on gold #FFD700 background
- [Phase 05-legal-consulting]: dealId forwarded as URL query param through multi-hop navigation (LegalBanner->lawyers->LawyerCard->profile) avoiding global state
- [Phase 05-legal-consulting]: Suspense boundary only needed in page.jsx for useSearchParams (Next.js app router); non-page use client components do not need Suspense
- [Phase 05-legal-consulting]: LawyerDeals excludes pending engagements -- only confirmed (active + completed) deals shown since pending have no accepted channel
- [Phase 05-legal-consulting]: Navbar lawyer links order: Lawyer Dashboard, Client Channels, Deal Review -- dashboard first as primary landing
- [Phase 05-legal-consulting]: Plan 05-06 Task 1 was pre-completed by gap closure plans 05-07 and 05-08 — no re-implementation needed; system message exclusion from onLegalMessageCreated trigger is key correctness detail
- [Phase 05-09]: Lawyer redirect uses router.replace (not push) to prevent back-button loop to pending screen
- [Phase 05-09]: hire_request notification link is conditionally /lawyer/dashboard — all other legal event links remain /deals/{dealId}/legal
- [Phase 05-09]: includeMetadataChanges: true on subscribeToRiskItems fires callback on both local optimistic write and server confirmation — solves rapid risk item gap without data model changes
- [Phase 05-10]: hireLayyer CF uses db.runTransaction for atomic existence check + set — prevents concurrent duplicate engagement docs
- [Phase 05-10]: submitLawyerReview CF sets reviewedAt on engagement doc — client-side ReviewPromptBanner self-hides via engagement.reviewedAt
- [Phase 05-legal-consulting]: approveLegalDraft CF reads specific draftId (not latest) to avoid race conditions; approve button hidden once approvedAt is set on draft
- [06-01]: VALID_DEAL_TRANSITIONS_CF added as named object (not inline map) for readability and transaction guard reuse
- [06-01]: appendStatusHistory uses FieldValue.arrayUnion — race-condition-safe; called outside transactions to prevent duplicate writes on retry
- [06-01]: confirmInsuranceCoverage uses deterministic doc ID coverage_{dealId} — idempotent re-calls return already-exists error (client can safely retry)
- [06-01]: submitShipmentUpdate denormalizes currentShipmentStatus and shipmentEtaDate on deal doc for DealCard display without N+1 queries
- [06-01]: DELIVERED state transition guarded inside runTransaction — prevents race condition if multiple delivered updates are submitted
- [06-01]: sendDealNotifications called with senderUid='system' for shipment events — both buyer and seller receive notifications
- [Phase 06-03]: useActiveShipments queries both logistics and insurance types via normalizeProviderType — handles both short-form and role-form inputs
- [Phase 06-03]: ProviderDashboard embedded prop separates inline-tab render from standalone full-page render — no duplicate main wrapper
- [Phase 06-03]: InsuranceCoverageTab checks shipmentUpdates for COVERAGE_ACTIVE to determine idempotent button state — real-time via tracking subscription
- [Phase 06-02]: useTradeSummary derives selectedInsuranceQuote/selectedLogisticsQuote by filtering quotes with status === ACCEPTED — no extra subscription needed
- [Phase 06-02]: LegalConsultingSection has dual privacy guard: data layer (subscribeToEngagementForDeal) + UI layer (clientId check) — defense in depth
- [Phase 06-02]: TradeRouteMap uses static placeholder pin positions per user decision — purely visual context
- [Phase 06-02]: DealPage tab auto-switches to summary for PROVIDERS_SELECTED and DELIVERED — users in those statuses care more about tracking than negotiation history
- [Phase 06-04]: DealSidebar self-subscribes to shipmentUpdates when showTimeline=true and no prop provided — avoids duplicate subscriptions with TradeSummaryTab
- [Phase 06-04]: OrderTimeline legacy inference uses deal.updatedAt as rough timestamp for inferred milestones when statusHistory is absent
- [Phase 06-04]: Admin TradeOverviewStats uses getDocs (one-time fetch) not onSnapshot — admin stats are approximate display data, real-time unnecessary
- [Phase 06-05]: Single-file gap closure: OrderTimeline already built, useTradeSummary already fetches shipmentUpdates — only TradeSummaryTab needed updating
- [Phase 06-08]: Natural Earth 110m paths inlined as string constants in TradeRouteMap — no npm dependencies, zero deployment friction, recognizable continent shapes at 180px display height
- [Phase 06]: buyerName/sellerName fetched via separate useEffect in useTradeSummary, keyed on deal.buyerId/sellerId — keeps subscription cleanup logic clean
- [Phase 06]: New Deal button links to /marketplace (not /deals/new) — /deals/new requires query params unavailable from deals list; button relabeled Browse Marketplace
- [Phase 06]: text-black on gold bg-[#FFD700] buttons for reliable contrast — same pattern as Phase 05-07 Find a Lawyer button fix
- [Phase 06]: subscribeToQuotesForDeal signature changed to (dealId, uid, callback, onError) — uid required for Firestore participants rule compliance on collectionGroup query
- [Phase 06]: All 5 useTradeSummary subscription errors set loaded flag + setError + checkAllLoaded() — prevents infinite loading spinner when any subscription fails
- [Phase 06]: [06-06]: @page margin:0 clips browser URL footer; body margin inside @media print preserves content spacing without showing localhost
- [Phase 06-09]: readers array pattern: store [buyerId, sellerId, providerUid] on each shipmentTracking doc — isAuthenticated() rule + array-contains query replaces complex resource.data field checks that queries cannot satisfy
- [Phase 06-09]: providerQuotes and shipmentTracking rules simplified to isAuthenticated() — client query-level scoping (array-contains) is sufficient; complex resource.data checks caused permission errors on collectionGroup queries
- [Phase 06-trade-summary-shipment-tracking]: Browse Marketplace button uses !text-black with Tailwind important modifier to override dark mode/parent specificity on gold #FFD700 background
- [Phase 06-trade-summary-shipment-tracking]: useDeal error callback sets dealLoaded=true so checkLoaded() still resolves loading=false even on subscription failure
- [Phase 08-01]: useLiveCurrency uses module-level singleton (not React context) — multiple consumers share one setInterval and one fetch cycle
- [Phase 08-01]: EUR as Frankfurter base — single API call for all 7 non-EUR rates; AED/SAR omitted gracefully if not in ECB dataset
- [Phase 08-01]: 16 TICKER_PAIRS covering all 8 currencies in conventional forex quoting directions; isStale derived from error === 'Using cached rates'
- [Phase 08-02]: CurrencyConvertPanel uses useState(null) + hydrated flag for localStorage init — avoids SSR hydration mismatch on target currency state
- [Phase 08-02]: pickDefault() auto-swaps default target away from base currency — handles EUR-base or USD-base deals gracefully
- [Phase 08-03]: Client-side direct fetch first; CORS proxy fallback only on TypeError — preserves per-user IP rate budget vs shared server IP
- [Phase 08-03]: FreightEstimatorWidget available on all deal stages; load type auto-detected via suggestLoadType() heuristic, shown as read-only badge
- [Phase 07-04]: submitQuoteSchema uses string validation for unitPrice (HTML input returns string) with parseFloat refine — avoids Zod coercion complexity
- [Phase 07-04]: Form validation standard established: zodResolver + mode:onSubmit + reValidateMode:onBlur on every useForm call; error text: text-xs text-red-400 mt-1; error border: border-red-500 on invalid
- [Phase 07-04]: RiskInlineForm converted from useState-controlled to react-hook-form to enable zodResolver; disabled button removed in favour of schema enforcement
- [Phase 07]: ErrorBoundary wraps only {children} in global layout so platform chrome stays visible during errors
- [Phase 07]: [07-02]: Background subscription fetch errors excluded from toast — they use in-page error state; toast reserved for user-triggered async actions
- [Phase 07]: [07-02]: Route-level layout.jsx created as thin wrappers for deals/lawyer/provider — no existing layout files existed in those dirs
- [Phase 07]: [07-01]: Custom hooks (useProfilePage, useUserActions) own all state and handlers; orchestrators are pure render trees — no state in orchestrator except what drives child selection
- [Phase 07]: [07-01]: Co-location enforced: all sub-components created in the same directory as their parent orchestrator file
- [Phase 07-platform-hardening]: HeroSection split into 4 sub-components to get orchestrator under 300 lines; HeroSearchBar extracted in addition to globe/stats/data-cards
- [Phase 07-platform-hardening]: QuoteGrid uses type prop to avoid two near-identical section components for insurance vs logistics
- [Phase 07-platform-hardening]: LegalBanner gold CTA standardized to !text-black in className replacing inline style={{ color: '#000000' }}
- [Phase 07-platform-hardening]: next/dynamic with ssr:false wraps heavy sub-components (not page shell) — profile wraps 5 sub-components, admin wraps 7 tab managers; page shell renders immediately with skeleton fallbacks
- [Phase 07-platform-hardening]: IntersectionObserver sentinel div approach with useCallback-wrapped loadMore — avoids scroll throttling and prevents stale closure re-subscription (PAGE_SIZE=12 products, NEWS_PAGE_SIZE=9 news)
- [Phase 09-02]: Middleware already permissive for /unsubscribe — protectedRoutes allowlist does not include it, no edit needed
- [Phase 09-02]: Unknown/missing ?status= falls back to error card — graceful default rather than crash
- [Phase 09-01]: Email always lowercased in HMAC payload AND Firestore storage for case-insensitive unsubscribe identity
- [Phase 09-01]: unsubscribedAt set only on first write (!snap.exists guard) — immutable timestamp; re-clicks update lastClickAt and campaigns only
- [Phase 09-01]: HMAC token format: base64url(JSON).hexSig — no new npm dependency, Node crypto built-in only; cors:false on onRequest CF (direct browser navigation, not XHR)

### Pending Todos

None yet.

### Quick Tasks Completed

| # | Description | Date | Commit | Directory |
|---|-------------|------|--------|-----------|
| 1 | Deal notification click navigates to deal page | 2026-02-23 | 7358c13 | [1-when-user-click-notification-for-deal-i-](./quick/1-when-user-click-notification-for-deal-i-/) |
| 2 | Fix navbar for provider dashboard and admin nav override | 2026-03-06 | 33373f5 | [2-fix-navbar-for-provider-dashboard-and-si](./quick/2-fix-navbar-for-provider-dashboard-and-si/) |
| 3 | Extract QuoteDetailView to /provider/quotes/[requestId] route | 2026-03-06 | 1d0d858 | [3-separate-provider-quote-detail-into-its-](./quick/3-separate-provider-quote-detail-into-its-/) |
| 4 | Mark completed phases 1-5 as done in ROADMAP.md | 2026-03-25 |  | [4-mark-completed-phases-1-5-as-done-in-roa](./quick/4-mark-completed-phases-1-5-as-done-in-roa/) |
| 5 | Fix hero supplier card to show last verified+approved user | 2026-04-02 | e91c531 | [5-fix-hero-not-fetching-last-verified-user](./quick/5-fix-hero-not-fetching-last-verified-user/) |

### Blockers/Concerns

- [Research]: Verify Next.js 16.1.4 patch status for CVE-2025-29927 before provider portals ship (Phase 4)
- [Research]: Price-separation data model needs concrete schema decision before Phase 4 implementation
- [Research]: Verify Next.js security patch CVE-2025-29927 status before provider portals ship

## Session Continuity

Last session: 2026-04-08T13:00:28.479Z
Stopped at: Completed 09-01-PLAN.md
Resume file: None
