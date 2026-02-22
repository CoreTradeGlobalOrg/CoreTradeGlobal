# Requirements: Core Trade Global

**Defined:** 2026-02-20
**Core Value:** A member can complete an entire international trade deal — negotiate, get legal advice, insure cargo, arrange shipping, and track delivery — without leaving the platform.

## v1 Requirements

Requirements for initial release. Each maps to roadmap phases.

### Role System

- [x] **ROLE-01**: Platform supports 5 roles: member, logistics_provider, insurance_provider, lawyer, admin
- [x] **ROLE-02**: Buyer/seller is contextual per deal — role determined by deal participation, not at registration
- [x] **ROLE-03**: Admin can create and invite provider and lawyer accounts (no self-registration)
- [x] **ROLE-04**: Role-based navigation shows relevant dashboard and menu items per role
- [x] **ROLE-05**: Firestore security rules enforce role-based access independently of middleware
- [x] **ROLE-06**: No role overlap — each account has exactly one role

### Negotiation (S1)

- [x] **NEGO-01**: Buyer and seller can exchange offers and counter-offers on a deal
- [x] **NEGO-02**: Offers include Incoterms 2020 selection (EXW, FOB, CIF, CFR, DAP, DDP, FCA, CPT)
- [ ] **NEGO-03**: Offer history timeline shows all rounds with timestamps, amounts, and terms
- [x] **NEGO-04**: Real-time updates via Firestore listeners — no page refresh needed
- [ ] **NEGO-05**: In-app and email notification when counter-offer received
- [x] **NEGO-06**: Offer state machine enforces valid transitions (open → countered → accepted/rejected/expired)
- [x] **NEGO-07**: All deal state transitions use atomic Firestore transactions

### Agreement (S2)

- [ ] **AGMT-01**: Both parties can review contract clauses populated from negotiation outcome
- [ ] **AGMT-02**: Each contract clause requires individual checkbox approval per party
- [ ] **AGMT-03**: Party approval status tracked (pending/approved per side)
- [ ] **AGMT-04**: Deal cannot advance to insurance/logistics stage until both parties approve
- [ ] **AGMT-05**: Financial summary and document requirements displayed before approval

### Legal Consulting

- [ ] **LEGAL-01**: Buyer can independently hire a lawyer for a deal
- [ ] **LEGAL-02**: Seller can independently hire a different lawyer for the same deal
- [ ] **LEGAL-03**: Private messaging channel between client and their lawyer, isolated from opposing party
- [ ] **LEGAL-04**: Lawyer can view full deal details (trade info, parties, documents)
- [ ] **LEGAL-05**: Lawyer can create and revise contract drafts with version history
- [ ] **LEGAL-06**: Risk analysis panel with severity levels (low/medium/high)
- [ ] **LEGAL-07**: Quick-action buttons (approve, request info, request changes, attach file)
- [ ] **LEGAL-08**: Legal consulting is optional — parties can proceed without hiring a lawyer

### Insurance & Logistics Quotes (S3)

- [ ] **QUOTE-01**: Buyer can view and compare insurance quotes from multiple providers
- [ ] **QUOTE-02**: Buyer can view and compare logistics quotes from multiple providers
- [ ] **QUOTE-03**: Quotes display provider details, price, coverage/mode, and validity countdown
- [ ] **QUOTE-04**: Quote validity timer enforced server-side via Cloud Function
- [ ] **QUOTE-05**: Buyer can select and confirm one insurance and one logistics provider per deal
- [ ] **QUOTE-06**: Cost breakdown summary displayed after provider selection

### Provider Portals

- [ ] **PORTAL-01**: Insurance providers can view incoming quote requests with full deal info including price
- [ ] **PORTAL-02**: Insurance providers can submit quotes with ICC coverage (A/B/C), premium, extras, and validity period
- [ ] **PORTAL-03**: Logistics providers can view incoming quote requests with all deal info except price
- [ ] **PORTAL-04**: Logistics providers can submit quotes with transport mode, pricing, timeline, and validity period
- [ ] **PORTAL-05**: Provider data visibility rules enforced at data layer — logistics providers never see deal price

### Tracking & Summary (S4)

- [ ] **TRACK-01**: Buyer and seller can view trade summary dashboard with deal overview
- [ ] **TRACK-02**: Shipment tracking with provider-submitted status updates
- [ ] **TRACK-03**: Order timeline showing all completed milestones with timestamps
- [ ] **TRACK-04**: Role-dispatched dashboard showing relevant view per role (member, lawyer, provider)

