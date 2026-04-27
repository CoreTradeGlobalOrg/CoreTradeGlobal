# Phase 11: UI/UX Polish and Visual Fixes - Research

**Researched:** 2026-04-15
**Domain:** React/Next.js CSS-first UI refinement, component restructuring, visual polish
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions

**Card visual refresh**
- Gold border `border: 1px solid rgba(255, 215, 0, 0.2)` applied to ALL homepage cards (fair, news, product, RFQ, company)
- Lighter card background: bump from `rgba(255,255,255,0.03)` to `rgba(255,255,255,0.06)`
- Gold gradient bottom border on all cards: `border-bottom: 2px solid` gradient from `#FFD700` to transparent
- Gold hover glow: border opacity increases from 20% to 50% + `box-shadow: 0 0 12px rgba(255,215,0,0.1)` with 300ms ease transition
- Fair cards: country flag placed in the date box area (flag + date combo section)
- News cards get same treatment as fair cards (gold border, lighter bg, gold gradient bottom)
- Fair listing page cards also get the same gold card treatment as homepage cards
- Product placeholder: styled SVG with lucide `Package` icon on subtle gradient background + "No image" text — replaces current 📦 emoji fallback
- Featured cards: add `user-select: none` CSS to prevent text selection

**Navbar & ticker layout**
- Currency ticker moves to dedicated thin bar ABOVE the main navbar
- Ticker bar scrolls away with the page; main navbar stays fixed/sticky
- Ticker visible on ALL pages site-wide (not just homepage)
- Ticker visible on mobile too — appears above hamburger navbar in thinner format
- Navbar gets reduced vertical padding after ticker removal (target ~48px height)
- Scroll overlap fix: `scroll-padding-top: calc(var(--navbar-height) + 16px)` on html — uses existing `--navbar-height` CSS variable from ResizeObserver

**Hero section**
- Slogan h1: silver metallic gradient text — `linear-gradient(180deg, #E8E8E8 0%, #C0C0C0 50%, #A0A0A0 100%)` with `WebkitBackgroundClip: text`
- Only the main h1 slogan gets silver treatment; subtitle stays current color
- No changes to hero stats cards or data visualization
- Globe rotation: reduce `autoRotateSpeed` from `2.5` to `2.0` (20% slower)
- Image loading: skeleton shimmer animation (gray gradient pulse left-to-right) while images load across homepage

**Fairs page UX**
- Upcoming + ongoing fairs shown in main grid; past fairs below a divider in collapsible section (collapsed by default, chevron toggle)
- Sort order: ongoing fairs pinned first (by start date), then upcoming (soonest first), then past (newest first, collapsed)
- Keep current text search — no status filter chips
- Fair listing page cards get same gold visual treatment as homepage

**Date picker consistency**
- Reuse existing `DatePicker.jsx` (react-day-picker v9 with dark theme, portal rendering) wherever native HTML date inputs exist
- No new date picker library needed

**Delete button wording**
- Clarify delete button labels to avoid misunderstanding (review and update wording across the platform)

**Style consistency**
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

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

---

## Summary

Phase 11 is a purely visual and interaction polish pass — no new data models, no Firestore schema changes, no new Cloud Functions. Every change is a CSS modification, JSX restructuring, or small state addition. The two most structurally significant changes are (1) extracting `CurrencyTicker` out of `Navbar` into its own above-nav bar that appears in the shared `(main)/layout.jsx`, and (2) adding a collapsible past-fairs section to `fairs/page.js` with a sort reorder.

All other changes are incremental: CSS class additions to `globals.css`, a new `@keyframes shimmer` animation, silver gradient on `.hero-slogan`, `autoRotateSpeed` one-liner, product placeholder SVG replacing an emoji, country flag in the fair card date box, and `DatePicker.jsx` substituted for native `<input type="date">` in 5 known files.

The codebase already has all required building blocks: `CountryFlag` component using `flagcdn.com`, `DatePicker.jsx` with react-day-picker v9, `lucide-react`'s `Package` icon, and the `--navbar-height` CSS variable via ResizeObserver. No new dependencies are needed.

**Primary recommendation:** Organize work into three plans — (A) Navbar/ticker restructuring + hero fixes, (B) Card visual refresh across all card types + shimmer, (C) Fairs page UX + date picker substitution + delete wording.

