---
phase: 03-contract-agreement-s2
plan: "01"
subsystem: database
tags: [firestore, cloud-functions, contract, approval, transaction, entity, repository]

requires:
  - phase: 02-deal-creation-and-negotiation-s1
    provides: Deal entity, DealRepository pattern, DEAL_STATUS, dealConstants.js, PAYMENT_TERMS, Cloud Function patterns (onCall, onDocumentUpdated, runTransaction, sendDealNotifications)

provides:
  - contractConstants.js with CONTRACT_STATUS, PAYMENT_TERMS_LABELS, INCOTERM_REQUIRED_DOCUMENTS, CLAUSE_SECTIONS, buildContractClauses
  - Contract entity (Contract.js) with fromFirestore, isBuyer, approval helpers, clause grouping, progress tracking
  - ContractRepository.js with subscribeToContract real-time subscription to deals/{dealId}/contract/main
  - getContractRepository() DI registration in container.js
  - Extended DEAL_STATUS with CONTRACT_APPROVED; ACCEPTED now transitional (not terminal)
  - Updated Deal.js isTerminal() — CONTRACT_APPROVED is terminal; added isAcceptedAwaitingContract(), isContractApproved()
  - Firestore rule for contract subcollection (participant read, write: if false)
  - onDealAccepted Cloud Function — auto-generates contract doc on deal acceptance
  - saveDraftApprovals Cloud Function — saves per-clause draft approvals (non-transactional)
  - submitContractApproval Cloud Function — atomic runTransaction advancing deal to contract_approved
  - contract_approved_by_party and contract_both_approved notification event types

affects:
  - 03-02-PLAN.md (contract UI uses Contract entity, ContractRepository, saveDraftApprovals, submitContractApproval)
  - Any phase referencing DEAL_STATUS.isTerminal() or deal flow
  - Phase 4 (logistics/insurance) — contract_approved is the gateway status

tech-stack:
  added: []
  patterns:
    - "CJS constant duplication: CONTRACT_STATUS and CONTRACT_APPROVED added to functions/index.js (cannot import ESM from Next.js app)"
    - "Denormalized buyerId/sellerId on contract doc: saveDraftApprovals reads dealBuyerId from contract doc — no extra deal fetch"
    - "runTransaction for approval submission: prevents race condition where both parties submit simultaneously and both see otherHasSubmitted=false"
    - "Notification calls outside transactions: contract_approved_by_party and contract_both_approved sent post-transaction"
    - "Clause array stored on contract doc: 8 clauses built from accepted offer at contract generation time, immutable thereafter"
    - "buildContractClausesCJS: CJS duplicate of buildContractClauses for Cloud Functions (same clause structure)"

key-files:
  created:
    - src/core/constants/contractConstants.js
    - src/domain/entities/Contract.js
    - src/data/repositories/ContractRepository.js
  modified:
    - src/core/constants/dealConstants.js
    - src/domain/entities/Deal.js
    - src/core/di/container.js
    - firestore.rules
    - functions/index.js

key-decisions:
  - "CONTRACT_APPROVED added to DEAL_STATUS; ACCEPTED is transitional (not terminal) — enables contract approval flow before deal completion"
  - "dealBuyerId/dealSellerId denormalized on contract doc — saveDraftApprovals determines isBuyer without extra Firestore read"
  - "deadline field stored as null on contract doc — enforcement deferred to future phase; field is forward-compatible placeholder"
  - "1500ms delay in onDealAccepted — UX feel for 'Generating contract...' per user decision"
  - "onDealAccepted does NOT send notification — existing onDealStatusChanged handles accepted event notification"
  - "submitContractApproval uses runTransaction — atomic prevention of race condition on simultaneous submission"

patterns-established:
  - "Contract subcollection at deals/{dealId}/contract/main — single document, participant read, CF-only write"
  - "Approval state shape: { approvedClauses: string[], hasSubmitted: boolean, submittedAt: Timestamp|null }"
  - "Draft saves non-transactional (saveDraftApprovals); final submission transactional (submitContractApproval)"

requirements-completed: [AGMT-01, AGMT-02, AGMT-03, AGMT-04]

duration: 7min
completed: 2026-03-01
---

# Phase 03 Plan 01: Contract Data Layer and Cloud Functions Summary

