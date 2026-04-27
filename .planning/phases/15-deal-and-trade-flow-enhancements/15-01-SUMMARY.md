---
phase: 15-deal-and-trade-flow-enhancements
plan: "01"
subsystem: contract-approval-ux
tags:
  - contract
  - clause-review
  - ux
  - progress-indicator
  - auto-advance
dependency_graph:
  requires: []
  provides:
    - always-visible-clause-rows
    - yellow-green-clause-visual-states
    - clause-progress-bar-top-and-sticky-bottom
    - auto-advance-toast-on-full-approval
  affects:
    - ClauseAccordion
    - ContractPage
    - useContractActions
    - contract-page-route
tech_stack:
  added: []
  patterns:
    - sticky bottom bar with z-10 for approve action proximity
    - prevDealStatusRef transition detection for real-time status watch
    - lucide-react Check inline with clause label for accepted state
    - always-expanded accordion pattern (no toggle, always rendered)
key_files:
  created: []
  modified:
    - src/presentation/components/features/contract/ClauseAccordion/ClauseAccordion.jsx
    - src/presentation/components/features/contract/ContractPage/ContractPage.jsx
    - src/presentation/hooks/contract/useContractActions.js
    - src/app/(main)/deals/[dealId]/contract/page.jsx
decisions:
  - hasExpanded initialized to all section IDs in a separate useEffect keyed on contract — cleanly decoupled from the approval sync effect
  - Submit button moved inside sticky bottom bar alongside progress bar — single action zone near viewport bottom
  - Auto-advance toast uses prevDealStatusRef (not initial load guard) — fires only on live transition, not when user arrives on an already-approved contract
  - isReadOnly now includes isFullyApproved in ContractPage — consistent read-only treatment for both submitted and fully-approved states
  - toggleSection and expandedSections fully removed from useContractActions — dead code elimination; no accordion state needed
metrics:
  duration: "5 minutes"
  completed_date: "2026-04-26"
  tasks_completed: 2
  files_modified: 4
---

# Phase 15 Plan 01: Contract Approval UX Overhaul Summary

Always-expanded clause rows with yellow/green visual states, dual ClauseProgressBar (top + sticky bottom), and auto-advance toast on full dual-party approval.

## What Was Built

### Task 1: Always-expanded clause rows with yellow/green visual states

**ClauseAccordion.jsx** — removed accordion toggle entirely. All clause content is always rendered (no `maxHeight: 0px` conditional, no chevron icon, no `onSectionToggle` prop). Section header is a plain `<div>` instead of a `<button>`.

Each `ClauseRow` now has two visual states:
- **Unaccepted**: `bg-yellow-900/15 border-l-2 border-yellow-500/50` with `<p className="text-xs text-yellow-500/80 mt-1">Please review and accept this clause</p>`
- **Accepted**: `bg-green-900/10 border-l-2 border-green-500/40` with inline `<Check size={14} className="text-green-400">` before the clause title and `text-[#8899AA]` muted title text

**useContractActions.js** — added a new `useEffect` keyed on `contract` that extracts all unique `clause.section` values and sets `hasExpanded` to that full set. This ensures all checkboxes are immediately active without requiring any user interaction. Removed `expandedSections`, `toggleSection`, and `isCheckboxActive` — dead code with no callers after the accordion was removed.

**ContractPage.jsx** — removed `onSectionToggle`, `isExpanded` props from `ClauseAccordion` calls. Added `isFullyApproved` to the `isReadOnly` condition.

### Task 2: Dual progress indicator and auto-advance with toast

**ContractPage.jsx** — added inline `ClauseProgressBar` component:
- Props: `approved` (number), `total` (number)
- Layout: left-aligned "X of Y clauses accepted" label, right-aligned gold percentage
- Bar: `h-1.5 bg-[#2A3B52] rounded-full` container, `bg-[#FFD700] rounded-full transition-all` fill with inline `style={{ width: pct% }}`

Rendered in two locations:
1. **Top**: `bg-[#1A283B] border border-[#2A3B52] rounded-xl px-4 py-3` card above clause sections (hidden when `isFullyApproved`)
2. **Bottom sticky**: `sticky bottom-4 z-10` outer wrapper, `bg-[#1A283B] border border-[#2A3B52] rounded-xl p-3 shadow-lg shadow-black/40` container with progress bar above the `SubmitApprovalsButton` (hidden once submitted or fully approved)

**contract/page.jsx** — added `prevDealStatusRef` initialized to `null`. A `useEffect` keyed on `deal` compares `prevDealStatusRef.current` vs `deal.status`. When it detects a transition from a non-`CONTRACT_APPROVED` status to `CONTRACT_APPROVED`, it fires `toast.success('Contract approved! Moving to provider quotes...')` and sets a 1.5s timeout to `router.push('/deals/${dealId}/quotes')`. The ref is updated to the current status at the end of each effect run.

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

- [x] `ClauseAccordion.jsx` exists and contains `bg-yellow-900`
- [x] `ContractPage.jsx` contains `ClauseProgressBar`
- [x] `useContractActions.js` contains `hasExpanded` initialized from `contract.clauses`
- [x] Build passes without errors
- [x] Task 1 commit: af80613
- [x] Task 2 commit: de1443f