---

## Standard Stack

### Core (already installed — no new packages needed)

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React / Next.js (app router) | Current project version | Component rendering, routing | Project foundation |
| Tailwind CSS | Current project version | Utility classes + custom CSS | Project standard |
| lucide-react | Current | Icon set | Already used throughout; `Package` icon available |
| react-day-picker | v9 | Date picker | Already installed, `DatePicker.jsx` wrapper exists |
| flagcdn.com | CDN (no npm) | Country flag images | Already used in `CountryFlag.jsx` |

### No New Dependencies

No npm installs required for this phase. All tools and libraries are already present.

---

## Architecture Patterns

### Recommended Component Structure Changes

```
src/presentation/components/homepage/
├── Navbar/
│   └── Navbar.jsx            # Remove <CurrencyTicker /> — render it in layout instead
├── CurrencyTicker/
│   └── CurrencyTicker.jsx    # No logic changes — just repositioned in DOM
└── (main)/
    └── layout.jsx            # Add <CurrencyTicker /> ABOVE <Navbar />
```

The `CurrencyTicker` is rendered at the bottom of `Navbar.jsx` (line 439). Moving it to the layout means it scrolls with the page (not fixed), and `--navbar-height` via ResizeObserver naturally excludes it — so navbar-based offset calculations remain unaffected.

### Pattern 1: Ticker-Above-Navbar Layout

**What:** `CurrencyTicker` moves from inside `<nav>` to the layout wrapper, placed before `<Navbar>`. The ticker bar scrolls away on scroll; the navbar remains fixed.

**When to use:** Any financial/trade site that needs a live rate strip without consuming fixed navbar height.

```jsx
// src/app/(main)/layout.jsx — add CurrencyTicker ABOVE Navbar
export default function MainLayout({ children }) {
  return (
    <>
      <CurrencyTicker />    {/* scrolls away */}
      <Navbar />            {/* fixed, only tracks its own height */}
      ...
    </>
  );
}
```

**CRITICAL:** `--navbar-height` ResizeObserver is on `navRef` which wraps ONLY `<nav>`. After moving the ticker out, the CSS variable value decreases by ~28px (ticker height). Any `pt-[var(--navbar-height)]` on pages will need to be verified so content does not sit under the navbar. The ticker is NOT part of the fixed offset — this is intentional per decisions.

### Pattern 2: Gold Card CSS Class Consolidation

**What:** Shared CSS classes added to `globals.css` applied across all card types.

```css
/* globals.css — new shared card utilities */
.card-surface {
  background: rgba(255, 255, 255, 0.06);   /* bumped from 0.03 */
}

.card-border-gold {
  border: 1px solid rgba(255, 215, 0, 0.2);
}

.card-bottom-gold {
  border-bottom: 2px solid;
  border-image: linear-gradient(to right, #FFD700, transparent) 1;
}

.card-hover-gold {
  transition: border-color 300ms ease, box-shadow 300ms ease;
}
.card-hover-gold:hover {
  border-color: rgba(255, 215, 0, 0.5);
  box-shadow: 0 0 12px rgba(255, 215, 0, 0.1);
}
```

Apply these to: `.fair-card`, `.rfq-card`, `.hp-rfq-card`, `.news-card`, `.product-card`, company card JSX inline styles.

### Pattern 3: Skeleton Shimmer Animation

**What:** Left-to-right gradient sweep animation for image loading states.

```css
/* globals.css — shimmer keyframe */
@keyframes shimmer {
  0%   { background-position: -400px 0; }
  100% { background-position: 400px 0; }
}

.animate-shimmer {
  background: linear-gradient(
    90deg,
    rgba(255, 255, 255, 0.03) 25%,
    rgba(255, 255, 255, 0.08) 50%,
    rgba(255, 255, 255, 0.03) 75%
  );
  background-size: 800px 100%;
  animation: shimmer 1.5s infinite;
}
```

Apply in `ProductCardImage` (inside `FeaturedProducts.jsx`) in place of the current spinner, and in `NewsCard` image wrapper.

### Pattern 4: Fairs Page — Sorted + Collapsible Past Section

**What:** `fairs/page.js` partitions fairs into three buckets after fetching: ongoing, upcoming, past. Ongoing and upcoming render in the main grid. Past renders in a `<details>`-style collapsible below a `<hr>` divider.