### Platform Hardening

- [ ] **HARDEN-01**: Thorough quality sweep of all existing features for UI consistency
- [ ] **HARDEN-02**: All error states handled gracefully across the platform
- [ ] **HARDEN-03**: All forms have proper validation with clear error messages
- [ ] **HARDEN-04**: Performance audit and optimization where needed

## v2 Requirements

Deferred to future release. Tracked but not in current roadmap.

### Legal Consulting Enhancements

- **LEGAL-V2-01**: Contract revision diff view — side-by-side visual comparison between draft versions

### Tracking Enhancements

- **TRACK-V2-01**: Provider-submitted tracking status history with incremental milestone updates
- **TRACK-V2-02**: Real carrier API tracking integration (DHL, Maersk, etc.)

### Notifications

- **NOTIF-V2-01**: Deal-level notification preferences — users can configure frequency and channels per deal

## Out of Scope

Explicitly excluded. Documented to prevent scope creep.

| Feature | Reason |
|---------|--------|
| On-platform payment/escrow | Regulatory complexity (KYC/AML, licensing) — parties arrange payment externally |
| Multi-language i18n | No validated non-English user demand — English-only for v1 |
| Mobile native app | Web-first until product-market fit established |
| Video/audio in lawyer channels | Requires WebRTC infrastructure — recommend Zoom/Teams for calls |
| Self-registration for providers/lawyers | Quality control — admin vets all providers before platform access |
| WebSocket chat for general messaging | Existing Firestore messaging pattern sufficient — only trade channels get real-time |
| AI-assisted contract review | Liability concerns for AI legal advice across jurisdictions — human lawyers are the differentiator |

## Traceability

Which phases cover which requirements. Updated during roadmap creation.

| Requirement | Phase | Status |
|-------------|-------|--------|
| ROLE-01 | Phase 1 | Complete |
| ROLE-02 | Phase 1 | Complete |
| ROLE-03 | Phase 1 | Complete |
| ROLE-04 | Phase 1 | Complete |
| ROLE-05 | Phase 1 | Complete |
| ROLE-06 | Phase 1 | Complete |
| NEGO-01 | Phase 2 | Complete |
| NEGO-02 | Phase 2 | Complete |
| NEGO-03 | Phase 2 | Pending |
| NEGO-04 | Phase 2 | Complete |
| NEGO-05 | Phase 2 | Pending |
| NEGO-06 | Phase 2 | Complete |
| NEGO-07 | Phase 2 | Complete |
| AGMT-01 | Phase 3 | Pending |
| AGMT-02 | Phase 3 | Pending |
| AGMT-03 | Phase 3 | Pending |
| AGMT-04 | Phase 3 | Pending |
| AGMT-05 | Phase 3 | Pending |
| LEGAL-01 | Phase 5 | Pending |
| LEGAL-02 | Phase 5 | Pending |
| LEGAL-03 | Phase 5 | Pending |
| LEGAL-04 | Phase 5 | Pending |
| LEGAL-05 | Phase 5 | Pending |
| LEGAL-06 | Phase 5 | Pending |
| LEGAL-07 | Phase 5 | Pending |
| LEGAL-08 | Phase 5 | Pending |
| QUOTE-01 | Phase 4 | Pending |
| QUOTE-02 | Phase 4 | Pending |
| QUOTE-03 | Phase 4 | Pending |
| QUOTE-04 | Phase 4 | Pending |
| QUOTE-05 | Phase 4 | Pending |
| QUOTE-06 | Phase 4 | Pending |
| PORTAL-01 | Phase 4 | Pending |
| PORTAL-02 | Phase 4 | Pending |
| PORTAL-03 | Phase 4 | Pending |
| PORTAL-04 | Phase 4 | Pending |
| PORTAL-05 | Phase 4 | Pending |
| TRACK-01 | Phase 6 | Pending |
| TRACK-02 | Phase 6 | Pending |
| TRACK-03 | Phase 6 | Pending |
| TRACK-04 | Phase 6 | Pending |
| HARDEN-01 | Phase 7 | Pending |
| HARDEN-02 | Phase 7 | Pending |
| HARDEN-03 | Phase 7 | Pending |
| HARDEN-04 | Phase 7 | Pending |

**Coverage:**
- v1 requirements: 45 total
- Mapped to phases: 45
- Unmapped: 0

---
*Requirements defined: 2026-02-20*
*Last updated: 2026-02-20 after roadmap creation*
