# Phase 2: Deal Creation and Negotiation (S1) - Context

**Gathered:** 2026-02-22
**Status:** Ready for planning

<domain>
## Phase Boundary

A buyer and seller can negotiate a deal through structured offers and counter-offers, with Incoterms 2020, real-time updates, state machine, and audit trail. Deals are initiated from existing chat conversations (which originate from product detail pages). Either party can initiate. The deal inherits product context from the chat.

Contract agreement (Phase 3), insurance/logistics quotes (Phase 4), and legal consulting (Phase 5) are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Deal Creation Flow
- Deal initiated via "Initiate Deal" button in existing chat (chat was started from product detail page)
- Either party (buyer or seller) can initiate a deal — product owner is always the seller
- Deal creation navigates to a separate page (not modal/drawer over chat)
- Initial offer form includes: price per unit, quantity, unit selection, Incoterms, delivery deadline, payment terms, currency, and optional notes
- Form pre-fills from product listing (price, quantity, etc.) — buyer can modify
- Seller can counter-offer on ALL fields (price, quantity, Incoterms, delivery, payment, currency)
- Only the receiver of the latest offer can accept, reject, or counter — not the sender
- Sender can withdraw their offer anytime before the receiver responds
- Offers have expiration: system default (e.g., 72h) with sender override for custom deadline
- Offer expiry checked by scheduled Cloud Function (runs periodically)
- After expiry, sender can renew/extend the deadline or create a new offer
- Acceptance immediately triggers contract generation (Phase 3) — no intermediate "accepted" state
- System auto-message sent in chat thread when deal is initiated (with link to deal) + email notification
- Product has a base currency; buyer can offer in a different currency with conversion rate
- Quantity includes unit selection (kg, ton, pieces, metre, m², containers)
- Optional file attachments on offers (product specs, certifications)
- Optional freeform notes field on each offer/counter-offer
- Multiple active deals allowed for the same product-seller pair simultaneously
- Incoterms named place covers delivery location — no separate destination field needed

### Negotiation UI & Offer Display
- Adapt mockup layout to existing app patterns and design system (don't replicate mockup CSS verbatim)
- Key sections from mockup to implement: product hero, offer timeline, counter-offer form, sidebar with parties/progress/summary
- Product hero section at top showing product image, name, category, key specs
- Offer timeline with card-based display — buyer cards (green accent), seller cards (gold accent), system event cards (dashed border)
- Changed fields between rounds visually highlighted (color, arrow, or badge) to show what changed
- Counter-offer form pre-fills from the most recent offer — party modifies only what they want to change
- Form visible only when it's the current user's turn to respond
- When waiting for other party: clear "Waiting for [Party] to respond..." message with timestamp
- Older offer rounds (5+) collapsed with "Show earlier offers" toggle — last 2-3 expanded
- Each offer card shows estimated total (price x quantity)
- System events (deal started, expired, withdrawn) shown as inline system cards in timeline (per mockup)
- Terminal states (accepted/rejected/expired) shown as status change in timeline — no separate banner
- Right sidebar always visible: party info cards (company, location, contact, member since, transactions, rating, verified), progress tracker (vertical steps: negotiation -> agreement -> quotes -> tracking), current offer summary (latest terms, round number, estimated total)
- No separate chat panel on deal page — parties use existing messaging system
- Countdown timer on deal page (not navbar) — changes color when running low
- Deal has direct URL (/deals/[dealId]) — bookmarkable and shareable between parties
- Online presence indicator showing when other party is viewing the deal
- Mobile responsive layout — panels stack vertically on small screens

### Incoterms Experience
- All 11 Incoterms 2020 available: EXW, FCA, CPT, CIP, DAP, DPU, DDP, FAS, FOB, CFR, CIF
- Displayed as selectable pills (per mockup)
- Tooltips on hover explaining what each term means and who bears risk/cost
- No transport mode distinction in UI — tooltip explains applicability
- Named place label and placeholder dynamically change based on selected Incoterm (FOB -> "Port of Loading", CIF -> "Port of Destination", DAP -> "Place of Destination", etc.)
- Named place input uses autocomplete with static UN/LOCODE dataset (bundled, free, no API cost)
- Insurance preference captured as deal term: seller provides / buyer provides / no insurance
- Insurance preference auto-set based on Incoterm semantics (e.g., CIF -> seller provides) with explanatory note

### Notifications & Real-time
- Use existing notification bell + FCM push notifications for deal events
- All major events trigger notifications: new deal, new offer, counter-offer, accepted, rejected, expired, withdrawn
- All events also trigger email notifications via Resend (100 emails/day free tier)
- Email service: Resend — needs to be set up as part of this phase
- Expiry reminders at 24h, 4h, and 1h before deadline — push + email
- Real-time updates via Firestore listeners — new offers appear automatically in timeline
- Subtle notification sound when new offer arrives while on deal page
- My Deals list page also uses Firestore listeners — real-time status updates
- Smart push suppression: skip FCM push if user is currently viewing the deal page
- General unread count in notification bell (deals + all other types together)
- Clicking a deal notification navigates directly to the deal page
- Firestore ID used for deals (no human-readable ID format)

### Claude's Discretion
- Exact layout adaptation from mockup to existing design system
- Loading skeleton and spinner patterns
- Error state handling and edge cases
- Exact spacing, typography, and component choices
- Scheduled function interval for expiry checks
- Expiry default duration (e.g., 72h)
- Sound file/pattern for notification alert
- Mobile responsive breakpoints and stacking behavior

</decisions>

<specifics>
## Specific Ideas

- Mockup reference: `other_items/S1-teklif,muzakere-.html` — follow the feature set and information architecture, adapt UI to existing app design language
- "Initiate Deal" button lives in the existing chat interface (chat originated from product detail "Contact Seller")
- Insurance preference field from mockup kept as negotiation term (not deferred to Phase 4) since it sets expectations for the insurance stage
- Payment terms from mockup: Cash, 30-day, 60-day, 90-day, Letter of Credit (LC), Documents Against Payment
- Unit options from mockup: kg, ton, pieces, metre, m²
- Color coding: buyer = green, seller = gold (matching existing brand identity)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 02-deal-creation-and-negotiation-s1*
*Context gathered: 2026-02-22*
