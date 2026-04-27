---
phase: 16-product-and-rfq-features
plan: "04"
subsystem: admin-tools
tags: [bulk-upload, csv, products, cloud-functions, firebase-storage]
dependency_graph:
  requires: []
  provides: [bulkUploadProducts-CF, BulkProductUpload-component]
  affects: [ProductsRequestsManager, admin-products-tab, firebase-storage, products-collection]
tech_stack:
  added: [papaparse@5.5.3]
  patterns: [csv-parsing, image-download-storage, onCall-admin-guard, concurrency-batching]
key_files:
  created:
    - src/presentation/components/features/admin/ProductsRequestsManager/BulkProductUpload.jsx
  modified:
    - src/presentation/components/features/admin/ProductsRequestsManager/ProductsRequestsManager.jsx
    - functions/index.js
    - package.json
decisions:
  - "Node 20 built-in fetch used for image download — no node-fetch dependency needed"
  - "AbortController with 10s timeout for each image download — failed images are skipped, row is not"
  - "Concurrency limit of 3 rows at a time via slice+Promise.all — avoids overwhelming external servers"
  - "Category validation uses both value and label matching via CATEGORY_LABEL_TO_VALUE map — flexible CSV authoring"
  - "Images stored at {userId}/products/{productId}/image_N.ext with public:true — direct GCS URL usable without signed tokens"
  - "bulkUploadProducts checks request.auth.token.role first then falls back to isUserAdmin() — avoids extra Firestore read for fresh tokens"
metrics:
  duration_minutes: 3
  completed_date: "2026-04-22"
  tasks_completed: 2
  files_modified: 4
---

# Phase 16 Plan 04: Admin CSV Bulk Product Upload Summary

**One-liner:** Admin CSV bulk upload with papaparse preview table, per-row validation, and a bulkUploadProducts Cloud Function that downloads images to Firebase Storage.

## What Was Built

### BulkProductUpload.jsx (new, 527 lines)

Client-side CSV upload tool embedded inline in the admin Products tab:

- **Member picker** via SearchableSelect — upload disabled until member is selected
- **Drag-and-drop CSV input** with click fallback, accepts `.csv` files only
- **papaparse client-side parsing** with `header: true, skipEmptyLines: true`
- **Column presence check** for 6 required columns before row validation runs
- **Per-row validation** covering: Product Name (non-empty), Category (value or label match), Price (positive float), Currency (3-letter code against CURRENCIES constant), Quantity (positive float), Unit (non-empty)
- **Preview table** with green checkmark / red X per row; hover tooltip shows error list for invalid rows
- **Summary bar** showing X valid / Y error counts above the table
- **Confirm button** with dynamic label "Upload N Products" — disabled until member selected and at least 1 valid row
- **Upload progress** state with spinner and descriptive message during CF call
- **Result panel** after completion: created count, skipped count, per-row error details
- **Reset / Upload Another** flow for iterative uploads in a single session

### ProductsRequestsManager.jsx (modified)

- Imports `BulkProductUpload` and `Rows3` icon
- Adds `showBulkUpload` state toggle
- New "Bulk Upload" button in the action bar — toggled style when active (gold border/bg)
- Renders `<BulkProductUpload>` inline below the button bar when toggled on

### functions/index.js (modified)

New `bulkUploadProducts` onCall Cloud Function:

- **Auth guard:** `request.auth.token.role !== 'admin'` check first; falls back to `isUserAdmin()` for legacy tokens
- **Input validation:** userId required, rows must be non-empty array, max 500 rows
- **Target user existence check** before processing begins
- **Per-row processing:** creates Firestore `products` doc, then downloads each image URL
- **Image download:** Node 20 built-in `fetch` with `AbortController` 10s timeout; detects file extension from `Content-Type` header or URL path; uploads buffer to `{userId}/products/{productId}/image_N.ext` with `public: true`
- **Graceful image failure:** failed/timed-out downloads are logged and skipped; row is still created successfully with whatever images succeeded
- **Concurrency:** rows processed in batches of 3 via `slice + Promise.all`
- **Returns:** `{ created, skipped, errors: [{row, reason}] }` for client display
- **Timeout:** `{ timeoutSeconds: 300 }` for large uploads with many images

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check: PASSED

- FOUND: `src/presentation/components/features/admin/ProductsRequestsManager/BulkProductUpload.jsx` (527 lines, exceeds 100-line minimum)
- FOUND: `bulkUploadProducts` in `functions/index.js`
- FOUND: commit 88ed30b (Task 1), commit bbf2b8a (Task 2)
- Build passes cleanly (verified via `npm run build`)
- `papaparse` installed and present in `package.json`
