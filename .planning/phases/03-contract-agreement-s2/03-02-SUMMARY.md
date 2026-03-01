---
phase: 03-contract-agreement-s2
plan: "02"
subsystem: presentation
tags: [contract, approval, accordion, real-time, onSnapshot, firestore, dual-party, pdf, print]

requires:
  - phase: 03-contract-agreement-s2
    plan: "01"
    provides: Contract entity, ContractRepository, contractConstants.js, Cloud Functions (saveDraftApprovals, submitContractApproval), DEAL_STATUS.CONTRACT_APPROVED, deal.isAcceptedAwaitingContract(), extended Firestore rules

provides:
  - Contract route at /deals/[dealId]/contract (auth guard, participant check, status redirect)
  - useContract hook — real-time onSnapshot subscription to deals/{dealId}/contract/main
  - useContractActions hook — local clause state, debounced draft saves, submit flow
  - ContractPage — main accordion + sidebar layout
  - ContractHeader — deal context (parties, product, accepted date, negotiation link)
  - ClauseAccordion — must-expand-before-approve UX with dual-party approval indicators
  - ApprovalProgressBar — X/Y progress bars for both parties with Submitted badges
  - ContractSidebar — financial summary, Incoterm document checklist, Phase 4 cost placeholder, PDF export
  - GeneratingContractOverlay — animated skeleton during contract generation window
  - DealPage updated — ACCEPTED shows View Contract banner; CONTRACT_APPROVED shows terminal banner; CounterOfferForm gated to NEGOTIATING only
  - globals.css — @media print styles for clean PDF output

affects:
  - src/app/(main)/deals/[dealId]/page.jsx — DealPage now shows contract-aware banners for ACCEPTED/CONTRACT_APPROVED
  - Phase 4 (logistics/insurance) — uses contract_approved gateway status

tech-stack:
  added: []
  patterns:
    - "useContract follows useDeal.js pattern — onSnapshot via ContractRepository singleton from DI container"
    - "useContractActions: debounced saveDraft (500ms inline useRef timer); hasExpanded Set restored from server approvedClauses on load (Pitfall 6 fix)"
    - "ClauseAccordion must-expand-before-approve: hasEverExpanded prop drives checkbox active/disabled state"
    - "ContractPage uses contract.getClausesBySection() grouped by CLAUSE_SECTIONS ordering"
    - "ConfirmDialog reused from common components for Submit All Approvals confirmation"
    - "window.print() for PDF export with @media print in globals.css"
    - "DEAL_STATUS.ACCEPTED removed from isTerminal fallback; CONTRACT_APPROVED added"
    - "CounterOfferForm guard changed from !isTerminal to deal.status === DEAL_STATUS.NEGOTIATING"

key-files:
  created:
    - src/app/(main)/deals/[dealId]/contract/page.jsx
    - src/presentation/hooks/contract/useContract.js
    - src/presentation/hooks/contract/useContractActions.js
    - src/presentation/components/features/contract/ContractPage/ContractPage.jsx
    - src/presentation/components/features/contract/ContractHeader/ContractHeader.jsx
    - src/presentation/components/features/contract/ClauseAccordion/ClauseAccordion.jsx
    - src/presentation/components/features/contract/ApprovalProgressBar/ApprovalProgressBar.jsx
    - src/presentation/components/features/contract/ContractSidebar/ContractSidebar.jsx
    - src/presentation/components/features/contract/GeneratingContractOverlay/GeneratingContractOverlay.jsx
  modified:
    - src/presentation/components/features/deal/DealPage/DealPage.jsx
    - src/app/globals.css

key-decisions:
  - "isTerminal fallback updated in DealPage: ACCEPTED removed, CONTRACT_APPROVED added — matches Deal.isTerminal() entity method from Plan 01"
  - "CounterOfferForm guard changed to deal.status === NEGOTIATING: prevents form showing for ACCEPTED deals (which are no longer terminal but should not show the counter-offer form)"
  - "hasExpanded restored from server approvedClauses on load: prevents Pitfall 6 where page refresh disables all checkboxes when clauses were already approved"
  - "GeneratingContractOverlay shown when contract === null and deal is accepted: handles the 1.5s+ generation window cleanly"
  - "useContractActions takes (dealId, contract, currentUid, deal) — contract and deal passed explicitly to avoid coupling the hook to route params"

duration: 6min
completed: 2026-03-01
---

# Phase 03 Plan 02: Contract Review UI Summary

**Contract review and approval UI: real-time dual-party clause approval flow with must-expand-before-approve UX, financial sidebar, PDF export, and DealPage integration for the ACCEPTED -> contract_approved state machine.**

## Performance

- **Duration:** 6 min
- **Started:** 2026-03-01T14:51:03Z
- **Completed:** 2026-03-01T14:57:08Z
- **Tasks:** 2 (+ 1 checkpoint awaiting human verification)
- **Files modified:** 11

## Accomplishments

