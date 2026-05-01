---
phase: 16-product-and-rfq-features
plan: "07"
subsystem: admin-bulk-upload
tags: [bug-fix, gap-closure, admin, products, csv, cloud-functions]
dependency_graph:
  requires: []
  provides: [working-csv-bulk-upload]
  affects: [BulkProductUpload, bulkUploadProducts-CF, ProductsRequestsManager]
tech_stack:
  added: []
  patterns: [firestore-category-lookup, dynamic-validation-maps, useMemo-derived-state]
key_files:
  created: []
  modified:
    - src/presentation/components/features/admin/ProductsRequestsManager/BulkProductUpload.jsx
    - src/presentation/components/features/admin/ProductsRequestsManager/ProductsRequestsManager.jsx
    - functions/index.js
decisions:
  - "Category maps built via useMemo from categories prop — avoids re-computation on every re-render while staying reactive to prop changes"
  - "buildCategoryMaps matches by value, name, and label (with icon prefix stripping) — flexible CSV authoring for admins"
  - "validateRow accepts resolveCategory/validValues as arguments — pure function, testable, decoupled from module-level state"
  - "Both quantity and stockQuantity stored on bulk-created products — ProductCard reads stockQuantity; quantity retained for backward compat"
  - "createdByAdmin: true on bulk-created products — consistent with admin-created products in ProductsRequestsManager"
metrics:
  duration_minutes: 4
  completed_date: "2026-05-01"
  tasks_completed: 2
  files_modified: 3
---

# Phase 16 Plan 07: CSV Bulk Upload Category Validation and CF Fix Summary

**One-liner:** Replaced COMPANY_CATEGORIES with dynamic Firestore product category lookup in BulkProductUpload, and added stockQuantity + createdByAdmin fields to the bulkUploadProducts Cloud Function.

## What Was Built

### Task 1: Fix Category Validation (GAP-7)

The root cause of GAP-7 was that `BulkProductUpload.jsx` validated CSV `Category` column values against `COMPANY_CATEGORIES` — a static list of business-type categories (automotive, electronics, machinery) used for company registration — instead of the actual product categories stored in Firestore's `categories` collection.

**Changes:**
- Removed `COMPANY_CATEGORIES` import from `BulkProductUpload.jsx`
- Added `buildCategoryMaps(categories)` function that derives `validValues` (Set) and `labelToValue` (map) from the Firestore categories prop. Matches by:
  - Category `value` (Firestore document ID, e.g. `"electronics"`)
  - Category `name` (plain text, e.g. `"Electronics"`)
  - Category `label` (full label including icon prefix, e.g. `"🔌 Electronics"`)
  - Stripped label (icon prefix removed via regex)
- Added `makeResolveCategory(labelToValue)` factory returning a pure resolver function
- Both maps derived via `useMemo` keyed on `categories` prop — reactive, efficient
- `validateRow()` refactored to accept `resolveCategory` and `validValues` as arguments (pure function, no module-level global state)
- Preview table category display updated to look up `c.name` from categories prop instead of `COMPANY_CATEGORIES`
- `ProductsRequestsManager.jsx` now calls `useCategories()` hook and passes `categories` prop to `<BulkProductUpload>`

### Task 2: Fix Cloud Function (GAP-8)

The `bulkUploadProducts` Cloud Function was missing fields that other parts of the app read from product documents.

**Changes in `functions/index.js`:**
- Added `stockQuantity: row.quantity` — `ProductCard` reads `product.stockQuantity`; without it, bulk-uploaded products show no stock info. Both `quantity` and `stockQuantity` now stored.
- Added `createdByAdmin: true` — consistent with admin-created products in `ProductsRequestsManager.handleProductSubmit()`

The client-side row mapping in `BulkProductUpload.handleConfirmUpload()` was already correct (maps `r.name`, `r.category` → `categoryId`, `r.price`, `r.currency`, `r.quantity`, `r.unit`, `r.description`, `r.imageUrls`) so no client-side CF payload fix was needed.

## Deviations from Plan

None — plan executed exactly as written. The plan correctly identified both root causes. The client-side row mapping was already correct (the plan mentioned it as a possibility to check, not a definite bug).

## Commits

| Task | Commit | Description |
|------|--------|-------------|
| 1 | e218726 | fix(16-07): use Firestore product categories for CSV bulk upload validation |
| 2 | 5512592 | fix(16-07): fix bulkUploadProducts CF field names and add admin metadata |

## Self-Check: PASSED

- [x] `BulkProductUpload.jsx` — modified, no COMPANY_CATEGORIES import
- [x] `ProductsRequestsManager.jsx` — uses useCategories, passes categories prop
- [x] `functions/index.js` — stockQuantity and createdByAdmin added
- [x] Build passes with zero errors
- [x] Commit e218726 exists
- [x] Commit 5512592 exists
