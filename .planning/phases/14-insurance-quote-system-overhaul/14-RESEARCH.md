# Phase 14: Insurance Quote System Overhaul - Research

**Researched:** 2026-04-22
**Domain:** React forms (react-hook-form + zod), Firestore data model extension, accordion UI patterns, modal confirmation, insurance domain modeling
**Confidence:** HIGH

---

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

- 3 risk types as accordion sections in a single scrollable form: Cargo/Marine, Commercial Risk, Political Risk
- Cargo/Marine is required; Commercial and Political are optional add-ons
- Provider chooses which optional risk types to quote on — only selected accordions expand
- All 3 risk types always available to all insurance providers — buyer does NOT specify which types to request at broadcast time
- Buyer quote comparison: main card shows Cargo/Marine summary (primary), expandable section below reveals Commercial and Political risk details if quoted
- Firm quotes get a green highlight/ribbon; Indicative quotes show a yellow "Subject to review" warning
- Exclusions: single shared section at the bottom, applies to entire quote (not per risk type)
- Conditions Precedent: single shared section, applies to entire quote
- Claims Handling: single shared section, applies to entire quote
- Premium additions: single shared section (rate %, payment terms dropdown)
- Buyer/Seller name + country added INTO the existing left column deal info card (not a separate card)
- Insurance arrangement derived from Incoterm — no extra field needed
- Payment terms: show the deal's exact terms text as-is (no mapping to categories)
- Both insurance AND logistics providers see buyer/seller names + countries
- Logistics providers still do NOT see deal price (existing restriction maintained)
- Indicative vs Firm toggle — Indicative is the default
- When Firm is selected, binding conditions textarea appears
- "Message to Buyer" grouped in the quote status section (after Indicative/Firm toggle and binding conditions)
- Existing "Notes" field remains separate
- Modal confirmation before final submit — clicking "Submit Quote" shows a modal summarizing all filled sections

### Claude's Discretion

- Whether binding conditions textarea is required or optional when Firm is selected
- Exact accordion expand/collapse behavior and animations
- How to derive insurance arrangement from Incoterm (CIF/CIP mapping)
- Cargo/Marine "% of Loss Covered" field placement within the existing ICC form section
- Quote entity field names for all new fields
- Firestore data model for the new risk type sub-objects
- Zod validation schemas for all new fields

### Deferred Ideas (OUT OF SCOPE)

None — all 12 scope items from PENDING_PHASES.md are included in this phase.
</user_constraints>

---

<phase_requirements>
## Phase Requirements

Phase 14 has no formal requirement IDs in REQUIREMENTS.md — requirements are derived from CONTEXT.md decisions and PENDING_PHASES.md scope items 1–12.

| Derived ID | Description | Research Support |
|------------|-------------|-----------------|
| INS-01 | Deal Info Panel: add buyer/seller name + country to existing left card | UserRepository.getById() pattern confirmed in useTradeSummary.js |
| INS-02 | Deal Info Panel: derive insurance arrangement from Incoterm | INCOTERMS_2020 has insuranceDefault field; getIncotermByCode() utility exists |
| INS-03 | Cargo/Marine accordion: add % of Loss Covered field to existing ICC section | Extends existing QuoteFormInsurance |
| INS-04 | Commercial Risk accordion (new): Coverage Limit, Currency, % Loss, Coverage Basis, Waiting Period | New sub-object on Quote entity |
| INS-05 | Political Risk accordion (new): Coverage Limit, Currency, % Loss, Political Perils checkboxes | New sub-object on Quote entity |
| INS-06 | Exclusions section: checkbox list + free text (shared, applies to whole quote) | New fields on Quote entity |
| INS-07 | Conditions Precedent section: checkbox list + free text (shared) | New fields on Quote entity |
| INS-08 | Claims Handling section: jurisdiction dropdown, response time dropdown, contact email | New fields on Quote entity |
| INS-09 | Premium additions: rate % field + payment terms dropdown (shared section) | New fields on Quote entity |
| INS-10 | Quote Status: Indicative/Firm toggle + binding conditions textarea (+ Message to Buyer field) | New fields on Quote entity |
| INS-11 | Quote Summary Modal: pre-submit confirmation modal showing all filled sections | New component |
| INS-12 | InsuranceQuoteCard: expandable section for Commercial/Political risk details; Firm/Indicative badge | Extends existing InsuranceQuoteCard |
</phase_requirements>

