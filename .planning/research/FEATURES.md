# Feature Research

**Domain:** B2B International Trade Platform — Integrated Legal, Insurance, and Logistics Services
**Researched:** 2026-02-20
**Confidence:** MEDIUM-HIGH (platform-specific features from official sources + domain research; insurance/legal details from multiple verified sources)

---

## Context: What This Platform Is Adding

The existing codebase already ships: auth, product catalog, RFQ submission/response, direct messaging, company profiles, trade fairs, and admin management. This research covers the **trade flow milestone** — the features being added on top of the working foundation:

- S1: Offer/counter-offer negotiation with Incoterms
- S2: Contract clause approval (dual-party)
- Legal Consulting: Lawyer-client private channels, contract drafting/revision
- S3: Insurance + logistics quote comparison and selection
- S4: Trade summary dashboard + shipment tracking
- Provider Portals: Insurance and logistics provider quote submission
- Role System: Extend to lawyer, logistics_provider, insurance_provider

---

## Feature Landscape

### Table Stakes (Users Expect These)

Features that B2B trade platforms with negotiation, legal, insurance, and logistics must have. Missing any of these means the product feels broken or untrustworthy.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| Offer and counter-offer exchange | Standard RFQ negotiation flow — buyers and sellers expect iterative price/terms discussion, not one-shot quotes | MEDIUM | State machine: open → countered → accepted/rejected/expired. Both sides can initiate counter-offers. |
| Incoterms selection on offers | International trade — Incoterms 2020 (EXW, FOB, CIF, CFR, DAP, DDP, FCA, CPT) define who pays what and who holds risk at each point; any serious B2B trade tool must expose this | MEDIUM | Incoterms 2020 is the current standard (next revision TBD — no "Incoterms 2026" exists as of research date). Requires a selection UI + carry-through to contract. |
| Offer history timeline | Negotiation audit trail — both parties need to review prior rounds; without history, disputes arise and trust breaks | LOW | Ordered list of offer rounds with timestamps, amounts, Incoterms, and party. |
| Real-time updates without page refresh | B2B users expect immediate counter-offer visibility — email-only notification is insufficient for active negotiations | MEDIUM | Firestore onSnapshot covers this without a WebSocket server. Constraint already decided in PROJECT.md. |
| In-app + email notification on counter-offer | Users need to know it's their turn — silent platforms lose engagement and deals | LOW | Firebase Functions email + Firestore notification document per event. |
| Both parties must approve before deal advances | Dual-party consent is a legal and trust requirement — one-sided advancement exposes the platform to liability | MEDIUM | Party approval status tracked per deal stage (pending/approved per side). Deal proceeds only when both approve. |
| Contract clause review with individual checkbox approval | International trade contracts are multi-clause; line-by-line approval is standard legal practice and provides clear audit trail | MEDIUM | Clause list rendered from deal data; each clause has per-party checkbox; summary approval state derived from all clauses. |
| Financial summary and document requirements visible before approval | Users must see what they're agreeing to — price, payment terms, required docs — before signing | LOW | Rendered from negotiation outcome. Static display, no calculation needed on the approval screen itself. |
| Private encrypted messaging between lawyer and client | Legal advice is confidential — a shared channel would be malpractice; each party must have their own private channel | HIGH | Two independent lawyer-client channels per deal. Access-controlled by role + deal membership. Encryption via Firestore security rules at minimum; full E2E encryption is a future concern. |
| Lawyer can view full deal details | A lawyer reviewing a contract needs to see the commercial terms — cargo, price, parties, Incoterms — to give meaningful advice | LOW | Read-only access to deal data scoped to the lawyer's client's deal. |
| Lawyer can create and revise contract drafts | Contract drafting is the core legal deliverable — without it, lawyers have no way to add value on-platform | HIGH | Version-controlled draft documents. Each revision is a new record; prior versions remain visible. Change tracking or diff display needed. |
| Insurance quote comparison from multiple providers | Buyers expect to compare options before committing — single-quote systems feel like vendor lock-in | MEDIUM | Quote list with provider name, coverage type (ICC A/B/C), premium, and validity countdown. Side-by-side or sortable list. |
| Logistics quote comparison from multiple providers | Same as insurance — freight rate shopping is standard practice; Freightos and Flexport made this the industry norm | MEDIUM | Quote list with mode, price, transit time, provider. Logistics providers do not see deal price (PROJECT.md decision). |
| Quote validity timer enforcement | Insurance and logistics quotes expire — stale quotes cause disputes and pricing problems | MEDIUM | Timer display on each quote. Once expired, quote is no longer selectable. Providers set validity when submitting. |
| Buyer can select and confirm insurance + logistics providers | Selection converts a quote into a binding commitment for the deal — this is the purchase decision moment | MEDIUM | One insurance + one logistics provider selected per deal. Confirmation triggers status update visible to all parties. |
| Trade summary dashboard (buyer and seller) | Both parties need a single view of where the deal stands — without it, users are lost in fragmented data | MEDIUM | Aggregated view: negotiation outcome, approvals, provider selections, current shipment status. |
| Shipment tracking with status updates | B2B buyers now expect consumer-grade tracking — 73% of B2B buyers expect digital experiences matching consumer standards (source: Knack Systems, 2026) | HIGH | Status timeline from order confirmed to delivered. Real-time updates via Firestore. Integration with logistics provider data is the hard part — mock initially, real integration later. |
| Order timeline showing all completed steps | Users need to understand what happened and what's next — a step-by-step timeline reduces support requests and builds confidence | LOW | Static milestone list (negotiated → approved → insured → shipped → delivered) with timestamps. |
| Insurance provider portal: view incoming quote requests | Providers cannot submit quotes without seeing requests — the portal is the provider's primary interface | MEDIUM | Shows deal cargo details, quantity, value, Incoterms, destination. Full deal info per PROJECT.md decision. |
| Insurance provider portal: submit quotes with ICC coverage details | Core action for insurance providers — without this, the platform has no supply side for insurance quotes | MEDIUM | Form: ICC A/B/C selection, premium, extras/riders, validity period. |
| Logistics provider portal: view incoming quote requests (excluding price) | Logistics providers need cargo details to quote transport — price is excluded per PROJECT.md decision | MEDIUM | Shows cargo type, quantity, origin/destination, Incoterms. Price field hidden. |
| Logistics provider portal: submit quotes with transport mode and timeline | Core action for logistics providers | MEDIUM | Form: mode (sea/air/road/multimodal), price, transit time, validity. |
| Role-based navigation and dashboards | Same app serves 5 role types — navigation must adapt to role or the platform feels chaotic | MEDIUM | Single app, role-filtered nav and dashboard. Roles: member, lawyer, logistics_provider, insurance_provider, admin. |