- Complete contract review route and hooks: `/deals/[dealId]/contract` with auth guard, participant check, and status redirect; `useContract` real-time subscription; `useContractActions` managing local clause state with debounced saves
- Six contract UI components: ContractPage (accordion + sidebar layout), ContractHeader (deal context), ClauseAccordion (must-expand-before-approve with dual-party indicators), ApprovalProgressBar (X/Y progress bars), ContractSidebar (financial summary, Incoterm documents, Phase 4 placeholder), GeneratingContractOverlay (loading skeleton)
- DealPage integration: ACCEPTED status now shows yellow "Contract Ready" banner with View Contract link instead of the old terminal banner; CONTRACT_APPROVED added as a new terminal status with green banner; CounterOfferForm correctly gated to NEGOTIATING status only
- PDF export via `window.print()` with full `@media print` styles in globals.css

## Task Commits

Each task was committed atomically:

1. **Task 1: Route page, hooks, and all contract UI components** — `0a980a6` (feat)
2. **Task 2: DealPage integration, PDF print styles, contract_approved status handling** — `1f4d652` (feat)

## Files Created/Modified

### Created
- `src/app/(main)/deals/[dealId]/contract/page.jsx` — Next.js route with auth guard, participant check, status redirect; Suspense boundary around useParams
- `src/presentation/hooks/contract/useContract.js` — Real-time contract subscription via ContractRepository.subscribeToContract
- `src/presentation/hooks/contract/useContractActions.js` — Local clause approval state, 500ms debounced saveDraftApprovals, submitContractApproval with toast feedback, hasExpanded restored from server state on load
- `src/presentation/components/features/contract/ContractPage/ContractPage.jsx` — Main layout: GeneratingContractOverlay fallback, completion banner, waiting banner, ClauseAccordion list + SubmitApprovalsButton + ContractSidebar
- `src/presentation/components/features/contract/ContractHeader/ContractHeader.jsx` — Deal ID (truncated), parties, product, accepted date, negotiation history link
- `src/presentation/components/features/contract/ClauseAccordion/ClauseAccordion.jsx` — Expandable section with clause rows; checkboxes disabled until section expanded at least once; dual approval indicators (You / Buyer|Seller)
- `src/presentation/components/features/contract/ApprovalProgressBar/ApprovalProgressBar.jsx` — Two progress bars (You + other party), yellow fill, Submitted badge
- `src/presentation/components/features/contract/ContractSidebar/ContractSidebar.jsx` — Sticky sidebar: financial summary (unit price, qty, total, Incoterm, named place), Incoterm document checklist (from INCOTERM_REQUIRED_DOCUMENTS), Phase 4 cost placeholder, Download PDF button
- `src/presentation/components/features/contract/GeneratingContractOverlay/GeneratingContractOverlay.jsx` — Animated pulse skeleton with "Generating contract..." banner; no timeout error (contract appears via onSnapshot)

### Modified
- `src/presentation/components/features/deal/DealPage/DealPage.jsx` — TerminalBanner: removed ACCEPTED config, added CONTRACT_APPROVED; isTerminal fallback updated; Contract Ready banner added for ACCEPTED; CounterOfferForm gated to NEGOTIATING
- `src/app/globals.css` — @media print block added; .print-only helper class

## Decisions Made

- `isTerminal` fallback updated in DealPage: matches the Deal.isTerminal() entity behavior from Plan 01 where ACCEPTED is transitional and CONTRACT_APPROVED is terminal.
- `CounterOfferForm` guard changed to `deal.status === NEGOTIATING`: the old `!isTerminal` guard was too broad — ACCEPTED is now non-terminal but should not show the counter-offer form.
- `hasExpanded` restored from server `approvedClauses` on load: prevents the Pitfall 6 scenario where page refresh resets all checkbox active states even though the user had already expanded and approved clauses.
- `GeneratingContractOverlay` shown for `contract === null`: cleanly handles the 1.5s+ generation window rather than showing an error state.

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 1 - Bug] Countdown timer shown for ACCEPTED deals**
- **Found during:** Task 2
- **Issue:** The countdown timer was guarded only by `!isTerminal`, which means it would show for ACCEPTED deals (now non-terminal). But the countdown is only meaningful during active negotiation.
- **Fix:** Added `deal.status !== DEAL_STATUS.ACCEPTED` to the countdown timer condition.
- **Files modified:** `src/presentation/components/features/deal/DealPage/DealPage.jsx`
- **Commit:** 1f4d652

## Issues Encountered

None beyond the auto-fixed countdown timer guard.

## User Setup Required

None — no new external services or manual configuration required.

## Checkpoint

Task 3 is a `checkpoint:human-verify` requiring end-to-end testing of:
- Contract generation after deal acceptance
- Must-expand-before-approve checkbox UX
- Real-time dual-party progress sync
- Final submission with ConfirmDialog
- PDF export via browser print
- DealPage banners for ACCEPTED and CONTRACT_APPROVED statuses

## Next Phase Readiness

- Contract UI is fully built and integrated with the Plan 01 data layer
- Both parties can review, draft-approve, and submit contract approvals
- deal.status advances to contract_approved when both submit (handled by submitContractApproval CF from Plan 01)
- Phase 4 (logistics/insurance) can build on the contract_approved gateway

---
*Phase: 03-contract-agreement-s2*
*Completed: 2026-03-01*
