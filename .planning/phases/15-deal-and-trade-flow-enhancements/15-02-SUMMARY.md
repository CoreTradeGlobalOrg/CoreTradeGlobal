---
phase: 15-deal-and-trade-flow-enhancements
plan: "02"
subsystem: legal-ui
tags: [legal-banner, tooltip, ux, trade-pages]
dependency_graph:
  requires: ["15-01", "15-03"]
  provides: [legal-banner-collapsed-state, tooltip-component, legal-banner-all-pages]
  affects: [DealPage, ContractPage, QuotesPage, TradeSummaryTab, DealSidebar]
tech_stack:
  added: []
  patterns: [local-state-dismiss, hover-click-tooltip, per-page-reset]
key_files:
  created:
    - src/presentation/components/common/Tooltip/Tooltip.jsx
  modified:
    - src/presentation/components/features/legal/LegalBanner/LegalBanner.jsx
    - src/presentation/components/features/contract/ContractPage/ContractPage.jsx
    - src/presentation/components/features/quote/QuotesPage/QuotesPage.jsx
    - src/presentation/components/features/quote/QuotesPage/QuoteGrid.jsx
    - src/presentation/components/features/deal/TradeSummary/TradeSummaryTab.jsx
    - src/presentation/components/features/deal/DealSidebar/DealSidebar.jsx
decisions:
  - "[15-02]: LegalBanner uses local useState(false) only — no localStorage; each page mount resets dismissed to false automatically via new component instance"
  - "[15-02]: CollapsedBanner is a full-width button element with border-l-4 amber accent — preserves click semantics for re-expansion without adding complexity"
  - "[15-02]: Tooltip uses onMouseEnter/onMouseLeave for desktop hover and onClick toggle for mobile; pointer-events-none on popup prevents accidental mouse-leave flicker"
  - "[15-02]: LegalBanner added to QuotesPage component (not the route file) to stay co-located with quote layout; currentUserUid already available as prop"
  - "[15-02]: Trade Summary heading extracted from PDF Export row into a flex row with Tooltip; PDF button moved to same row preserving layout"
metrics:
  duration: "5 min"
  completed_date: "2026-04-26"
  tasks_completed: 2
  files_modified: 7
---

# Phase 15 Plan 02: LegalBanner Overhaul and Tooltip Component Summary

**One-liner:** Per-page dismiss with slim gold collapsed banner on all 4 trade stages, plus a reusable hover/click Tooltip component with placements on Incoterms, contract clauses, quote sections, and trade summary.

## Tasks Completed

| Task | Name | Commit | Key Files |
|------|------|--------|-----------|
| 1 | LegalBanner per-page dismiss with slim collapsed banner | fee0c0d | LegalBanner.jsx |
| 2 | Tooltip component + LegalBanner on all trade pages + tooltip placements | 5eced77 | Tooltip.jsx, ContractPage.jsx, QuotesPage.jsx, QuoteGrid.jsx, TradeSummaryTab.jsx, DealSidebar.jsx |

## What Was Built

### Task 1: LegalBanner Rewrite

Removed all localStorage logic (DISMISS_KEY constant, useEffect that read from localStorage on mount, localStorage.setItem in handleDismiss). Replaced with:

- `const [dismissed, setDismissed] = useState(false)` — local state only
- New `CollapsedBanner` sub-component: full-width `<button>` with `border-l-4 border-amber-500/60 bg-amber-900/10` styling, Scale icon, "Need legal advice?" muted text, "Hire a Lawyer" gold text, onClick calls `setDismissed(false)` to re-expand
- `PromotionalBanner` "No thanks" button now calls `setDismissed(true)` directly
- Each page navigation creates a new component instance, auto-resetting `dismissed = false`
- EngagementBadge logic unchanged

### Task 2: Tooltip + Multi-page Integration

**Tooltip component** (`src/presentation/components/common/Tooltip/Tooltip.jsx`):
- Props: `content` (string or JSX), `children` (defaults to `<Info size={13} />`)
- `onMouseEnter` opens, `onMouseLeave` closes, `onClick` toggles (mobile support)
- Popup: absolute-positioned above trigger, `w-56 bg-[#1A283B] border border-[#2A3B52] rounded-lg p-2.5 text-xs text-[#8899AA] shadow-xl`
- SVG caret pointing down toward trigger
- `pointer-events-none` on popup prevents accidental close on hover transition

**LegalBanner placements:**
- ContractPage: after WaitingBanner, before main content
- QuotesPage: below the two-column quote grid (via QuotesPage.jsx)
- TradeSummaryTab: after LegalConsultingSection

**Tooltip placements:**
- DealSidebar: next to "Incoterm" label — Incoterms explainer
- ContractPage: "Contract Clauses" heading added above clause list with Tooltip
- QuoteGrid: next to Insurance Quotes / Logistics Quotes section headers
- TradeSummaryTab: "Trade Summary" heading row with Tooltip (replaces standalone PDF export row)

## Deviations from Plan

None — plan executed exactly as written.

## Verification

- Build passes (`npx next build` — no errors)
- LegalBanner on all 4 trade pages: DealPage (pre-existing), ContractPage (added), QuotesPage (added), TradeSummaryTab (added)
- Dismissing LegalBanner shows slim gold CollapsedBanner (not null)
- Clicking slim banner calls setDismissed(false) re-expanding full card
- Page navigation resets banner to full card (new component instance, useState resets)
- Tooltip renders on hover/click with explanatory content on all 4 placements
- When lawyer is hired, EngagementBadge shows instead of promotional card (unchanged)

## Self-Check: PASSED

- Tooltip.jsx: FOUND
- LegalBanner.jsx: FOUND
- 15-02-SUMMARY.md: FOUND
- Commit fee0c0d: FOUND
- Commit 5eced77: FOUND
