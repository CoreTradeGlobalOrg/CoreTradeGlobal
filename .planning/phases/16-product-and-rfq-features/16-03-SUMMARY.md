---
phase: 16-product-and-rfq-features
plan: "03"
subsystem: RFQ/Requests
tags: [rfq, modal, quotes, ui-enhancement]
dependency_graph:
  requires: []
  provides: [backdrop-close-prevention, enriched-quotes-display]
  affects: [ProfileRequests, RequestDetailsPage, QuotesSection]
tech_stack:
  added: []
  patterns: [Intl.NumberFormat for currency, useMemo for best-quote detection, no-op onClose for modal hardening]
key_files:
  created: []
  modified:
    - src/app/(main)/profile/[userId]/ProfileRequests.jsx
    - src/app/(main)/request/[requestId]/page.jsx
    - src/presentation/components/features/request/QuotesSection/QuotesSection.jsx
decisions:
  - "onClose={() => {}} passed at both RequestForm Modal call sites — prevents backdrop close without touching global Modal component; X header button becomes cosmetic; Cancel button is the explicit dismiss path"
  - "Best quote detection uses useMemo over non-rejected quotes with parseFloat(unitPrice) comparison — handles string-typed unit prices from HTML form inputs"
  - "Intl.NumberFormat with minimumFractionDigits:2 maximumFractionDigits:4 for currency — handles both whole-number and precise per-unit prices"
  - "PROD-10 (RFQ notifications) confirmed already implemented in Phase 12 onRFQCreated Cloud Function — no code changes needed"
metrics:
  duration: "~2.5 minutes"
  completed_date: "2026-04-22"
  tasks_completed: 2
  files_modified: 3
requirements:
  - PROD-06
  - PROD-07
  - PROD-10
---

# Phase 16 Plan 03: RFQ Modal Hardening and QuotesSection Enhancement Summary

**One-liner:** Modal backdrop-click prevention at both RFQ call sites (no-op onClose) plus enriched QuotesSection with best-offer highlighting, currency formatting, validity countdown, and structured expanded layout.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | RFQ modal outside-click prevention and cancel button | e932f9d | ProfileRequests.jsx, request/[requestId]/page.jsx |
| 2 | Enhance QuotesSection with richer quote details | c63bb90 | QuotesSection.jsx |

## What Was Built

### Task 1: RFQ Modal Backdrop-Click Prevention

Two call sites where `RequestForm` renders inside a `Modal` were identified and fixed:

- **`ProfileRequests.jsx`** — "Create New Request" / "Edit Request" modal
- **`request/[requestId]/page.jsx`** — "Edit Request" modal

At both sites, `onClose` was changed to `() => {}` (no-op). The `RequestForm` component already had an `onCancel` prop and Cancel button wired to `onCloseModal` / `setEditModalOpen(false)` — no changes to `RequestForm.jsx` were required. The global `Modal` component was not touched, preserving backdrop-close behavior for all other modals in the app.

### Task 2: QuotesSection Enhancement

The `QuotesSection.jsx` was substantially enhanced:

**Best Offer Highlighting:**
- `useMemo` computes the lowest unit price among non-rejected quotes
- Best quote card gets a gold border (`border-[#FFD700]/60`), gold Building2 icon, gold unit price, and a "Best Offer — Lowest Price" star badge
- A legend hint is shown in the section header when multiple quotes exist

**Currency Formatting:**
- `Intl.NumberFormat` with `style: 'currency'` formats unit prices with proper symbols and thousands separators
- `minimumFractionDigits: 2`, `maximumFractionDigits: 4` handles both whole-number and precise per-unit pricing

**Estimated Total:**
- Computed inline as `unitPrice × request.quantity` and displayed in a dedicated row per quote card
- Shows full formula `(currency price × qty unit)` for transparency
- Hidden when either value is non-numeric or zero

**Price Validity Countdown:**
- `getDaysUntilExpiry()` parses ISO strings, `Date` objects, and Firestore Timestamps
- `ValidityBadge` component renders: green check (>7 days), amber clock (≤7 days), yellow alert (≤3 days), red expired badge
- Displayed both in collapsed and expanded view

**Supplier Country:**
- Shows `quote.userInfo?.country || quote.originCountry` below the supplier name when present
- Uses `MapPin` icon for visual clarity

**Expanded Details Restructure:**
- Three labeled sections: "Shipping & Trade Details", "Pricing Details", "Technical Specifications"
- New "Additional Notes" section if `quote.notes` is present
- Cards use `bg-[rgba(255,255,255,0.03)]` for subtle separation within sections

**PROD-10 Confirmation:**
- Verified in `useSubmitQuote.js`: `Notification.createQuoteNotification()` already fires on quote submission
- Phase 12 `onRFQCreated` Cloud Function also covers this path
- No implementation work needed — requirement satisfied

## Deviations from Plan

None — plan executed exactly as written.

## PROD-10 Traceability Note

PROD-10 (RFQ notifications) is implemented via two paths:
1. **Client-side** (`useSubmitQuote.js`): `notificationRepository.create()` fires for the RFQ owner on quote submission
2. **Cloud Function** (`onRFQCreated`): Phase 12 trigger handles server-side notification on new RFQ creation

This plan covers PROD-10 for requirement traceability only. No code changes were required.

## Self-Check: PASSED

- ProfileRequests.jsx: FOUND
- request/[requestId]/page.jsx: FOUND
- QuotesSection.jsx: FOUND
- SUMMARY.md: FOUND
- Commit e932f9d: VERIFIED
- Commit c63bb90: VERIFIED
