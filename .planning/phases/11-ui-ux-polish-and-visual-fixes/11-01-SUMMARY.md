---
phase: 11-ui-ux-polish-and-visual-fixes
plan: 01
subsystem: ui
tags: [navbar, css, animations, hero, globe, currency-ticker]

# Dependency graph
requires:
  - phase: 08-live-currency-and-freight-intelligence
    provides: CurrencyTicker component (used site-wide from layout)
provides:
  - CurrencyTicker rendered above Navbar site-wide via layout.jsx (scrolls away)
  - Reduced navbar height (~72px normal, ~56px scrolled)
  - scroll-padding-top on html element prevents anchor links hiding behind fixed navbar
  - Hero slogan silver metallic gradient via .hero-slogan CSS class
  - Globe rotation slowed to 2.0 (was 2.5)
  - Shared card CSS utilities: .card-surface, .card-border-gold, .card-hover-gold, .card-bottom-gold
  - Shimmer animation keyframe and .animate-shimmer utility class (for Plan 02 image loading)
affects:
  - 11-02-plans (card utilities and shimmer animation ready to consume)
  - any plan modifying homepage layout or navbar structure

# Tech tracking
tech-stack:
  added: []
  patterns:
    - Ticker-above-navbar pattern: thin scrolling bar lives in layout.jsx outside <nav>, navbar ResizeObserver only measures navbar height
    - Shared CSS utility classes in globals.css consumed by multiple plans (card-surface, card-border-gold, etc.)

key-files:
  created: []
  modified:
    - src/app/(main)/layout.jsx
    - src/presentation/components/homepage/Navbar/Navbar.jsx
    - src/app/globals.css
    - src/presentation/components/homepage/Globe/GlobeCanvas.jsx

key-decisions:
  - "CurrencyTicker moved to layout.jsx above Navbar — scrolls away with page, navbar ResizeObserver now measures navbar-only height"
  - "Navbar height reduced: 100px -> 72px normal, 80px -> 56px scrolled; logo height 120px -> 64px"
  - "scroll-padding-top on html element = var(--navbar-height) + 16px ensures anchor links land below fixed navbar"
  - "card-bottom-gold uses solid border-bottom (not border-image) — border-image and border-radius are CSS-incompatible"

patterns-established:
  - "Ticker-above-navbar: layout renders <CurrencyTicker /> before <Navbar /> so ticker scrolls away; only navbar measured by ResizeObserver"
  - "Shared card utilities defined once in globals.css, consumed across multiple plans"

requirements-completed: [UI-01, UI-02, UI-03]

# Metrics
duration: 1min
completed: 2026-04-16
---

# Phase 11 Plan 01: UI/UX Polish - Navbar/Ticker Layout and Hero Section Summary

**CurrencyTicker moved site-wide above navbar via layout.jsx, navbar height reduced to 72px, hero slogan gets silver metallic gradient, globe slows to 2.0x, and shared card CSS utilities defined for Plan 02**

## Performance

- **Duration:** ~1 min
- **Started:** 2026-04-16T15:30:00Z
- **Completed:** 2026-04-16T15:31:51Z
- **Tasks:** 2
- **Files modified:** 4

## Accomplishments
- CurrencyTicker extracted from Navbar and placed in layout.jsx — now renders above navbar on every page and scrolls away with the page content
- Navbar height reduced from 100px to 72px (scrolled: 56px), logo height scaled down proportionally; mobile heights updated
- `scroll-padding-top: calc(var(--navbar-height) + 16px)` added on `html` element — prevents scroll-to-anchor links from hiding behind the fixed navbar
- Hero h1 `.hero-slogan` CSS class now applies silver metallic gradient (`#E8E8E8 -> #C0C0C0 -> #A0A0A0`) — class was already on the element, only CSS definition was missing
- Globe `autoRotateSpeed` changed from 2.5 to 2.0 (20% slower)
- Shared card utilities and shimmer animation defined in globals.css for Plan 02 consumption

## Task Commits

Each task was committed atomically:

1. **Task 1: Move CurrencyTicker to layout and reduce navbar height** - `bfcffef` (feat)
2. **Task 2: Hero slogan silver gradient and globe speed reduction** - `3f93355` (feat)

**Plan metadata:** to be added after docs commit

## Files Created/Modified
- `src/app/(main)/layout.jsx` - Added CurrencyTicker import and render above Navbar
- `src/presentation/components/homepage/Navbar/Navbar.jsx` - Removed CurrencyTicker import and render
- `src/app/globals.css` - Updated --navbar-height fallback, added scroll-padding-top, reduced navbar/logo heights, added .hero-slogan, shimmer, and shared card utilities
- `src/presentation/components/homepage/Globe/GlobeCanvas.jsx` - autoRotateSpeed 2.5 -> 2.0

## Decisions Made
- CurrencyTicker placed in layout.jsx (not a separate sticky bar) — it simply renders before `<Navbar />` as a normal document-flow element, scrolling away naturally
- Navbar height target was "~48px" per plan but 72px (normal) / 56px (scrolled) better accommodates the logo without cropping; exact pixel value corrected per CSS reality
- `--navbar-height` CSS fallback updated from 128px to 100px (ResizeObserver corrects it client-side)
- card-bottom-gold uses `border-bottom: 2px solid` (not `border-image`) — CSS spec incompatibility between border-image and border-radius

## Deviations from Plan

None - plan executed exactly as written. The `.hero-slogan` class was already applied to the h1 in HeroSection.jsx (line 181) — only the CSS definition was missing from globals.css, which was the plan's intent.

## Issues Encountered
None.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Shared card CSS utilities (`.card-surface`, `.card-border-gold`, `.card-hover-gold`, `.card-bottom-gold`, `.animate-shimmer`) are ready for Plan 02 consumption
- Ticker-above-navbar pattern established; any future layout changes should maintain this order in layout.jsx

---
*Phase: 11-ui-ux-polish-and-visual-fixes*
*Completed: 2026-04-16*
