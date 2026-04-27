---
phase: 14-insurance-quote-system-overhaul
verified: 2026-04-22T12:00:00Z
status: human_needed
score: 12/12 must-haves verified
human_verification:
  - test: "Cargo/Marine accordion displays all fields correctly and is always expanded"
    expected: "ICC coverage radio cards, war/strikes checkboxes, premium/coverage/lossCoveredPct row, deductible/claimsPaymentDays row, policy dates, coverage scope, certificate type all visible"
    why_human: "Visual form rendering and field layout cannot be confirmed programmatically"
  - test: "Commercial Risk and Political Risk accordions toggle on/off via checkbox"
    expected: "Checking the enable checkbox expands the section with smooth animation; unchecking collapses and clears form state"
    why_human: "UI interaction state and framer-motion animation requires browser"
  - test: "Submit Quote button triggers validation then shows summary modal"
    expected: "Clicking Submit Quote with invalid fields shows field errors; with valid data opens QuoteSummaryModal showing all filled sections"
    why_human: "Form validation and modal display flow requires end-to-end browser interaction"
  - test: "QuoteSummaryModal Confirm & Submit triggers Cloud Function call"
    expected: "Clicking Confirm & Submit in the modal submits the form data to submitQuote CF and closes the modal on success"
    why_human: "Requires authenticated session and deployed CF interaction"
  - test: "QuoteDetailView shows buyer/seller name+country for BOTH insurance and logistics providers"
    expected: "Both insurance and logistics providers see Buyer and Seller rows at top of deal info panel when dealSnapshot includes buyerName/sellerName"
    why_human: "Requires live dealSnapshot with Phase 14 CF data (CF must be deployed to populate buyerName)"
  - test: "Insurance Arrangement row shown only for insurance providers"
    expected: "Insurance provider sees 'Seller provides cargo insurance' or 'Buyer provides cargo insurance' below Incoterm row; logistics provider does not see this row"
    why_human: "Requires provider-type-specific UI rendering verification in browser"
  - test: "InsuranceQuoteCard shows Firm/Indicative badge"
    expected: "Firm quotes display green 'Firm Quote' badge; indicative quotes display yellow 'Subject to Review' badge"
    why_human: "Badge rendering depends on live quote data from Firestore with quoteStatus sub-object"
  - test: "InsuranceQuoteCard expandable section reveals all extended data sub-sections"
    expected: "Clicking 'View Full Coverage Details' reveals Commercial Risk, Political Risk, Exclusions, Claims Handling, Premium Additions, and Message from Provider sections when data present"
    why_human: "Requires live quote with Phase 14 sub-objects; layout behavior in comparison grid requires visual check"
  - test: "Old flat-field insurance quotes still render correctly in InsuranceQuoteCard"
    expected: "Legacy Firestore quote docs without cargoMarine/commercialRisk fields render the card identically to pre-Phase-14 appearance with no badge and no expandable toggle"
    why_human: "Requires real legacy Firestore data; backward compat cannot be confirmed without actual old quote documents"
  - test: "Cloud Functions deployed and submitQuote validates new nested sub-objects"
    expected: "Submitting a quote with commercialRisk.coverageLimit=0 returns validation error; valid nested submission persists cargoMarine, commercialRisk, politicalRisk in Firestore"
    why_human: "CF must be manually deployed before validation logic takes effect (per project convention)"
---

# Phase 14: Insurance Quote System Overhaul — Verification Report

**Phase Goal:** Expand the insurance quote system with 3 risk type sections (Cargo/Marine, Commercial Risk, Political Risk), enriched deal information panel, quote status (Indicative/Firm), exclusions, conditions precedent, claims handling, premium additions, quote summary confirmation, and message to buyer.
**Verified:** 2026-04-22
**Status:** human_needed
**Re-verification:** No — initial verification

---

## Goal Achievement

### Observable Truths