---

## Summary

Phase 14 overhauls the insurance quote form from a ~12-field single-page form to a structured multi-section form covering three risk type accordions (Cargo/Marine required, Commercial Risk and Political Risk optional), four shared sections (Exclusions, Conditions Precedent, Claims Handling, Premium), and a Quote Status section. The Quote entity will grow from ~11 insurance-specific fields to ~50+ fields organized in nested sub-objects. The buyer comparison card needs expandable sections for Commercial and Political risk details, plus Indicative/Firm visual treatment.

The project's existing form stack (react-hook-form + zod + zodResolver, `mode:onSubmit`, `reValidateMode:onBlur`) is well-established and handles this complexity. The key architectural challenge is managing a large nested form with conditional sections (optional accordions, conditional binding conditions textarea) without creating prop-drilling or validation complexity. The recommended approach is a single `useForm` instance with nested field names (`cargoMarine.lossCoveredPct`, `commercialRisk.coverageLimit`, etc.) using Zod's `z.object().optional()` for the optional risk types.

The Deal Info Panel enrichment (buyer/seller names + countries) follows the exact pattern already used in `useTradeSummary.js` — `UserRepository.getById()` plus two `useEffect` calls. The Incoterm→insurance arrangement derivation is already fully supported by `INCOTERMS_2020[].insuranceDefault` and the `getIncotermByCode()` utility. The `broadcastQuoteRequests` function needs to be updated to include `buyerName`, `buyerCountry`, `sellerName`, `sellerCountry` in both `insuranceDealSnapshot` and `logisticsDealSnapshot`.

**Primary recommendation:** Use a single react-hook-form instance with nested Zod schema objects per risk type, `z.optional()` for Commercial and Political risk sub-schemas, and a pre-submit modal that reads `watch()` values to display the summary. Extend the Quote entity and submitQuote CF with the new nested structure rather than flat fields.

---

## Standard Stack

### Core (already in project — verified from package.json and existing code)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| react-hook-form | ^7 (via @hookform/resolvers ^5.2.2) | Form state, validation | Already the project standard (Phase 7) |
| zod | (peer of @hookform/resolvers) | Schema validation | Already the project standard (Phase 7) |
| @hookform/resolvers | ^5.2.2 | zodResolver adapter | Already installed |
| lucide-react | ^0.560.0 | Icons (ChevronDown for accordions) | Already in project |
| framer-motion | ^12.33.0 | Accordion animation (already installed) | Present in package.json |
| firebase | ^12.4.0 | Firestore read/write | Project-wide |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| DatePicker (internal) | project component | Policy dates | Already standardized in Phase 11 |
| INCOTERMS_2020 (internal) | project constant | Derive insurance arrangement | `src/core/constants/incoterms.js` |
| UserRepository (internal) | project layer | Fetch buyer/seller name + country | `container.getUserRepository().getById()` |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| Single useForm with nested paths | Separate useForm per accordion | Single form is simpler — one handleSubmit, one errors object, one submit payload |
| framer-motion AnimatePresence | CSS transition on max-height | Framer-motion is already installed and the project uses it; no new dependency |
| Modal as local component | Dialog/Radix | No external dialog library exists in the project — inline modal with portal/overlay is simpler |

**Installation:** No new packages needed. All required libraries are already in `package.json`.

---

## Architecture Patterns

### Recommended Project Structure

```
src/
├── presentation/components/features/provider/
│   └── QuoteFormInsurance/
│       ├── QuoteFormInsurance.jsx          # Main orchestrator — REPLACE entirely
│       ├── QuoteFormInsurance.css          # (if needed for accordion transitions)
│       ├── sections/
│       │   ├── CargoMarineSection.jsx      # Cargo/Marine accordion body
│       │   ├── CommercialRiskSection.jsx   # Commercial Risk accordion body
│       │   ├── PoliticalRiskSection.jsx    # Political Risk accordion body
│       │   ├── ExclusionsSection.jsx       # Shared exclusions
│       │   ├── ConditionsPrecedentSection.jsx
│       │   ├── ClaimsHandlingSection.jsx
│       │   ├── PremiumAdditionsSection.jsx
│       │   └── QuoteStatusSection.jsx      # Indicative/Firm + Message to Buyer
│       └── QuoteSummaryModal.jsx           # Pre-submit confirmation modal
├── presentation/components/features/quote/
│   └── InsuranceQuoteCard/
│       └── InsuranceQuoteCard.jsx          # Add expandable Commercial/Political + Firm badge
├── domain/entities/
│   └── Quote.js                            # Add ~40 new insurance fields
└── core/constants/
    └── quoteConstants.js                   # Add new constants for new dropdown/checkbox values
```

