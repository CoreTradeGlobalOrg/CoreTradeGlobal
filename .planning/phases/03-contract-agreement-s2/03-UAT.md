---
status: complete
phase: 03-contract-agreement-s2
source: [03-01-SUMMARY.md, 03-02-SUMMARY.md]
started: 2026-03-02T10:00:00Z
updated: 2026-03-02T10:10:00Z
---

## Current Test

[testing complete]

## Tests

### 1. Contract Generation After Deal Acceptance
expected: After a deal is accepted, a "Generating contract..." overlay with animated skeleton appears briefly. Then the contract page loads with all 8 clauses populated from the accepted offer terms.
result: pass

### 2. DealPage Contract Ready Banner
expected: When a deal is in ACCEPTED status, the DealPage shows a yellow "Contract Ready" banner with a "View Contract" link. The old terminal banner is NOT shown for ACCEPTED deals.
result: pass

### 3. CounterOfferForm Hidden for Accepted Deals
expected: When a deal is in ACCEPTED status, the counter-offer form is NOT visible. It should only appear for NEGOTIATING status.
result: pass

### 4. Contract Route and Auth Guard
expected: Navigating to /deals/[dealId]/contract loads the contract page. Non-participants are redirected. Unauthenticated users are redirected to login.
result: pass

### 5. Must-Expand-Before-Approve UX
expected: Each clause section has a checkbox. The checkbox is disabled/inactive until you expand the clause section at least once. After expanding, the checkbox becomes clickable.
result: pass

### 6. Clause Draft Save (Auto-Save)
expected: After checking a clause checkbox, the approval is auto-saved (debounced ~500ms). Refreshing the page restores your previously checked clauses.
result: pass

### 7. Dual-Party Approval Indicators
expected: Each clause row shows approval indicators for both parties (You / Buyer or Seller). You can see which clauses the other party has approved in real-time.
result: pass

### 8. Approval Progress Bars
expected: Progress bars show "X/8 clauses approved" for both you and the other party. The bars update as clauses are checked. A "Submitted" badge appears after a party submits.
result: pass

### 9. Contract Sidebar
expected: Sticky sidebar shows: financial summary (unit price, quantity, total value, Incoterm, named place), Incoterm-specific document checklist, Phase 4 cost placeholder section, and a "Download PDF" button.
result: pass

### 10. Submit All Approvals
expected: After approving all 8 clauses, a "Submit All Approvals" button becomes active. Clicking it shows a confirmation dialog. Confirming submits your approval. When both parties have submitted, the deal advances to CONTRACT_APPROVED status.
result: pass

### 11. DealPage CONTRACT_APPROVED Terminal Banner
expected: After both parties submit their contract approvals, the DealPage shows a green terminal banner indicating the contract is fully approved. The deal is now in its final state.
result: pass

### 12. PDF Export
expected: Clicking "Download PDF" in the sidebar triggers the browser print dialog. The print preview shows a clean contract layout without navigation, sidebars, or UI chrome.
result: pass

## Summary

total: 12
passed: 12
issues: 0
pending: 0
skipped: 0

## Gaps

[none yet]