```jsx
// fairs/page.js — after fetching all fairs
const now = new Date();
const ongoing = allFairs.filter(f => getFairStatus(f) === 'ongoing')
  .sort((a, b) => getDate(a.startDate) - getDate(b.startDate));
const upcoming = allFairs.filter(f => getFairStatus(f) === 'upcoming')
  .sort((a, b) => getDate(a.startDate) - getDate(b.startDate));
const past = allFairs.filter(f => getFairStatus(f) === 'past')
  .sort((a, b) => getDate(b.startDate) - getDate(a.startDate)); // newest first

const [pastExpanded, setPastExpanded] = useState(false);

// render: [...ongoing, ...upcoming] in main grid
// render: past below a divider, collapsed by default
// toggle: ChevronDown/ChevronUp with pastExpanded state
```

### Pattern 5: Product Image Placeholder (SVG with Package icon)

**What:** Replaces the `📦` emoji in `FeaturedProducts.jsx` `ProductCardImage` component with a styled SVG placeholder.

```jsx
// In ProductCardImage (FeaturedProducts.jsx)
if (!src || error) {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center
                    bg-gradient-to-br from-[#1A283B] to-[#0F1B2B] gap-2">
      <Package className="w-10 h-10 text-[rgba(255,255,255,0.2)]" />
      <span className="text-[10px] text-[rgba(255,255,255,0.3)] font-medium uppercase tracking-wider">
        No image
      </span>
    </div>
  );
}
```

### Pattern 6: Fair Card — Country Flag in Date Box

**What:** Adds `CountryFlag` component alongside the date in `.fair-date-box`. Fair data must have a `country` field (ISO 2-letter code). The date box splits into flag row + date row.

```jsx
// FairCard (FairsSection.jsx and fairs/page.js)
<div className="fair-date-box flex flex-col items-center gap-1">
  {fair.country && (
    <CountryFlag countryCode={fair.country} size={18} />
  )}
  <span className="fair-date-day">{startDateInfo.day}</span>
  <span className="fair-date-month">{startDateInfo.month}</span>
</div>
```

Note: `CountryFlag` already handles missing/invalid codes gracefully (returns null or globe emoji fallback).

### Anti-Patterns to Avoid

- **Animating `background-color` on navbar scroll:** The navbar already explicitly avoids background-color transition to prevent glitches. Do not add it.
- **Putting ticker inside `<nav>` after refactor:** Ticker must live OUTSIDE the `<nav>` element so `--navbar-height` excludes it.
- **Using `border-image` with `border-radius`:** CSS `border-image` and `border-radius` are incompatible. For the gold gradient bottom border on cards with `border-radius: 20px`, use a `::after` pseudo-element or a `background: linear-gradient` on the border area instead of `border-image`.
- **Conditional hook calls for DatePicker swap:** When replacing native date inputs, integrate DatePicker as a controlled component replacing the `<input>` — do not conditionally call hooks.

---

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Country flag images | Custom SVG/emoji flags | `CountryFlag` component (flagcdn.com) | Already built, handles errors, consistent sizing |
| Date picker UI | Custom calendar component | `DatePicker.jsx` wrapper | react-day-picker v9 already integrated, dark theme matches CTG |
| Shimmer skeleton animation | JS-driven loading spinners | CSS `@keyframes shimmer` utility class | Pure CSS, performant, consistent with existing pattern |
| Collapsible section | Accordion library | Native `useState` + Chevron icon | No animation complexity needed, pattern matches existing deals/codebase |
| Package icon | Custom SVG | `lucide-react Package` | Already installed, consistent icon weight |

---

## Common Pitfalls

### Pitfall 1: `--navbar-height` Value After Ticker Move

**What goes wrong:** After moving `CurrencyTicker` out of `<nav>` and into layout above it, `--navbar-height` will be ~28px smaller. Pages that use `pt-[var(--navbar-height)]` for top padding will show content sitting ~28px too high — under the navbar.

**Why it happens:** The ResizeObserver on `navRef` only tracks the `<nav>` element's height. When the ticker was inside `<nav>`, it contributed to that height. After the move, it doesn't.

