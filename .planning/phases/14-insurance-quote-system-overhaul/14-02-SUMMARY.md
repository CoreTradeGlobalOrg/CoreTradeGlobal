---
phase: 14-insurance-quote-system-overhaul
plan: 02
subsystem: ui
tags: [insurance, quote, form, accordion, react-hook-form, zod, framer-motion]

# Dependency graph
requires:
  - phase: 14-insurance-quote-system-overhaul
    plan: 01
    provides: "quoteConstants (POLITICAL_PERILS, COMMERCIAL_COVERAGE_BASIS, etc.), Quote entity nested sub-objects"

provides:
  - "CargoMarineSection sub-component: all cargo/marine fields under cargoMarine.* prefix + new lossCoveredPct field"
  - "CommercialRiskSection sub-component: 5 fields under commercialRisk.* prefix"
  - "PoliticalRiskSection sub-component: 4 fields + political perils checkboxes under politicalRisk.* prefix"
  - "QuoteFormInsurance rewritten as accordion orchestrator with single useForm, nested Zod schema, framer-motion animations"
  - "Accordion toggle state clears form data via setValue(undefined) when optional sections disabled"
  - "Edit mode backward compat: reads from cargoMarine.* nested or falls back to old flat-field quotes"

affects:
  - 14-03-insurance-quote-card
  - 14-04-deal-info-panel

# Tech tracking
tech-stack:
  added: []
  patterns:
    - "Accordion form pattern: parent owns single useForm, passes register/control/errors/watch to section sub-components"
    - "Optional section toggle: useState for enabled, setValue(field, undefined) on disable to clear form state"
    - "Backward compat defaultValues: new?.nested || old?.flat || default — handles both old flat-field and new nested quote docs"
    - "framer-motion AnimatePresence + motion.div with height:auto animation for accordion expand/collapse"

key-files:
  created:
    - src/presentation/components/features/provider/QuoteFormInsurance/sections/CargoMarineSection.jsx
    - src/presentation/components/features/provider/QuoteFormInsurance/sections/CommercialRiskSection.jsx
    - src/presentation/components/features/provider/QuoteFormInsurance/sections/PoliticalRiskSection.jsx
  modified:
    - src/presentation/components/features/provider/QuoteFormInsurance/QuoteFormInsurance.jsx

key-decisions:
  - "[14-02]: lossCoveredPct placed as 3rd column in Premium/Coverage row (grid-cols-3) rather than Deductible row — keeps financially related fields together"
  - "[14-02]: Cargo/Marine accordion is always rendered open without toggle — no AnimatePresence needed, body renders statically for required section"
  - "[14-02]: normalizeDate() helper for edit mode date fields — handles Date objects, ISO strings, and undefined uniformly"
  - "[14-02]: CommercialRiskSection/PoliticalRiskSection currency selects include empty placeholder option — required fields need explicit selection for new quotes (no defaulted value)"

# Metrics
duration: 3min
completed: 2026-04-26
---

# Phase 14 Plan 02: Insurance Quote Form — Accordion Restructure Summary

**Three risk-type accordion sections (Cargo/Marine always-open + Commercial/Political optional toggles) with single shared useForm, nested Zod schema, and framer-motion expand/collapse animations**

## Performance

- **Duration:** ~3 minutes
- **Started:** 2026-04-26T19:04:14Z
- **Completed:** 2026-04-26T19:06:44Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments

- Created `sections/` directory under QuoteFormInsurance with 3 sub-components:
  - `CargoMarineSection.jsx` — all existing cargo/marine fields reorganized under `cargoMarine.*` prefix, plus new `lossCoveredPct` field (70-110%, default 100) in a 3-column grid alongside premium and coverage amount
  - `CommercialRiskSection.jsx` — `coverageLimit`, `currency`, `lossCoveredPct`, `coverageBasis`, `waitingPeriodDays` under `commercialRisk.*` prefix
  - `PoliticalRiskSection.jsx` — `coverageLimit`, `currency`, `lossCoveredPct`, `perils` checkbox list under `politicalRisk.*` prefix
- Rewrote `QuoteFormInsurance.jsx` as an accordion orchestrator:
  - Replaced flat Zod schema with nested schema: `cargoMarine` (required), `commercialRisk` (optional), `politicalRisk` (optional), shared `currency/validityHours/notes`
  - Added `commercialRiskEnabled` / `politicalRiskEnabled` useState toggles
  - Disabling a toggle calls `setValue('commercialRisk', undefined)` / `setValue('politicalRisk', undefined)` to clear form state
  - Accordion headers use Shield/AlertTriangle icons, Required/Optional badges, Enable checkboxes for optional sections
  - `AnimatePresence` + `motion.div` with height-auto animation for smooth expand/collapse
  - Edit mode defaultValues read from `existingQuote.cargoMarine?.field || existingQuote.field` for backward compat with old flat-field quotes
  - `normalizeDate()` helper for consistent Date/string/undefined handling

## Task Commits

Each task was committed atomically:

1. **Task 1: Create 3 risk type section sub-components** - `a7d0977` (feat)
2. **Task 2: Rewrite QuoteFormInsurance orchestrator with nested Zod schema and accordion layout** - `c43378e` (feat)

**Plan metadata:** See final docs commit (docs)

## Files Created/Modified

- `src/presentation/components/features/provider/QuoteFormInsurance/sections/CargoMarineSection.jsx` - Created; cargo/marine fields under `cargoMarine.*` prefix, lossCoveredPct new field
- `src/presentation/components/features/provider/QuoteFormInsurance/sections/CommercialRiskSection.jsx` - Created; 5 commercial risk fields
- `src/presentation/components/features/provider/QuoteFormInsurance/sections/PoliticalRiskSection.jsx` - Created; 4 political risk fields + perils checkboxes
- `src/presentation/components/features/provider/QuoteFormInsurance/QuoteFormInsurance.jsx` - Rewritten; accordion orchestrator with nested schema, framer-motion

## Decisions Made

- `lossCoveredPct` placed as 3rd column in Premium/Coverage row (grid-cols-3) — keeps financially related fields together rather than splitting into Deductible row
- Cargo/Marine accordion has no AnimatePresence — always rendered open for required section; no performance cost for always-visible content
- `normalizeDate()` helper centralizes Date object / ISO string / undefined normalization for edit mode date fields
- CommercialRiskSection/PoliticalRiskSection currency selects include empty placeholder option — required dropdown fields need explicit user selection with no valid default

## Deviations from Plan

None — plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None — UI changes only, no Cloud Function deployments, no environment variable changes required.

## Next Phase Readiness

- Plan 03 (shared sections: exclusions, conditions precedent, claims handling, premium additions, quote status) can now extend the existing nested Zod schema and add sections below the Political Risk accordion
- Plan 03 must add `exclusions`, `conditionsPrecedent`, `claimsHandling`, `premiumAdditions`, and `quoteStatus` to the insuranceQuoteSchema
- Plan 14-03 (insurance quote card) can now read `quote.cargoMarine`, `quote.commercialRisk`, `quote.politicalRisk` from the submitted form data

---
*Phase: 14-insurance-quote-system-overhaul*
*Completed: 2026-04-26*

## Self-Check: PASSED

- FOUND: CargoMarineSection.jsx
- FOUND: CommercialRiskSection.jsx
- FOUND: PoliticalRiskSection.jsx
- FOUND: QuoteFormInsurance.jsx
- FOUND: 14-02-SUMMARY.md
- FOUND: commit a7d0977 (Task 1)
- FOUND: commit c43378e (Task 2)
