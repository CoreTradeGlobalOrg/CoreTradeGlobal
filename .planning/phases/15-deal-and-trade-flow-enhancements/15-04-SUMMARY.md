---
phase: 15-deal-and-trade-flow-enhancements
plan: "04"
subsystem: ui
tags: [react, deal-form, date-picker, form-ux, zod-validation]

# Dependency graph
requires:
  - phase: 15-deal-and-trade-flow-enhancements
    provides: Deal page, deal forms, counter-offer forms, insurance/logistics quote forms

provides:
  - Deal ID breadcrumb in ProductHero (first 8 chars, uppercase)
  - PDF download link slot in ProductHero (renders when productPdfUrl field exists)
  - DatePicker gold accent color entry in ACCENT_MAP
  - onFocus auto-select on all ~24 number inputs across 10 deal/trade/quote files
  - Confirmed Zod validation messages are all in English

affects:
  - 16-product-and-rfq-features
  - Any future deal form additions (maintain onFocus pattern on number inputs)

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "onFocus={e => e.target.select()} placed AFTER {...register()} spread on number inputs"
    - "gold DatePicker accent (FFD700 palette) for deal-context date fields; blue for RFQ-context"
    - "shortDealId = deal.id.slice(0, 8).toUpperCase() for compact deal identifiers"

key-files:
  created: []
  modified:
    - src/presentation/components/features/deal/ProductHero/ProductHero.jsx
    - src/presentation/components/common/DatePicker/DatePicker.jsx
    - src/presentation/components/features/deal/DealForm/DealFormFields.jsx
    - src/presentation/components/features/deal/DealForm/DealFormSidebar.jsx
    - src/presentation/components/features/deal/CounterOfferForm/CounterOfferForm.jsx
    - src/presentation/components/features/deal/DealSidebar/FreightEstimatorWidget.jsx
    - src/presentation/components/features/provider/QuoteFormLogistics/QuoteFormLogistics.jsx
    - src/presentation/components/features/provider/QuoteFormInsurance/sections/CargoMarineSection.jsx
    - src/presentation/components/features/provider/QuoteFormInsurance/sections/CommercialRiskSection.jsx
    - src/presentation/components/features/provider/QuoteFormInsurance/sections/PremiumAdditionsSection.jsx
    - src/presentation/components/features/provider/QuoteFormInsurance/sections/PoliticalRiskSection.jsx
    - src/presentation/components/features/request/SubmitQuoteDialog/SubmitQuoteDialog.jsx

key-decisions:
  - "No PDF URL field exists on deal documents — productPdfUrl not denormalized in createDeal CF (only productName, productImage, productCategory are). PDF link renders nothing; documented for future addition if needed."
  - "gold DatePicker variant uses FFD700 text on FFD700 bg for selected day — text color set to #0F1C2E (dark) for contrast, matching platform convention for gold CTA elements."
  - "onFocus handler placed after register() spread so it is not silently overridden by RHF's event bindings."

patterns-established:
  - "All new number inputs in deal/trade forms must include onFocus={e => e.target.select()}"
  - "Deal-context DatePickers use accentColor='gold'; RFQ/logistics DatePickers keep accentColor='green'; RFQ response forms keep accentColor='blue'"

requirements-completed:
  - DEAL-14
  - DEAL-15
  - DEAL-16
  - DEAL-17
  - DEAL-18

# Metrics
duration: 12min
completed: 2026-04-26
---

# Phase 15 Plan 04: Form Input Polish Sweep Summary

**Deal ID breadcrumb (#XXXXXXXX) in ProductHero, gold DatePicker accent on deal forms, and onFocus auto-select on all 24 number inputs across 10 deal/trade/quote files**

## Performance

- **Duration:** ~12 min
- **Started:** 2026-04-26T21:10:00Z
- **Completed:** 2026-04-26T21:22:00Z
- **Tasks:** 2 of 2
- **Files modified:** 12

## Accomplishments

- ProductHero now shows the Deal ID as "Deal #XXXXXXXX" (8-char truncated uppercase) above the product category badge
- DatePicker gains a `gold` accent entry in ACCENT_MAP; deal form date pickers switched from default blue to gold
- All 24 number inputs across 10 form files auto-select their content on focus, enabling fast overwrite without manual triple-click
- Zod validation audit confirmed: all messages in offerSchema.js, submitQuoteSchema.js, and logisticsQuoteSchema are in English with friendly phrasing

## Task Commits

1. **Task 1: Deal ID breadcrumb, PDF download, and DatePicker gold accent** - `126e712` (feat)
2. **Task 2: Number input onFocus auto-select and Zod validation audit** - `e55f784` (feat)

**Plan metadata:** (docs commit below)

## Files Created/Modified

- `src/presentation/components/features/deal/ProductHero/ProductHero.jsx` - Added shortDealId breadcrumb and conditional PDF download link slot
- `src/presentation/components/common/DatePicker/DatePicker.jsx` - Added `gold` entry to ACCENT_MAP with FFD700 palette; updated JSDoc
- `src/presentation/components/features/deal/DealForm/DealFormFields.jsx` - accentColor='gold' on DeliveryDeadline; onFocus on price, conversionRate, quantity
- `src/presentation/components/features/deal/DealForm/DealFormSidebar.jsx` - onFocus on expiryHours
- `src/presentation/components/features/deal/CounterOfferForm/CounterOfferForm.jsx` - accentColor='gold' on DeliveryDeadline; onFocus on price, quantity, expiryHours
- `src/presentation/components/features/deal/DealSidebar/FreightEstimatorWidget.jsx` - onFocus on weight and all 3 dimension inputs
- `src/presentation/components/features/provider/QuoteFormLogistics/QuoteFormLogistics.jsx` - onFocus on freightCost, estimatedTransitDays
- `src/presentation/components/features/provider/QuoteFormInsurance/sections/CargoMarineSection.jsx` - onFocus on 5 inputs
- `src/presentation/components/features/provider/QuoteFormInsurance/sections/CommercialRiskSection.jsx` - onFocus on 3 inputs
- `src/presentation/components/features/provider/QuoteFormInsurance/sections/PremiumAdditionsSection.jsx` - onFocus on ratePercent
- `src/presentation/components/features/provider/QuoteFormInsurance/sections/PoliticalRiskSection.jsx` - onFocus on 2 inputs
- `src/presentation/components/features/request/SubmitQuoteDialog/SubmitQuoteDialog.jsx` - onFocus on unitPrice, moq

## Decisions Made

- No PDF URL field exists on deal documents. The Cloud Function `createDeal` denormalizes only `productName`, `productImage`, and `productCategory` — no PDF URL. The PDF download link renders conditionally (`pdfUrl && ...`) and produces no output with current data. Future implementation would add `productPdfUrl` denormalization in the CF.
- Gold DatePicker accent uses `text-[#0F1C2E]` for selected day text (dark on gold background) — consistent with platform convention for gold CTA elements requiring black text for contrast.
- `onFocus` placed after `{...register()}` spread so react-hook-form's synthetic event handler is not replaced.

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — no external service configuration required.

## Next Phase Readiness

- All deal/trade form UX polish from Plan 04 is complete
- Phase 15 Plans 01–04 provide a polished deal flow ready for Phase 16 product/RFQ features
- Future: If PDF URLs are added to the product catalog, they would need denormalization in `createDeal` CF to appear in ProductHero

---
*Phase: 15-deal-and-trade-flow-enhancements*
*Completed: 2026-04-26*
