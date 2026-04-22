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
- [x] **NEGO-03**: Offer history timeline shows all rounds with timestamps, amounts, and terms
- [x] **NEGO-04**: Real-time updates via Firestore listeners — no page refresh needed
- [x] **NEGO-05**: In-app and email notification when counter-offer received
- [x] **NEGO-06**: Offer state machine enforces valid transitions (open → countered → accepted/rejected/expired)
- [x] **NEGO-07**: All deal state transitions use atomic Firestore transactions

### Agreement (S2)

- [x] **AGMT-01**: Both parties can review contract clauses populated from negotiation outcome
- [x] **AGMT-02**: Each contract clause requires individual checkbox approval per party
- [x] **AGMT-03**: Party approval status tracked (pending/approved per side)
- [x] **AGMT-04**: Deal cannot advance to insurance/logistics stage until both parties approve
- [x] **AGMT-05**: Financial summary and document requirements displayed before approval

### Legal Consulting

- [x] **LEGAL-01**: Buyer can independently hire a lawyer for a deal
- [x] **LEGAL-02**: Seller can independently hire a different lawyer for the same deal
- [x] **LEGAL-03**: Private messaging channel between client and their lawyer, isolated from opposing party
- [x] **LEGAL-04**: Lawyer can view full deal details (trade info, parties, documents)
- [x] **LEGAL-05**: Lawyer can create and revise contract drafts with version history
- [x] **LEGAL-06**: Risk analysis panel with severity levels (low/medium/high)
- [x] **LEGAL-07**: Quick-action buttons (approve, request info, request changes, attach file)
- [x] **LEGAL-08**: Legal consulting is optional — parties can proceed without hiring a lawyer

### Insurance & Logistics Quotes (S3)

- [x] **QUOTE-01**: Buyer can view and compare insurance quotes from multiple providers
- [x] **QUOTE-02**: Buyer can view and compare logistics quotes from multiple providers
- [x] **QUOTE-03**: Quotes display provider details, price, coverage/mode, and validity countdown
- [x] **QUOTE-04**: Quote validity timer enforced server-side via Cloud Function
- [x] **QUOTE-05**: Buyer can select and confirm one insurance and one logistics provider per deal
- [x] **QUOTE-06**: Cost breakdown summary displayed after provider selection

### Provider Portals

- [x] **PORTAL-01**: Insurance providers can view incoming quote requests with full deal info including price
- [x] **PORTAL-02**: Insurance providers can submit quotes with ICC coverage (A/B/C), premium, extras, and validity period
- [x] **PORTAL-03**: Logistics providers can view incoming quote requests with all deal info except price
- [x] **PORTAL-04**: Logistics providers can submit quotes with transport mode, pricing, timeline, and validity period
- [x] **PORTAL-05**: Provider data visibility rules enforced at data layer — logistics providers never see deal price

### Tracking & Summary (S4)

- [x] **TRACK-01**: Buyer and seller can view trade summary dashboard with deal overview
- [x] **TRACK-02**: Shipment tracking with provider-submitted status updates
- [x] **TRACK-03**: Order timeline showing all completed milestones with timestamps
- [x] **TRACK-04**: Role-dispatched dashboard showing relevant view per role (member, lawyer, provider)

### Live Currency and Freight Intelligence

- [x] **INTEL-01**: Homepage displays a live currency ticker (USD, EUR, GBP, TRY, CNY minimum) with auto-refresh and last-updated timestamp -- no login required
- [x] **INTEL-02**: Deal negotiation page shows offer amounts in base currency plus two user-selected target currencies with live conversion
- [x] **INTEL-03**: Deal page sidebar freight estimator accepts origin, destination, load type, weight and returns min/max range per transport mode (sea FCL/LCL, air, road) via Freightos API with attribution link
- [x] **INTEL-04**: Freight estimator runs client-side (browser-to-Freightos) -- server never proxies Freightos calls, per-IP rate limits apply per user
- [x] **INTEL-05**: Both currency and freight widgets show graceful fallback states when external APIs are unavailable -- deal flow is never blocked

### Platform Hardening

