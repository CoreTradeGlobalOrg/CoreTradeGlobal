---
phase: 16-product-and-rfq-features
plan: 02
subsystem: products
tags: [product, category-sidebar, deals, navigation, ux]
dependency_graph:
  requires: []
  provides:
    - ProductCategorySidebar component with search and URL-based filtering
    - Start Deal button on product detail for authenticated non-owners
    - /deals/new sellerId direct entry path (no conversationId required)
  affects:
    - src/app/(main)/products/page.jsx
    - src/app/(main)/product/[productId]/page.jsx
    - src/app/(main)/deals/new/page.jsx
    - src/presentation/components/features/product/ProductGrid/ProductGrid.jsx
tech_stack:
  added: []
  patterns:
    - Sticky sidebar with max-h overflow scroll
    - URL query param navigation via router.replace
    - Dual entry path pattern with isDirectPath flag
    - Seller name fetch from UserRepository in /deals/new
key_files:
  created:
    - src/presentation/components/features/product/ProductCategorySidebar/ProductCategorySidebar.jsx
  modified:
    - src/app/(main)/products/page.jsx
    - src/presentation/components/features/product/ProductGrid/ProductGrid.jsx
    - src/app/(main)/product/[productId]/page.jsx
    - src/app/(main)/deals/new/page.jsx
decisions:
  - "ProductCategorySidebar hidden on mobile (lg:hidden) — top SearchBar + category chip remain for mobile users"
  - "sidebarVisible prop on ProductGrid reduces from 4 to 3 columns at xl breakpoint — keeps cards readable with narrower flex-1 container"
  - "Start Deal button condition: currentUser?.uid && !isOwnProduct — guards both unauthenticated and owner cases"
  - "isOwnProduct already covers isAdmin via OR — admin cannot start a deal against their own product either"
  - "/deals/new isDirectPath = !conversationId && productId && sellerId — clean flag to branch both fetch and UI without duplicating guards"
  - "conversationId || null passed to createDeal CF — CF already accepts null conversationId, no CF change needed"
  - "Back link on direct path returns to /product/[productId] instead of /messages for coherent navigation"
metrics:
  duration: 8
  completed_date: "2026-04-22"
  tasks_completed: 2
  files_changed: 5
requirements:
  - PROD-03
  - PROD-08
---

# Phase 16 Plan 02: Product Category Sidebar and Start Deal Button Summary

**One-liner:** Category sidebar with hierarchical search and gold highlight added to All Products page; Start Deal gold CTA on product detail navigates directly to deal creation with seller pre-filled.

## Tasks Completed

| # | Task | Commit | Key Files |
|---|------|--------|-----------|
| 1 | Product category sidebar with search and URL filtering | fda5aac | ProductCategorySidebar.jsx, products/page.jsx, ProductGrid.jsx |
| 2 | Start Deal button on product detail and /deals/new sellerId support | dc57004 | product/[productId]/page.jsx, deals/new/page.jsx |

## What Was Built

### Task 1: ProductCategorySidebar

- New component at `src/presentation/components/features/product/ProductCategorySidebar/ProductCategorySidebar.jsx`
- Fetches parent categories with `getParentCategories()` then sub-categories per parent with `getSubCategories(parentId)` in parallel on mount
- Client-side search filters both parent names and sub-category names; matching subs shown when typing
- "All Products" item clears `categoryId` param; parent/sub items set `?categoryId=X` via `router.replace`
- Active item highlighted with gold left border (`border-[#FFD700]`) and `bg-[#FFD700]/10` tint
- Auto-expands parent accordion that contains the current `activeCategoryId`
- Hidden on `< lg` screens via `hidden lg:flex` — mobile users retain the existing SearchBar + category chip
- Sticky positioning with `max-h` + overflow scroll so long category lists don't overflow the viewport

### Task 2: Start Deal Button + /deals/new Direct Path

- "Start Deal" gold button added to product detail page, visible only when `currentUser?.uid && !isOwnProduct`
- Navigates to `/deals/new?productId=${product.id}&sellerId=${product.userId}`
- `/deals/new` extended with `sellerId` param reading and `isDirectPath` flag
- On direct path: fetches product (for pre-fill) and seller user doc (for name display) in parallel
- On direct path: `conversationId` passed as `null` to `createDeal` CF — CF already accepts null
- Classic `conversationId + productId` path fully intact — zero regressions

## Deviations from Plan

None — plan executed exactly as written.

## Self-Check

Files created/modified:
- `src/presentation/components/features/product/ProductCategorySidebar/ProductCategorySidebar.jsx` — FOUND
- `src/app/(main)/products/page.jsx` — FOUND
- `src/presentation/components/features/product/ProductGrid/ProductGrid.jsx` — FOUND
- `src/app/(main)/product/[productId]/page.jsx` — FOUND
- `src/app/(main)/deals/new/page.jsx` — FOUND

Commits:
- fda5aac — FOUND
- dc57004 — FOUND
