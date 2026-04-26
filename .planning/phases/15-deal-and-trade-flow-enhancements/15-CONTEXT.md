# Phase 15: Deal and Trade Flow Enhancements - Context

**Gathered:** 2026-04-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Improve the existing deal/trade pages with contract approval UX enhancements, Hire a Lawyer card on all trade pages, flexible quote skipping, trade flow communication buttons, tooltip-based trade page guidance, form input polish (DatePicker consistency, number auto-select, locale-correct validation), and visibility improvements (Deal ID, PDF download). All 16 items from the backlog are included.

</domain>

<decisions>
## Implementation Decisions

### Contract & Approval UX
- Unaccepted clauses highlighted with **yellow background tint** + generic instruction text ("Please review and accept this clause")
- Accepted clauses show **green checkmark + slightly muted text** — clear visual distinction from pending
- All clause checkboxes **always expanded** (never collapsed/accordion) — user sees everything at once
- **Progress indicator** at both top and bottom of clause list: "X of Y clauses accepted"
- Bottom progress near the approve button — sticky/visible
- **Auto-advance with toast** when both parties approve all clauses — deal moves to next stage automatically
- Parties **can un-accept** a clause anytime until both parties have fully approved
- **No "Accept All" button** — each clause must be accepted individually
- Instruction text is **generic** (same text for all unaccepted clauses), not clause-specific

### Hire a Lawyer Placement
- Hire a Lawyer card appears on **all trade stages**: Negotiation, Contract, Quotes, and Trade Summary
- Positioned **below the deal round / offer area** on negotiation pages
- **Both buyer and seller** see the card independently (each can hire their own lawyer)
- "No thanks" **collapses to a slim one-line banner**: "⚖️ Need legal advice? [Hire]"
- Collapsed banner has **subtle gold/amber accent** (left border or background tint)
- Dismissal **resets per page** — each trade page shows the full card fresh
- Clicking the collapsed banner **re-expands** the full card
- When a lawyer is **already hired**, card transforms to show hired lawyer's name, status, and link to legal channel
- On **Trade Summary page**, shows engagement summary: lawyer name, hire date, key actions taken, link to legal channel

### Skip Quotes & Trade Flow Flexibility
- **Skip button per section** (insurance and logistics independently): "Skip — I'll arrange my own"
- Skipped sections show as "⚠️ Not arranged via platform" with an **[Undo skip]** option
- Trade summary reflects skipped sections appropriately
- **Button rename**: "Quote Selected" → "Confirm Coverage & Shipment" (shorter version)
- **Trade summary message buttons**: each party (buyer, seller, insurance provider, logistics provider, lawyer) gets a [✉ Chat] button that opens the existing FAB widget / /messages conversation
- **Deal page messaging** (negotiation/contract): message button icons that open FAB widget — no inline chat sidebar (keeps pages focused; Phase 13 handles provider chat sidebars on quote pages)
- **Trade pages guide**: tooltip icons (ⓘ) on key elements (Incoterms, clause sections, quote status, etc.) — hover/click shows brief explanation. Non-intrusive, available on demand.

### Form Inputs & Validation Polish
- **Deal ID visible** in page header/breadcrumb area: "Deals > Deal #CTG-2024-001"
- **PDF download**: gold accent button/link text on the product card within deal pages
- **DatePicker audit**: replace ALL native HTML date inputs across trade pages with shared DatePicker component
  - DatePicker accent color: **gold for product-related** contexts, **blue for RFQ-related** contexts
  - Fix "expected string, received null" error with friendly message: "Please select a delivery date"
- **Number inputs**: add `onFocus={e => e.target.select()}` to ALL numeric inputs across deal/trade pages
- **Validation messages**: audit all Zod schemas to ensure messages are in English (not Turkish hardcoded). Apply globally across deal/trade pages.

### Claude's Discretion
- Exact tooltip content for trade page guide elements
- Exact placement of the ⓘ icons on each page
- DatePicker component color prop implementation details
- How to detect hired lawyer state for card transformation
- Exact progress indicator styling (sticky bottom bar vs inline)
- Breadcrumb component creation/extension for Deal ID display

</decisions>

<specifics>
## Specific Ideas

- The collapsed lawyer banner should feel like a subtle prompt, not an ad — gold accent consistent with the platform's gold theme for product-related elements
- Contract clause highlighting inspired by form validation patterns — yellow = needs attention, green = done
- Trade page tooltips should explain domain terms (Incoterms, ICC clauses, etc.) in plain language for users new to international trade
- Message buttons on trade summary should reuse Phase 13's messaging infrastructure (ConversationRepository, MessagesContext, FAB widget)
- "No Accept All button" — the user wants to ensure each clause is consciously reviewed

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `DatePicker` (`src/presentation/components/common/DatePicker/DatePicker.jsx`): Shared component already used in `DealFormFields` and `CounterOfferForm` — extend to all date inputs
- `DealSidebar` (`src/presentation/components/features/deal/DealSidebar/`): Existing sidebar — Deal ID and Hire a Lawyer card integrate here or adjacent
- `LawyerDirectory` + `LawyerCard` (`src/presentation/components/features/legal/`): Existing lawyer browsing components — reuse for Hire a Lawyer card
- `useLegalActions` hook (`src/presentation/hooks/legal/useLegalActions.js`): Existing hook for lawyer hiring actions
- `TradeSummary` components (`src/presentation/components/features/deal/TradeSummary/`): Multiple sub-components (PartiesProvidersSection, LegalConsultingSection) — add message buttons and lawyer engagement summary here
- `MessagesContext` + `MessagesWidget` (FAB): Phase 13's messaging infrastructure — reuse for chat buttons

### Established Patterns
- Zod + react-hook-form with `zodResolver` for form validation (Phase 7 standard)
- Form validation: `mode:onSubmit`, `reValidateMode:onBlur`, error text `text-xs text-red-400 mt-1`
- Contract page: `src/app/(main)/deals/[dealId]/contract/page.jsx` — clause approval logic already exists, needs UX enhancement
- Deal constants: `src/core/constants/dealConstants.js` — deal statuses and stage progression
- Incoterms data: `src/core/constants/incoterms.js` — source for tooltip content

### Integration Points
- Contract page needs yellow highlight + progress indicator additions
- All trade stage pages (negotiation, contract, quotes, summary) need Hire a Lawyer card
- `DealPage` component needs Deal ID in header/breadcrumb
- Product card on deal page needs PDF download button with gold styling
- Quote comparison page needs skip buttons per section
- Trade summary's `PartiesProvidersSection` needs message buttons

</code_context>

<deferred>
## Deferred Ideas

None — all 16 backlog items are covered in this phase.

</deferred>

---

*Phase: 15-deal-and-trade-flow-enhancements*
*Context gathered: 2026-04-26*
