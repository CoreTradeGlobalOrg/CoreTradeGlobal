# Phase 14: Insurance Quote System Overhaul - Context

**Gathered:** 2026-04-26
**Status:** Ready for planning

<domain>
## Phase Boundary

Expand the insurance quote system with 3 risk type sections (Cargo/Marine, Commercial Risk, Political Risk), enriched deal information panel, quote status (Indicative/Firm), exclusions, conditions precedent, claims handling, premium additions, quote summary confirmation, and message to buyer. All 12 items from the scope document are included.

</domain>

<decisions>
## Implementation Decisions

### Risk Type Structure
- 3 risk types organized as **accordion sections** in a single scrollable form: Cargo/Marine, Commercial Risk, Political Risk
- **Cargo/Marine is required**, Commercial and Political are optional add-ons
- Provider chooses which optional risk types to quote on — only selected accordions expand
- All 3 risk types always available to all insurance providers — buyer does NOT specify which types to request at broadcast time
- Buyer's quote comparison: main card shows Cargo/Marine summary (primary), **expandable section below** reveals Commercial and Political risk details if quoted
- Firm quotes get a **green highlight/ribbon**; Indicative quotes show a **yellow "Subject to review" warning**

### Shared Form Sections (below risk type accordions)
- **Exclusions**: single shared section at the bottom, applies to the entire quote (not per risk type)
- **Conditions Precedent**: single shared section, applies to the entire quote
- **Claims Handling**: single shared section, applies to the entire quote
- **Premium additions**: single shared section (rate %, payment terms dropdown)

### Deal Info Panel Enrichment
- Add new fields **into the existing** left column deal info card (not a separate card)
- Buyer name + country and Seller name + country at the top of the panel
- Insurance arrangement **derived from Incoterm** (e.g., CIF = seller provides) — no extra field needed
- Payment terms: show the deal's **exact terms text** as-is (no mapping to categories)
- Both **insurance AND logistics providers** see buyer/seller names + countries
- Logistics providers still do NOT see the deal price (existing restriction maintained)

### Quote Status & Binding
- Indicative vs Firm toggle on the form — **Indicative is the default**
- When Firm is selected, binding conditions textarea appears
- Binding conditions: Claude's discretion on whether required or optional for Firm
- "Message to Buyer" field grouped in the **quote status section** (after Indicative/Firm toggle and binding conditions)
- Existing "Notes" field remains separate — Message to Buyer is additional provider communication

### Quote Summary Panel
- **Modal confirmation** before final submit — clicking "Submit Quote" shows a modal summarizing all filled sections
- Provider reviews and confirms in the modal

### Claude's Discretion
- Whether binding conditions textarea is required or optional when Firm is selected
- Exact accordion expand/collapse behavior and animations
- How to derive insurance arrangement from Incoterm (CIF/CIP mapping)
- Cargo/Marine "% of Loss Covered" field placement within the existing ICC form section
- Quote entity field names for all new fields
- Firestore data model for the new risk type sub-objects
- Zod validation schemas for all new fields

</decisions>

<specifics>
## Specific Ideas

- The form structure is: Deal Info Panel (left) | Quote Form (right) with accordions for risk types at top, then shared sections (Exclusions, Conditions Precedent, Claims Handling, Premium, Quote Status + Message to Buyer) below
- Exclusions uses a checkbox list with standard items + free text area for deal-specific exclusions
- Conditions Precedent uses a checkbox list with standard items + free text area
- Claims Handling has: jurisdiction dropdown, response time dropdown, contact email field
- Premium additions: rate (% of insured value) field + payment terms dropdown
- All new fields from PENDING_PHASES.md scope items 1-12 are included

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `QuoteFormInsurance` (`src/presentation/components/features/provider/QuoteFormInsurance/QuoteFormInsurance.jsx`): Current insurance form with ICC, premium, policy dates — will be extended significantly
- `InsuranceQuoteCard` (`src/presentation/components/features/quote/InsuranceQuoteCard/InsuranceQuoteCard.jsx`): Buyer comparison card — needs expandable sections for new risk types
- `QuoteDetailView` (`src/presentation/components/features/provider/QuoteDetailView/QuoteDetailView.jsx`): Provider deal info panel — needs buyer/seller names, insurance arrangement
- `Quote` entity (`src/domain/entities/Quote.js`): Currently has 11 insurance-specific fields — will grow to ~50+ fields
- `submitQuote` Cloud Function (`functions/index.js`): Validates and stores quotes — needs new field validation

### Established Patterns
- DatePicker component used across forms (Phase 11 standardization)
- Zod validation with react-hook-form zodResolver (Phase 7 standard)
- Form validation: `mode:onSubmit`, `reValidateMode:onBlur`, error text `text-xs text-red-400 mt-1`
- Quote constants in `src/core/constants/quoteConstants.js` — needs new risk type constants

### Integration Points
- `broadcastQuoteRequests` Cloud Function — no changes needed (risk types always available)
- Quote comparison page at `/deals/[dealId]/quotes` — InsuranceQuoteCard needs expandable sections
- Provider dashboard kanban — no changes to card display

</code_context>

<deferred>
## Deferred Ideas

None — all 12 scope items are included in this phase.

</deferred>

---

*Phase: 14-insurance-quote-system-overhaul*
*Context gathered: 2026-04-26*
