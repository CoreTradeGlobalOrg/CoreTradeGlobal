# Roadmap: Core Trade Global

## Overview

This roadmap delivers the end-to-end trade flow for Core Trade Global -- from role system foundation through negotiation, agreement, provider integration, legal consulting, tracking, and a final quality sweep. The dependency chain is strict: roles gate everything, negotiation creates deals that feed agreement, agreement unlocks provider quotes, and the summary dashboard reads data from all prior stages. Legal consulting runs parallel after the negotiation foundation is stable. Platform hardening closes the milestone by sweeping all built features for consistency and robustness.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [x] **Phase 1: Role System and Infrastructure** - Extend roles to 5 types with Firebase custom claims, admin invite flow, role-based navigation, and Firestore security rules (completed 2026-02-22)
- [x] **Phase 2: Deal Creation and Negotiation (S1)** - Offer/counter-offer exchange with Incoterms, real-time updates, state machine, and audit trail (completed 2026-02-23)
- [x] **Phase 3: Contract Agreement (S2)** - Dual-party clause-by-clause contract approval that gates deal advancement (completed 2026-03-01)
- [x] **Phase 4: Provider Portals and Insurance/Logistics Quotes (S3)** - Provider quote submission portals and buyer quote comparison/selection with server-enforced validity (completed 2026-03-03)
- [x] **Phase 5: Legal Consulting** - Independent lawyer hiring per deal party, private encrypted channels, versioned contract drafts, and risk analysis (completed 2026-03-12)
- [x] **Phase 6: Trade Summary and Shipment Tracking (S4)** - Trade summary dashboard, shipment tracking, order timeline, and role-dispatched dashboards (UAT gap closure in progress) (completed 2026-03-30)
- [x] **Phase 7: Platform Hardening** - Quality sweep of all features for UI consistency, error handling, validation, and performance (completed 2026-04-04)
- [x] **Phase 8: Live Currency and Freight Intelligence (INSERTED)** - Live currency ticker, multi-currency deal conversions, and freight cost estimator via Freightos API (completed 2026-04-02)

## Phase Details

### Phase 1: Role System and Infrastructure
**Goal**: Every user has exactly one role, the platform enforces that role at both middleware and database layers, and admins can onboard providers and lawyers
**Depends on**: Nothing (first phase)
**Requirements**: ROLE-01, ROLE-02, ROLE-03, ROLE-04, ROLE-05, ROLE-06
**Success Criteria** (what must be TRUE):
  1. Admin can create a new account with role lawyer, insurance_provider, or logistics_provider from the admin panel -- the invited user can log in and sees role-appropriate navigation
  2. A member user sees only member-relevant menu items and dashboards; a provider user sees only provider-relevant items; a lawyer user sees only lawyer-relevant items
  3. Firestore security rules independently reject unauthorized access attempts (a logistics_provider cannot read insurance-only data, even if middleware is bypassed)
  4. Each account has exactly one role that cannot be changed by the user themselves
  5. Existing member accounts continue to work without migration -- buyer/seller distinction is determined per deal, not at registration
**Plans**: 4 plans

Plans:
- [x] 01-01-PLAN.md — Role constants, Cloud Functions (inviteUser, setUserRole, migrateExistingUsers), session security fix, Firestore rules rewrite
- [x] 01-02-PLAN.md — Admin invite modal, invite tracking, onboarding wizard for invited users
- [x] 01-03-PLAN.md — Role-based navigation, middleware route protection, forbidden page, RoleBadge, provider/lawyer placeholder pages
- [x] 01-04-PLAN.md — UAT gap closure: Cloud Functions emulator, admin navbar override, session error visibility

### Phase 2: Deal Creation and Negotiation (S1)
**Goal**: A buyer and seller can negotiate a deal through structured offers and counter-offers, with real-time updates and a complete audit trail
**Depends on**: Phase 1
**Requirements**: NEGO-01, NEGO-02, NEGO-03, NEGO-04, NEGO-05, NEGO-06, NEGO-07
**Success Criteria** (what must be TRUE):
  1. A buyer can create a deal and submit an initial offer with price, quantity, Incoterms selection (with named place), and terms -- the seller sees it in real-time without refreshing
  2. The seller can submit a counter-offer modifying any terms -- both parties see the full offer history timeline with all rounds, timestamps, amounts, and terms
  3. An offer follows valid state transitions only (open -> countered -> accepted/rejected/expired) -- invalid transitions are rejected at the data layer
  4. Both parties receive in-app and email notifications when a counter-offer is received
  5. All deal state transitions are atomic -- concurrent acceptance and counter-offer cannot corrupt deal state