### Differentiators (Competitive Advantage)

Features that set this platform apart from standard trade marketplaces. Not baseline expectations, but high value when present.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| End-to-end deal in one platform | Most trade platforms stop at RFQ or order — requiring external tools for legal, insurance, and logistics creates friction; single-platform completion is the stated core value (PROJECT.md) | HIGH | The entire product is the differentiator — individual features are table stakes but the integration of all of them in one flow is unique. |
| Independent lawyers for both parties in the same deal | Standard legal consultation platforms handle one client at a time; two-lawyer model where both sides of the same deal hire independent lawyers on the same platform is unusual | HIGH | Two private channels, two independent lawyer relationships, shared deal visibility at the read-only layer. Requires careful access control architecture. |
| Risk analysis panel with severity levels from lawyer | Going beyond document review — a structured risk flagging interface (low/medium/high severity) gives lawyers a way to communicate concerns clearly rather than burying them in document comments | MEDIUM | Structured data alongside freeform draft documents. Severity levels enable visual priority cues for clients. |
| Contract revision history with visible change tracking | Most contract chat platforms lack version diff — knowing exactly what changed between lawyer draft v1 and v3 is high value in disputes | MEDIUM | Each revision is a stored record. Diff view between versions is optional initially; full history with metadata (who, when, what changed) is the minimum. |
| Contextual buyer/seller role (not fixed at registration) | Most B2B platforms require separate buyer/seller accounts or fixed role selection at signup; contextual role per deal reduces friction and supports users who both buy and sell | LOW | Role determined by deal context, not by user account. Requires deal data model to track initiating vs responding party. |
| Invite-only provider and lawyer network | Quality-controlled supply side — admin vets all lawyers, insurance, and logistics providers before they access the platform; this is a trust signal to buyers and sellers | LOW | Admin creates provider/lawyer accounts. No self-registration flow. Simple to implement, high trust value. |
| Incoterms selection embedded in negotiation (not just documentation) | Most platforms treat Incoterms as a document field; embedding it in the offer round means Incoterms is part of the negotiation — a party can counter-offer on Incoterms, not just price | MEDIUM | Incoterms value carries through from negotiation to contract clauses to insurance and logistics scoping. |
| Quick-action buttons in lawyer-client channel | Structured communication actions (approve, request info, request changes, attach file) reduce email-style back-and-forth and give lawyers a professional workflow tool | LOW | Predefined action types that produce typed message records. Avoids freeform text ambiguity in legal communication. |
| Provider data visibility rules (logistics vs insurance) | Thoughtful information architecture — logistics providers see cargo but not price; insurance providers see full deal including price (needed for premium calculation). This is a deliberate trust and privacy design | MEDIUM | Field-level access control on the quote request view. Enforced at the repository/server layer, not just the UI. |