**How to avoid:** After the ticker move, check every page that uses `pt-[var(--navbar-height)]` or `top: var(--navbar-height)`. Per the decisions, this is INTENTIONAL — the ticker scrolls away and is not part of the fixed offset. Content should be pinned below the fixed navbar only. Verify the fallback value on line 10 of globals.css (`--navbar-height: 128px`) is updated to reflect the new navbar-only height (~100px unscrolled).

**Warning signs:** Hero section or page content peeking behind the fixed navbar on initial load.

### Pitfall 2: `border-image` + `border-radius` Incompatibility

**What goes wrong:** Applying `border-image` for the gold gradient bottom border on rounded cards causes the `border-radius` to be ignored — cards appear with square corners.

**Why it happens:** CSS specification: `border-image` and `border-radius` cannot be combined on the same element.

**How to avoid:** Use one of these approaches for the gold gradient bottom border:
- `::after` pseudo-element positioned at the bottom of the card with `border-radius` matching the card's bottom corners
- OR apply the gradient bottom border via a wrapper/overlay technique
- Simplest working approach: `border-bottom: 2px solid #FFD700` (solid gold, no gradient) — visually close enough given rounded corners mask the gradient endpoints

**Warning signs:** Card corners becoming square after adding gradient border.

### Pitfall 3: Dual FairCard Implementations Getting Out of Sync

**What goes wrong:** `FairCard` is implemented in two places — `FairsSection.jsx` (homepage) and inline in `fairs/page.js` (listing page). Adding flag + gold border to one and forgetting the other creates visual inconsistency.

**Why it happens:** The listing page has its own inline card JSX instead of importing the homepage component.

**How to avoid:** Either (a) extract a shared `FairCard` component used by both, or (b) update both files in the same plan task. The planner should treat both files as a single atomic change.

### Pitfall 4: Ticker Mobile Height Causing Navbar Height Jank

**What goes wrong:** On mobile, the ticker bar + navbar stacks differently. If the ticker wraps to two lines on small screens (e.g., 320px viewports), `--navbar-height` is correct but the ticker above it pushes content down more than expected.

**Why it happens:** The ticker bar is not fixed, it scrolls away. If the user doesn't scroll, the full ticker + navbar height pushes page content down. The ResizeObserver doesn't track ticker height.

**How to avoid:** Keep ticker to a single line on all screen sizes. The existing `text-[10px] sm:text-xs` sizing and `whitespace-nowrap` on the marquee content should prevent wrapping. Verify on narrow mobile.

### Pitfall 5: `DatePicker.jsx` Controlled vs. Uncontrolled Integration

**What goes wrong:** Native `<input type="date">` returns a `string` in `YYYY-MM-DD` format. `DatePicker.jsx` works with `Date` objects. Swapping without converting the value type breaks form validation or Firestore writes.

**Why it happens:** react-hook-form or manual `useState` expects the same type before/after the swap.

**How to avoid:** When replacing each native date input, verify the form's `onChange` handler and submit transform. Add a `dateToString` / `stringToDate` adapter where needed. The 5 files with native date inputs are:
1. `DealFormFields.jsx`
2. `CounterOfferForm.jsx`
3. `FairForm.jsx` (admin)
4. `ShipmentUpdateForm.jsx` (provider)
5. `SubmitQuoteDialog.jsx` (request)

### Pitfall 6: `user-select: none` Scope

**What goes wrong:** Applying `user-select: none` too broadly prevents users from copying useful text (product names, prices, contact info).

**Why it happens:** A global `.card-surface` class might get `user-select: none` applied.

**How to avoid:** Apply `user-select: none` only to featured/scrolling card containers (the outer scroll row div), NOT to individual cards or their content. The intent is to prevent accidental text selection during horizontal drag-scrolling on desktop.

---

## Code Examples

Verified patterns from project codebase:

### Hero Slogan Silver Gradient (globals.css)
```css
/* src/app/globals.css — add to .hero-slogan */
.hero-slogan {
  background: linear-gradient(180deg, #E8E8E8 0%, #C0C0C0 50%, #A0A0A0 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
}
```

### Globe Speed Reduction (GlobeCanvas.jsx line 335)
```jsx
// Change from 2.5 to 2.0
<OrbitControls
  autoRotate
  autoRotateSpeed={2.0}   // was 2.5
  ...
/>
```

### Scroll Padding Fix (globals.css — html element)
```css
html {
  scroll-padding-top: calc(var(--navbar-height) + 16px);
}
```