**Plans**: 7 plans

Plans:
- [x] 02-01-PLAN.md -- Data foundation: constants, entities, validation, repositories, Cloud Functions (state machine), Firestore rules, indexes
- [x] 02-02-PLAN.md -- Deal creation flow: "Initiate Deal" in chat, /deals/new page with Incoterms + UN/LOCODE, My Deals list page
- [x] 02-03-PLAN.md -- Deal negotiation page: offer timeline, counter-offer form, sidebar, countdown timer, presence indicator
- [x] 02-04-PLAN.md -- Notifications (in-app + FCM + Resend email), expiry checker, reminders, navbar link, end-to-end verification
- [x] 02-05-PLAN.md -- UAT gap closure: Fix Firestore offers subcollection rules for member access, product quantity/unit pre-fill with UNECE mapping
- [x] 02-06-PLAN.md -- UAT gap closure: Fix FCM deal notification handlers, remove duplicate system messages, add system message rendering in chat
- [x] 02-07-PLAN.md -- Verification gap closure: Fix submitCounterOffer parameter name mismatch (offerData -> offer)

### Phase 3: Contract Agreement (S2)
**Goal**: Both deal parties can review and individually approve contract clauses populated from the negotiation outcome, and the deal cannot advance until both approve
**Depends on**: Phase 2
**Requirements**: AGMT-01, AGMT-02, AGMT-03, AGMT-04, AGMT-05
**Success Criteria** (what must be TRUE):
  1. After a deal's offer is accepted, both parties see a contract with clauses populated from the negotiation outcome (agreed price, Incoterms, terms)
  2. Each contract clause has an individual checkbox -- a party must approve each clause separately, and their approval status is tracked independently from the other party
  3. The deal cannot advance to the insurance/logistics stage until both parties have approved all clauses -- attempting to advance with one party pending is blocked
  4. A financial summary and document requirements are clearly displayed before a party commits their approval
**Plans**: 2 plans

Plans:
- [x] 03-01-PLAN.md — Data foundation: contractConstants, Contract entity, ContractRepository, deal status extension, Firestore rules, Cloud Functions (onDealAccepted, saveDraftApprovals, submitContractApproval), contract approval notifications
- [x] 03-02-PLAN.md — Contract page UI: route, hooks, accordion clause layout, dual-party real-time approval, financial sidebar, PDF export, DealPage integration, verification checkpoint

### Phase 4: Provider Portals and Insurance/Logistics Quotes (S3)
**Goal**: Insurance and logistics providers can receive and respond to quote requests, and buyers can compare quotes and select providers -- with server-enforced validity and correct data visibility
**Depends on**: Phase 3
**Requirements**: QUOTE-01, QUOTE-02, QUOTE-03, QUOTE-04, QUOTE-05, QUOTE-06, PORTAL-01, PORTAL-02, PORTAL-03, PORTAL-04, PORTAL-05
**Success Criteria** (what must be TRUE):
  1. An insurance provider can view incoming quote requests with full deal information (including price) and submit a quote specifying ICC coverage type (A/B/C), premium, extras, and validity period
  2. A logistics provider can view incoming quote requests with all deal information except price and submit a quote specifying transport mode, pricing, timeline, and validity period -- the deal price is never visible to logistics providers, even via direct database access
  3. A buyer can view and compare multiple insurance quotes and multiple logistics quotes side-by-side, with provider details, pricing, coverage/mode, and a live validity countdown
  4. Quote validity is enforced server-side -- a buyer cannot accept an expired quote even if the client-side timer shows it as valid
  5. After selecting one insurance and one logistics provider, the buyer sees a cost breakdown summary confirming their selections
**Plans**: 6 plans

