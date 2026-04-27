---
phase: 14-insurance-quote-system-overhaul
plan: 04
subsystem: ui
tags: [insurance, quote, form, accordion, react-hook-form, zod, modal, incoterms]

# Dependency graph
requires:
  - phase: 14-insurance-quote-system-overhaul
    plan: 02
    provides: "QuoteFormInsurance accordion orchestrator with 3 risk-type sections and nested Zod schema"
  - phase: 14-insurance-quote-system-overhaul
    plan: 03
    provides: "5 shared section sub-components (Exclusions, ConditionsPrecedent, ClaimsHandling, PremiumAdditions, QuoteStatus) and QuoteSummaryModal"
  - phase: 14-insurance-quote-system-overhaul
    plan: 01
    provides: "dealSnapshot.buyerName/buyerCountry/sellerName/sellerCountry on both insurance and logistics snapshots"

provides:
  - "QuoteFormInsurance: complete form with all 8 sections (3 risk + 5 shared) plus QuoteSummaryModal integration"
  - "Submit button validates form then shows summary modal; Confirm in modal triggers actual CF submission"
  - "QuoteDetailView: enriched deal info panel showing buyer/seller names+countries for both provider types"
  - "Insurance Arrangement row derived from Incoterm insuranceDefault field (insurance providers only)"
  - "Payment Terms displayed as-is from dealSnapshot (satisfies INS-02)"
  - "Logistics providers confirmed to still NOT see deal price (isInsurance guard intact)"

affects:
  - 14-05-insurance-quote-card-display

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Modal-gated submit: form onSubmit calls handleSubmit(() => setShowSummaryModal(true)) for validation-first UX; actual submission in handleConfirmSubmit via handleSubmit(onSubmit)()"
    - "Full-chain watch(): parent calls const watchedValues = watch() at orchestrator level and passes to modal as prop"
    - "deriveInsuranceArrangement(): pure helper that maps getIncotermByCode(code).insuranceDefault to display label"

key-files:
  created: []
  modified:
    - src/presentation/components/features/provider/QuoteFormInsurance/QuoteFormInsurance.jsx
    - src/presentation/components/features/provider/QuoteDetailView/QuoteDetailView.jsx

key-decisions:
  - "[14-04]: Submit button validates then shows modal (not direct submit) — provider reviews full quote before CF call; handleConfirmSubmit wraps handleSubmit(onSubmit)() for reuse of the same onSubmit function"
  - "[14-04]: watchedValues = watch() at orchestrator level — single watch() call, passed as prop to modal; avoids redundant subscriptions"
  - "[14-04]: Buyer/Seller InfoRow placed at TOP of deal fields (before Quantity) — counterparty identity is primary context for provider; plan spec explicitly requires this ordering"
  - "[14-04]: Insurance Arrangement placed after Incoterm row — directly contextualizes the Incoterm entry above it"

patterns-established:
  - "Validation-first modal submit: form.onSubmit triggers validation via handleSubmit callback that sets modal state; modal confirm triggers actual async action — clean separation of validation and side effects"

requirements-completed: [INS-01, INS-02, INS-11]

# Metrics
duration: 2min
completed: 2026-04-22
---

# Phase 14 Plan 04: Insurance Quote Form Integration and QuoteDetailView Enrichment Summary

**Full insurance quote form with all 8 sections + pre-submit summary modal, plus enriched QuoteDetailView showing buyer/seller counterparty identity and Incoterm-derived insurance arrangement for both provider types**

## Performance

- **Duration:** ~2 minutes
- **Started:** 2026-04-22T19:08:45Z
- **Completed:** 2026-04-22T19:10:40Z
- **Tasks:** 2
- **Files modified:** 2

## Accomplishments

- Extended QuoteFormInsurance Zod schema with 5 new nested sections: `exclusions`, `conditionsPrecedent`, `claimsHandling`, `premiumAdditions`, `quoteStatus`; added defaultValues for all 5 in both new-quote and edit-mode paths
- Wired all 5 shared section sub-components (from Plan 03) into the QuoteFormInsurance layout after the 3 risk-type accordions
- Replaced direct form submit with a validation-first flow: submit button calls `handleSubmit(() => setShowSummaryModal(true))`, the modal's Confirm button triggers `handleConfirmSubmit` which calls `handleSubmit(onSubmit)()`
- Added `QuoteSummaryModal` render with all required props (`isOpen`, `onClose`, `onConfirm`, `watchedValues`, `isLoading`, `commercialRiskEnabled`, `politicalRiskEnabled`)
- Enriched QuoteDetailView with `deriveInsuranceArrangement()` helper using `getIncotermByCode()` from incoterms.js, buyer/seller InfoRow entries (both provider types), and Insurance Arrangement row (insurance only)
- Confirmed logistics provider price guard (`isInsurance && pricePerUnit != null`) untouched — no price leak

## Task Commits

Each task was committed atomically:

1. **Task 1: Integrate shared sections and summary modal into QuoteFormInsurance** - `7d7ea98` (feat)
2. **Task 2: Enrich QuoteDetailView deal info panel with buyer/seller names, insurance arrangement, and payment terms** - `e9f7cbd` (feat)

**Plan metadata:** See final docs commit (docs)

## Files Created/Modified

- `src/presentation/components/features/provider/QuoteFormInsurance/QuoteFormInsurance.jsx` - Extended Zod schema with 5 shared sections, imported and rendered all section sub-components and modal, modal-gated submit flow, watchedValues passed to modal
- `src/presentation/components/features/provider/QuoteDetailView/QuoteDetailView.jsx` - Added Users import, getIncotermByCode import, deriveInsuranceArrangement() helper, buyer/seller/insuranceArrangement extractions, and 3 new InfoRow entries

## Decisions Made

- Submit button validates then shows modal — provider reviews the full quote summary before committing to the Cloud Function call; `handleConfirmSubmit` reuses the existing `onSubmit` function via `handleSubmit(onSubmit)()`
- `watchedValues = watch()` called once at orchestrator level and passed as prop to `QuoteSummaryModal` — avoids a second `watch()` subscription inside the modal
- Buyer/Seller rows placed at the TOP of the deal fields block (before Quantity) — counterparty identity is the primary context a provider needs when pricing a quote
- Insurance Arrangement row placed immediately after the Incoterm row — directly contextualizes the Incoterm entry it derives from

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — UI-only changes, no Cloud Function deployments or environment variable changes required.

## Next Phase Readiness

- Insurance quote form is fully functional: 3 risk-type accordions + 5 shared sections + summary modal + currency/validity/notes
- QuoteDetailView deal info panel is complete: buyer/seller names+countries for both provider types, insurance arrangement for insurance providers
- All INS-01, INS-02, INS-11 requirements satisfied
- Phase 14 provider-side overhaul is complete; any remaining work is consumer-side (QuoteCard display) if needed

---
*Phase: 14-insurance-quote-system-overhaul*
*Completed: 2026-04-22*

## Self-Check: PASSED

- FOUND: QuoteFormInsurance.jsx
- FOUND: QuoteDetailView.jsx
- FOUND: 14-04-SUMMARY.md
- FOUND: commit 7d7ea98 (Task 1)
- FOUND: commit e9f7cbd (Task 2)