### Gold Card Applied to .fair-card (globals.css)
```css
/* Update existing .fair-card */
.fair-card {
  background: linear-gradient(160deg, rgba(26,28,32,0.6) 0%, rgba(15,27,43,0.8) 100%);
  border: 1px solid rgba(255, 215, 0, 0.2);   /* was rgba(255,255,255,0.1) */
  border-radius: 20px;
  /* ... existing props ... */
  transition: border-color 300ms ease, box-shadow 300ms ease, transform 0.3s;
}

.fair-card:hover {
  transform: translateY(-8px);
  border-color: rgba(255, 215, 0, 0.5);         /* was #FFD700 flat */
  box-shadow: 0 0 12px rgba(255, 215, 0, 0.1);  /* new glow */
}
```

### Fairs Past Section Toggle (fairs/page.js pattern)
```jsx
const [pastExpanded, setPastExpanded] = useState(false);

// After main grid:
{past.length > 0 && (
  <div className="mt-12">
    <div className="flex items-center gap-4 mb-6">
      <hr className="flex-1 border-[rgba(255,255,255,0.1)]" />
      <button
        onClick={() => setPastExpanded(v => !v)}
        className="flex items-center gap-2 text-[#A0A0A0] text-sm hover:text-white transition-colors"
      >
        Past Fairs ({past.length})
        {pastExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      <hr className="flex-1 border-[rgba(255,255,255,0.1)]" />
    </div>
    {pastExpanded && (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
        {past.map(fair => <FairCard key={fair.id} fair={fair} />)}
      </div>
    )}
  </div>
)}
```

### CountryFlag in FairCard Date Box
```jsx
// Import at top of FairsSection.jsx (already exists in CompaniesSection)
import { CountryFlag } from '@/presentation/components/common/CountryFlag/CountryFlag';

// In FairCard JSX:
<div className="fair-date-box flex flex-col items-center gap-2">
  {fair.country && <CountryFlag countryCode={fair.country} size={20} />}
  <span className="fair-date-day">{startDateInfo.day}</span>
  <span className="fair-date-month">{startDateInfo.month}</span>
</div>
```

---

## File Change Inventory

The planner should scope tasks around this precise file list:

### Plan A — Navbar restructuring + hero + globe

| File | Change |
|------|--------|
| `src/app/(main)/layout.jsx` | Add `<CurrencyTicker />` above `<Navbar />` |
| `src/presentation/components/homepage/Navbar/Navbar.jsx` | Remove `<CurrencyTicker />` (line 439); reduce `.navbar-content` height to ~48px |
| `src/presentation/components/homepage/Globe/GlobeCanvas.jsx` | `autoRotateSpeed={2.0}` (line 335) |
| `src/presentation/components/homepage/Hero/HeroSection.jsx` | Silver gradient on `.hero-slogan` class or inline style on h1 |
| `src/app/globals.css` | `.hero-slogan` silver gradient; update `--navbar-height` fallback; add `scroll-padding-top` on html; reduce `.navbar-content` height |

### Plan B — Card visual refresh + shimmer + product placeholder

| File | Change |
|------|--------|
| `src/app/globals.css` | Update `.fair-card`, `.rfq-card`, `.hp-rfq-card` gold border + hover; add `@keyframes shimmer` + `.animate-shimmer`; add `.card-surface`, `.card-border-gold`, `.card-hover-gold` utilities |
| `src/presentation/components/homepage/Fairs/FairsSection.jsx` | Gold class on `.fair-card`; add `CountryFlag` to date box |
| `src/presentation/components/homepage/Products/FeaturedProducts.jsx` | Replace `📦` emoji with SVG + Package icon placeholder; add shimmer to `ProductCardImage` |
| `src/presentation/components/homepage/News/NewsSection.jsx` | Add gold border treatment to news card |
| `src/presentation/components/homepage/RFQs/HomepageRFQCard.jsx` | Apply gold border treatment |
| `src/presentation/components/homepage/Companies/CompaniesSection.jsx` | Apply gold border treatment to company card |
| `src/presentation/components/homepage/RFQs/FeaturedRFQs.jsx` | `user-select: none` on scroll container |

### Plan C — Fairs page UX + date picker + delete wording

