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
- [ ] **Phase 4: Provider Portals and Insurance/Logistics Quotes (S3)** - Provider quote submission portals and buyer quote comparison/selection with server-enforced validity
- [ ] **Phase 5: Legal Consulting** - Independent lawyer hiring per deal party, private encrypted channels, versioned contract drafts, and risk analysis
- [ ] **Phase 6: Trade Summary and Shipment Tracking (S4)** - Trade summary dashboard, shipment tracking, order timeline, and role-dispatched dashboards
- [ ] **Phase 7: Platform Hardening** - Quality sweep of all features for UI consistency, error handling, validation, and performance

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
- [ ] 01-04-PLAN.md — UAT gap closure: Cloud Functions emulator, admin navbar override, session error visibility

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
- [ ] 02-05-PLAN.md -- UAT gap closure: Fix Firestore offers subcollection rules for member access, product quantity/unit pre-fill with UNECE mapping
- [ ] 02-06-PLAN.md -- UAT gap closure: Fix FCM deal notification handlers, remove duplicate system messages, add system message rendering in chat
- [ ] 02-07-PLAN.md -- Verification gap closure: Fix submitCounterOffer parameter name mismatch (offerData -> offer)

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
- [ ] 03-01-PLAN.md — Data foundation: contractConstants, Contract entity, ContractRepository, deal status extension, Firestore rules, Cloud Functions (onDealAccepted, saveDraftApprovals, submitContractApproval), contract approval notifications
- [ ] 03-02-PLAN.md — Contract page UI: route, hooks, accordion clause layout, dual-party real-time approval, financial sidebar, PDF export, DealPage integration, verification checkpoint

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
- [ ] 04-01-PLAN.md — Quote constants, entities, repositories, DI registration, deal status extension (PROVIDERS_SELECTED), DealCard badge
- [ ] 04-02-PLAN.md — Cloud Functions (broadcast, submit, accept, decline, withdraw, confirm, expiry checker), Firestore rules, indexes
- [ ] 04-03-PLAN.md — Provider portal: kanban dashboard, request cards, insurance and logistics quote forms, hooks, route
- [ ] 04-04-PLAN.md — Buyer quotes comparison: filter/sort/ribbons, quote cards, cost breakdown sidebar, selection confirmation
- [ ] 04-05-PLAN.md — DealPage integration (quotes banner, providers_selected terminal), ProgressTracker update, end-to-end verification checkpoint
- [ ] 04-06-PLAN.md — UAT gap closure: providerType normalization fix, useQuoteForRequest hook, withdraw button visibility

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
**Plans**: TBD

Plans:
- [ ] 05-01: TBD
- [ ] 05-02: TBD

### Phase 6: Trade Summary and Shipment Tracking (S4)
**Goal**: Both deal parties can view a complete trade summary with shipment tracking and milestone timeline, and every role sees a relevant dashboard
**Depends on**: Phase 4 (reads data from all prior stages)
**Requirements**: TRACK-01, TRACK-02, TRACK-03, TRACK-04
**Success Criteria** (what must be TRUE):
  1. Buyer and seller can view a trade summary dashboard showing the full deal overview -- negotiation outcome, approval status, selected providers, costs, and current shipment status
  2. Shipment tracking shows provider-submitted status updates, and the order timeline displays all completed milestones with timestamps (negotiated, approved, insured, in transit, delivered)
  3. Each role sees a role-appropriate dashboard: members see their deals, lawyers see their assigned channels, providers see their quote requests and active shipments
**Plans**: TBD

Plans:
- [ ] 06-01: TBD

### Phase 7: Platform Hardening
**Goal**: Every feature across the platform -- existing and newly built -- meets a consistent standard of UI quality, error handling, validation, and performance
**Depends on**: Phase 6 (all features must be built before sweeping)
**Requirements**: HARDEN-01, HARDEN-02, HARDEN-03, HARDEN-04
**Success Criteria** (what must be TRUE):
  1. All pages and components follow the same visual patterns -- no inconsistent spacing, typography, colors, or component styles across existing and new features
  2. Every error state across the platform shows a clear, user-friendly message -- no unhandled exceptions, blank screens, or raw error text visible to users
  3. Every form across the platform validates inputs with clear error messages before submission -- no form can submit invalid data
  4. Core user flows (product browsing, deal negotiation, quote comparison, dashboard loading) perform without perceptible lag on standard connections
**Plans**: TBD

Plans:
- [ ] 07-01: TBD
- [ ] 07-02: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 -> 2 -> 3 -> 4 -> 5 (parallel with 3-4) -> 6 -> 7

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Role System and Infrastructure | 4/4 | Complete   | 2026-02-22 |
| 2. Deal Creation and Negotiation (S1) | 7/7 | Complete   | 2026-02-23 |
| 3. Contract Agreement (S2) | 2/2 | Complete   | 2026-03-01 |
| 4. Provider Portals and Insurance/Logistics Quotes (S3) | 4/6 | In Progress|  |
| 5. Legal Consulting | 0/0 | Not started | - |
| 6. Trade Summary and Shipment Tracking (S4) | 0/0 | Not started | - |
| 7. Platform Hardening | 0/0 | Not started | - |

---
*Roadmap created: 2026-02-20*
*Last updated: 2026-03-03*
