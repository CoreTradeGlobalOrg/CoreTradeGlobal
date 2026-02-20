# Core Trade Global

## What This Is

A B2B international trade platform where buyers and sellers negotiate deals end-to-end — from offer to agreement to insurance/shipping to tracking. The platform connects trade parties with real insurance providers, logistics companies, and lawyers, all within a single unified experience. Built on Next.js + Firebase with Clean Architecture.

## Core Value

A member can complete an entire international trade deal — negotiate, get legal advice, insure cargo, arrange shipping, and track delivery — without leaving the platform.

## Requirements

### Validated

<!-- Shipped and confirmed valuable. -->

- ✓ User can register with email and password — existing
- ✓ User receives email verification after signup — existing
- ✓ User can reset password via email link — existing
- ✓ User session persists across browser refresh (HTTP-only cookie) — existing
- ✓ User can browse and search products with filters — existing
- ✓ User can view product details — existing
- ✓ User can create and manage their own products — existing
- ✓ User can submit requests for quotation (RFQ) — existing
- ✓ User can view and respond to RFQs — existing
- ✓ User can send and receive direct messages — existing
- ✓ User can browse trade fairs with status badges — existing
- ✓ User can view company profiles — existing
- ✓ User can view and edit their own profile — existing
- ✓ Admin can manage users, products, and requests — existing
- ✓ Admin can approve/reject products and requests — existing
- ✓ Platform has SEO sitemap and static pages (about, FAQ, privacy, terms) — existing
- ✓ Route protection via middleware (auth, admin) — existing
- ✓ Google Analytics integration with custom event tracking — existing
- ✓ reCAPTCHA bot protection — existing
- ✓ Security headers (HSTS, XSS protection, clickjacking prevention) — existing

### Active

<!-- Current scope. Building toward these. -->

**Trade Flow — Negotiation (S1):**
- [ ] Buyer and seller can exchange offers and counter-offers on a deal
- [ ] Negotiation supports Incoterms selection (EXW, FOB, CIF, CFR, DAP, DDP, FCA, CPT)
- [ ] Offer history timeline shows all rounds of negotiation
- [ ] Real-time updates via Firestore listeners — no page refresh needed
- [ ] In-app + email notifications when counter-offer received

**Trade Flow — Agreement & Approval (S2):**
- [ ] Both parties can review and approve contract clauses
- [ ] Contract has multiple legal clauses requiring individual checkbox approval
- [ ] Party approval status tracked (pending/approved per side)
- [ ] Deal cannot proceed until both parties approve
- [ ] Financial summary and document requirements displayed

**Trade Flow — Legal Consulting (hukuk-danismanlik):**
- [ ] Buyer can independently hire a lawyer for a deal
- [ ] Seller can independently hire a different lawyer for the same deal
- [ ] Private encrypted messaging channel between client and their lawyer
- [ ] Lawyer can review full deal details (trade info, parties, documents)
- [ ] Lawyer can create, revise, and share contract drafts (versioned)
- [ ] Risk analysis panel with severity levels (low/medium/high)
- [ ] Contract revision history with change tracking
- [ ] Document sharing within lawyer-client channel
- [ ] Quick-action buttons (approve, request info, request changes, attach file)
- [ ] Lawyer approval is optional — parties can proceed without it

**Trade Flow — Insurance & Transportation (S3):**
- [ ] Buyer can view and compare live insurance quotes from multiple providers
- [ ] Buyer can view and compare live logistics quotes from multiple providers
- [ ] Quotes show provider details, price, coverage type, and validity timer
- [ ] Buyer can select and confirm insurance + logistics providers for a deal
- [ ] Cost breakdown summary after selection

**Trade Flow — Tracking & Summary (S4):**
- [ ] Buyer and seller can view trade summary dashboard
- [ ] Real-time shipment tracking with status updates
- [ ] Order timeline showing all steps completed

**Provider Portals:**
- [ ] Insurance providers can view incoming quote requests (full deal info including price)
- [ ] Insurance providers can submit quotes with coverage details (ICC A/B/C), premium, extras
- [ ] Logistics providers can view incoming quote requests (everything except price)
- [ ] Logistics providers can submit quotes with transport mode, pricing, and timeline
- [ ] Quote validity timer and rules enforcement

**Role System:**
- [ ] Extend Firestore role field to support: member, logistics_provider, insurance_provider, lawyer, admin
- [ ] Same app with role-filtered navigation and dashboards
- [ ] Members are contextual buyers/sellers — role determined per deal, not at registration
- [ ] Providers and lawyers are invite-only (admin creates their accounts)
- [ ] No role overlap — each account is one type only

**Platform Hardening:**
- [ ] Thorough review and quality sweep of all existing features
- [ ] Fix any UI inconsistencies across the platform
- [ ] Ensure all error states are handled gracefully
- [ ] Verify all forms have proper validation
- [ ] Performance audit and optimization where needed

### Out of Scope

<!-- Explicit boundaries. Includes reasoning to prevent re-adding. -->

- On-platform payment/escrow — payment happens off-platform; just track the deal
- Multi-language i18n — platform is English; multilingual support is future scope
- Mobile native app — web-first; mobile later
- Video/audio calls within lawyer chat — communication stays text-based on platform
- Self-registration for providers/lawyers — invite-only via admin
- Real-time chat (WebSocket) for general messaging — existing messaging system stays as-is; only trade-specific channels get real-time updates

## Context

- **Existing codebase**: Next.js 16.1.4, React 19, Firebase (Auth, Firestore, Storage, Functions), Tailwind CSS 4, Clean Architecture with DDD
- **Existing users**: 8 active users, all with role `member` — no migration needed, just extend the role field
- **HTML mockups**: 7 colleague-designed HTML files in `other_items/` serve as feature reference for the trade flow — adapt to existing design system, not pixel-perfect
- **Architecture pattern**: Domain entities, use cases, repositories, DI container — new features should follow this pattern
- **Provider data visibility**: Logistics providers see everything except price; insurance providers see everything (need value for premium calculation)
- **Lawyer model**: Both sides of a deal can independently hire lawyers; two different lawyers can work on the same deal; each has a private channel with their client

## Constraints

- **Tech stack**: Must use existing Next.js + Firebase stack — no new backend services
- **Design system**: New features must use existing Tailwind-based design system (dark theme with gold accents)
- **Architecture**: New features must follow Clean Architecture pattern (entities, use cases, repositories, hooks)
- **Real-time**: Use Firestore onSnapshot listeners for live updates — no WebSocket server needed
- **Notifications**: Email notifications via Firebase Functions; in-app via Firestore listeners

## Key Decisions

<!-- Decisions that constrain future work. Add throughout project lifecycle. -->

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Buyer/seller is contextual, not a fixed role | Same user can buy in one deal, sell in another — simpler than separate accounts | — Pending |
| Both sides can hire independent lawyers | Each party needs confidential legal advice — can't share a lawyer | — Pending |
| Logistics providers can't see deal price | They ship cargo regardless of value — price is irrelevant and sensitive | — Pending |
| Insurance providers see full deal info | Need cargo value to calculate premiums — price is essential | — Pending |
| Providers/lawyers are invite-only | Quality control — admin vets providers before they access the platform | — Pending |
| Legal consulting is optional per deal | Not every deal needs a lawyer — keeps the flow lightweight | — Pending |
| Adapt mockups to existing design system | Maintain UI consistency — mockups are feature reference, not visual spec | — Pending |
| No on-platform payment | Reduces complexity and regulatory burden — parties arrange payment externally | — Pending |

---
*Last updated: 2026-02-20 after initialization*