### Anti-Features (Deliberately NOT Building)

Features that seem valuable but should be explicitly excluded. These are captured to prevent scope creep during implementation.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| On-platform payment / escrow | Buyers and sellers want payment security | Requires payment provider integration (Stripe, Wise, or bank API), KYC/AML compliance, regulatory licensing in multiple jurisdictions, fraud handling, and chargeback infrastructure — 6+ months of additional work, not a trade platform feature | Track deal status and payment confirmation externally; parties arrange payment via wire, LC, or other instruments off-platform |
| Real-time WebSocket chat for general messaging | General messaging improvements feel like a natural extension | Existing messaging uses Firestore documents (polling/listeners), not WebSockets. Rebuilding it as WebSocket would require a new backend service (violates stack constraint). Trade-specific channels get Firestore real-time via onSnapshot — that's sufficient | Keep existing messaging as-is; only trade-specific lawyer-client channels and negotiation updates use Firestore real-time listeners |
| Video/audio calls within lawyer-client channel | Lawyers and clients want richer communication | Requires WebRTC infrastructure, recording/compliance concerns, browser permission handling, and network reliability at scale — all orthogonal to the platform's value | Recommend Zoom/Teams for calls; keep platform communication text-based with structured quick-actions |
| Multi-language internationalization (i18n) | Platform serves international trade — non-English speakers exist | String extraction, translation management, RTL layout, locale-specific date/number formatting, and ongoing translation maintenance adds significant ongoing cost with no validated demand | Platform launches in English; multi-language is explicitly deferred to future scope (PROJECT.md) |
| Self-registration for providers and lawyers | Providers and lawyers want to join independently | Quality control would be lost — unvetted providers submitting quotes or unqualified lawyers giving legal advice would damage trust and create liability. Open registration also increases fraud surface | Admin-only account creation for all non-member roles; invite flow if needed later |
| Mobile native app (iOS/Android) | Mobile is the growth channel | Current Next.js app is web-first; native app requires separate codebase, App Store/Play Store maintenance, push notification infrastructure, and review cycles — justified only after web PMF | Optimize web app for mobile browsers; responsive design covers the immediate need |
| AI-assisted contract review / AI risk flagging | AI contract review is the 2026 trend (Wordsmith, Juro, etc.) | AI legal accuracy is not validated for international trade contracts across jurisdictions; liability for wrong AI legal advice is severe; on-platform lawyers provide this human judgment | Human lawyers provide risk analysis via the structured risk panel; AI tools are what lawyers use in their own practice, not what the platform provides |
| Automated shipment tracking via carrier API integration | Full tracking requires real carrier data | Each carrier (DHL, Maersk, UPS, FedEx) has different APIs, authentication, rate limits, and data formats — building integrations for each is a long-tail engineering effort with ongoing maintenance | Show tracking status updates submitted by the logistics provider through their portal; real carrier API integration is a v2 feature |

---

## Feature Dependencies

```
[User Auth + Role System]
    └──required by──> [All trade flow features]
    └──required by──> [Provider Portals]
    └──required by──> [Lawyer-Client Channels]

[S1: Offer/Counter-Offer Negotiation]
    └──required by──> [S2: Contract Clause Approval]
    └──required by──> [S3: Insurance + Logistics Selection]
    └──required by──> [Legal Consulting: Lawyer Deal Access]
    └──required by──> [Provider Portals: Quote Requests]

[S2: Contract Clause Approval]
    └──required by──> [S3: Insurance + Logistics Selection]

[S3: Insurance + Logistics Selection]
    └──required by──> [S4: Trade Summary + Tracking]

[Provider Portals: Insurance]
    └──feeds──> [S3: Insurance Quote Display]

[Provider Portals: Logistics]
    └──feeds──> [S3: Logistics Quote Display]

[Legal Consulting: Contract Drafts]
    └──enhances──> [S2: Contract Clause Approval]
    (optional — legal consulting is not on the critical path)

[Incoterms Selection in S1]
    └──carries through──> [S2: Contract clauses]
    └──carries through──> [S3: Insurance scope / logistics scope]
    └──carries through──> [Provider Portals: Quote request display]

[Quote Validity Timer]
    └──required by──> [S3: Quote Selection]
    └──enforced by──> [Provider Portals: Quote submission]
```

