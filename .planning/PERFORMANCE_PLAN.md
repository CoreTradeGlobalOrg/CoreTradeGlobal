# Homepage Performance Plan

Created 2026-10-12 from Lighthouse 13.5 runs on https://www.coretradeglobal.com (homepage).

**Status (2026-10-13)**: quick batch done (1.1, 1.4, 2.3, Priority 3, plus a mobile CLS fix)
and live in production; 1.2 measured and not kept; 2.6 done. See "Progress log" at the bottom.
Next: 1.3 thumbnails (now the biggest mobile LCP lever, see the 2.6 entry), then the rest of
Priority 2.

## Baseline (2026-10-12, production)

| Metric | Desktop | Mobile (Moto G Power, slow 4G) |
|---|---|---|
| Performance | **82** | **55** |
| Accessibility | 100 | 98 |
| Best Practices | 96 | 96 |
| SEO | 92 | 92 |
| FCP | 0.4 s | 2.3 s |
| LCP | 0.9 s | **6.2 s** |
| TBT | 340 ms | **640 ms** |
| CLS | 0 | 0 |
| Speed Index | 1.7 s | 5.5 s |

Mobile is the real problem. The four bottlenecks: the Firebase Auth iframe on
every load, render-blocking CSS, full-size images, and main-thread JS.

## Already in good shape (do not redo)

- **Analytics**: GA (gtag) and Clarity load with `strategy="lazyOnload"` (`src/app/layout.js`).
- **Font**: Inter via `next/font`, `subsets: ['latin']`, `display: 'optional'`, `preload: false`.
- **Browserslist** is already modern (`chrome >= 108`, `safari >= 16`, ...). The 14 KiB
  "legacy JavaScript" finding comes from Next.js's own polyfills, low priority.
- **Globe on mobile**: never mounted (`HeroGlobe mounted={canMountGlobe && !isMobile}` in
  `src/presentation/components/homepage/Hero/HeroSection.jsx`). three.js and the texture are
  not downloaded on mobile. `#canvas-container` and `.globe-loading-text` are
  `display: none !important` on mobile (`src/app/(main)/homepage.css`).

## Priority 1: biggest wins, low risk

### 1.1 Stop loading the Firebase Auth iframe on every page load (DONE 2026-10-13)
- **Problem**: the longest mobile critical chain (2.9 s): `auth/iframe.js` (93 KiB) on
  `core-trade-global.firebaseapp.com`, then gapi, then `relyingparty/getProjectConfig`.
  Cause: `getAuth(app)` (in `src/core/config/firebase.config.js`, `getAuthAsync` /
  `getAuthSync`) installs `browserPopupRedirectResolver`, which loads the popup iframe eagerly.
- **Fix**: initialize with `initializeAuth(app, { persistence: [indexedDBLocalPersistence,
  browserLocalPersistence] })` and no `popupRedirectResolver`. Pass
  `browserPopupRedirectResolver` only where popups are used (Google sign-in:
  `src/presentation/hooks/auth/useGoogleAuth.js`, and any `signInWithPopup` /
  `linkWithPopup` / `reauthenticateWithPopup` call; grep for them).
- **Check**: email/password login, Google login, LinkedIn login (custom token), email-link
  login (`/email-link`), onboarding wizard, password reset, MFA.
- **Expected**: mobile LCP −1 to −2 s, about 150 KiB less JS.

### 1.2 Remove render-blocking CSS (MEASURED 2026-10-13, NOT KEPT)
- **Problem**: 4 CSS files (45 KiB transfer) block first paint; Lighthouse estimates 1.6 s on mobile.
- **Tried**: Next.js 16 `experimental.inlineCss: true`. The CSS is really ~262 KB raw (42 KB gzip;
  one chunk alone is 208 KB raw) and Next repeats it in the RSC payload, so the homepage HTML
  went from 29 KB to 146 KB gzip. Local mobile score flat (75 vs 76, 5 runs each); FCP 1.66 →
  2.26 s, Speed Index 2.23 → 3.58 s, simulated LCP 7.07 → 5.41 s. Not worth a 5× HTML on
  every page; a note is left in `next.config.mjs`.
- **Better fix, moved to 2.5**: shrink the CSS.

### 1.3 Product and logo thumbnails
- **Problem**: `images.unoptimized: true` in `next.config.mjs`. Cards that are 175 px wide get
  1200×1200 originals from Firebase Storage. Savings: about 600 KiB mobile, 1.5 MiB desktop.