Plans:
- [x] 04-01-PLAN.md — Quote constants, entities, repositories, DI registration, deal status extension (PROVIDERS_SELECTED), DealCard badge
- [x] 04-02-PLAN.md — Cloud Functions (broadcast, submit, accept, decline, withdraw, confirm, expiry checker), Firestore rules, indexes
- [x] 04-03-PLAN.md — Provider portal: kanban dashboard, request cards, insurance and logistics quote forms, hooks, route
- [x] 04-04-PLAN.md — Buyer quotes comparison: filter/sort/ribbons, quote cards, cost breakdown sidebar, selection confirmation
- [x] 04-05-PLAN.md — DealPage integration (quotes banner, providers_selected terminal), ProgressTracker update, end-to-end verification checkpoint
- [x] 04-06-PLAN.md — UAT gap closure: providerType normalization fix, useQuoteForRequest hook, withdraw button visibility

### Phase 5: Legal Consulting
**Goal**: Either deal party can independently hire a lawyer who gets a private, encrypted channel with their client and can review deals, draft contracts, and provide risk analysis -- without blocking the trade flow
**Depends on**: Phase 2 (reads deal data; parallel to Phases 3-4)
**Requirements**: LEGAL-01, LEGAL-02, LEGAL-03, LEGAL-04, LEGAL-05, LEGAL-06, LEGAL-07, LEGAL-08
**Success Criteria** (what must be TRUE):
  1. A buyer can hire a lawyer for a deal, and independently, the seller can hire a different lawyer for the same deal -- each lawyer sees only their own client's channel
  2. Messages between a lawyer and their client are private and encrypted -- the opposing deal party and their lawyer cannot see or access the channel
  3. A lawyer can view full deal details (trade info, parties, documents) and can create, revise, and share contract drafts with version history
  4. A lawyer can provide risk analysis with severity levels (low/medium/high) and use quick-action buttons (approve, request info, request changes, attach file) within their channel
  5. Legal consulting is optional -- a deal can proceed through all stages (negotiation, agreement, quotes, tracking) without either party hiring a lawyer
**Plans**: 11 plans

Plans:
- [x] 05-01-PLAN.md — Data layer: entities, repositories, Firestore rules, composite indexes, Cloud Functions
- [x] 05-02-PLAN.md — Cloud Functions: hireLawyer, respondToHireRequest, closeLegalEngagement, submitLawyerReview
- [x] 05-03-PLAN.md — Lawyer directory: /lawyers page with search/filter, profile adaptation for lawyer role
- [x] 05-04-PLAN.md — Legal hiring UX: LegalBanner on DealPage, LawyerDashboard, engagement hooks
- [x] 05-05-PLAN.md — Legal channel: 3-panel UI at /deals/[dealId]/legal with chat, drafts, risks
- [x] 05-06-PLAN.md — Navbar lawyer links, notification triggers, end-to-end verification
- [x] 05-07-PLAN.md — UAT gap closure: Fix dealId persistence through hire flow, LegalBanner text contrast
- [x] 05-08-PLAN.md — UAT gap closure: Build real /lawyer/channels and /lawyer/deals pages, update Navbar
- [x] 05-09-PLAN.md — UAT gap closure: Fix pending page role gate for lawyer, risk real-time subscription, notification link
- [x] 05-10-PLAN.md — UAT gap closure: Fix duplicate engagement creation, build review prompt UI
- [x] 05-11-PLAN.md — UAT gap closure: Approve draft flow (contract-to-deal), deploy all Cloud Functions

### Phase 6: Trade Summary and Shipment Tracking (S4)
**Goal**: Both deal parties can view a complete trade summary with shipment tracking and milestone timeline, and every role sees a relevant dashboard
**Depends on**: Phase 4 (reads data from all prior stages)
**Requirements**: TRACK-01, TRACK-02, TRACK-03, TRACK-04
**Success Criteria** (what must be TRUE):
  1. Buyer and seller can view a trade summary dashboard showing the full deal overview -- negotiation outcome, approval status, selected providers, costs, and current shipment status
  2. Shipment tracking shows provider-submitted status updates, and the order timeline displays all completed milestones with timestamps (negotiated, approved, insured, in transit, delivered)
  3. Each role sees a role-appropriate dashboard: members see their deals, lawyers see their assigned channels, providers see their quote requests and active shipments
**Plans**: 10 plans

