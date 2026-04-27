---
phase: 16-product-and-rfq-features
plan: "01"
subsystem: product
tags: [favorites, share, image-zoom, product, ux]
dependency_graph:
  requires: []
  provides: [useFavoriteProduct, favorites-page, product-image-zoom]
  affects: [ProductCard, ProductGrid, ProductGallery, product-detail]
tech_stack:
  added: [firebase/firestore arrayUnion/arrayRemove, Web Share API]
  patterns: [optimistic-update, Firestore real-time subscription, hover zoom lens]
key_files:
  created:
    - src/presentation/hooks/product/useFavoriteProduct.js
    - src/app/(main)/favorites/page.jsx
    - src/app/(main)/product/[productId]/ProductImageZoom.jsx
  modified:
    - src/presentation/components/features/product/ProductCard/ProductCard.jsx
    - src/app/(main)/product/[productId]/page.jsx
    - src/presentation/components/features/product/ProductGrid/ProductGrid.jsx
    - src/app/(main)/product/[productId]/ProductGallery.jsx
decisions:
  - useFavoriteProduct uses optimistic update + revert on error to avoid Firestore latency impacting UX
  - ProductImageZoom uses CSS background-image zoom panel positioned to the right with pointer-events:none; hidden img tag triggers onImageLoad callback
  - Star button uses e.preventDefault + e.stopPropagation in ProductGrid (Link wrapper) to prevent navigation
  - favorites page re-fetches products on favoriteIds change rather than caching; acceptable for small favorite counts
metrics:
  duration: "4 minutes"
  completed_date: "2026-04-22"
  tasks_completed: 2
  files_modified: 7
---

# Phase 16 Plan 01: Product Favorites, Share, and Image Zoom Summary

Product browsing UX enhanced with star-based favorites system (Firestore arrayUnion/arrayRemove), Web Share API share button on product detail, and desktop hover image zoom magnifier.

## Tasks Completed

| # | Task | Commit | Files |
|---|------|--------|-------|
| 1 | Favorites hook, star icon on ProductCard and detail, share button | f8340b5 | useFavoriteProduct.js, ProductCard.jsx, page.jsx, ProductGrid.jsx |
| 2 | Favorites page and product image hover zoom | e61b8b2 | favorites/page.jsx, ProductImageZoom.jsx, ProductGallery.jsx |

## What Was Built

**useFavoriteProduct hook** (`src/presentation/hooks/product/useFavoriteProduct.js`):
- Real-time Firestore subscription to `users/{uid}.favoriteProductIds`
- `toggleFavorite(productId)` uses `arrayUnion`/`arrayRemove` with optimistic local state update
- `isFavorited(productId)` returns boolean
- Unauthenticated call shows toast "Sign in to save favorites" and returns early
- On Firestore write failure, optimistic update is reverted

**ProductCard star button** (`ProductCard.jsx`):
- Optional `isFavorited` + `onToggleFavorite` props; star only rendered when `onToggleFavorite` is provided
- Status badge moved from `top-right` to `top-left` to make room for star
- Gold fill (#FFD700) when favorited, white outline when not

**Product detail page** (`page.jsx`):
- Share2 button using `navigator.share()` with `navigator.clipboard.writeText()` fallback + `toast.success('Link copied!')`
- Star button next to status badge in product header
- Both use `useFavoriteProduct` hook

**ProductGrid** (`ProductGrid.jsx`):
- `useFavoriteProduct` imported at grid level; `isFavorited`/`onToggleFavorite` passed to each card
- Star button uses `e.preventDefault()` + `e.stopPropagation()` inside `<Link>` wrapper

**Favorites page** (`src/app/(main)/favorites/page.jsx`):
- Auth guard: unauthenticated users redirected to `/login?redirect=/favorites`
- Fetches all favorited products via `Promise.all` + product repository
- Loading skeleton, empty state with link to /products, grid of ProductCard components
- Removing a favorite removes the card from the page in real-time

**ProductImageZoom** (`ProductImageZoom.jsx`):
- Desktop-only (hidden on mobile/tablet via `hidden lg:block`)
- 300x300 zoom panel positioned to the right of the image container
- `background-size: 200%`, background-position tracks mouse coordinates
- 80px dashed lens indicator follows cursor on source image
- Hidden `<img>` sibling in ProductGallery triggers the existing `onImageLoad` callback

## Deviations from Plan

None - plan executed exactly as written.

## Self-Check

- [x] `src/presentation/hooks/product/useFavoriteProduct.js` — created
- [x] `src/app/(main)/favorites/page.jsx` — created (>40 lines)
- [x] `src/app/(main)/product/[productId]/ProductImageZoom.jsx` — created (>30 lines)
- [x] Commit f8340b5 exists
- [x] Commit e61b8b2 exists
- [x] Build passes with zero errors (`/favorites` route compiled as static)