- **Fix** (preferred over Vercel Image Optimization, which is billed per image):
  - generate a 400 px WebP thumbnail on upload (Cloud Function on Storage finalize, or
    client-side next to the existing `compressImage` presets in `src/lib/image-utils`);
  - store its URL on the product (for example `thumbnailUrl`) and the company logo;
  - one-off backfill function for existing products and logos;
  - cards and hero ad cards use the thumbnail, the product detail page keeps the full image.
- **Also**: the mobile LCP element is probably a hero ad image
  (`src/presentation/components/homepage/Hero/HeroMobileAdCards.jsx`). Give it
  `fetchpriority="high"` and no lazy loading. (Local runs on 2026-10-13 showed
  `h1.hero-slogan` as the LCP element; check again with real ad data.)
- **Why it matters for LCP (measured 2026-10-13)**: the product card images are
  `loading="lazy"`, but on mobile the first six are inside the lazy-load distance, so Chrome
  requests them during the first layout: ~870 KiB (145–187 KiB each). Lighthouse's simulated
  LCP counts every request that started before the observed LCP, so these images are most of
  the remaining ~5 s.
- **Note**: the biggest work item: upload flow, a function and a backfill.

### 1.4 Globe (DONE 2026-10-13)
- **Mobile**: cleanup only. Do not render `#canvas-container` and the "Welcome to
  CoreTradeGlobal" loading text on mobile at all. Small score impact. Keep it CLS-safe: the
  server does not know the viewport, so keep the CSS hide as well.
- **Desktop**: `public/textures/earth_specular_2048.jpg` is 219 KiB, but the worker
  (`src/presentation/components/homepage/Globe/globe.worker.js`, `mapUrl`) and the fallback
  (`GlobeCanvasFallback.jsx`) only read it at 1024×512 as a land/sea mask. Replace it with a
  1024×512 grayscale WebP (about 20–30 KiB) and update both `mapUrl`s.

## Priority 2: JavaScript work

### 2.1 Homepage Firestore realtime listeners
- **Problem**: `FeaturedProducts.jsx` and `FeaturedRFQs.jsx`
  (`src/presentation/components/homepage/...`) already get SSR data but also open
  `subscribeToQuery` (onSnapshot) on hydration. That loads Firestore's WebChannel early and
  causes the `Listen/channel ... ERR_TIMED_OUT` console errors (Best Practices 96).
- **Fix**: render SSR data, refresh once with a one-shot query on idle, no realtime listener on
  the homepage.

