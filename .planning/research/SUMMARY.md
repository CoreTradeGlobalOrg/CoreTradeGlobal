# Project Research Summary

**Project:** Core Trade Global — Trade Flow Features Milestone
**Domain:** B2B International Trade Platform (Legal, Insurance, Logistics Integration)
**Researched:** 2026-02-20
**Confidence:** MEDIUM-HIGH

## Executive Summary

Core Trade Global is adding a complete end-to-end trade flow on top of an already functioning B2B marketplace (auth, product catalog, RFQ, messaging, company profiles, trade fairs). The milestone covers offer/counter-offer negotiation with Incoterms, dual-party contract approval, lawyer-client private channels, versioned contract drafting, insurance and logistics provider portals, and a final trade summary dashboard with shipment tracking. The distinguishing characteristic of this platform — and the primary source of architectural complexity — is that it handles the entire trade lifecycle in a single application, integrating roles that are traditionally served by separate specialized platforms (Freightos for logistics, Juro for legal, Loadsure for insurance).

The recommended approach is to build on the existing Clean Architecture (domain entities, use cases, repositories, Firestore data source) without introducing new architectural conventions. No new Firebase products are needed. Three client-side libraries are required: `libsodium-wrappers` for end-to-end encryption of lawyer-client channels, `diff-match-patch-es` for contract version change tracking, and `@react-pdf/renderer` for client-side contract PDF generation. One server-side library is needed in Firebase Functions: `@sendgrid/mail` for transactional email. The existing `onSnapshot`, `runTransaction`, and `writeBatch` Firebase APIs are sufficient for all real-time and atomicity requirements. The role system must be extended to five roles (member, lawyer, insurance_provider, logistics_provider, admin) using Firebase custom claims, with Firestore security rules enforcing access independently of middleware.

The highest risks in this milestone fall into two categories. First, security: logistics providers must never see deal price (Firestore does not support field-level read restrictions — requires document structure separation), and lawyer-client channels must be invisible to opposing deal parties (requires a top-level collection, not a subcollection under deals). Second, data integrity: all deal state transitions must use Firestore transactions to prevent race conditions during concurrent offer/acceptance, and offer history must be an append-only subcollection (not an array on the deal document) to serve as a legally defensible audit trail. Building these constraints correctly from the first negotiation feature is essential — retrofitting them after data is written requires migrations.

---

## Key Findings

### Recommended Stack

The existing stack (Next.js 16.1.4, React 19, Firebase 12, Tailwind 4, Zod 4, React Hook Form 7) requires no version changes. All Firebase capabilities needed — `onSnapshot` for real-time updates, `runTransaction` for atomic state transitions, `writeBatch` for multi-document consistency, and `setCustomUserClaims` for role management — are already available in the installed `firebase` SDK. The three new client libraries add targeted functionality without architectural disruption.