### Dependency Notes

- **Role System must be extended before any trade flow feature**: Provider and lawyer roles gate access to portals and channels. Member role must be contextual (buyer/seller per deal). This is the foundational dependency for the entire milestone.
- **S1 must complete before S2**: The negotiation outcome (agreed price, Incoterms, terms) populates the contract clauses in S2. Without a finalized offer, there is nothing to approve.
- **S2 must complete before S3**: Insurance and logistics quotes are scoped to the agreed terms. Selecting providers before parties approve the deal creates ambiguity.
- **Provider portals feed S3 (parallel workstream)**: Insurance and logistics providers can be onboarded and can start submitting quotes while S1/S2 UI is being built. These are decoupled in implementation.
- **Legal consulting is parallel and optional**: Lawyers can be hired at any point in the deal lifecycle. They do not block negotiation, approval, or insurance/logistics selection. This is explicit in PROJECT.md.
- **S4 depends on all prior stages**: The trade summary dashboard aggregates data from S1 through S3 — it is the last stage to build.

---

## MVP Definition

The "MVP" for this milestone is the complete trade flow functioning end-to-end with one deal. A deal that cannot complete the full flow (negotiate → approve → select providers → track) is not an MVP — it is a partial flow.

### Launch With (v1 — Full Trade Flow)

- [ ] **Role system extension** — member, lawyer, logistics_provider, insurance_provider, admin. Gate everything else on this.
- [ ] **S1: Offer/counter-offer with Incoterms** — negotiation state machine, history timeline, real-time updates, email notifications.
- [ ] **S2: Dual-party contract clause approval** — clause list, individual checkboxes, party approval status, financial summary.
- [ ] **Provider portals (insurance + logistics)** — quote request list, quote submission form, validity enforcement.
- [ ] **S3: Insurance + logistics quote comparison and selection** — quote list display, validity timer, confirm selection, cost summary.
- [ ] **S4: Trade summary dashboard** — deal overview, order timeline, shipment status (provider-submitted updates, not carrier API).
- [ ] **Lawyer-client channels** — private channel per party, deal read access, quick-action buttons.
- [ ] **Lawyer contract drafting** — version-controlled drafts, risk analysis panel with severity levels.

### Add After Validation (v1.x)

- [ ] **Lawyer contract diff view** — trigger: lawyers and clients report difficulty tracking changes between versions.
- [ ] **Provider-submitted tracking status history** — trigger: logistics providers request the ability to post incremental status updates (not just current state).
- [ ] **Deal-level notification preferences** — trigger: users report too many / too few notifications.
- [ ] **Document attachment in lawyer-client channel** — trigger: lawyers report needing to share supporting documents (term sheets, precedents).

### Future Consideration (v2+)

- [ ] **Real carrier API tracking integration** — defer: high integration cost, mock data sufficient for v1; real data adds trust at scale.
- [ ] **AI-assisted risk flagging in lawyer panel** — defer: liability concerns, no validated demand, human lawyers are the differentiator.
- [ ] **Multi-language support** — defer: no validated non-English user demand yet.
- [ ] **Mobile native app** — defer: web-first until PMF established.
- [ ] **On-platform payment/escrow** — defer: regulatory complexity, not the platform's core value.

---

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Role system extension | HIGH | LOW | P1 |
| S1: Offer/counter-offer negotiation | HIGH | MEDIUM | P1 |
| S1: Incoterms selection | HIGH | LOW | P1 |
| S1: Real-time updates (Firestore onSnapshot) | HIGH | LOW | P1 |
| S2: Dual-party clause approval | HIGH | MEDIUM | P1 |
| Insurance provider portal | HIGH | MEDIUM | P1 |
| Logistics provider portal | HIGH | MEDIUM | P1 |
| S3: Quote comparison + selection | HIGH | MEDIUM | P1 |
| S4: Trade summary dashboard | HIGH | MEDIUM | P1 |
| Lawyer-client private channel | HIGH | HIGH | P1 |
| Lawyer contract drafting (versioned) | HIGH | HIGH | P1 |
| Offer history timeline | MEDIUM | LOW | P1 |
| Quote validity timer enforcement | MEDIUM | LOW | P1 |
| Shipment status updates (provider-submitted) | MEDIUM | LOW | P1 |
| Risk analysis panel (lawyer) | MEDIUM | LOW | P1 |
| S4: Order timeline milestone display | MEDIUM | LOW | P1 |
| In-app + email notifications | MEDIUM | LOW | P2 |
| Contract revision history | MEDIUM | MEDIUM | P2 |
| Quick-action buttons in lawyer channel | LOW | LOW | P2 |
| Contract diff view | MEDIUM | HIGH | P3 |
| Real carrier API tracking | HIGH | HIGH | P3 |
| AI risk flagging | MEDIUM | HIGH | P3 |

