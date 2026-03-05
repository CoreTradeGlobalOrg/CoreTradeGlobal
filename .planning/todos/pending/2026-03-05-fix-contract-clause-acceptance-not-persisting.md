---
created: 2026-03-05T22:05:00.629Z
title: Fix contract clause acceptance not persisting
area: ui
files:
  - src/presentation/components/features/contract/ClauseAccordion/ClauseAccordion.jsx
  - src/presentation/components/features/contract/ContractPage/ContractPage.jsx
  - src/presentation/hooks/contract/useContractActions.js
---

## Problem

When accepting clauses in the contract view, the acceptance sometimes doesn't persist — the clause reverts to its previous (unaccepted) state and the user has to accept it again. This is an intermittent bug, suggesting a race condition, optimistic UI update that gets overwritten by a stale Firestore snapshot, or a state management issue where local state is reset by an incoming listener update.

## Solution

Investigate the clause acceptance flow end-to-end:
1. Check `useContractActions.js` for how clause acceptance is written to Firestore
2. Check if Firestore `onSnapshot` listener in `ContractPage.jsx` overwrites local optimistic state before the write completes
3. Look for race conditions between the acceptance write and the real-time listener update
4. Possible fix: debounce listener updates after a local write, or use a pending-writes check (`snapshot.metadata.hasPendingWrites`) to avoid reverting optimistic UI
