# Phase 3: Contract Agreement (S2) - Context

**Gathered:** 2026-02-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Dual-party clause-by-clause contract approval that gates deal advancement. After a deal's offer is accepted, both parties review and individually approve contract clauses populated from the negotiation outcome. The deal cannot advance to insurance/logistics until both parties approve all clauses. Provider portals, legal consulting, and quote flows are separate phases.

</domain>

<decisions>
## Implementation Decisions

### Contract Presentation
- Sectioned accordion layout — clauses grouped into collapsible sections, expand one at a time
- Core trade terms only — price, quantity, Incoterms, delivery terms, payment terms (only what was negotiated)
- Clean and modern visual tone — readable language, card-based sections, matches platform UI
- Dedicated route at `/deals/[id]/contract`, linked from deal page and notifications
- Label data sources — each clause shows where values came from (e.g., "From negotiation")
- PDF export — "Download PDF" button generates a printable version of the contract
- Context header at top — shows deal overview: buyer, seller, product, accepted date, deal ID
- Link to negotiation history — show final terms with a link back to negotiation timeline for reference

### Clause Approval UX
- Checkbox per individual clause — approve each clause one by one
- Approvals are toggleable until final submit — user can un-check until they click "Submit All Approvals"
- Both parties see each other's approval progress in real-time (live updates)
- Confirmation dialog on final submit — modal summarizes all approvals before committing
- Yellow checkmark + subtle yellow highlight for approved clauses (matches platform brand)
- Both parties use same yellow checkmark style, labeled "You" and "Buyer/Seller" to distinguish
- Progress bar at top showing "X/Y clauses approved" for each party
- Notifications only on full approval — notify when other party submits all approvals, not per clause
- Auto-save draft — checked (but not submitted) clauses are saved, user picks up where they left off
- No comments on clauses — approve or don't; discussions happen in chat
- After both approve, redirect to next stage (insurance/logistics quote request flow)
- Submit button always visible but disabled until all clauses checked — shows remaining count
- Must expand each accordion section before checkbox becomes active — ensures clauses are read

### Financial Summary
- Sticky sidebar — financial summary always visible while scrolling through clauses
- Line items: unit price, quantity, total value, Incoterms, currency, plus estimated insurance/logistics costs (placeholder until Phase 4)
- Incoterms-driven document checklist — required documents change based on selected Incoterms (FOB vs CIF etc.)

### Approval Flow
- When one party approves: contract becomes read-only with banner showing other party's progress
- Deal page shows contract approval status (e.g., "Contract: Buyer approved, Seller pending")
- Contract generated after brief "Generating contract..." delay when offer is accepted — feels deliberate
- Configurable deadline — deal creator can set an approval deadline; deal expires if not met

### Claude's Discretion
- Exact accordion animation and transitions
- Loading skeleton design during contract generation
- Specific Incoterms-to-document mapping (research which docs each Incoterm requires)
- Error state handling (network errors, concurrent edits)
- Exact estimated costs placeholder design
- Mobile responsiveness of sidebar (likely collapses below clauses)

</decisions>

<specifics>
## Specific Ideas

- Brand color is yellow — approved states should use yellow checkmarks and subtle yellow highlights, not green
- "Generating contract..." delay after offer acceptance to make it feel like a deliberate process
- Accordion must-expand-to-approve pattern ensures parties actually read each clause before checking
- Financial sidebar should feel like a checkout summary — always in view while reviewing terms

</specifics>

<deferred>
## Deferred Ideas

- Clause comments/dispute annotations — could be part of Legal Consulting (Phase 5) or a separate phase
- Contract versioning/amendment after approval — future phase if needed
- Digital signature integration — beyond checkbox approval, could be a future enhancement

</deferred>

---

*Phase: 03-contract-agreement-s2*
*Context gathered: 2026-02-28*