**Priority key:**
- P1: Must have for launch (trade flow is incomplete without it)
- P2: Should have, add when core flow is working
- P3: Future consideration — validated by user feedback, not pre-built

---

## Competitor Feature Analysis

| Feature | Freightos / Flexport (Logistics Platforms) | Juro / Wordsmith (Legal Platforms) | Loadsure / CoverGenius (Insurance Platforms) | Our Approach |
|---------|--------------------------------------------|------------------------------------|-----------------------------------------------|--------------|
| Negotiation / RFQ | Instant rate lookup; no iterative counter-offer | Not applicable | Not applicable | Full iterative offer/counter-offer with history — more like Yo!Kart RFQ than freight rate lookup |
| Legal review | Not included | Standalone; not trade-context-aware | Not included | Embedded in deal context; lawyers see actual trade terms |
| Insurance quotes | Integrated (Flexport has cargo insurance) | Not included | Core product — instant AI-priced quotes | Multi-provider comparison; providers submit manually via portal; buyer selects |
| Logistics quotes | Core product — instant multi-carrier rates | Not included | Not included | Multi-provider comparison; providers submit via portal |
| Tracking | Real-time via carrier APIs (Flexport) | Not applicable | Not applicable | Provider-submitted status updates in v1; carrier API in v2 |
| End-to-end deal | No — logistics only, or insurance only, or legal only | No — legal only | No — insurance only | Yes — entire trade lifecycle in one platform; the differentiation |
| Provider model | Open marketplace (many carriers/forwarders) | Open marketplace (legal professionals) | Integrated insurers | Invite-only; admin-vetted; quality over quantity |

---

## Sources

- Rigby.js: "Top 7 B2B Marketplace Features in 2026" — https://www.rigbyjs.com/blog/b2b-marketplace-features (MEDIUM confidence — industry blog, multiple corroborated points)
- Yo!Kart RFQ Module documentation — https://www.yo-kart.com/blog/request-for-quote-rfq-module-b2b-ecommerce-marketplaces/ (MEDIUM confidence — vendor docs, representative of industry RFQ patterns)
- Knack Systems: "Real-Time Shipping and Order Tracking in B2B Self-Service Portals" — https://www.knacksystems.com/blog/real-time-shipping-and-order-tracking-in-b2b-portals (MEDIUM confidence — industry analysis)
- Oithamarine: "Cargo Insurance Cost for International Shipping 2026" — https://oithamarine.com/cargo-insurance-cost-for-international-shipping-2026-rates-coverage-types-and-how-to-reduce-premiums/ (MEDIUM confidence — insurance broker perspective)
- Tata AIG: "Institute Cargo Clauses A, B & C in Marine Insurance" — https://www.tataaig.com/knowledge-center/marine-insurance/difference-between-institute-cargo-clauses-in-marine-insurance (HIGH confidence — insurer official documentation)
- Freightos: Platform overview — https://www.freightos.com/freightos-freight-as-a-service-for-b2b-global-logistics/ (MEDIUM confidence — competitor analysis)
- Flexport: Platform overview — https://www.flexport.com/products/flexport-platform/ (MEDIUM confidence — competitor analysis)
- Juro: "Contract review software guide 2026" — https://juro.com/learn/contract-review-software (MEDIUM confidence — legal platform vendor)
- WTW: "Insurance Marketplace Realities 2026 — Marine Cargo" — https://www.wtwco.com/en-us/insights/2025/10/insurance-marketplace-realities-2026-marine-cargo (HIGH confidence — major insurance broker official publication)
- Freightos Incoterms Guide: "Incoterms 2026 — Plain English Guide" — https://www.freightos.com/freight-resources/incoterms-plain-english-guide/ (HIGH confidence — confirms Incoterms 2020 remains current standard)
- PYMNTS: "B2B Logistics Resets for 2026" — https://www.pymnts.com/news/b2b-payments/2026/b2b-logistics-resets-for-2026-as-old-pricing-models-break-down (MEDIUM confidence — financial tech reporting)
- PROJECT.md: Core Trade Global project context — internal document (HIGH confidence — primary source of truth for scope decisions)

---
*Feature research for: B2B International Trade Platform — Trade Flow Milestone (Legal, Insurance, Logistics Integration)*
*Researched: 2026-02-20*