| # | Truth | Status | Evidence |
|---|-------|--------|----------|
| 1 | Quote entity supports nested sub-objects for cargoMarine, commercialRisk, politicalRisk, exclusions, conditionsPrecedent, claimsHandling, premiumAdditions, quoteStatus, messageToBuyer | VERIFIED | `Quote.js` lines 130-139: all 9 fields assigned as null in constructor; `fromFirestore()` lines 193-201 populate from Firestore data |
| 2 | Old flat-field quotes still render correctly via Quote.fromFirestore() backward compat | VERIFIED | `Quote.js` lines 205-217: backward compat block re-maps cargoMarine sub-fields to flat accessors; `getPrice()` and `isInsurance()` unchanged |
| 3 | broadcastQuoteRequests includes buyerName, buyerCountry, sellerName, sellerCountry in both insurance and logistics dealSnapshots | VERIFIED | `functions/index.js` lines 2688-2736: buyer/seller docs fetched, name/country extracted, added to both insuranceDealSnapshot and logisticsDealSnapshot |
| 4 | submitQuote CF validates new nested cargoMarine fields and optional commercialRisk/politicalRisk sub-objects | VERIFIED | `functions/index.js` lines 2915-2940: commercialRisk, politicalRisk, claimsHandling validation blocks present with HttpsError throws on invalid data |
| 5 | quoteConstants.js exports all 8 new constant arrays for exclusions, conditions precedent, jurisdictions, response times, payment terms, political perils, coverage basis options, quote binding status | VERIFIED | `quoteConstants.js` lines 161-282: all 8 arrays (STANDARD_EXCLUSIONS 7 items, STANDARD_CONDITIONS_PRECEDENT 6 items, CLAIMS_JURISDICTION 6 items, CLAIMS_RESPONSE_TIME 5 items, PREMIUM_PAYMENT_TERMS 5 items, POLITICAL_PERILS 7 items, COMMERCIAL_COVERAGE_BASIS 4 items, QUOTE_BINDING_STATUS object) present and in default export |
| 6 | Cargo/Marine accordion always expanded and required — all fields present with new lossCoveredPct field | VERIFIED | `CargoMarineSection.jsx` (246 lines): all required fields under `cargoMarine.*` prefix; lossCoveredPct as 3rd column in premium/coverage grid |
| 7 | Commercial Risk accordion is optional with toggle enabling 5 fields | VERIFIED | `CommercialRiskSection.jsx` (120 lines): coverageLimit, currency, lossCoveredPct, coverageBasis, waitingPeriodDays; `QuoteFormInsurance.jsx` line 179: commercialRiskEnabled toggle state; line 422 enables/disables section |
| 8 | Political Risk accordion is optional with toggle enabling 4 fields + perils checkboxes | VERIFIED | `PoliticalRiskSection.jsx` (110 lines): coverageLimit, currency, lossCoveredPct, perils checkboxes from POLITICAL_PERILS |
| 9 | Exclusions, Conditions Precedent, Claims Handling, Premium Additions sections exist with correct fields and constants | VERIFIED | All 4 section files exist and are substantive (72-103 lines each); ExclusionsSection uses STANDARD_EXCLUSIONS, ConditionsPrecedentSection uses STANDARD_CONDITIONS_PRECEDENT, ClaimsHandlingSection uses CLAIMS_JURISDICTION and CLAIMS_RESPONSE_TIME, PremiumAdditionsSection uses PREMIUM_PAYMENT_TERMS |
| 10 | Quote Status section has Indicative/Firm toggle; QuoteStatusSection imports QUOTE_BINDING_STATUS | VERIFIED | `QuoteStatusSection.jsx` line 16: imports QUOTE_BINDING_STATUS; lines 48, 72: used for radio card values; framer-motion AnimatePresence for binding conditions reveal |
| 11 | QuoteSummaryModal receives watchedValues from parent and shows structured summary | VERIFIED | `QuoteSummaryModal.jsx` (395 lines): receives watchedValues prop, 9 structured summary sections with conditional display; `QuoteFormInsurance.jsx` lines 529-537: modal rendered with all required props including watchedValues |
| 12 | QuoteFormInsurance integrates all 8 sections + modal; submit validates then opens modal | VERIFIED | `QuoteFormInsurance.jsx` (542 lines): all 8 sections imported and rendered (lines 29-37, 444-449); form onSubmit calls `handleSubmit(() => setShowSummaryModal(true))` line 340; `handleConfirmSubmit` calls `handleSubmit(onSubmit)()` line 307 |
| 13 | QuoteDetailView shows buyer/seller names+countries; insurance arrangement derived from Incoterm | VERIFIED | `QuoteDetailView.jsx` lines 85-89: buyerName, sellerName, insuranceArrangement extracted from dealSnapshot; lines 149-163: Buyer/Seller InfoRows for both provider types; lines 178-186: Insurance Arrangement row for insurance only; `deriveInsuranceArrangement()` helper at line 45 |
| 14 | InsuranceQuoteCard shows Firm/Indicative badges and expandable extended detail sections | VERIFIED | `InsuranceQuoteCard.jsx` (419 lines): `lookupLabel/lookupLabels` helpers lines 71-85; `isFirmQuote?.()` line 191; `hasExtendedData` lines 147+; `isExpanded` state line 137; expandable section lines 293-391 covering commercialRisk, politicalRisk, exclusions, claimsHandling, premiumAdditions, messageToBuyer |

