---
phase: 16-product-and-rfq-features
plan: "06"
subsystem: product-detail, rfq-modals
tags: [gap-closure, uat, image-zoom, start-deal, rfq-modal]
dependency_graph:
  requires: []
  provides: [GAP-4-image-zoom, GAP-5-start-deal-button, GAP-6-rfq-backdrop-close]
  affects: [product-detail-page, homepage-hero, strategic-cta, admin-products-manager]
tech_stack:
  added: []
  patterns: [overflow-visible-escape, conditional-onClose, no-op-backdrop]
key_files:
  created: []
  modified:
    - src/app/(main)/product/[productId]/ProductGallery.jsx
    - src/app/(main)/product/[productId]/page.jsx
    - src/presentation/components/homepage/Hero/HeroSection.jsx
    - src/presentation/components/homepage/StrategicCTA/StrategicCTA.jsx
    - src/presentation/components/features/admin/ProductsRequestsManager/ProductsRequestsManager.jsx
decisions:
  - "ProductGallery restructured with outer overflow-visible wrapper + inner overflow-hidden glass-card — zoom panel escapes clip without affecting image presentation"
  - "Start Deal button moved from right column to left column after ProductSellerCard — satisfies GAP-5 without layout duplication"
  - "ProductsRequestsManager uses conditional onClose (no-op for request, closeModal for product) — preserves backdrop close on product form while blocking it on RFQ form"
metrics:
  duration: "5 min"
  completed_date: "2026-05-01"
  tasks_completed: 2
  files_modified: 5
requirements: [PROD-04, PROD-06, PROD-08]
---

# Phase 16 Plan 06: UAT Gap Closure (GAP-4, GAP-5, GAP-6) Summary

**One-liner:** Restructured ProductGallery overflow to expose zoom panel, relocated Start Deal button below seller card, and blocked RFQ modal backdrop dismiss at all three remaining call sites.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Fix product image hover zoom + reposition Start Deal button | 2c6106e | ProductGallery.jsx, page.jsx |
| 2 | Prevent RFQ modal backdrop close at all remaining call sites | 0602793 | HeroSection.jsx, StrategicCTA.jsx, ProductsRequestsManager.jsx |

## What Was Built

### GAP-4: Image Hover Zoom (ProductGallery.jsx)

The zoom panel was invisible because `ProductGallery` wrapped the main image in `overflow-hidden` (glass-card div), which clipped the absolutely-positioned `ProductImageZoom` panel that extends 12px to the right.

**Fix:** Restructured the main image area into two layers:
- Outer `<div className="relative group">` — no overflow clipping, zoom panel renders here
- Inner `<div className="absolute inset-0 glass-card rounded-2xl overflow-hidden">` — clips only the image and nav controls
- `ProductImageZoom` moved outside the inner wrapper so its zoom panel (positioned `left-[calc(100%+12px)]`) is not clipped

### GAP-5: Start Deal Button Repositioning (page.jsx)

The Start Deal button was in the right column (under product details). GAP-5 requires it to appear below Contact Seller and View Profile buttons in the left column.

**Fix:** Moved the button JSX into the left column `<div className="flex flex-col gap-4">` block, immediately after `ProductSellerCard`. Removed the duplicate button from the right column. Gold styling (`bg-[#FFD700]` + `!text-black`) was already correct.

### GAP-6: RFQ Modal Backdrop Close Prevention

Three call sites still had `onClose={() => setXxxOpen(false)}` on the Modal wrapping RequestForm.

**Fixes:**
1. `HeroSection.jsx` — changed Request modal `onClose` to `() => {}` (no-op)
2. `StrategicCTA.jsx` — changed Request modal `onClose` to `() => {}` (no-op)
3. `ProductsRequestsManager.jsx` — changed to `modalType === 'request' ? () => {} : closeModal` (conditional: blocks backdrop close only for request form, preserves it for product form)

In all cases, the `onCancel` prop on `RequestForm` already provided explicit close via Cancel button.

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

- [x] ProductGallery.jsx modified — outer wrapper is `relative group`, inner wrapper is `absolute inset-0 glass-card overflow-hidden`
- [x] page.jsx Start Deal button in left column after ProductSellerCard, removed from right column
- [x] HeroSection.jsx Request modal `onClose={() => {}}`
- [x] StrategicCTA.jsx Request modal `onClose={() => {}}`
- [x] ProductsRequestsManager.jsx `onClose={modalType === 'request' ? () => {} : closeModal}`
- [x] Build passes with zero errors (verified both times)

## Self-Check: PASSED