### Pattern 1: Single useForm with Nested Zod Schema

**What:** One `useForm` instance at the `QuoteFormInsurance` level. All accordion section components receive `register`, `control`, `errors`, and `watch` as props. Field names use dot notation for nesting: `cargoMarine.lossCoveredPct`, `commercialRisk.coverageLimit`.

**When to use:** Always — this is the project standard for complex forms (established in Phase 7).

**Example:**
```javascript
// Zod schema for the whole form
const insuranceQuoteSchema = z.object({
  // Existing Cargo/Marine fields (keep iccCoverage, warClause, etc.)
  cargoMarine: z.object({
    iccCoverage: z.enum(['A', 'B', 'C'], { required_error: 'Required' }),
    warClause: z.boolean().default(false),
    strikesClause: z.boolean().default(false),
    lossCoveredPct: z.number().min(70).max(100),
    premiumAmount: z.number().positive('Premium must be > 0'),
    coverageAmount: z.number().positive(),
    deductiblePct: z.number().min(0).max(100).default(0),
    claimsPaymentDays: z.number().int().positive(),
    policyStartDate: z.string().optional(),
    policyEndDate: z.string().optional(),
    coverageScope: z.string().min(1),
    certificateType: z.string().optional(),
  }),
  // Optional risk types — undefined when accordion not selected
  commercialRisk: z.object({
    coverageLimit: z.number().positive(),
    currency: z.string().min(1),
    lossCoveredPct: z.number(),
    coverageBasis: z.string().min(1),
    waitingPeriodDays: z.number().int(),
  }).optional(),
  politicalRisk: z.object({
    coverageLimit: z.number().positive(),
    currency: z.string().min(1),
    lossCoveredPct: z.number(),
    perils: z.array(z.string()).min(1, 'Select at least one peril'),
  }).optional(),
  // Shared sections
  exclusions: z.object({
    standardItems: z.array(z.string()).default([]),
    customText: z.string().optional(),
  }),
  conditionsPrecedent: z.object({
    standardItems: z.array(z.string()).default([]),
    customText: z.string().optional(),
  }),
  claimsHandling: z.object({
    jurisdiction: z.string().min(1),
    responseTime: z.string().min(1),
    contactEmail: z.string().email().optional().or(z.literal('')),
  }),
  premiumAdditions: z.object({
    ratePercent: z.number().min(0).optional(),
    paymentTerms: z.string().optional(),
  }),
  quoteStatus: z.object({
    status: z.enum(['indicative', 'firm']).default('indicative'),
    bindingConditions: z.string().optional(),
    messageToBuyer: z.string().optional(),
  }),
  // Shared top-level fields
  currency: z.string().min(1),
  validityHours: z.number().positive(),
  notes: z.string().optional(),
});
```

### Pattern 2: Accordion with Toggle State

**What:** Each accordion section has a local `isOpen` boolean controlled by a toggle button. For optional risk types, a checkbox enables the accordion AND sets/clears the optional sub-schema data. Cargo/Marine is always open (no toggle).

**When to use:** For all three risk type sections, and optionally for shared sections.

**Example:**
```javascript
// In QuoteFormInsurance orchestrator
const [commercialRiskEnabled, setCommercialRiskEnabled] = useState(false);
const [politicalRiskEnabled, setPoliticalRiskEnabled] = useState(false);

// When disabling an optional risk type, unregister its fields
const handleCommercialRiskToggle = (checked) => {
  setCommercialRiskEnabled(checked);
  if (!checked) {
    // Clear the sub-object from form state
    setValue('commercialRisk', undefined);
  }
};
```

### Pattern 3: Quote Summary Modal

**What:** A full-screen overlay modal that reads the current form state via `watch()` and presents a structured summary before final submit. The modal receives the form's `watch` values, not a separate data fetch.

**When to use:** Triggered by the "Submit Quote" button. Actual `handleSubmit` is called from within the modal's "Confirm" button.

**Example:**
```javascript
// In QuoteFormInsurance
const [showSummaryModal, setShowSummaryModal] = useState(false);
const watchedValues = watch(); // or watch specific fields for perf

// "Submit Quote" button → setShowSummaryModal(true)
// Modal "Confirm" button → handleSubmit(onSubmit)()
```

