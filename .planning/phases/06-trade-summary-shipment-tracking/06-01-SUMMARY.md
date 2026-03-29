---
phase: 06-trade-summary-shipment-tracking
plan: "01"
subsystem: shipment-tracking-data-layer
tags: [firestore, cloud-functions, shipment-tracking, delivered-status, state-machine]
dependency_graph:
  requires: []
  provides:
    - SHIPMENT_STATUS enum and display labels
    - ShipmentUpdate entity with fromFirestore and helper methods
    - ShipmentRepository with real-time subscription and latest-update query
    - ShipmentRepository registered in DI container
    - submitShipmentUpdate Cloud Function (logistics provider)
    - confirmInsuranceCoverage Cloud Function (insurance provider)
    - DEAL_STATUS.DELIVERED added to state machine (ESM + CJS)
    - shipmentTracking Firestore rules (party-only read, CF write)
    - shipmentTracking composite index (timestamp ASC)
    - appendStatusHistory helper retrofitted into acceptOffer, submitContractApproval, confirmProviderSelection
  affects:
    - src/core/constants/dealConstants.js
    - src/domain/entities/Deal.js
    - src/core/di/container.js
    - firestore.rules
    - firestore.indexes.json
    - functions/index.js
tech_stack:
  added: []
  patterns:
    - Entity pattern (ShipmentUpdate.fromFirestore with Timestamp->Date conversion)
    - Repository pattern (onSnapshot subscriber, no client writes)
    - DI singleton pattern (container.getShipmentRepository)
    - Deterministic document ID for idempotency (coverage_${dealId})
    - FieldValue.arrayUnion for race-condition-safe statusHistory append
    - Provider auth via quoteRequest lookup (not deal fields)
key_files:
  created:
    - src/core/constants/shipmentConstants.js
    - src/domain/entities/ShipmentUpdate.js
    - src/data/repositories/ShipmentRepository.js
  modified:
    - src/core/constants/dealConstants.js
    - src/domain/entities/Deal.js
    - src/core/di/container.js
    - firestore.rules
    - firestore.indexes.json
    - functions/index.js
decisions:
  - "[06-01]: VALID_DEAL_TRANSITIONS_CF added as named object (not inline map) for readability and transaction guard reuse"
  - "[06-01]: appendStatusHistory uses FieldValue.arrayUnion — race-condition-safe; called outside transactions to prevent duplicate writes on retry"
  - "[06-01]: confirmInsuranceCoverage uses deterministic doc ID coverage_{dealId} — idempotent re-calls return already-exists error (client can safely retry)"
  - "[06-01]: submitShipmentUpdate denormalizes currentShipmentStatus and shipmentEtaDate on deal doc for DealCard display without N+1 queries"
  - "[06-01]: DELIVERED state transition guarded inside runTransaction — prevents race condition if multiple delivered updates are submitted"
  - "[06-01]: sendDealNotifications called with senderUid='system' for shipment events — both buyer and seller receive notifications"
metrics:
  duration: 5 minutes
  completed: "2026-03-29"
  tasks_completed: 2
  files_modified: 8
---

# Phase 6 Plan 01: Shipment Tracking Data Layer Summary

**One-liner:** DELIVERED state machine + ShipmentUpdate entity + ShipmentRepository + submitShipmentUpdate/confirmInsuranceCoverage CFs with statusHistory retrofits.

## What Was Built

### Task 1: Constants, Entity, Repository, DI, Firestore Rules and Indexes

- **shipmentConstants.js** — New file with `SHIPMENT_STATUS` (7 values) and `SHIPMENT_STATUS_LABELS` display map.
- **dealConstants.js** — Added `DELIVERED: 'delivered'` to `DEAL_STATUS`; updated `VALID_DEAL_TRANSITIONS` so `PROVIDERS_SELECTED -> [DELIVERED]` and `DELIVERED -> []`.
- **Deal.js** — Added `DELIVERED` to `isTerminal()`; added `isDelivered()` and `isAwaitingShipment()` convenience methods.
- **ShipmentUpdate.js** — New entity with full constructor, `fromFirestore` factory (Timestamp->Date), `isLogistics()`, `isInsurance()`, `isDelivered()`, `isCoverageActive()`.
- **ShipmentRepository.js** — New repository with `subscribeToShipmentUpdates(dealId, callback)` (timestamp ASC onSnapshot) and `getLatestShipmentUpdate(dealId)` (timestamp DESC limit 1).
- **container.js** — `shipmentRepository` singleton and `getShipmentRepository()` method added.
- **firestore.rules** — Added `shipmentTracking/{updateId}` subcollection rule: read allowed to `dealBuyerId`/`dealSellerId`/admin; write denied (CF only).
- **firestore.indexes.json** — Added `shipmentTracking` COLLECTION index on `timestamp ASC`. Existing indexes untouched.

### Task 2: Cloud Functions

- **DEAL_STATUS_CF** — Added `DELIVERED: 'delivered'`.
- **VALID_DEAL_TRANSITIONS_CF** — New named object for state machine guards in CFs.
- **SHIPMENT_STATUS_CF** — New CJS constants block (7 values).
- **appendStatusHistory()** — Private helper using `FieldValue.arrayUnion`; retrofitted into `acceptOffer` (ACCEPTED), `submitContractApproval` (CONTRACT_APPROVED, on full approval only), and `confirmProviderSelection` (PROVIDERS_SELECTED).
- **getDealEventCopy** — Added `shipment_update` and `insurance_coverage` event types.
- **submitShipmentUpdate** — New onCall CF: validates logistics provider auth via `quoteRequest.providerUid`, writes to `shipmentTracking` subcollection, denormalizes `currentShipmentStatus`/`shipmentEtaDate` on deal doc, transitions deal to DELIVERED via transaction when status is `delivered`, appends statusHistory, notifies buyer+seller.
- **confirmInsuranceCoverage** — New onCall CF: validates insurance provider auth via `quoteRequest.providerUid`, uses deterministic `coverage_${dealId}` doc ID with transaction-based idempotency check, writes `coverage_active` entry, notifies buyer+seller.

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

### Files created/exist:
- src/core/constants/shipmentConstants.js: FOUND
- src/domain/entities/ShipmentUpdate.js: FOUND
- src/data/repositories/ShipmentRepository.js: FOUND

### Commits:
- e6f1ed6: feat(06-01): constants, ShipmentUpdate entity, ShipmentRepository, Firestore rules/indexes
- 3c95161: feat(06-01): submitShipmentUpdate and confirmInsuranceCoverage Cloud Functions

### Verification:
- `node -e "require('./functions/index.js')"` — PASSED (CF loaded OK)
- `exports.submitShipmentUpdate` — FOUND
- `exports.confirmInsuranceCoverage` — FOUND
- `DEAL_STATUS.DELIVERED` in ESM — FOUND
- `DEAL_STATUS.DELIVERED` in CJS — FOUND

## Self-Check: PASSED