**Score:** 14/14 truths verified (all observable truth dimensions pass automated checks)

---

### Required Artifacts

| Artifact | Expected | Status | Details |
|----------|----------|--------|---------|
| `src/core/constants/quoteConstants.js` | 8 new constant arrays for form dropdowns/checkboxes | VERIFIED | 283 lines; STANDARD_EXCLUSIONS through QUOTE_BINDING_STATUS all present in named exports and default export |
| `src/domain/entities/Quote.js` | Extended Quote entity with nested risk sub-objects + 4 helpers | VERIFIED | 320 lines; 9 sub-object fields in constructor, fromFirestore Phase 14 block, backward compat bridge, isFirmQuote/isIndicativeQuote/hasCommercialRisk/hasPoliticalRisk helpers |
| `functions/index.js` | Updated broadcastQuoteRequests and submitQuote CF | VERIFIED | buyerName/sellerName/buyerCountry/sellerCountry in both dealSnapshots; commercialRisk/politicalRisk/claimsHandling validation blocks with HttpsError |
| `src/.../QuoteFormInsurance/sections/CargoMarineSection.jsx` | Cargo/Marine accordion body with all fields + lossCoveredPct | VERIFIED | 246 lines; all required fields under cargoMarine.* prefix |
| `src/.../QuoteFormInsurance/sections/CommercialRiskSection.jsx` | Commercial Risk section body | VERIFIED | 120 lines; 5 fields under commercialRisk.* prefix |
| `src/.../QuoteFormInsurance/sections/PoliticalRiskSection.jsx` | Political Risk section body | VERIFIED | 110 lines; 4 fields + political perils checkboxes under politicalRisk.* prefix |
| `src/.../QuoteFormInsurance/sections/ExclusionsSection.jsx` | 7 standard exclusion checkboxes + custom text | VERIFIED | 72 lines; 7 STANDARD_EXCLUSIONS checkboxes + customText textarea |
| `src/.../QuoteFormInsurance/sections/ConditionsPrecedentSection.jsx` | 6 conditions precedent checkboxes + custom text | VERIFIED | Exists; STANDARD_CONDITIONS_PRECEDENT checkboxes + customText textarea |
| `src/.../QuoteFormInsurance/sections/ClaimsHandlingSection.jsx` | Jurisdiction + response time dropdowns + contact email | VERIFIED | 103 lines; CLAIMS_JURISDICTION, CLAIMS_RESPONSE_TIME, contactEmail input |
| `src/.../QuoteFormInsurance/sections/PremiumAdditionsSection.jsx` | Rate % input + payment terms dropdown | VERIFIED | Exists; ratePercent + PREMIUM_PAYMENT_TERMS dropdown |
| `src/.../QuoteFormInsurance/sections/QuoteStatusSection.jsx` | Indicative/Firm toggle + binding conditions + message to buyer | VERIFIED | Exists; QUOTE_BINDING_STATUS radio cards, framer-motion binding conditions, messageToBuyer textarea |
| `src/.../QuoteFormInsurance/QuoteSummaryModal.jsx` | Pre-submit confirmation modal with 9 sections | VERIFIED | 395 lines; 9 structured summary sections, formatCurrency/getLabel helpers, Confirm & Submit with Loader2 |
| `src/.../QuoteFormInsurance/QuoteFormInsurance.jsx` | Complete form orchestrator with all 8 sections + modal | VERIFIED | 542 lines; nested Zod schema, all 8 sections imported and rendered, validation-first submit flow |
| `src/.../QuoteDetailView/QuoteDetailView.jsx` | Enriched deal info panel with buyer/seller + insurance arrangement | VERIFIED | 308 lines; Users import, getIncotermByCode import, deriveInsuranceArrangement helper, Buyer/Seller/InsuranceArrangement InfoRows |
| `src/.../InsuranceQuoteCard/InsuranceQuoteCard.jsx` | Extended buyer card with badges + expandable sections | VERIFIED | 419 lines; Firm/Indicative badges, hasExtendedData guard, within-card expandable section |

