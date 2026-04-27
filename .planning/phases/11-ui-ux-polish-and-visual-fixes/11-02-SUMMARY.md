---
phase: 11-ui-ux-polish-and-visual-fixes
plan: "02"
subsystem: homepage-ui
tags: [ui, css, gold-treatment, cards, homepage]
dependency_graph:
  requires: ["11-01"]
  provides: ["unified-gold-card-theme"]
  affects: ["homepage"]
tech_stack:
  added: []
  patterns:
    - "Shared CSS utility classes (card-border-gold, card-bottom-gold, card-hover-gold) applied to all card types"
    - "Package icon from lucide-react replacing emoji placeholder"
    - "animate-shimmer utility class for image loading state"
    - "CountryFlag component rendered conditionally in fair card date box"
    - "select-none Tailwind class on outer scroll container divs"
key_files:
  created: []
  modified:
    - src/app/globals.css
    - src/app/(main)/homepage.css
    - src/presentation/components/homepage/Fairs/FairsSection.jsx
    - src/presentation/components/homepage/News/NewsSection.jsx
    - src/presentation/components/homepage/RFQs/HomepageRFQCard.jsx
    - src/presentation/components/homepage/Products/FeaturedProducts.jsx
    - src/presentation/components/homepage/Companies/CompaniesSection.jsx
    - src/presentation/components/homepage/RFQs/FeaturedRFQs.jsx
decisions:
  - "news-card gold styles updated in homepage.css (not globals.css) because homepage.css loads later via (main)/layout.jsx import and would override globals.css"
  - "product-card and company-card hover box-shadow simplified to match gold glow spec instead of the previous heavy drop shadows"
  - "select-none applied to outer dynamic-container and scroll row divs only — not to card content — preserving user ability to copy text from individual cards"
metrics:
  duration_minutes: 4
  completed_date: "2026-04-16"
  tasks_completed: 2
  files_modified: 8
requirements_satisfied:
  - UI-04
  - UI-05
  - UI-06
---

# Phase 11 Plan 02: Gold Card Visual Refresh Summary

**One-liner:** Unified gold border treatment (rgba 0.2 border, 0.4 bottom, 0.5 hover glow) applied to all homepage card types — fair, news, product, RFQ, company — plus Package icon placeholder, shimmer loading, country flag on fair cards, and select-none on scroll containers.

## What Was Built

Applied a cohesive premium gold accent theme across all six homepage card types:

1. **Fair cards** — border changed from `rgba(255,255,255,0.1)` to `rgba(255,215,0,0.2)`, gold bottom border added, hover glow updated to 300ms transition + `0 0 12px rgba(255,215,0,0.1)`. `CountryFlag` component rendered in `fair-date-box` when `fair.country` is present.

2. **News cards** — updated in `homepage.css` (where the authoritative `.news-card` rule lives, loaded after globals.css). Gold border spec applied with 300ms transition.

3. **RFQ cards** (`.rfq-card`) — gold border, gold bottom border, 300ms transition, consistent hover glow.

4. **Homepage RFQ cards** (`.hp-rfq-card`) — gold border treatment matching other card types.

5. **Product cards** — gold border, gold bottom border, 300ms transition, hover glow in homepage.css. Loading spinner replaced with `animate-shimmer` class. Emoji placeholder `📦` replaced with `Package` lucide icon + "No image" label.

6. **Company cards** — `#companies .company-card-inner` updated with `rgba(255,255,255,0.06)` background and gold border spec.

7. **Scroll containers** — `select-none` Tailwind class added to `dynamic-container` divs in FeaturedProducts, FeaturedRFQs, CompaniesSection, and to `fair-scroll-row` in FairsSection and news `dynamic-container` in NewsSection.

## Tasks Completed

| Task | Description | Commit |
|------|-------------|--------|
| 1 | Gold card treatment for fair, news, RFQ cards + country flag | e84639f |
| 2 | Product placeholder SVG, shimmer loading, company card gold, select-none | dbf487a |

## Deviations from Plan

**1. [Rule 2 - Missing critical fix] Updated homepage.css instead of globals.css for news-card**
- **Found during:** Task 1
- **Issue:** `.news-card` is defined in `homepage.css` which is imported AFTER `globals.css` via `(main)/layout.jsx`. Adding the gold treatment only to `globals.css` would have no effect since homepage.css overrides it.
- **Fix:** Updated `.news-card` directly in `homepage.css` for both border and hover styles.
- **Files modified:** `src/app/(main)/homepage.css`

**2. [Rule 2 - Missing critical fix] Updated product-card and company-card via homepage.css**
- **Found during:** Task 2
- **Issue:** `.product-card` and `#companies .company-card-inner` are defined in `homepage.css` and would override any globals.css additions.
- **Fix:** Updated styles directly in `homepage.css`.
- **Files modified:** `src/app/(main)/homepage.css`

## Self-Check: PASSED

All key files confirmed present. Both task commits (e84639f, dbf487a) verified in git history.