### 2.2 Main JS chunk
- `35craq0ck01tf.js` runs about 1 s on mobile. Check the bundle treemap (Lighthouse "View
  Treemap" or `next build` analysis), find which Firebase modules or libraries load on the
  homepage without being needed, and defer them.

### 2.3 Preconnects (DONE 2026-10-13; the "/" one comes from next/font with `preload: false`, kept)
- 5 preconnects (Lighthouse wants at most 4). Remove the self `preconnect "/"`; after 1.1 also
  `core-trade-global.firebaseapp.com`; the Clarity preconnect is pointless with `lazyOnload`.
  Keep `firestore.googleapis.com` and `firebasestorage.googleapis.com`.
  Preconnects are in `src/app/layout.js`.

### 2.4 Jank
- Forced reflow of about 160 ms and 4 non-composited animations (desktop). Record a Performance
  trace to find them. Suspects: currency ticker, hero cards. Move animations to
  `transform` / `opacity`.

### 2.5 Shrink the CSS (added 2026-10-13, replaces 1.2)
- `.next/static/chunks/*.css` for the homepage: one 208 KB raw / 32 KB gzip chunk (globals.css +
  Tailwind + homepage.css), plus 44 KB, 7 KB, 2 KB. Find unused global rules and per-page CSS
  that ships on every route; smaller CSS shortens the render-blocking step without inlining.

### 2.6 Hero text waits for a Suspense swap (added 2026-10-13, DONE 2026-10-13)
- Mobile LCP is still ~7 s (simulated). The LCP element is `h1.hero-slogan` (text), but
  `src/app/(main)/loading.jsx` wraps the homepage in a Suspense boundary: even the static HTML
  ships the loading fallback first and the real sections in `<div hidden id="S:0">`, revealed by
  an inline `$RC` script near byte 79K of the 159 KB HTML. Worth testing the homepage without
  that boundary (for example a route that is not under `(main)/loading.jsx`), keeping the
  `notFound()` caveat in "Working rules" in mind.
- **Cause**: React writes a Suspense boundary larger than ~12.8 KB (`progressiveChunkSize`)
  out of order even when it is already complete, and Next does not expose that setting.
- **Done**: the homepage moved to `src/app/(home)/page.js`; `(home)/layout.jsx` reuses
  `(main)/layout` (same pattern as `(detail)`), `(home)/error.jsx` reuses `(main)/error`.
  Trade-off: navigating between `/` and a `(main)` page remounts the layout (Navbar, widgets),
  as it already did for `/product/*` and `/request/*`; client-side navigation still works
  without a page reload (checked in headless Chrome).

## Priority 3: small score fixes (DONE 2026-10-13)
- Link text was the cookie banner's "Learn more" (`CookieConsent.jsx`), now "Read our Cookie Policy".
- **Accessibility (mobile 98)**: the homepage has no `<main>` landmark. `src/app/(main)/page.js`
  returns `<div className="homepage">`; make it `<main>` (or wrap it) and check CSS.
- **SEO 92**: "Links do not have descriptive text", 1 link. Find it in the Lighthouse details
  (likely a "View" / "Visit" / "Book" link on a card) and add an `aria-label` or better text.
- **Navbar logo**: `/icons/ctg-logo-optimized.png` is 400×218 for 147×80 display; ship 300 px.

## Order and expectations
1. Quick batch: 1.1, 1.2, 1.4, Priority 3.
2. 1.3 thumbnails as its own piece of work.
3. Priority 2.

Rough target: mobile 55 → 75–85, desktop 82 → 90+. Measure after every step.

## How to measure
- The Vercel preview is behind Vercel Authentication, so PageSpeed Insights cannot reach it.
- Local: `npx next build && npx next start -p 3107`, then Lighthouse in Chrome DevTools (or the
  headless Chrome + CDP approach) against `http://localhost:3107/`.
- Production: PageSpeed Insights on https://www.coretradeglobal.com after merging to `main`.

## Working rules and gotchas (from the 2026-10-12 session)
- Push to `development`; merge to `main` only when the user asks (format:
  `merge: development → main — ...`, `--no-ff`).
- **Cloud Functions deploys**: `firebase deploy --only functions` (about 70 functions at once)
  fails with "Quota exceeded for total allowable CPU per project per region". Deploy only the
  changed functions, one at a time: `firebase deploy --only functions:<name>`. A Cloud Run CPU
  quota increase for us-central1 (about 200 vCPU) was suggested to the user; not confirmed.
- `setGlobalOptions({ maxInstances: 10 })` is set in `functions/index.js`.
- The active middleware is the **root** `middleware.js`. `src/middleware.js` is dead code (its
  2026-07-31 login/register fix never shipped). The root matcher is deliberately narrow so detail
  pages stay CDN-cacheable: do not add `/product` or `/request` to it.
- Product and RFQ detail routes live in `src/app/(detail)/` (same layout as `(main)`, with no
  group-level `loading.jsx`). Each segment's `layout.jsx` checks existence (`src/lib/docExists.js`)
  before its own `loading.jsx`, so missing records return a real 404.
- `src/app/(main)/loading.jsx` makes every `(main)` page stream: `notFound()` inside those pages
  can only produce a 200 with noindex. The homepage is not under it any more: it lives in
  `src/app/(home)/` (see 2.6).
- Global `a { color: ... }` in `globals.css` overrides Tailwind text colors on links; set the
  color inline (`style={{ color, WebkitTextFillColor }}`).
- The Chrome extension may be disconnected; headless Chrome via
  `--remote-debugging-port` plus Node's built-in WebSocket works for click-through tests.

## Progress log

### 2026-10-13: quick batch
Local Lighthouse 13.5, `next build && next start`, median of 3–5 runs, headless Chrome.
Local numbers are not comparable to production PSI (desktop is ~97 locally vs 82 in production).

| Local | Baseline (c234dc3) | Quick batch |
|---|---|---|
| Mobile performance | 46 [36,46,50] | **75** [75,80,75,73,69] |
| Mobile LCP / TBT / CLS | 7.23 s / 317 ms / 0.406 | 7.07 s / 124 ms / 0.006 |
| Mobile Speed Index | 2.76 s | 2.23 s |
| Mobile a11y / SEO | 98 / 92 | 100 / 100 |
| Desktop performance / SEO | 97 / 92 | 97 / 100 |
| Bytes, mobile / desktop | 2758 / 3472 KiB | 2600 / 3221 KiB |
| Auth iframe on mobile load | yes | no |

Most of the local mobile jump is the CLS fix (without it the batch measured 53). Production
PSI showed CLS 0 before, so expect a smaller production gain (mainly TBT and the shorter
request chain); measure with PSI after merging.

What changed:
- **1.1**: `initializeAuth` without `popupRedirectResolver` (`createAuth` in
  `src/core/config/firebase.config.js`). `signInWithPopup` / `linkWithPopup` pass the resolver.
  Safari and mobile browsers block a popup that opens long after the tap, and the popup waits
  for the iframe, so `useGoogleAuth` and `ConnectedAccountsCard` call
  `prewarmGooglePopup()` on mount (uses the SDK-internal `_initialize`, best effort; see
  `getPopupResolver` in `FirebaseAuthDataSource.js`). Verified with headless Chrome and an
  iPhone user agent: no iframe/gapi requests on `/`, iframe preloaded on `/login`.
  **Still to test by hand on the Vercel preview**: Google sign-in on iOS Safari and Android
  Chrome, Google sign-in on desktop, "Connect Google" on the profile page, email/password
  login, MFA, email link, LinkedIn.
- **1.4**: `public/textures/earth_landmask_1024.webp` (7.5 KiB, black/white, lossless)
  replaces `earth_specular_2048.jpg` (219 KiB). Same land/sea result for all 12,000 sampled
  points. On mobile `HeroGlobe` is not rendered after hydration.
- **2.3**: removed preconnects to `core-trade-global.firebaseapp.com` and `scripts.clarity.ms`
  and the `apis.google.com` dns-prefetch.
- **Priority 3**: `<main className="homepage">`, cookie link text, logo resized to 300×164.
- **Mobile CLS (new)**: the footer painted at the top while the homepage was still in the
  hidden Suspense content (see 2.6) and jumped down when it was swapped in (0.40 CLS locally).
  `.main-content-reservation` is now `min-height: 100vh` on mobile (was 0), in
  `src/app/layout.js`.

### 2026-10-13: quick batch in production (merge a210538)
PageSpeed Insights web UI (pagespeed.web.dev; the keyless PSI API has a quota of 0). Mobile is
the median of 3 runs, desktop of 2.

| Production PSI | Baseline 2026-10-12 | After quick batch |
|---|---|---|
| Mobile performance | 55 | **71** [71,65,72] |
| Mobile FCP / LCP | 2.3 s / 6.2 s | 1.5 s / 4.5 s |
| Mobile TBT / CLS | 640 ms / 0 | 490 ms / 0.006 |
| Mobile Speed Index | 5.5 s | 3.0 s |
| Mobile a11y / SEO | 98 / 92 | 100 / 100 |
| Desktop performance | 82 | **98–99** |
| Desktop TBT / SI | 340 ms / 1.7 s | 40–60 ms / 0.9–1.1 s |

No auth iframe, gapi or old globe texture requests in the reports. Remaining mobile insights:
render-blocking requests (est. 780 ms, see 2.5), image delivery (est. 781 KiB, see 1.3), LCP
still 4.5 s (see 2.6).

### 2026-10-13: 2.6 homepage outside the loading boundary
Local Lighthouse 13.5, `next build && next start`, headless Chrome. "Before" is the quick-batch
build (`fix-extcss` runs, 5 each); "After" is median of 3 mobile runs on the final build and
5 desktop runs on the same change tested as a deleted `(main)/loading.jsx`.

| Local | Before | After 2.6 |
|---|---|---|
| Mobile performance | 75 | **79** [79,79,75] |
| Mobile FCP / LCP | 1.66 s / 7.07 s | 2.11 s / **4.97 s** |
| Mobile TBT / CLS | 124 ms / 0.006 | ~100 ms / 0.006 |
| Desktop performance | 97 | **99** |
| Desktop FCP / LCP | 0.41 s / 1.29 s | 0.49 s / 0.97 s |

FCP is a bit later because the first paint is now the real page instead of the "Loading…"
fallback; FCP and LCP are now the same paint. In the observed (unthrottled) runs that paint
happens at ~170–230 ms, but ~1.5 MB has been requested by then, including ~870 KiB of product
card images (see 1.3), and the simulation charges all of it to FCP and LCP.

## Open items outside this plan (from the same session)
- Unused components: `src/presentation/components/features/product/ProductCard/ProductCard.jsx`
  and `src/presentation/components/homepage/Products/HomepageProductCard.jsx` (the second shows
  Turkish "adet"). Candidates for deletion.
- `src/middleware.js`: delete, and move the login/register guest-redirect removal to the root
  `middleware.js` if still wanted.
- The admin "Delete" on an ad leaves `ads/{id}/dailyStats` behind (harmless).