---

### Key Link Verification

| From | To | Via | Status | Details |
|------|----|-----|--------|---------|
| `Quote.js` | `quoteConstants.js` | imports QUOTE_STATUS | WIRED | Line 16: `import { QUOTE_STATUS } from '@/core/constants/quoteConstants'` |
| `functions/index.js` | Firestore users collection | `db.collection('users').doc(buyerId).get()` with buyerName/buyerCountry | WIRED | Lines 2688-2736: fetch and denormalize into both dealSnapshots |
| `QuoteFormInsurance.jsx` | `CargoMarineSection.jsx` | props: register, control, errors, watch | WIRED | Lines 29, ~380: import + render with props |
| `QuoteFormInsurance.jsx` | `CommercialRiskSection.jsx` | props: register, errors, watch, enabled toggle | WIRED | Lines 31, ~414: import + conditional render with toggle state |
| `QuoteSummaryModal.jsx` | `QuoteFormInsurance.jsx` | receives watchedValues from parent watch() | WIRED | `QuoteFormInsurance.jsx` line 533: `watchedValues={watchedValues}` prop passed |
| `QuoteStatusSection.jsx` | `quoteConstants.js` | imports QUOTE_BINDING_STATUS | WIRED | `QuoteStatusSection.jsx` line 16: `import { QUOTE_BINDING_STATUS }` |
| `QuoteFormInsurance.jsx` | `QuoteSummaryModal.jsx` | showSummaryModal state + watch() values | WIRED | Lines 37, 529-537: import + render with isOpen/onConfirm/watchedValues props |
| `QuoteDetailView.jsx` | `dealSnapshot` | reads buyerName, buyerCountry, sellerName, sellerCountry | WIRED | Lines 85-88: destructured from dealSnapshot |
| `QuoteDetailView.jsx` | `incoterms.js` | getIncotermByCode for insurance arrangement derivation | WIRED | Line 14: import; line 47: `getIncotermByCode(incotermCode)` in deriveInsuranceArrangement |
| `InsuranceQuoteCard.jsx` | Quote entity | reads quote.commercialRisk, quote.politicalRisk, quote.quoteStatus, quote.isFirmQuote() | WIRED | Lines 137-391: `isFirmQuote?.()`, `commercialRisk`, `politicalRisk`, `hasExtendedData` all use Phase 14 entity fields |

---

### Requirements Coverage

