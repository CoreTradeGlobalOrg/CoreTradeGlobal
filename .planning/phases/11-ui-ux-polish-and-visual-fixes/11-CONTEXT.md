# Phase 11: UI/UX Polish and Visual Fixes - Context

**Gathered:** 2026-04-15
**Status:** Ready for planning

<domain>
## Phase Boundary

Visual refinements and interaction fixes across homepage, fairs, cards, navbar, and miscellaneous UX items — 14 items from BUG FIX.docx backlog. Covers card visual refresh (gold borders, lighter tones, country flags), navbar/ticker restructuring, hero slogan styling, fairs page UX improvements, and style consistency consolidation. No new capabilities — all items polish existing features.

</domain>

<decisions>
## Implementation Decisions

### Card visual refresh
- Gold border `border: 1px solid rgba(255, 215, 0, 0.2)` applied to ALL homepage cards (fair, news, product, RFQ, company)
- Lighter card background: bump from `rgba(255,255,255,0.03)` to `rgba(255,255,255,0.06)`
- Gold gradient bottom border on all cards: `border-bottom: 2px solid` gradient from `#FFD700` to transparent
- Gold hover glow: border opacity increases from 20% to 50% + `box-shadow: 0 0 12px rgba(255,215,0,0.1)` with 300ms ease transition
- Fair cards: country flag placed in the date box area (flag + date combo section)
- News cards get same treatment as fair cards (gold border, lighter bg, gold gradient bottom)
- Fair listing page cards also get the same gold card treatment as homepage cards
- Product placeholder: styled SVG with lucide `Package` icon on subtle gradient background + "No image" text — replaces current 📦 emoji fallback
- Featured cards: add `user-select: none` CSS to prevent text selection

### Navbar & ticker layout
- Currency ticker moves to dedicated thin bar ABOVE the main navbar
- Ticker bar scrolls away with the page; main navbar stays fixed/sticky
- Ticker visible on ALL pages site-wide (not just homepage)
- Ticker visible on mobile too — appears above hamburger navbar in thinner format
- Navbar gets reduced vertical padding after ticker removal (target ~48px height)
- Scroll overlap fix: `scroll-padding-top: calc(var(--navbar-height) + 16px)` on html — uses existing `--navbar-height` CSS variable from ResizeObserver

### Hero section
- Slogan h1: silver metallic gradient text — `linear-gradient(180deg, #E8E8E8 0%, #C0C0C0 50%, #A0A0A0 100%)` with `WebkitBackgroundClip: text`
- Only the main h1 slogan gets silver treatment; subtitle stays current color
- No changes to hero stats cards or data visualization
- Globe rotation: reduce `autoRotateSpeed` from `2.5` to `2.0` (20% slower)
- Image loading: skeleton shimmer animation (gray gradient pulse left-to-right) while images load across homepage

### Fairs page UX
- Upcoming + ongoing fairs shown in main grid; past fairs below a divider in collapsible section (collapsed by default, chevron toggle)
- Sort order: ongoing fairs pinned first (by start date), then upcoming (soonest first), then past (newest first, collapsed)
- Keep current text search — no status filter chips
- Fair listing page cards get same gold visual treatment as homepage

### Date picker consistency
- Reuse existing `DatePicker.jsx` (react-day-picker v9 with dark theme, portal rendering) wherever native HTML date inputs exist
- No new date picker library needed

### Delete button wording
- Clarify delete button labels to avoid misunderstanding (review and update wording across the platform)

### Style consistency
- Consolidate duplicated color/size values into shared Tailwind classes or CSS variables as each component is touched during implementation
- Examples: `.card-surface` for card bg, `.card-border-gold` for gold border, `.card-hover-gold` for hover glow
- Not a separate audit pass — clean up incrementally during implementation

### Claude's Discretion
- Exact shimmer animation CSS implementation
- Delete button rewording specifics (review current labels and improve clarity)
- Which specific pages have native date inputs to replace
- Shared class naming conventions for style consolidation
- Ticker bar height and styling details on mobile
- Fair card date box + flag layout specifics

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- `CurrencyTicker.jsx`: Existing marquee component with `TICKER_PAIRS`, EUR base conversion, staleness indicator — needs relocation from inside navbar to separate bar
- `DatePicker.jsx`: react-day-picker v9 with dark theme, portal rendering, 4 accent color themes — ready for reuse across platform
- `useScrollLoadMore` hook: Lazy loading with IntersectionObserver — already in use for featured sections
- `useResponsiveLimit` hook: Responsive item counts per breakpoint
- Lucide-react icons: Already used throughout app — `Package` icon available for product placeholder

### Established Patterns
- Glass-card: `bg-[rgba(255,255,255,0.03)]` inner cards, `text-white` headings, `text-[#A0A0A0]` descriptions
- Gold accent: `#FFD700` with `!text-black` on gold backgrounds (Phase 5/6/7 standard)
- Skeleton loading: 6 placeholder cards pattern on fairs page
- Navbar scroll: requestAnimationFrame throttling, `isScrolled` state at `scrollY > 50`
- `--navbar-height` CSS variable tracked via ResizeObserver
- `animate-marquee 40s linear infinite` for ticker, hover pause via `animation-play-state`

### Integration Points
- `Navbar.jsx` (lines 56-101): Scroll behavior, ticker integration — needs restructuring to extract ticker
- `GlobeCanvas.jsx` (line 335): `autoRotateSpeed={2.5}` → `2.0`
- `HeroSection.jsx` (line 181): `.hero-slogan` class — add silver gradient
- `FairsSection.jsx` (lines 52-98): Fair card component — add flag, gold border, gradient bottom
- `FeaturedProducts.jsx` (lines 141-165): Product image placeholder — replace emoji with SVG
- `fairs/page.js`: Fairs listing — add sorting, collapsible past section
- `globals.css`: Marquee keyframes (line 1056-1062), shared card classes to add

</code_context>

<specifics>
## Specific Ideas

- Ticker bar above navbar is a common pattern on financial/trade sites — establishes CTG as a serious trade platform
- Fair card flag in date box area gives geographical context at a glance
- Gold border glow on hover makes cards feel premium and interactive
- Skeleton shimmer (not blur-up) for image loading — no extra image data needed, consistent with existing skeleton patterns
- Style consolidation targets: card backgrounds, gold borders, hover effects, text hierarchy — define once, use everywhere

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 11-ui-ux-polish-and-visual-fixes*
*Context gathered: 2026-04-15*