Plans:
- [x] 06-01-PLAN.md — Data foundation: shipment constants, ShipmentUpdate entity, ShipmentRepository, DELIVERED state machine, Cloud Functions (submitShipmentUpdate, confirmInsuranceCoverage), statusHistory, Firestore rules
- [x] 06-02-PLAN.md — Trade Summary tab UI: TradeSummaryTab with hero banner, trade info bar, sections (overview, parties, costs, documents, legal), TradeRouteMap, DealPage tab integration, print/PDF export
- [x] 06-03-PLAN.md — Provider dashboard: Active Shipments tab for logistics (ShipmentUpdateForm), Insurance Coverage tab for insurance (Confirm Coverage), useActiveShipments hook
- [x] 06-04-PLAN.md — Order timeline (milestone categories), ETACountdown, DealSidebar integration, DealCard tracking badge, member deals page stats, admin dashboard trade stats
- [x] 06-05-PLAN.md — Gap closure: Wire OrderTimeline into TradeSummaryTab right sidebar
- [x] 06-06-PLAN.md — UAT gap closure: Fix Firestore permission errors (providerQuotes participants filter, shipment error handling), add composite index for Active Shipments, fix print CSS
- [x] 06-07-PLAN.md — UAT gap closure: Fetch buyer/seller names for Trade Summary parties section, fix New Deal button destination and text color
- [x] 06-08-PLAN.md — UAT gap closure: Replace crude polygon world map with realistic Natural Earth continent outlines
- [ ] 06-09-PLAN.md — UAT gap closure: Add readers array to shipmentTracking CFs, simplify Firestore rules, add readers filter to useActiveShipments
- [ ] 06-10-PLAN.md — UAT gap closure: Fix deals page button href to /products, InsuranceCoverageTab double-click prevention, useDeal error handling

### Phase 7: Platform Hardening
**Goal**: Every feature across the platform -- existing and newly built -- meets a consistent standard of UI quality, error handling, validation, and performance
**Depends on**: Phase 6, Phase 8 (all features must be built before sweeping)
**Requirements**: HARDEN-01, HARDEN-02, HARDEN-03, HARDEN-04
**Success Criteria** (what must be TRUE):
  1. All pages and components follow the same visual patterns -- no inconsistent spacing, typography, colors, or component styles across existing and new features
  2. Every error state across the platform shows a clear, user-friendly message -- no unhandled exceptions, blank screens, or raw error text visible to users
  3. Every form across the platform validates inputs with clear error messages before submission -- no form can submit invalid data
  4. Core user flows (product browsing, deal negotiation, quote comparison, dashboard loading) perform without perceptible lag on standard connections
**Plans**: 5 plans

Plans:
- [ ] 07-01-PLAN.md — Component refactoring: Extract sub-components from the 5 largest files (profile 1091L, UsersTable 1012L, OnboardingWizard 779L, product detail 653L, ChannelRight 592L)
- [ ] 07-02-PLAN.md — Error handling: ErrorBoundary component, global + 4 route-level boundaries, toast standardization, empty states
- [ ] 07-03-PLAN.md — Component refactoring part 2: Remaining 5 large components (HeroSection, DealForm, FairsManager, RegisterForm, QuotesPage) + UI style standardization audit
- [ ] 07-04-PLAN.md — Form validation: Zod schemas for 2 unvalidated forms (SubmitQuoteDialog, QuickActionToolbar), inline error display audit across all forms
- [ ] 07-05-PLAN.md — Performance: Dynamic imports for 6 heavy pages, infinite scroll for product/news lists, console.log/warn cleanup (54 occurrences)

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 (parallel with 3-4) -> 6 -> 8 (parallel with 6, depends on 2+6) -> 7

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Role System and Infrastructure | 4/4 | Complete | 2026-02-22 |
| 2. Deal Creation and Negotiation (S1) | 7/7 | Complete | 2026-02-23 |
| 3. Contract Agreement (S2) | 2/2 | Complete | 2026-03-01 |
| 4. Provider Portals and Insurance/Logistics Quotes (S3) | 6/6 | Complete | 2026-03-03 |
| 5. Legal Consulting | 11/11 | Complete | 2026-03-12 |
| 6. Trade Summary and Shipment Tracking (S4) | 10/10 | Complete | 2026-04-01 |
| 7. Platform Hardening | 5/5 | Complete | 2026-04-04 |
| 8. Live Currency and Freight Intelligence | 3/3 | Complete | 2026-04-02 |
| 9. Cold Email Unsubscribe | 4/4 | Planned | — |
| 10. Settings Page | 3/3 | Planned | — |
| 11. UI/UX Polish and Visual Fixes | 3/3 | Planned | — |
| 12. Notifications and Email System | 5/5 | Planned | — |
| 13. Messaging and Communication Improvements | 4/4 | Planned | — |
| 14. Insurance Quote System Overhaul | 5/5 | Planned | — |
| 15. Deal and Trade Flow Enhancements | 4/4 | Complete    | 2026-04-27 |
| 16. Product and RFQ Features | 7/7 | Complete    | 2026-05-01 |
| 17. Registration, Onboarding and Misc | 8/8 | Complete   | 2026-05-05 |