### Pattern 4: Deal Info Panel Enrichment

**What:** `QuoteDetailView` currently renders buyer/seller only implicitly (they're not shown). Add `useEffect` + `UserRepository.getById()` to fetch buyer and seller profiles (name + country) from Firestore. This is the exact pattern used in `useTradeSummary.js` (lines 176–188).

**Note:** `broadcastQuoteRequests` in `functions/index.js` must be updated to denormalize `buyerName`, `buyerCountry`, `sellerName`, `sellerCountry` into both `insuranceDealSnapshot` and `logisticsDealSnapshot`. This avoids a Firestore read in `QuoteDetailView` at runtime — the names are available immediately from `request.dealSnapshot`.

**Incoterm derivation:**
```javascript
import { getIncotermByCode } from '@/core/constants/incoterms';

function deriveInsuranceArrangement(incoterm) {
  const term = getIncotermByCode(incoterm);
  if (!term) return null;
  return term.insuranceDefault === 'seller_provides'
    ? 'Seller provides insurance'
    : 'Buyer provides insurance';
}
```

### Anti-Patterns to Avoid

- **Separate useForm per section:** Creates multiple submit handlers, multiple payloads, and makes the modal summary impossible. Use one form instance.
- **Storing accordion open/close state in form state:** Use local `useState` for UI open/close — do not bind accordion expansion to zod fields.
- **Re-fetching buyer/seller on every render:** Cache in `useState` with a `useEffect` dependency on `request.dealSnapshot.buyerId`. Better still: denormalize into dealSnapshot at broadcast time (see Pattern 4).
- **Hardcoding exclusion/condition strings in JSX:** Define all checkbox label lists as constants in `quoteConstants.js` so the submitQuote CF can validate against the same set.
- **Blocking submit on optional risk type validation:** If `commercialRiskEnabled` is false, Zod's `.optional()` correctly allows the field to be `undefined`. Do not add manual guards.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Accordion open/close animation | CSS height transitions | framer-motion AnimatePresence + motion.div | Already installed; handles enter/exit cleanly without layout thrash |
| Form field nested access | Manual dot-path string assembly | react-hook-form `register('cargoMarine.lossCoveredPct')` | RHF handles nested paths natively |
| Zod conditional validation (optional risk types) | Manual if-blocks in onSubmit | `z.object().optional()` | Built-in Zod feature; plays well with zodResolver |
| Modal portal | document.createElement + ReactDOM.createPortal | Inline fixed overlay with z-index | Project has no portal/dialog infrastructure; fixed overlay is simpler for one-off modal |
| Incoterm insurance derivation | Custom lookup | `getIncotermByCode(incoterm).insuranceDefault` | Already implemented in `src/core/constants/incoterms.js` |
| Buyer/seller name fetch | Direct Firestore `db.collection('users').doc(id).get()` | `container.getUserRepository().getById(uid)` | Repository layer is the project standard |

**Key insight:** The form complexity is managed by react-hook-form's nested field support, not by component fragmentation. The entire form should share one `useForm` instance.

---

## Common Pitfalls

### Pitfall 1: Flat vs. Nested Quote entity fields
**What goes wrong:** Adding 40+ flat fields to the Quote constructor (e.g., `commercialRiskCoverageLimit`, `commercialRiskCurrency`) causes the constructor signature to become unmaintainable.
**Why it happens:** The current Quote entity uses flat positional constructor args (26 parameters already).
**How to avoid:** Add new risk types as named sub-objects stored in Firestore as nested maps: `cargoMarine: {...}`, `commercialRisk: {...}`, `politicalRisk: {...}`. Update `Quote.fromFirestore()` to read `data.cargoMarine || {}` etc. Keep existing flat fields for backward compatibility with old quotes.
**Warning signs:** Constructor with >30 positional args, any new field named like `commercialRiskXxx`.

### Pitfall 2: submitQuote CF validation breaks for new fields
**What goes wrong:** The CF's insurance validation block (lines 2865–2887) only validates the old flat fields. New fields (risk sub-objects, exclusions, etc.) will pass through unvalidated or be silently dropped.
**Why it happens:** The CF currently spreads `...quoteData` directly into the Firestore document (line 2920). New fields pass through, but there's no CF-side validation for them.
**How to avoid:** Add explicit validation blocks in the CF for each new section. For optional sections (commercialRisk, politicalRisk), validate only when the key is present in `quoteData`. Make the CF validation mirror the Zod schema.
**Warning signs:** Submitting a Firm quote without binding conditions saves successfully on the server but the field is missing from Firestore.

### Pitfall 3: Existing policyStartDate/policyEndDate become required in CF
**What goes wrong:** The CF currently throws `HttpsError` if `policyStartDate` or `policyEndDate` is missing. These are now inside `cargoMarine` sub-object — migrating the shape requires updating the CF destructuring.
**Why it happens:** Line 2882: `if (!policyStartDate || !policyEndDate)` — this will fail for any quote using the new nested schema.
**How to avoid:** Update the CF to destructure from `quoteData.cargoMarine` instead of `quoteData` directly. Keep backward compatibility by falling back to flat fields for old clients: `const { iccCoverage } = quoteData.cargoMarine || quoteData`.
**Warning signs:** All new quote submissions from the updated form fail CF validation with "policyStartDate and policyEndDate are required."

### Pitfall 4: InsuranceQuoteCard expandable section layout shift
**What goes wrong:** The expandable Commercial/Political risk section expands inside the existing card grid, causing other cards in the grid to shift vertically.
**Why it happens:** Quote comparison uses a CSS grid where each card is a grid item. Expanding one card to reveal nested details causes height change in the row.
**How to avoid:** The expandable section should show below the card, not inside the card grid. Consider a full-width disclosure panel below the card row, or use absolute/overflow positioning within the card. Confirm with the user if needed.
**Warning signs:** Opening the expandable section causes sibling cards to jump or misalign.

### Pitfall 5: Zod `mode:onSubmit` with conditional required fields
**What goes wrong:** The Firm quote's binding conditions may be optional or required. If required, the zod schema needs a `.superRefine()` or conditional `.refine()` — `z.string().optional()` will not enforce the requirement.
**Why it happens:** Conditional required fields based on sibling field values require cross-field validation, which is not supported by basic `.required()`.
**How to avoid (Claude's discretion):** Make binding conditions **optional** (recommended). The real enforcement is the provider's professional obligation. This avoids superRefine complexity and keeps the schema simple.
**Warning signs:** Provider can submit a Firm quote with no binding conditions and no validation error — this is acceptable per the "optional" decision.

### Pitfall 6: broadcastQuoteRequests snapshot not updated with buyer/seller info
**What goes wrong:** Provider opens QuoteDetailView and sees no buyer/seller names, because the `dealSnapshot` stored at broadcast time doesn't include them.
**Why it happens:** `broadcastQuoteRequests` builds `insuranceDealSnapshot` and `logisticsDealSnapshot` from `dealData` — these currently don't include buyer/seller names or countries.
**How to avoid:** Update `broadcastQuoteRequests` to include `buyerName`, `buyerCountry`, `sellerName`, `sellerCountry` in both snapshot objects. These require fetching buyer/seller user docs in the CF (two additional `db.collection('users').doc(id).get()` calls before building the batch). Store result as `dealData.buyerName` etc. after fetching.
**Warning signs:** Buyer/seller fields are `undefined` in `QuoteDetailView` even after adding the UI fields.

---

## Code Examples

Verified patterns from existing project code:

### Existing form setup pattern (from QuoteFormInsurance.jsx)
```javascript
// Source: src/presentation/components/features/provider/QuoteFormInsurance/QuoteFormInsurance.jsx
const { register, handleSubmit, watch, control, formState: { errors } } = useForm({
  resolver: zodResolver(insuranceQuoteSchema),
  mode: 'onSubmit',
  reValidateMode: 'onBlur',
  defaultValues,
});
```

### Buyer/seller name fetch pattern (from useTradeSummary.js lines 176–188)
```javascript
// Source: src/presentation/hooks/deal/useTradeSummary.js
useEffect(() => {
  if (!deal?.buyerId || !deal?.sellerId) return;
  const userRepo = container.getUserRepository();
  userRepo.getById(deal.buyerId).then((user) => {
    setBuyerName(user?.companyName || user?.displayName || 'Buyer');
  }).catch(() => setBuyerName('Buyer'));
  userRepo.getById(deal.sellerId).then((user) => {
    setSellerName(user?.companyName || user?.displayName || 'Seller');
  }).catch(() => setSellerName('Seller'));
}, [deal?.buyerId, deal?.sellerId]);
```

### Incoterm insurance arrangement derivation (from incoterms.js)
```javascript
// Source: src/core/constants/incoterms.js
import { getIncotermByCode } from '@/core/constants/incoterms';

function deriveInsuranceArrangement(incotermCode) {
  const term = getIncotermByCode(incotermCode);
  if (!term) return null;
  return term.insuranceDefault === 'seller_provides'
    ? 'Seller provides cargo insurance'
    : 'Buyer provides cargo insurance';
}
// CIF, CIP, DAP, DPU, DDP → 'Seller provides cargo insurance'
// EXW, FCA, CPT, FAS, FOB, CFR → 'Buyer provides cargo insurance'
```

### broadcastQuoteRequests buyer/seller fetch pattern (to be added to functions/index.js)
```javascript
// In broadcastQuoteRequests — fetch buyer/seller docs before building snapshots
const [buyerDoc, sellerDoc] = await Promise.all([
  db.collection('users').doc(dealData.buyerId).get(),
  db.collection('users').doc(dealData.sellerId).get(),
]);
const buyerData = buyerDoc.data() || {};
const sellerData = sellerDoc.data() || {};

const buyerName = buyerData.companyName || buyerData.displayName || 'Buyer';
const buyerCountry = buyerData.country || null;
const sellerName = sellerData.companyName || sellerData.displayName || 'Seller';
const sellerCountry = sellerData.country || null;

// Then include in both insuranceDealSnapshot and logisticsDealSnapshot:
// buyerName, buyerCountry, sellerName, sellerCountry
```

### Quote entity nested structure (new Quote.fromFirestore additions)
```javascript
// In Quote.fromFirestore — new nested risk sub-objects
this.cargoMarine = data.cargoMarine || null;
this.commercialRisk = data.commercialRisk || null;
this.politicalRisk = data.politicalRisk || null;
this.exclusions = data.exclusions || null;
this.conditionsPrecedent = data.conditionsPrecedent || null;
this.claimsHandling = data.claimsHandling || null;
this.premiumAdditions = data.premiumAdditions || null;
this.quoteStatus = data.quoteStatus || { status: 'indicative' };
```

### Error display pattern (established project standard — Phase 7)
```javascript
// Error text: text-xs text-red-400 mt-1
// Error border: border-red-500 on invalid inputs
{errors.cargoMarine?.iccCoverage && (
  <p className="text-xs text-red-400 mt-1">{errors.cargoMarine.iccCoverage.message}</p>
)}
```

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Flat 11-field insurance schema | Nested sub-objects per risk type | Phase 14 | Quote entity grows ~4x, CF validation refactored |
| Single "Notes" field for extras | Dedicated Exclusions, Conditions Precedent, Claims Handling sections | Phase 14 | Provider can express structured policy terms |
| No quote status | Indicative / Firm toggle | Phase 14 | Buyer knows whether quote is bindable |
| No buyer/seller info in panel | Buyer + seller name + country shown to both insurance and logistics providers | Phase 14 | Providers have counterparty context |

**Deprecated/outdated after this phase:**
- Flat `iccCoverage`, `warClause`, `strikesClause`, `premiumAmount`, `coverageAmount`, `deductiblePct`, `claimsPaymentDays`, `policyStartDate`, `policyEndDate`, `coverageScope`, `certificateType` as top-level Quote fields — these move into `cargoMarine` sub-object. Old Firestore documents that don't have `cargoMarine` should still render correctly via `Quote.fromFirestore()` fallback to flat fields.

---

## Open Questions

1. **Backward compatibility: old quote documents**
   - What we know: Existing quotes in Firestore store flat fields (iccCoverage etc. at root level). After Phase 14, new quotes store them under `cargoMarine`.
   - What's unclear: Do old quotes need to display correctly in `InsuranceQuoteCard`? (Yes, likely — accepted/expired old quotes still show on buyer's quotes page.)
   - Recommendation: `Quote.fromFirestore()` should read `data.cargoMarine?.iccCoverage || data.iccCoverage` to support both old flat and new nested shapes. Similarly for `InsuranceQuoteCard` display logic.

2. **Country field presence on User documents**
   - What we know: `UserRepository.getById()` returns the Firestore user doc. `useTradeSummary.js` only reads `companyName` and `displayName` — no `country` field access exists anywhere in the codebase.
   - What's unclear: Is `country` reliably stored on all user documents? Registration may not have required it.
   - Recommendation: Render with fallback — `user?.country || null` — and if null, skip country display (don't show empty parentheses).

3. **submitQuote CF: required vs. optional new fields**
   - What we know: The CF currently does strict required-field validation for the 6 core insurance fields.
   - What's unclear: For the new nested schema, how strict should CF-side validation be for the shared sections (Exclusions, Claims Handling)?
   - Recommendation: CF should require `cargoMarine` sub-object with the same 6 existing fields. Commercial/Political risk objects are optional (validate only when present). Claims Handling jurisdiction and responseTime are required when the `claimsHandling` object is present. Quote status field defaults to `indicative` server-side if missing.

---

## Validation Architecture

> `nyquist_validation` is not set in `.planning/config.json` — treated as enabled.

### Test Framework

| Property | Value |
|----------|-------|
| Framework | None detected — no jest/vitest config, no test scripts in package.json |
| Config file | None — Wave 0 gap |
| Quick run command | N/A (no test infrastructure) |
| Full suite command | N/A |

### Phase Requirements → Test Map

| Req ID | Behavior | Test Type | Automated Command | File Exists? |
|--------|----------|-----------|-------------------|-------------|
| INS-02 | deriveInsuranceArrangement returns correct label for all 11 incoterms | unit | manual verify only | ❌ Wave 0 |
| INS-10 | Zod schema rejects Cargo/Marine quote missing iccCoverage | unit | manual verify only | ❌ Wave 0 |
| INS-12 | InsuranceQuoteCard renders Firm/Indicative badge correctly | manual | visual check | N/A |

### Sampling Rate

- **Per task commit:** No automated tests — developer manually verifies in browser
- **Per wave merge:** No automated tests — manual smoke test of form submission
- **Phase gate:** Manual end-to-end: submit indicative quote, submit firm quote, check buyer comparison card expands

### Wave 0 Gaps

- [ ] No test framework installed — the project has no jest/vitest/cypress setup
- [ ] `deriveInsuranceArrangement` pure function is testable if jest is added, but this is out of scope for Phase 14

*(No action required for Phase 14 — test infrastructure is a future concern. All validation is through react-hook-form/zod on the client and CF-side guards on the server.)*

---

## Sources

### Primary (HIGH confidence)

- Direct code inspection: `src/presentation/components/features/provider/QuoteFormInsurance/QuoteFormInsurance.jsx` — existing form implementation
- Direct code inspection: `src/presentation/components/features/quote/InsuranceQuoteCard/InsuranceQuoteCard.jsx` — existing buyer card
- Direct code inspection: `src/domain/entities/Quote.js` — current Quote entity (11 insurance fields, 26 constructor args)
- Direct code inspection: `src/domain/entities/QuoteRequest.js` — QuoteRequest entity with dealSnapshot structure
- Direct code inspection: `src/core/constants/quoteConstants.js` — existing constants
- Direct code inspection: `src/core/constants/incoterms.js` — INCOTERMS_2020 with `insuranceDefault` field, `getIncotermByCode()` utility
- Direct code inspection: `functions/index.js` lines 2798–2978 — submitQuote CF implementation
- Direct code inspection: `functions/index.js` lines 2656–2755 — broadcastQuoteRequests with dealSnapshot building
- Direct code inspection: `src/presentation/hooks/deal/useTradeSummary.js` lines 176–188 — buyer/seller name fetch pattern
- `.planning/phases/14-insurance-quote-system-overhaul/14-CONTEXT.md` — locked decisions

### Secondary (MEDIUM confidence)

- `.planning/PENDING_PHASES.md` Phase 15 section — full scope items 1–12 (this phase was originally "Phase 15" in the backlog, now renumbered to Phase 14)

### Tertiary (LOW confidence)

- `react-hook-form` nested field behavior with `z.object().optional()` — based on training knowledge; verify against official docs if unexpected Zod/RHF interactions occur

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries verified present in package.json and codebase
- Architecture: HIGH — patterns derived directly from existing code inspection
- Pitfalls: HIGH — derived from direct code reading of CF validation, entity structure, and dealSnapshot building logic
- Domain model: HIGH — all new fields taken directly from PENDING_PHASES.md scope items 1–12 and confirmed against CONTEXT.md locked decisions

**Research date:** 2026-04-22
**Valid until:** 2026-05-22 (stable domain — no fast-moving external APIs involved)