| File | Change |
|------|--------|
| `src/app/(main)/fairs/page.js` | Sort + collapsible past section; gold card treatment on listing cards; add `CountryFlag` to date box |
| `src/presentation/components/features/deal/DealFormFields.jsx` | Replace `<input type="date">` with `DatePicker` |
| `src/presentation/components/features/deal/CounterOfferForm/CounterOfferForm.jsx` | Replace `<input type="date">` with `DatePicker` |
| `src/presentation/components/features/admin/FairsManager/FairForm.jsx` | Replace `<input type="date">` with `DatePicker` |
| `src/presentation/components/features/provider/ShipmentUpdateForm.jsx` | Replace `<input type="date">` with `DatePicker` |
| `src/presentation/components/features/request/SubmitQuoteDialog/SubmitQuoteDialog.jsx` | Replace `<input type="date">` with `DatePicker` |
| Various files with delete buttons | Audit and reword labels for clarity (DangerSection, NewsManager, FairsList, ProductList, ProductForm, etc.) |

---

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Emoji fallback `📦` for missing images | Styled SVG placeholder with icon | Phase 11 | Consistent look across all platforms (no emoji rendering differences) |
| CurrencyTicker inside `<nav>` | CurrencyTicker as separate bar above nav in layout | Phase 11 | Ticker visible site-wide; navbar height is nav-only |
| Native `<input type="date">` scattered across forms | `DatePicker.jsx` (react-day-picker v9, dark theme) | Phase 11 | Consistent UX, matches CTG dark design |
| All fairs in one flat grid | Ongoing+upcoming in grid, past in collapsible | Phase 11 | Cleaner signal/noise; past fairs don't dominate active listings |

---

## Open Questions

1. **`border-image` vs. `::after` for gradient bottom border**
   - What we know: `border-image` + `border-radius` are incompatible in CSS
   - What's unclear: Whether the gradient bottom is visually necessary or if solid `#FFD700` bottom border is sufficient
   - Recommendation: Use solid `border-bottom: 2px solid rgba(255,215,0,0.4)` — cleaner, no compatibility issue, still communicates gold theme. If gradient is required, use `::after` pseudo-element.

2. **`--navbar-height` fallback value**
   - What we know: Currently hardcoded as `128px` (line 10 of globals.css) — includes ticker height
   - What's unclear: Whether any SSR or initial render relies on the fallback before ResizeObserver fires
   - Recommendation: Update fallback to `100px` after moving ticker. ResizeObserver will correct it client-side within one frame.

3. **`DatePicker.jsx` integration with react-hook-form**
   - What we know: Project uses `zodResolver + react-hook-form` as Phase 7 standard. `DatePicker.jsx` likely needs a `Controller` wrapper.
   - What's unclear: Current forms (DealFormFields, CounterOfferForm) may use uncontrolled or manual state for the date field
   - Recommendation: Use `Controller` from react-hook-form wrapping `DatePicker`. Set `mode: 'onChange'`. Planner should note this per-file.

---

## Sources

### Primary (HIGH confidence)
- Direct code inspection of `/Users/wenubey/Desktop/CTG/core-trade-global/src/` — all file paths and line numbers verified against actual source
- `globals.css` — all CSS classes and current values verified line-by-line
- `Navbar.jsx` — ticker location (line 439), ResizeObserver pattern confirmed
- `GlobeCanvas.jsx` — `autoRotateSpeed={2.5}` confirmed at line 335
- `FairsSection.jsx`, `fairs/page.js`, `FeaturedProducts.jsx`, `NewsSection.jsx` — card structures verified
- `CountryFlag.jsx` — flagcdn.com implementation, error handling verified
- `DatePicker.jsx` — react-day-picker v9, portal rendering confirmed
- `(main)/layout.jsx` — Navbar placement and site-wide layout structure confirmed

### Secondary (MEDIUM confidence)
- CONTEXT.md decisions — all implementation choices locked by user session

---

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — no new dependencies, all libraries verified in codebase
- Architecture: HIGH — all component locations and CSS classes read from actual source files
- Pitfalls: HIGH — border-image/border-radius incompatibility is a CSS spec fact; --navbar-height impact verified by reading ResizeObserver code; dual FairCard locations verified by inspection

**Research date:** 2026-04-15
**Valid until:** 2026-05-15 (stable UI codebase, no external API changes)