### Phase 8: Live Currency and Freight Intelligence (INSERTED)
**Goal**: Any visitor can see live currency rates on the homepage, and both deal parties can see multi-currency price conversions and a real-time freight cost estimate throughout the deal flow -- without CoreTradeGlobal being party to or responsible for any transaction
**Depends on**: Phase 2 (deal pages exist), Phase 6 (trade summary and deal sidebar are complete)
**Requirements**: INTEL-01, INTEL-02, INTEL-03, INTEL-04, INTEL-05
**Success Criteria** (what must be TRUE):
  1. The homepage displays a live currency ticker showing at minimum USD, EUR, GBP, TRY, CNY rates -- rates refresh automatically and show the last-updated timestamp; no API key or login is required to see this
  2. On the deal negotiation page, every offer amount is shown in the deal's base currency plus two user-selected target currencies -- conversion uses the same live rates as the homepage ticker and updates without a page reload
  3. On the deal page sidebar, a freight cost estimator widget accepts origin, destination, load type, and weight -- it returns an estimated range (min/max) per transport mode (sea FCL/LCL, air, road) sourced from the Freightos public marketplace API, with a clearly visible Freightos attribution link as required by their terms of service
  4. The freight estimator is called client-side (from the user's browser, not the server) so that per-IP rate limits (100 req/hour) apply per user, not per server -- the server never proxies Freightos calls
  5. Both the currency widget and the freight estimator display graceful fallback states when the external API is unavailable -- no blank screens, no unhandled errors; the deal flow is never blocked by a third-party API failure
**Plans**: 3 plans

Plans:
- [ ] 08-01-PLAN.md — Currency foundation: useLiveCurrency hook (Frankfurter API, client-side, 60s polling), CurrencyTicker component for homepage, currency constants, error/loading states
- [ ] 08-02-PLAN.md — Deal page currency integration: CurrencyConvertPanel in deal sidebar, offer timeline amounts in target currencies, currency selector persisted to localStorage
- [ ] 08-03-PLAN.md — Freight estimator: FreightEstimatorWidget component, client-side Freightos API call, min/max range per mode, transit time, Freightos attribution, deal sidebar integration, graceful degradation

### Phase 9: Cold email unsubscribe page with signed tokens, Firestore storage, and scheduled Google Sheets sync
**Goal**: Admins can bulk-generate HMAC-signed unsubscribe links for cold email campaigns; recipients can one-click unsubscribe via a public confirmation page; all records land in Firestore and are synced daily to a Google Sheet that Antigravity consumes
**Depends on**: Phase 8
**Requirements**: UNSUB-01, UNSUB-02, UNSUB-03, UNSUB-04, UNSUB-05, UNSUB-06
**Success Criteria** (what must be TRUE):
  1. An admin can paste a list of emails plus a campaign id into the /admin Unsubscribe Links tab and receive a copyable CSV-style block of email,url pairs ready for Antigravity
  2. A cold-email recipient clicking an unsubscribe link is recorded in Firestore in one click and lands on a chrome-less /unsubscribe?status=success page without auth
  3. Re-clicking the same unsubscribe link is idempotent — unsubscribedAt is preserved, lastClickAt updates, campaigns arrayUnion dedups
  4. Tampered or malformed tokens redirect to /unsubscribe?status=invalid with no Firestore write and no PII echoed back
  5. A scheduled daily Cloud Function exports the unsubscribes collection to a Google Sheet via a service-account-authenticated googleapis client with full-overwrite semantics
**Plans**: 4 plans

Plans:
- [ ] 09-01-PLAN.md — Cloud Functions (generateUnsubscribeLinks onCall + unsubscribe onRequest) with HMAC signing, Firestore idempotent upsert, security rules
- [ ] 09-02-PLAN.md — Public /unsubscribe confirmation page with chrome-less layout override (success/invalid/error states via useSearchParams)
- [ ] 09-03-PLAN.md — Admin UnsubscribeLinksManager component + /admin tab integration with correct label
- [ ] 09-04-PLAN.md — Scheduled exportUnsubscribesToSheet Cloud Function (googleapis + lazy-init singleton, daily cron in UTC)

### Phase 10: Settings Page

**Goal:** Users can manage account security (password, 2FA), notification preferences, email subscriptions, and account deletion from a dedicated settings page accessible via a fixed navbar dropdown -- profile page is cleaned of migrated functionality
**Depends on:** Phase 9
**Requirements**: SET-01, SET-02, SET-03, SET-04, SET-05, SET-06, SET-07
**Success Criteria** (what must be TRUE):
  1. Navbar user dropdown has solid dark background, shows avatar+name trigger, includes Profile/Settings/Logout items, and closes reliably on click-outside
  2. User can change their password with current password verification and Zod validation on the settings page
  3. User can enable TOTP 2FA by scanning a QR code and entering a 6-digit code, and receives 10 backup codes
  4. User can toggle email and push notification preferences per category (Deals, Messages, Legal, Providers, System), persisted in Firestore
  5. User can toggle email marketing subscription status, integrated with Phase 9 unsubscribes collection
  6. Settings page /settings route is protected and accessible to all authenticated roles
  7. Profile page no longer contains account settings, password change, or logout functionality
**Plans**: 3 plans

Plans:
- [ ] 10-01-PLAN.md — Navbar dropdown fix (solid bg, click-outside, Settings link) + settings page route shell with middleware protection
- [ ] 10-02-PLAN.md — Security section: password change with zodResolver + TOTP 2FA enrollment/unenrollment with QR code and backup codes
- [ ] 10-03-PLAN.md — Notification preferences, email subscriptions, danger zone (logout + delete), profile page cleanup

### Phase 11: UI/UX Polish and Visual Fixes

**Goal:** All homepage cards, navigation, hero section, fairs page, date pickers, and delete buttons meet a consistent premium visual standard with gold accent theme, ticker-above-navbar layout, and polished interactions
**Requirements**: UI-01, UI-02, UI-03, UI-04, UI-05, UI-06, UI-07, UI-08, UI-09, UI-10
**Depends on:** Phase 10
**Plans:** 3/3 plans complete

Plans:
- [ ] 11-01-PLAN.md — Navbar/ticker restructuring (ticker above navbar, reduced height, scroll-padding-top) + hero silver gradient + globe speed + shared card CSS utilities
- [ ] 11-02-PLAN.md — Card visual refresh: gold borders, lighter backgrounds, hover glow on all card types + country flag on fair cards + product placeholder SVG + shimmer loading
- [ ] 11-03-PLAN.md — Fairs page sorting with collapsible past section + DatePicker replacement across 5 forms + delete button wording clarity

### Phase 12: Notifications and Email System

**Goal:** Full notification center page with filter tabs and bulk actions, branded email templates with throttled message digests, extended push notification coverage (member registration, RFQ, quote broadcast, announcements), FCM pipeline fix, admin announcement system with scheduling, and LinkedIn share on news articles
**Requirements**: NOTIF-01, NOTIF-02, NOTIF-03, NOTIF-04, NOTIF-05, NOTIF-06, NOTIF-07, NOTIF-08
**Depends on:** Phase 11
**Plans:** 5/5 plans complete

Plans:
- [ ] 12-01-PLAN.md — Notification center page (/notifications) with filter tabs, infinite scroll, bulk actions + NotificationBell extension (10 items, "View all" link)
- [ ] 12-02-PLAN.md — Branded email template (buildBrandedEmailHtml), sender address change to noreply@, message email throttling (1/day)
- [ ] 12-03-PLAN.md — LinkedIn share and copy-to-clipboard buttons on news detail page
- [ ] 12-04-PLAN.md — FCM debug/fix, new push triggers (member registered, RFQ created, quote broadcast), Firestore rules notification type update
- [ ] 12-05-PLAN.md — Admin announcement system: form (title, body, audience, channels, schedule), Cloud Functions (sendAnnouncement, processScheduledAnnouncements), history view

### Phase 13: Messaging and Communication Improvements

**Goal:** Improve the existing messaging system with seller/user profile visibility in chat, fix dual chat opening bug, add provider-buyer-seller messaging on quote pages, and rename provider dashboard tabs/columns per provider type
**Requirements**: MSG-01, MSG-02, MSG-03, MSG-04, MSG-05, MSG-06, MSG-07, MSG-08, MSG-09, MSG-10, MSG-11
**Depends on:** Phase 12
**Success Criteria** (what must be TRUE):
  1. Every conversation in both the FAB widget and /messages page shows a compact profile card header with avatar, full name, company name, country, and role badge -- clicking it navigates to the user's profile
  2. FAB widget is hidden when user is on /messages routes -- no dual chat panels; message notification clicks route to the correct view based on current page
  3. Full chat sidebar on both buyer's quote comparison page and provider's quote detail page, with 3-party conversations (buyer + seller + provider) and separate threads per provider
  4. Provider dashboard tabs and kanban columns show provider-type-specific labels (insurance vs logistics terminology)
**Plans**: 4 plans

Plans:
- [ ] 13-01-PLAN.md — ConversationProfileCard component + country enrichment in CreateConversationUseCase, integration into FAB widget and /messages page
- [ ] 13-02-PLAN.md — FAB route-aware hiding on /messages with usePathname + notification click routing fix
- [ ] 13-03-PLAN.md — Provider quote chat sidebar: new provider_quote conversation type, ConversationRepository methods, ProviderQuoteChatSidebar on both quote pages
- [ ] 13-04-PLAN.md — Provider dashboard tab and kanban column label renaming per provider type

### Phase 14: Insurance Quote System Overhaul

**Goal:** Expand the insurance quote system with 3 risk type sections (Cargo/Marine, Commercial Risk, Political Risk), enriched deal information panel with buyer/seller details, quote status (Indicative/Firm) with binding conditions, exclusions, conditions precedent, claims handling, premium additions, quote summary confirmation modal, and message to buyer field
**Requirements**: INS-01, INS-02, INS-03, INS-04, INS-05, INS-06, INS-07, INS-08, INS-09, INS-10, INS-11, INS-12
**Depends on:** Phase 13
**Success Criteria** (what must be TRUE):
  1. Insurance providers can submit quotes with 3 risk type sections: Cargo/Marine (required), Commercial Risk (optional), and Political Risk (optional) — each with full coverage details
  2. Deal info panel shows buyer/seller names + countries, insurance arrangement derived from Incoterm, and payment terms for both insurance and logistics providers
  3. Provider can mark quote as Indicative or Firm — Firm quotes show binding conditions textarea
  4. Quote form includes shared sections: Exclusions (checkboxes + free text), Conditions Precedent, Claims Handling (jurisdiction, response time, contact email), and Premium additions (rate %, payment terms)
  5. A summary modal appears before final submit showing all filled sections for provider review
  6. Buyer's quote comparison card shows expandable sections for Commercial and Political risk details, with Firm/Indicative badges
**Plans**: 5 plans

Plans:
- [x] 14-01-PLAN.md — Data foundation: extend Quote entity with nested risk type sub-objects, new constants, update broadcastQuoteRequests and submitQuote Cloud Functions (completed 2026-04-26)
- [x] 14-02-PLAN.md — Risk type accordion sections in QuoteFormInsurance: Cargo/Marine (required), Commercial Risk (optional), Political Risk (optional) (completed 2026-04-26)
- [x] 14-03-PLAN.md — Shared form sections: Exclusions, Conditions Precedent, Claims Handling, Premium Additions, Quote Status + Quote Summary Modal (completed 2026-04-26)
- [x] 14-04-PLAN.md — Wire all sub-components into QuoteFormInsurance, extend Zod schema, enrich QuoteDetailView deal info panel (completed 2026-04-26)
- [x] 14-05-PLAN.md — Extend InsuranceQuoteCard with expandable risk sections and Firm/Indicative badges (completed 2026-04-26)

### Phase 15: Deal and Trade Flow Enhancements

**Goal:** Improve deal/trade pages with contract approval UX enhancements (always-expanded clauses, yellow/green highlighting, progress indicators, auto-advance), Hire a Lawyer card on all trade stages, flexible quote skipping, trade flow communication buttons, tooltip-based guidance, and form input polish (Deal ID, DatePicker gold accent, number auto-select, English validation messages)
**Requirements**: DEAL-01, DEAL-02, DEAL-03, DEAL-04, DEAL-05, DEAL-06, DEAL-07, DEAL-08, DEAL-09, DEAL-10, DEAL-11, DEAL-12, DEAL-13, DEAL-14, DEAL-15, DEAL-16, DEAL-17, DEAL-18
**Depends on:** Phase 14
**Plans:** 8 plans (4 complete + 4 gap closure)

Plans:
- [ ] 15-01-PLAN.md — Contract approval UX: always-expanded clauses with yellow/green visual states, dual progress indicators, auto-advance with toast
- [ ] 15-02-PLAN.md — LegalBanner overhaul (per-page dismiss, slim collapsed banner, all trade pages), Tooltip component, tooltip placements
- [ ] 15-03-PLAN.md — Skip quote sections (insurance/logistics independently), confirm button rename, Chat buttons on Trade Summary, message icons on deal pages
- [ ] 15-04-PLAN.md — Deal ID breadcrumb, PDF download link, DatePicker gold accent, number input onFocus auto-select, Zod validation English audit

### Phase 16: Product and RFQ Features

**Goal:** Enhance product and RFQ pages with favorite products + share button, CSV bulk product upload, product category sidebar with search, product image zoom on hover, quote details on page, dedicated product request upload page, deal start button on product detail, RFQ member notifications, and target budget "0 = negotiable" option
**Requirements**: PROD-01, PROD-02, PROD-03, PROD-04, PROD-05, PROD-06, PROD-07, PROD-08, PROD-09, PROD-10
**Depends on:** Phase 15
**Plans:** 7/7 plans complete

Plans:
- [x] 16-01-PLAN.md — Favorites (star toggle, /favorites page), share button, product image hover zoom
- [x] 16-02-PLAN.md — Product category sidebar with search, Start Deal button on product detail
- [x] 16-03-PLAN.md — RFQ modal outside-click fix, QuotesSection enhancement
- [x] 16-04-PLAN.md — Admin CSV bulk product upload with image downloading
- [ ] 16-05-PLAN.md — UAT gap closure: favorites link on profile, consistent card styles, homepage products reliability
- [ ] 16-06-PLAN.md — UAT gap closure: image hover zoom fix, Start Deal button repositioning, RFQ modal backdrop fix
- [ ] 16-07-PLAN.md — UAT gap closure: bulk upload category validation fix, Cloud Function error fix

### Phase 17: Registration, Onboarding and Misc

**Goal:** Add company type selection at registration (Trade/Logistics/Insurance), phone country code auto-fill, new member onboarding guide, fix register page Vercel crash, FAQ text updates, "upload my products" request button on profile, homepage chatbot (Zoho SalesIQ), cookies compliance, and accessibility audit
**Requirements**: REG-01, REG-02, REG-03, REG-04, REG-05, REG-06, REG-07, REG-08, REG-09
**Depends on:** Phase 16
**Plans:** 8/8 plans complete

Plans:
- [ ] 17-01-PLAN.md — Registration form: company type dropdown, phone country code auto-fill, auto-role assignment, Vercel crash fix
- [ ] 17-02-PLAN.md — Onboarding tour overlay (5 steps per role) + profile completion progress card
- [ ] 17-03-PLAN.md — Zoho SalesIQ integration: Support tab in FAB widget + standalone button on public pages
- [ ] 17-04-PLAN.md — Upload my products request button, cookie consent text update, WCAG 2.1 AA accessibility audit
- [ ] 17-05-PLAN.md — UAT gap closure: Rename Trade Company to Supplier, remove Zoho SalesIQ code, deploy Firestore rules
- [ ] 17-06-PLAN.md — UAT gap closure: Independent phone country code dropdown (not auto-filled from company country)
- [ ] 17-07-PLAN.md — UAT gap closure: Reposition profile completion card to right top corner, fix hide behavior
- [ ] 17-08-PLAN.md — UAT gap closure: Onboarding tour complete redesign with 3-part Turkish content and ? FAB button

---
*Roadmap created: 2026-02-20*
*Last updated: 2026-05-01*
