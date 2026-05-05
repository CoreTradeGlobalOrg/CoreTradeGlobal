---
phase: 17-registration-onboarding-and-misc
plan: "05"
subsystem: registration, messaging, infrastructure
tags: [gap-closure, zoho-removal, label-rename, firestore-rules]
requirements: [REG-01, REG-07]

dependency_graph:
  requires: []
  provides: [company-type-supplier-label, zoho-free-codebase, productUploadRequests-rules-live]
  affects: [registration-form, messages-widget, main-layout]

tech_stack:
  added: []
  patterns: [targeted-file-removal, feature-flag-removal]

key_files:
  created: []
  modified:
    - src/core/constants/companyTypes.js
    - src/app/(main)/layout.jsx
    - src/presentation/components/common/MessagesWidget/MessagesWidget.jsx
  deleted:
    - src/presentation/components/common/ZohoSalesIQ/ZohoSalesIQButton.jsx

decisions:
  - "Zoho SalesIQ removed entirely rather than feature-flagged: user chose custom AI chatbot in a future phase"
  - "Layout useAuth import removed along with Zoho: isAuthenticated was only used to conditionally render ZohoSalesIQButton"
  - "Firestore rules were already compiled and current; deploy confirmed live application of productUploadRequests rules"

metrics:
  duration: 3 minutes
  completed_date: "2026-05-05"
  tasks_completed: 2
  files_modified: 3
  files_deleted: 1
---

# Phase 17 Plan 05: Label Rename, Zoho Removal, and Firestore Rules Deploy Summary

**One-liner:** Renamed Trade Company to Supplier, removed all Zoho SalesIQ integration code (script, button, MessagesWidget tabs), and deployed Firestore rules enabling productUploadRequests collection access in production.

## What Was Built

### Task 1: Company Type Label Rename + Zoho SalesIQ Removal

**Label rename (GAP-1):** `src/core/constants/companyTypes.js` — changed `label: 'Trade Company'` to `label: 'Supplier'` for the `trade` value. Value key unchanged to preserve all existing Firestore documents and role mappings.

**Zoho removal (scope change):**

1. `src/app/(main)/layout.jsx` — removed `ZohoSalesIQButton` dynamic import, `ZOHO_WIDGET_KEY` constant, the conditional `<Script id="zoho-salesiq">` block, and the `{!isAuthenticated && <ZohoSalesIQButton />}` JSX. Also removed `import Script from 'next/script'` and `import { useAuth }` since both were only used for the Zoho integration. The layout no longer has any client-side hooks and could be converted to a Server Component in a future cleanup pass.

2. `src/presentation/components/common/MessagesWidget/MessagesWidget.jsx` — removed `ZOHO_WIDGET_KEY` constant, `activeTab`/`setActiveTab` state, `zohoReady`/`zohoFailed` state, `zohoCheckRef` ref, the Zoho readiness polling `useEffect`, the Zoho visibility toggle `useEffect`, the Zoho hide-on-close `useEffect`, the `{ZOHO_WIDGET_KEY && !activeConversationId && (...)}` tab bar JSX block, and the `{ZOHO_WIDGET_KEY && activeTab === 'support' && ...}` support content block. Updated JSDoc to remove "Two tabs: Messages and Support" description. Removed `Headphones` and `Loader2` from lucide imports since they were Zoho-only.

3. `src/presentation/components/common/ZohoSalesIQ/ZohoSalesIQButton.jsx` — deleted. Parent `ZohoSalesIQ/` directory also deleted.

**Verification:** `grep -ri "zoho|salesiq|ZOHO" src/` returns zero results. Build completes successfully.

### Task 2: Firestore Rules Deploy (GAP-5)

Deployed Firestore rules via `firebase deploy --only firestore:rules --project core-trade-global`. Rules compiled without errors and were released to cloud.firestore. The `productUploadRequests` collection rules (already written in `firestore.rules`) are now live in production, resolving the permission error that prevented suppliers from submitting upload requests.

Note: Per MEMORY.md guidelines, `--only firestore:rules` was used — no index deployment, no `--force` flag.

## Deviations from Plan

### Auto-fixed Issues

None — plan executed exactly as written.

### Observations (not fixed, out of scope)

- `src/app/(main)/layout.jsx` now has `'use client'` with no hooks or event handlers. It imports only client components (Navbar, MessagesWidget, etc.) which Next.js App Router allows from Server Components. Removing `'use client'` would make this a Server Component, potentially improving initial load. Deferred to future cleanup phase as it requires verifying no hook usage across all imported components at this layout level.

## Auth Gates

None.

## Self-Check

- [x] `src/core/constants/companyTypes.js` — label shows `'Supplier'`
- [x] `src/app/(main)/layout.jsx` — no Zoho imports, Script, or useAuth
- [x] `MessagesWidget.jsx` — no Zoho state, effects, or JSX
- [x] `ZohoSalesIQ/` directory — deleted
- [x] `grep -ri "zoho" src/` — zero results
- [x] `npx next build` — succeeded
- [x] Firestore rules deployed — "Deploy complete!" confirmed
- [x] Commit 8c43e11 — Task 1 changes
- [x] Commit fba3530 — Task 2 deployment record