**Core technologies:**
- `libsodium-wrappers@^0.7.13`: Client-side E2E encryption for lawyer-client channels — chosen over SubtleCrypto because it wraps ECDH key exchange, IV generation, and serialization into a single `crypto_box_easy()` call; load via dynamic import to avoid ~300KB bundle impact
- `diff-match-patch-es@^1.0.1`: ESM contract version change tracking — antfu's ESM/TypeScript rewrite of the abandoned Google original; needed for "what changed between draft v2 and v3" display in the lawyer portal
- `@react-pdf/renderer@^4.3.2`: Client-side contract PDF generation — confirmed React 19 compatible since v4.1.0; must use `dynamic(() => import(...), { ssr: false })` — SSR in Next.js App Router route handlers is broken (confirmed via GitHub issues #2350, #2460)
- `@sendgrid/mail@^8.x` (Functions only): Transactional email for trade events — install in `functions/` only; extends the existing email notification pattern already used for general messaging

**Critical version note:** `@react-pdf/renderer` must be loaded client-side only. Any attempt to use it in a Next.js Server Component or API route handler will throw "ba.Component is not a constructor".

### Expected Features

The feature dependency chain is strict and determines build order. Role system must be complete before anything else. S1 (negotiation) must complete before S2 (approval). S2 must complete before S3 (insurance/logistics). S4 (tracking) depends on all prior stages. Legal consulting is parallel and optional at any stage — lawyers do not block the main flow.

**Must have (table stakes — deal flow is broken without these):**
- Role system extension: member, lawyer, insurance_provider, logistics_provider, admin — gates all trade flow features
- S1: Offer/counter-offer with Incoterms 2020 selection, history timeline, real-time updates, email notifications
- S2: Dual-party contract clause approval — individual clause checkboxes, party approval tracking, both must approve before advancement
- Provider portals (insurance + logistics): quote request list, quote submission form with validity period enforcement
- S3: Insurance + logistics quote comparison with validity timer, selection confirmation, cost summary
- S4: Trade summary dashboard, order milestone timeline, provider-submitted shipment status
- Lawyer-client private channels: one channel per party per deal, deal read-only access for lawyer, quick-action buttons
- Versioned contract drafts: lawyer creates/revises drafts with version history and risk analysis panel

**Should have (differentiators — add after core flow validated):**
- Contract revision diff view (version N vs N-1 change display)
- Provider-submitted tracking status history (incremental updates, not just current state)
- Contextual buyer/seller role per deal (not fixed at signup)
- Risk analysis panel with severity levels (low/medium/high) in lawyer portal

**Defer (v2+):**
- Real carrier API tracking integration (DHL, Maersk, etc.) — high integration cost per carrier
- AI-assisted risk flagging in lawyer panel — liability concerns, no validated demand
- Multi-language support — no validated non-English user demand
- On-platform payment/escrow — regulatory complexity outside platform scope
- Mobile native app — web-first until PMF

**Anti-features (explicitly out of scope — record to prevent scope creep):**
- WebSocket chat for general messaging (existing Firestore pattern stays)
- Video/audio in lawyer channels (recommend Zoom/Teams)
- Self-registration for providers/lawyers (admin-only invite)

### Architecture Approach

All new features slot into the existing Clean Architecture (Routes → Presentation → Domain → Data → Infrastructure) without new conventions. The critical structural decisions are: deals as a top-level Firestore collection (not nested under users) for participant-based querying; offers, quotes, legal channels, and tracking events as subcollections under deals; legal channels additionally considered for top-level collection to prevent recursive rule inheritance (see pitfalls). A `DealContext` wraps S1–S4 pages to share the active deal subscription across steps without refetching. The existing `FirestoreDataSource` methods (`subscribeToDocument`, `subscribeToSubcollection`) are reused for all real-time subscriptions — no new data source infrastructure is needed.

**Major components:**
1. **Deal Entity + DealRepository** — core state machine (negotiating → agreed → legal_review → insuring → in_transit → delivered | cancelled); owns status transition validation; queries scoped by `participants` array-contains
2. **Offer Entity + OfferRepository** — immutable append-only subcollection; each round is a new document; ordered by `roundNumber`; source of negotiation audit trail
3. **LegalChannel Entity + LegalChannelRepository** — private channel scoped to `[clientId, lawyerId]`; structurally separate from general conversations; messages subcollection reuses existing message pattern
4. **Quote Entity + QuoteRepository** — insurance or logistics quote with type discriminator; validity timer enforced server-side via Cloud Function; logistics provider gets price-filtered view via document structure separation, not field filtering
5. **TrackingEvent Entity + TrackingRepository** — append-only shipment milestone log; `allow update, delete: if false` in Firestore rules
6. **Role-Dispatched Dashboard** — single `/dashboard` route; dispatches to MemberDashboard, LawyerDashboard, or ProviderDashboard based on `user.role`; role set via Firebase custom claims on admin invite
7. **Firebase Custom Claims RBAC** — Admin SDK sets `role` on JWT at account creation; Firestore rules check `request.auth.token.role`; Next.js middleware checks `session.role` from cookie; both layers independently enforce access

**Build order (from architecture dependency analysis):**
- Level 0: Constants (COLLECTIONS, DEAL_STATUS, ROLES) + custom claims setup
- Level 1: Deal + Offer entities, repositories, DI container extension
- Level 2: CreateDeal, SubmitOffer, CounterOffer, ApproveDeal use cases + hooks
- Level 3: S1 Negotiation UI + S2 Agreement UI + DealContext
- Level 4 (parallel): Legal consulting (LegalChannel, lawyer portal)
- Level 5 (parallel): Provider portals + S3 quote comparison/selection
- Level 6: Tracking events + S4 trade summary dashboard
- Level 7: Role-dispatched dashboards (wraps all roles working)

### Critical Pitfalls

1. **Middleware-only authorization (CVE-2025-29927 class)** — Next.js middleware is a UX gate, not a security gate. Every sensitive Firestore collection must have independent security rules checking role + deal membership. Write and test rules in the Firebase Rules Simulator before the first provider portal ships. Verify Next.js 16.1.4 patch status for CVE-2025-29927.

2. **Deal price leaked to logistics providers** — Firestore has no field-level read restrictions; sending the whole deal document to logistics providers exposes price regardless of UI filtering. Resolution: split deal document — create `deals/{dealId}/financials/{id}` readable only by deal parties + insurance providers; logistics providers read a separate price-excluded quote request document. Must be designed into the schema from day one — retrofitting requires data migration.

3. **Negotiation state machine without atomic transitions** — concurrent buyer acceptance + seller counter-offer causes last-write-wins corruption in Firestore. All deal state transitions must use `runTransaction()`. The transaction reads current state, validates the transition is legal, then writes atomically. Never update deal status with a plain `updateDoc`.

4. **Lawyer-client channel visible to opposing deal party** — Firestore recursive wildcards on deal subcollections expose all subcollections to all deal participants. Resolution: store legal channels as a top-level collection with `dealId` reference, or use a subcollection with explicit rules that override parent deal rules, scoped strictly to `clientId` and `lawyerId`. Test with the security rule simulator before the lawyer messaging UI ships.

5. **Stale role tokens after admin role change** — Firebase ID tokens cache custom claims for up to 1 hour. A demoted provider retains access; a newly promoted provider is locked out. Resolution: after admin role change, call `auth.revokeRefreshTokens(uid)` via Admin SDK to force re-authentication. Alternatively, keep role in Firestore document (current pattern) for rule checks — Firestore document reads in rules are always current, whereas JWT claims are stale.

6. **Quote expiry race condition** — client-side `Date.now() < validUntil` check before a direct Firestore write is not server-enforced. A buyer can accept an expired quote. Resolution: quote acceptance must go through a Cloud Function that checks `admin.firestore.Timestamp.now() < quote.validUntil` server-side before committing.

7. **No immutable audit trail** — deal status as a single mutable field on the deal document cannot withstand a dispute. Resolution: append-only `deals/{dealId}/events` subcollection with `allow update, delete: if false` in Firestore rules. Each offer, acceptance, and status transition writes an event document.

---

## Implications for Roadmap

Based on research, the feature dependency chain, the architecture build order, and the pitfall-to-phase mapping, a six-phase structure is recommended:

### Phase 1: Role System and Infrastructure Foundation
**Rationale:** Every single trade flow feature is gated on role. Provider portals, legal channels, and dashboard routing all depend on role detection working correctly at middleware, Firestore rules, and UI layers. This is Level 0–1 of the architecture dependency graph — no other phase can start correctly without it.
**Delivers:** Extended role constants (MEMBER, LAWYER, INSURANCE_PROVIDER, LOGISTICS_PROVIDER, ADMIN), custom claims setup via Admin SDK, admin UI for provider/lawyer account creation, Firestore security rules skeleton with role checks, middleware route protection for new roles, Firestore collection constants (DEALS, OFFERS, LEGAL_CHANNELS, QUOTES, TRACKING), DI container extensions.
**Addresses:** Role-based navigation and dashboards (table stakes), invite-only provider network (differentiator)
**Avoids:** Middleware-only authorization pitfall (CVE-2025-29927 class) — rules written and tested before any portal ships; stale role token pitfall — token revocation flow built into admin invite flow
**Research flag:** Standard patterns — Firebase custom claims are well-documented; no phase research needed

### Phase 2: Deal Creation and S1 Offer/Counter-Offer Negotiation
**Rationale:** S1 is the entry point to the entire trade flow. All subsequent phases depend on a deal existing in a valid state. The offer/counter-offer state machine and its atomic transaction pattern must be correct from the first write — data written incorrectly in S1 propagates through S2–S4.
**Delivers:** Deal entity + DealRepository, Offer entity + OfferRepository, DealContext, CreateDealUseCase, SubmitOfferUseCase (with `runTransaction`), CounterOfferUseCase, Incoterms 2020 selection with named place capture, offer history timeline UI (NegotiationPanel, OfferTimeline), real-time updates via `onSnapshot`, email notifications on counter-offer received, append-only `dealEvents` subcollection with immutable rules.
**Addresses:** Offer/counter-offer exchange, Incoterms selection, offer history timeline, real-time updates, in-app + email notifications (all table stakes)
**Avoids:** Negotiation state machine without atomic transitions (Pitfall 3) — `runTransaction` enforced from first write; no immutable audit trail (Pitfall 6) — events subcollection built from first offer; offers embedded as array on deal document (architecture anti-pattern 1) — subcollection from start; Incoterms missing named place/version (UX pitfall)
**Research flag:** Standard patterns — well-documented; no phase research needed

### Phase 3: S2 Contract Clause Approval
**Rationale:** S2 directly depends on a finalized offer from S1 (agreed price, Incoterms, terms populate contract clauses). This is a contained phase — dual-party approval tracking with Firestore transaction to advance deal status only when both parties have approved.
**Delivers:** ApproveDealUseCase, AgreementClauses component, per-clause checkbox tracking (individual + party-level), financial summary display, both-parties-approved gate before deal status advances to `insuring`, notifications on approval status change.
**Addresses:** Both parties must approve before deal advances (table stakes), contract clause review with individual checkbox approval (table stakes), financial summary visible before approval (table stakes)
**Avoids:** Agreement approval "looks done but isn't" — verify neither party can set the other's flag; deal cannot advance without both flags set
**Research flag:** Standard patterns — Firestore update + transaction patterns straightforward; no phase research needed

### Phase 4: Provider Portals and S3 Insurance + Logistics Quotes
**Rationale:** Provider portals (supply side) and S3 quote comparison (demand side) are built together because they are two sides of the same flow. Providers must be able to submit quotes before buyers can compare them. This phase requires the price-separation data model decision resolved before any code is written.
**Delivers:** Quote entity + QuoteRepository, SubmitInsuranceQuoteUseCase, SubmitLogisticsQuoteUseCase, SelectProviderUseCase, quote acceptance Cloud Function (server-side expiry validation), scheduled expiry-marking Cloud Function, insurance provider portal (full deal view including price), logistics provider portal (price-excluded deal view via document structure separation), quote comparison UI (QuoteComparisonPanel, InsuranceQuoteCard, LogisticsQuoteCard), validity countdown with banner warnings, provider selection confirmation.
**Addresses:** Insurance quote comparison (table stakes), logistics quote comparison (table stakes), quote validity timer enforcement (table stakes), buyer selects and confirms providers (table stakes), provider data visibility rules (differentiator)
**Avoids:** Deal price leaking to logistics providers (Pitfall 2) — document structure separation designed before any provider code ships; quote expiry race condition (Pitfall 7) — Cloud Function server-side timestamp validation; giving providers direct deal document access (architecture anti-pattern 2)
**Research flag:** Needs deeper research during planning — the price-separation data model (document vs subcollection structure) needs a concrete decision with schema written out before implementation; Cloud Function quote acceptance flow has edge cases worth mapping

### Phase 5: Legal Consulting (Lawyer-Client Channels and Contract Drafting)
**Rationale:** Legal consulting is parallel and optional — it does not block any stage of the main trade flow. However, it is architecturally the most security-sensitive phase (attorney-client privilege, E2E encryption, channel isolation from opposing party). Building it after S1–S3 are working ensures the deal context it reads is stable.
**Delivers:** LegalChannel entity + LegalChannelRepository (top-level collection with `dealId` reference), LegalMessage entity, HireLawyerUseCase, SendLegalMessageUseCase, `libsodium-wrappers` E2E encryption (client-side key generation, IndexedDB key storage, `crypto_box_easy` encrypt/decrypt), contract version-controlled drafts (`deals/{dealId}/contractVersions/` subcollection), `diff-match-patch-es` diff storage per version, `@react-pdf/renderer` client-side PDF generation, lawyer portal (LegalChannelPanel, ContractDraftView), risk analysis panel with severity levels, quick-action buttons.
**Addresses:** Private encrypted messaging between lawyer and client (table stakes), lawyer views full deal details (table stakes), lawyer creates and revises contract drafts (table stakes), independent lawyers for both parties (differentiator), contract revision history with change tracking (differentiator), risk analysis panel with severity levels (differentiator)
**Avoids:** Lawyer-client channel visible to opposing deal party (Pitfall 5) — top-level collection + strict rules; private key storage in Firestore (stack anti-pattern) — IndexedDB only; extending MessagesContext for legal channels (architecture anti-pattern 5); `@react-pdf/renderer` in SSR (stack warning) — `dynamic()` import with `ssr: false`
**Research flag:** Needs deeper research during planning — E2E encryption key management (key derivation, rotation, what happens when a lawyer is replaced) needs a concrete implementation decision; libsodium WASM initialization in Next.js client components has nuances worth documenting

### Phase 6: S4 Trade Summary Dashboard and Shipment Tracking
**Rationale:** The trade summary aggregates data from all prior phases. It is the last phase to build because it depends on all prior stages (negotiation outcome, approval status, provider selections, tracking events) being in a stable state.
**Delivers:** TrackingEvent entity + TrackingRepository (append-only, `allow update, delete: if false`), AddTrackingEventUseCase, logistics provider tracking update submission, S4 tracking UI (ShipmentTimeline, DealSummary), order milestone timeline (negotiated → approved → insured → in_transit → delivered with timestamps), role-dispatched dashboard (MemberDashboard, LawyerDashboard, ProviderDashboard at `/dashboard`).
**Addresses:** Trade summary dashboard — buyer and seller (table stakes), shipment tracking with status updates (table stakes), order timeline showing all completed steps (table stakes), role-based navigation and dashboards (table stakes)
**Avoids:** Provider portal showing all deals without filtering (UX pitfall) — default view shows only deals needing action; onSnapshot listener leak (performance trap) — useEffect cleanup patterns established in S1 carried through
**Research flag:** Standard patterns — aggregation dashboard and append-only tracking are well-documented patterns; no phase research needed

### Phase Ordering Rationale

- Phase 1 before all others because role enforcement at both middleware and Firestore rules layers is a prerequisite for every gated feature. Security vulnerabilities that are baked in early are expensive to fix later.
- Phase 2 before Phase 3 because the negotiation outcome (price, Incoterms, agreed terms) is the data that populates contract clauses in S2.
- Phase 3 before Phase 4 because insurance and logistics quotes are scoped to agreed terms — providers cannot quote before terms are settled.
- Phase 4 (provider portals) and Phase 5 (legal consulting) can be built in parallel after Phase 3, because they are independent branches reading the same deal state without modifying each other.
- Phase 6 last because the summary dashboard has read-dependencies on all prior phases' data.

### Research Flags

Phases needing deeper research during planning:
- **Phase 4 (Provider Portals):** Price-separation data model needs a concrete schema decision (separate `financials` subcollection vs sibling document vs Cloud Function proxy); Cloud Function quote acceptance edge cases (concurrent accepts, provider cancellation) need mapping before implementation
- **Phase 5 (Legal Consulting):** E2E encryption key management lifecycle needs a decision document (initial key generation, key derivation vs random, what happens on lawyer reassignment); libsodium WASM async initialization in React Server/Client Component boundary needs a concrete initialization pattern

Phases with standard patterns (skip research-phase):
- **Phase 1:** Firebase custom claims and security rules are thoroughly documented with official sources at HIGH confidence
- **Phase 2:** Firestore transaction patterns, `onSnapshot`, append-only subcollections — all HIGH confidence from official docs
- **Phase 3:** Dual-party approval with Firestore transactions — straightforward extension of Phase 2 patterns
- **Phase 6:** Append-only tracking events and aggregation dashboards — well-established patterns

---

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | MEDIUM-HIGH | Firebase features (onSnapshot, transactions, custom claims) verified via official docs at HIGH confidence. New libraries (libsodium, diff-match-patch-es, react-pdf) verified via npm listings and official sites at MEDIUM confidence — production usage patterns are community-confirmed but not Anthropic-audited. |
| Features | MEDIUM-HIGH | Table stakes features verified from multiple industry sources. Feature prioritization derived from PROJECT.md (HIGH confidence primary source) + competitor analysis (MEDIUM confidence). Incoterms 2020 confirmed as current standard — no "Incoterms 2026" exists. |
| Architecture | HIGH | Based on direct codebase analysis of existing patterns + official Firebase documentation. Build order dependency graph derived from code analysis, not inference. Anti-patterns verified against official Firestore limitations (document size, field-level security rules, recursive wildcards). |
| Pitfalls | MEDIUM-HIGH | CVE-2025-29927 at HIGH confidence (official advisory, multiple independent sources). Firestore security pitfalls at HIGH confidence (official docs). Trade domain workflow pitfalls (Incoterms ambiguity, audit trail requirements) at MEDIUM confidence (industry publications, consistent with domain knowledge). |

**Overall confidence:** MEDIUM-HIGH

### Gaps to Address

- **Next.js 16.1.4 and CVE-2025-29927:** Verify whether 16.1.4 includes the patch for the middleware bypass vulnerability. If not, apply the `x-middleware-subrequest` header-stripping workaround at the Firebase Hosting CDN level before any provider portal ships.
- **Legal channel collection placement:** The architecture recommends a top-level `legalChannels` collection (to avoid recursive rule inheritance from the deal document) but ARCHITECTURE.md shows it as a subcollection in the Firestore schema. This contradiction must be resolved in Phase 5 planning — pick one model and write the Firestore rules accordingly before any legal channel code is written.
- **Quote request document structure:** The logistics price-separation approach needs a concrete decision: separate `quoteRequests` subcollection with filtered fields vs `financials` subcollection only accessible to insurance providers vs Cloud Function proxy. All three approaches work but are not interchangeable after data is written. Decide in Phase 4 planning.
- **libsodium-wrappers WASM initialization:** The WASM module must be initialized asynchronously before any crypto operations. The initialization pattern inside a Next.js Client Component (particularly with `dynamic()` imports) needs to be prototyped before Phase 5 implementation begins to avoid blocking the lawyer UI on WASM load.
- **Email notification deduplication:** Cloud Functions can retry on failure, causing duplicate emails for the same event. A `lastNotifiedAt` field or idempotency key pattern must be established in Phase 2 (first email trigger) and carried through all subsequent phases.

---

## Sources

### Primary (HIGH confidence)
- Firebase Firestore onSnapshot — https://firebase.google.com/docs/firestore/query-data/listen — real-time listener patterns
- Firebase Transactions and batched writes — https://firebase.google.com/docs/firestore/manage-data/transactions — atomic state transition patterns
- Firebase Custom Claims — https://firebase.google.com/docs/auth/admin/custom-claims — role embedding in JWT, Firestore rules usage
- Firebase Secure Data Access for Groups — https://firebase.google.com/docs/firestore/solutions/role-based-access — RBAC with participants array
- Firebase Functions v2 onDocumentCreated — https://firebase.google.com/docs/functions/firestore-events — already in use in codebase
- CVE-2025-29927 GitHub Advisory — https://github.com/advisories/GHSA-f82v-jwr5-mffw — middleware bypass vulnerability
- CVE-2025-29927 ProjectDiscovery writeup — https://projectdiscovery.io/blog/nextjs-middleware-authorization-bypass — attack surface confirmed
- react-pdf React 19 compatibility — https://react-pdf.org/compatibility — confirmed since v4.1.0
- react-pdf SSR bug — https://github.com/diegomura/react-pdf/issues/2350 — confirmed breakage in App Router route handlers
- Direct codebase analysis: `/src/domain/entities/`, `/src/data/repositories/`, `/src/core/di/container.js` — existing patterns source of truth
- PROJECT.md — primary scope decisions source

### Secondary (MEDIUM confidence)
- libsodium-wrappers npm — https://www.npmjs.com/package/libsodium-wrappers — v0.7.13 verified
- diff-match-patch-es npm — https://www.npmjs.com/package/diff-match-patch-es — v1.0.1 verified
- @react-pdf/renderer npm — https://www.npmjs.com/package/@react-pdf/renderer — v4.3.2 verified
- next-firebase-auth-edge releases — https://github.com/awinogrodzki/next-firebase-auth-edge/releases — v1.11.5 released 2026-02-16
- SendGrid + Firebase Functions — https://www.twilio.com/en-us/blog/email-notifications-sendgrid-firebase-functions — integration pattern
- Tata AIG: Institute Cargo Clauses A, B & C — https://www.tataaig.com/knowledge-center/marine-insurance/difference-between-institute-cargo-clauses — ICC coverage types
- WTW: Insurance Marketplace Realities 2026 — https://www.wtwco.com/en-us/insights/2025/10/insurance-marketplace-realities-2026-marine-cargo — marine cargo insurance standards
- Freightos Incoterms Guide — https://www.freightos.com/freight-resources/incoterms-plain-english-guide/ — Incoterms 2020 as current standard confirmed
- Knack Systems: B2B tracking expectations — https://www.knacksystems.com/blog/real-time-shipping-and-order-tracking-in-b2b-portals — 73% of B2B buyers expect digital tracking

### Tertiary (LOW confidence)
- Firestore Pipeline Operations / InfoQ 2026 — https://www.infoq.com/news/2026/02/firestore-enterprise-pipeline/ — new aggregation features not yet stable; not applicable to this project
- Exploiting Firestore Database Rules — Medium — consistent with official Firebase security guidance but single source

---
*Research completed: 2026-02-20*
*Ready for roadmap: yes*