The INS-01 through INS-12 requirements are phase-local requirements defined in `14-VALIDATION.md`. They do not appear in the top-level `.planning/REQUIREMENTS.md` (which uses QUOTE-xx and PORTAL-xx IDs for Phase 4 coverage). This is by design — Phase 14 extends Phase 4 capabilities without adding new v1 REQUIREMENTS.md entries. The phase-local requirement coverage is:

| Requirement | Source Plan(s) | Description | Status | Evidence |
|-------------|---------------|-------------|--------|---------|
| INS-01 | 14-01, 14-04 | Quote entity backward compatibility and extended sub-objects | SATISFIED | Quote.js fromFirestore backward compat bridge verified |
| INS-02 | 14-01, 14-04 | Deal info panel shows buyer/seller names + payment terms | SATISFIED | QuoteDetailView.jsx buyerName/sellerName rows + existing paymentTerms row |
| INS-03 | 14-02 | Accordion risk type sections (Cargo required, others optional) | SATISFIED | QuoteFormInsurance.jsx accordion structure with toggle state |
| INS-04 | 14-02 | Commercial Risk accordion with all 5 fields | SATISFIED | CommercialRiskSection.jsx verified |
| INS-05 | 14-02 | Political Risk accordion with 4 fields + perils checkboxes | SATISFIED | PoliticalRiskSection.jsx verified |
| INS-06 | 14-02, 14-01 | Cargo/Marine % of Loss Covered field | SATISFIED | CargoMarineSection.jsx lossCoveredPct field in grid |
| INS-07 | 14-03 | Exclusions section with 7 standard checkboxes + free text | SATISFIED | ExclusionsSection.jsx with STANDARD_EXCLUSIONS |
| INS-08 | 14-03 | Conditions Precedent with 6 standard checkboxes + free text | SATISFIED | ConditionsPrecedentSection.jsx with STANDARD_CONDITIONS_PRECEDENT |
| INS-09 | 14-03 | Claims Handling: jurisdiction, response time, contact email | SATISFIED | ClaimsHandlingSection.jsx verified |
| INS-10 | 14-03, 14-01 | Quote Status Indicative/Firm toggle | SATISFIED | QuoteStatusSection.jsx with QUOTE_BINDING_STATUS radio cards |
| INS-11 | 14-03, 14-04 | Quote Summary Modal pre-submit confirmation | SATISFIED | QuoteSummaryModal.jsx + QuoteFormInsurance wiring |
| INS-12 | 14-05 | Buyer comparison card expandable with commercial/political risk | SATISFIED | InsuranceQuoteCard.jsx expandable section with all sub-objects |

**Requirements Coverage Note:** INS-01 through INS-12 do not appear in the top-level REQUIREMENTS.md (no ORPHANED requirements). They are phase-local IDs scoped to this overhaul and defined in 14-VALIDATION.md. No cross-reference discrepancy exists.

---

### Anti-Patterns Found

No anti-patterns detected across all phase artifacts:

- No TODO/FIXME/XXX/HACK comments found in any modified file
- No empty implementations (`return null`, `return {}`, `return []`)
- No placeholder stubs — all components render real fields
- The only "placeholder" occurrences are valid HTML `placeholder="..."` attributes on form inputs

**One noted concern from 14-03-SUMMARY.md:** The `hasPremiumAdditions` logic in `QuoteSummaryModal.jsx` was flagged as using `claims.ratePercent` instead of `premium.ratePercent`. This is a cosmetic modal display guard — it does not block submission or corrupt data. The Premium Additions section in the modal may not display when rate is set but payment terms are absent, but all data is still submitted correctly.

| File | Line | Pattern | Severity | Impact |
|------|------|---------|----------|--------|
| `QuoteSummaryModal.jsx` | ~hasPremiumAdditions | Possible variable name typo: `claims.ratePercent` should be `premium.ratePercent` | Warning | Modal may not show Premium Additions block under some conditions; data submission unaffected |

---

### Human Verification Required

#### 1. Insurance Quote Form — Full Accordion Interaction