**Dual-party contract approval data layer: auto-generation trigger (onDealAccepted), atomic submission (submitContractApproval with runTransaction), draft save (saveDraftApprovals), Contract entity + repository, and extended deal state machine with CONTRACT_APPROVED**

## Performance

- **Duration:** 7 min
- **Started:** 2026-03-01T14:40:58Z
- **Completed:** 2026-03-01T14:47:53Z
- **Tasks:** 2
- **Files modified:** 8

## Accomplishments

- Complete contract data model: contractConstants.js (STATUS enum, clause builder, document requirements), Contract entity with approval helpers, ContractRepository with real-time subscription
- Three Cloud Functions: onDealAccepted Firestore trigger auto-generates clause-populated contract on deal acceptance; saveDraftApprovals saves per-clause drafts; submitContractApproval atomically marks submission and advances deal to contract_approved when both parties submit
- Extended deal state machine: ACCEPTED is now a transitional state (not terminal); CONTRACT_APPROVED added as the new terminal gateway for Phase 4 logistics/insurance

## Task Commits

Each task was committed atomically:

1. **Task 1: Contract constants, entity, repository, DI registration, deal status extension, Firestore rules** - `ce2cad5` (feat)
2. **Task 2: Cloud Functions — contract generation trigger, draft saves, final approval submission, notification on full approval** - `852e3c1` (feat)

## Files Created/Modified

- `src/core/constants/contractConstants.js` - CONTRACT_STATUS, PAYMENT_TERMS_LABELS, INCOTERM_REQUIRED_DOCUMENTS, CLAUSE_SECTIONS, buildContractClauses (8 clauses from accepted offer)
- `src/domain/entities/Contract.js` - Contract entity with fromFirestore, isBuyer (uses denormalized dealBuyerId), getMyApproval/getOtherApproval, getClausesBySection, isFullyApproved, getMyProgress/getOtherProgress
- `src/data/repositories/ContractRepository.js` - subscribeToContract(dealId, callback) real-time onSnapshot to deals/{dealId}/contract/main
- `src/core/constants/dealConstants.js` - Added CONTRACT_APPROVED to DEAL_STATUS; ACCEPTED now transitional in VALID_DEAL_TRANSITIONS
- `src/domain/entities/Deal.js` - isTerminal() now includes CONTRACT_APPROVED instead of ACCEPTED; added isAcceptedAwaitingContract(), isContractApproved()
- `src/core/di/container.js` - Added getContractRepository() lazy singleton; imports ContractRepository; contractRepository in _reset()
- `firestore.rules` - Added match /contract/{contractDoc} block: participant read via get() on parent deal, write: if false
- `functions/index.js` - CONTRACT_STATUS + CONTRACT_APPROVED constants; buildContractClausesCJS helper; onDealAccepted trigger; saveDraftApprovals onCall; submitContractApproval onCall; getDealEventCopy extended with contract_approved_by_party and contract_both_approved

## Decisions Made

- CONTRACT_APPROVED added to DEAL_STATUS; ACCEPTED is transitional: enables the contract approval flow before the deal is fully complete. Prior to this plan, ACCEPTED was terminal, preventing further state advancement.
- dealBuyerId and dealSellerId denormalized on contract doc: saveDraftApprovals can determine buyer/seller without an extra Firestore read — follows Phase 2's denormalization pattern.
- deadline stored as null: field is a forward-compatible placeholder; enforcement (scheduled Cloud Function, auto-expiry) deferred to future phase per locked decision in CONTEXT.md.
- 1500ms delay in onDealAccepted: per user decision for UX feel ("Generating contract..." spinner has time to show).
- onDealAccepted does NOT send notification: existing onDealStatusChanged already handles the 'accepted' notification; duplicate would send 2 notifications.
- submitContractApproval uses runTransaction: prevents race condition where both parties submit simultaneously and both read otherHasSubmitted=false, leading to neither seeing BOTH_APPROVED.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None.

## User Setup Required

None - no external service configuration required.

## Next Phase Readiness

- Contract data layer is fully ready for 03-02 UI build
- Contract entity provides all helpers needed for clause review UI (getClausesBySection, getMyProgress, getOtherProgress, isFullyApproved)
- saveDraftApprovals and submitContractApproval Cloud Functions ready for deployment
- Firestore rules protect contract subcollection — no additional security setup needed

---
*Phase: 03-contract-agreement-s2*
*Completed: 2026-03-01*