- [x] **HARDEN-01**: Thorough quality sweep of all existing features for UI consistency
- [x] **HARDEN-02**: All error states handled gracefully across the platform
- [x] **HARDEN-03**: All forms have proper validation with clear error messages
- [x] **HARDEN-04**: Performance audit and optimization where needed

### Notifications and Email System

- [x] **NOTIF-01**: Full-page notification center at /notifications with filter tabs (All, Deals, Messages, Legal, Providers, System), infinite scroll, and bulk actions (mark read, delete, batch selection)
- [x] **NOTIF-02**: NotificationBell dropdown shows 10 items with "View all" link navigating to notification center
- [x] **NOTIF-03**: All automated emails use noreply@coretradeglobal.com sender and shared branded HTML template with CTG logo, gold accents, and unsubscribe footer
- [x] **NOTIF-04**: Message notification emails throttled to max 1 per user per day across all conversations
- [ ] **NOTIF-05**: Push notifications for new member registration (admin), new RFQ (all members), and quote request broadcast (providers), respecting Phase 10 notification preferences
- [ ] **NOTIF-06**: FCM push notification pipeline debugged and functional (token lifecycle, service worker, foreground/background handlers)
- [ ] **NOTIF-07**: Admin announcement system with title, body, audience selector, channel toggles (in-app/push/email), optional scheduling, and announcement history
- [ ] **NOTIF-08**: LinkedIn share button and copy-to-clipboard on news detail page (LinkedIn share-offsite URL scheme, no API key)

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
| NEGO-03 | Phase 2 | Complete |
| NEGO-04 | Phase 2 | Complete |
| NEGO-05 | Phase 2 | Complete |
| NEGO-06 | Phase 2 | Complete |
| NEGO-07 | Phase 2 | Complete |
| AGMT-01 | Phase 3 | Complete |
| AGMT-02 | Phase 3 | Complete |
| AGMT-03 | Phase 3 | Complete |
| AGMT-04 | Phase 3 | Complete |
| AGMT-05 | Phase 3 | Complete |
| LEGAL-01 | Phase 5 | Complete |
| LEGAL-02 | Phase 5 | Complete |
| LEGAL-03 | Phase 5 | Complete |
| LEGAL-04 | Phase 5 | Complete |
| LEGAL-05 | Phase 5 | Complete |
| LEGAL-06 | Phase 5 | Complete |
| LEGAL-07 | Phase 5 | Complete |
| LEGAL-08 | Phase 5 | Complete |
| QUOTE-01 | Phase 4 | Complete |
| QUOTE-02 | Phase 4 | Complete |
| QUOTE-03 | Phase 4 | Complete |
| QUOTE-04 | Phase 4 | Complete |
| QUOTE-05 | Phase 4 | Complete |
| QUOTE-06 | Phase 4 | Complete |
| PORTAL-01 | Phase 4 | Complete |
| PORTAL-02 | Phase 4 | Complete |
| PORTAL-03 | Phase 4 | Complete |
| PORTAL-04 | Phase 4 | Complete |
| PORTAL-05 | Phase 4 | Complete |
| TRACK-01 | Phase 6 | Complete |
| TRACK-02 | Phase 6 | Complete |
| TRACK-03 | Phase 6 | Complete |
| TRACK-04 | Phase 6 | Complete |
| HARDEN-01 | Phase 7 | Complete |
| HARDEN-02 | Phase 7 | Complete |
| HARDEN-03 | Phase 7 | Complete |
| HARDEN-04 | Phase 7 | Complete |
| NOTIF-01 | Phase 12 | Planned |
| NOTIF-02 | Phase 12 | Planned |
| NOTIF-03 | Phase 12 | Planned |
| NOTIF-04 | Phase 12 | Planned |
| NOTIF-05 | Phase 12 | Planned |
| NOTIF-06 | Phase 12 | Planned |
| NOTIF-07 | Phase 12 | Planned |
| NOTIF-08 | Phase 12 | Planned |

**Coverage:**
- v1 requirements: 53 total
- Mapped to phases: 53
- Unmapped: 0

---
*Requirements defined: 2026-02-20*
*Last updated: 2026-04-22 after Phase 12 planning*