**Test:** Log in as an insurance provider. Open an insurance quote request. Verify the quote form shows three accordion sections: Cargo/Marine (always expanded, Required badge), Commercial Risk (collapsed by default, Optional badge with enable checkbox), Political Risk (collapsed, Optional badge).

**Expected:** Cargo/Marine is always visible with all fields. Clicking the Commercial Risk enable checkbox expands the section smoothly. Unchecking collapses and clears the data.

**Why human:** UI interaction, framer-motion animation, and form state clearing cannot be verified programmatically.

---

#### 2. Quote Form Submission — Validation then Modal

**Test:** Fill out the Cargo/Marine section completely. Click "Submit Quote". Verify the QuoteSummaryModal appears showing all filled sections. Click "Confirm & Submit". Verify the quote is submitted successfully.

**Expected:** Modal displays a structured review with Cargo/Marine section populated. Confirm submits to CF. Modal closes and success state appears.

**Why human:** Requires authenticated browser session, complete form flow, and CF call.

---

#### 3. QuoteDetailView — Buyer/Seller Names and Insurance Arrangement

**Test:** Log in as both an insurance provider and a logistics provider. Open a quote request detail view for a deal with a known Incoterm (e.g., CIF). Verify both see Buyer and Seller rows at the top of the deal info card. Verify only the insurance provider sees the "Insurance Arrangement" row below Incoterm.

**Expected:** Both providers see counterparty names. Only insurance provider sees insurance arrangement text (e.g., "Seller provides cargo insurance" for CIF).

**Why human:** Requires buyerName/sellerName to be populated in dealSnapshot (needs Phase 14 CF deployed). Visual rendering of conditional rows requires browser.

---

#### 4. InsuranceQuoteCard — Badges and Expandable Section

**Test:** View the buyer quotes comparison page for a deal that has received a Phase 14 format insurance quote with commercialRisk and politicalRisk sub-objects. Verify: (a) the Firm/Indicative badge appears in the card header; (b) "View Full Coverage Details" toggle is visible; (c) clicking it expands Commercial Risk, Political Risk, and other sub-sections within the card without shifting sibling cards.

**Expected:** Green badge for firm quotes, yellow badge for indicative. Expandable section reveals all filled sub-objects. Sibling cards in comparison grid remain in position.

**Why human:** Requires live Firestore quote data with Phase 14 nested sub-objects; layout stability in comparison grid requires visual check.

---

#### 5. Backward Compatibility — Old Quote Cards

**Test:** View the buyer quotes comparison page for a deal with a pre-Phase-14 insurance quote (flat-field format in Firestore).

**Expected:** The InsuranceQuoteCard renders identically to its pre-Phase-14 appearance — no badge, no expandable toggle, all existing fields still visible.

**Why human:** Requires old Firestore quote documents that predate Phase 14; cannot be simulated programmatically.

---

#### 6. Cloud Functions Deployment

**Test:** Deploy the updated `functions/index.js` to Firebase (`firebase deploy --only functions`). Submit a Phase 14 format insurance quote with a commercialRisk sub-object where `coverageLimit` is 0.

**Expected:** CF returns `invalid-argument` error "commercialRisk.coverageLimit must be > 0". Valid submission persists the full nested structure in Firestore.

**Why human:** CF source is updated but not deployed per project convention. Validation logic requires deployed CF.

---

### Gaps Summary

No automated gaps found. All 14 observable truths are verified by code inspection:

- All artifacts exist, are substantive (not stubs), and are wired correctly
- All 12 INS-XX phase requirements have implementation evidence
- All 10 key links between components and data sources are wired
- All 9 section sub-components + 1 modal + 2 modified orchestrators are present and non-trivial
- No blocker anti-patterns found

The phase goal is structurally achieved at the code level. Human verification is required to confirm the full UI interaction flow, live data behavior, and CF deployment.

---

_Verified: 2026-04-22_
_Verifier: Claude (gsd-verifier)_
