# Homepage Performance Plan

Created 2026-10-12 from Lighthouse 13.5 runs on https://www.coretradeglobal.com (homepage).

**Status (2026-10-13)**: quick batch done (1.1, 1.4, 2.3, Priority 3, plus a mobile CLS fix)
and live in production; 1.2 measured and not kept; 2.6 and 1.3 done and live in production.
2026-10-15: catalog pages (product/RFQ/fair detail, /products, /requests) moved out of the loading
screen and the detail pages made ISR, for SEO and TTFB. See "Progress log" at the bottom.
2026-10-21: re-audit (PSI mobile 63/64, desktop 99/97) and a "startup requests" batch, see
"Progress log". Next: decisions on analytics timing and ad impressions (Priority 4), product card
images (4.3), then Priority 2 JS (2.2) and CSS (2.5).

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

### 1.3 Product and logo thumbnails (product photos: DONE 2026-10-13, merge 596d46b)
- **Done (code)**: Cloud Functions `generateProductThumbnail` / `deleteProductThumbnail`
  (us-west1, the bucket's region) write/remove a 640 px WebP at
  `users/{uid}/products/{pid}/thumbs/{same file name}`; shared code in
  `functions/utils/productThumbnail.js`. No Firestore field: the frontend derives the thumb URL
  from the original (`src/lib/productThumbnail.js`, `?alt=media&v=<token>`, public read via a
  new `storage.rules` match) and falls back to the original on error (`ProductThumbImg`,
  FeaturedProducts). Used by FeaturedProducts, Showcase, ProductGrid, ProductList and the
  hero ad cards. Backfill: `scripts/generate-product-thumbnails.js` (dry run: 1,569 photos,
  143 MiB). Tested on the emulator (upload, overwrite, delete, PNG, rules) and locally with
  missing thumbs (cards fall back, nothing broken). Logos (81 KiB on the homepage) left out.
- **Rollout order**: storage rules → the two functions → backfill `--apply` → merge the
  frontend. Until the thumbs exist every card makes one failed request before the original.
- **Rollout (2026-10-13)**: storage rules deployed; both functions created in us-west1;
  production smoke test on `users/__thumbnail-smoke-test__/` (thumb in 1–3 s, survives an
  overwrite, removed with the original; cleaned up). Backfill: 1,568 thumbs, 138.6 MiB of
  originals → 42.0 MiB; 1 failure, a `.heic` photo (sharp's prebuilt binary has no HEIC; it
  is a 5th photo, not a card image). The 12 product photos on the live homepage: 1,497 KiB →
  513 KiB. Functions deploy warnings: Node.js 20 runtime is decommissioned on 2026-10-30
  (fixed 2026-10-14: `functions/package.json` is on Node 22 and all 73 functions are
  redeployed on nodejs22), and us-west1 has no Artifact Registry cleanup policy
  (`firebase functions:artifacts:setpolicy`).
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

## Priority 4: what the page starts in its first seconds (added 2026-10-21)

PSI and local Lighthouse mobile runs randomly show a +1.3 s or +2.3 s "element render delay" on the
LCP text (Chrome does not present the first frame; seen on GitHub, nextjs.org, react.dev and on a
JS-free copy of our page too, so it is not our code). Lantern charges every request that started
before that paint to the simulated LCP, so a delayed run lands at LCP ~10 s with 125 requests /
1.8 MB in the window. Blocking the non-critical requests in Lighthouse gave 61–64 → 68–71 even in
delayed runs.

- 4.1 (DONE 2026-10-21) favicon 102 → 5 KiB; ₹ ₺ ₩ ₽ prices drawn in the system font
  (`CurrencySymbol`) so Inter's 84 KiB latin-ext file is no longer fetched; notification.mp3 only
  for signed-in users; homepage `<Link>`s are `DeferredLink` (prefetch after the page settles);
  below-the-fold Firestore reads (products/RFQs listeners, owner roles, companies, categories,
  fairs, showcase products) wait for `usePageSettled()` (`src/lib/pageSettled.js`: load + 3 s +
  idle, or the first scroll/tap/key); hero data-card queries skipped at ≤920 px where the cards
  are hidden. The hero sponsored ad still loads right away (above the fold).
- 4.2 (OPEN, needs a decision) gtag + Clarity: now fire ~0.25 s after load (177 KiB). Could load
  on the same "settled" signal; visits shorter than ~3.5 s without interaction would not be counted.
  trackAdImpression fires the moment an ad is 50 % visible; waiting for 1 s of visibility (IAB
  standard) would move it out of the first seconds and change impression counts slightly.
- 4.3 (OPEN) product card thumbnails: on mobile 7 thumbs (~330 KiB) start before the first paint
  (carousel cards right of the viewport are inside Chrome's lazy-load margin); some 640 px thumbs
  are 84–89 KiB. Options: smaller/lower-quality thumbs (re-run the backfill), or our own
  IntersectionObserver for off-screen carousel cards.

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
- The public catalog lives in `src/app/(catalog)/` (renamed from `(detail)` on 2026-10-15): the
  product, RFQ and fair detail pages plus `/products` and `/requests`. Same layout as `(main)` and
  no `loading.jsx` anywhere in the group. The detail pages are ISR (`generateStaticParams()`
  returns `[]`, `revalidate = 3600`); edits and deletes in the app call `/api/revalidate`
  (`src/lib/revalidatePublicPage.js`) so the cached page is rebuilt on the next visit.
- `src/app/(main)/loading.jsx` makes every `(main)` page stream: `notFound()` inside those pages
  can only produce a 200 with noindex, and any page content over ~12 KB is sent in a hidden
  `<div id="S:0">` behind "Loading…". The homepage (`(home)`) and the catalog are not under it.
- A dynamic page (no `generateStaticParams`, or reads `searchParams`) gets its
  `generateMetadata` output streamed into `<body>`, not `<head>` (Next 16 streaming metadata).
  Pages with static `metadata` are not affected.
- Vercel starts every production deployment with an empty ISR cache. To warm it, GET every
  sitemap URL after the deploy (plain `fetch(url, { cache: 'no-store' })` from a browser bypasses
  the CDN and always shows MISS; use curl or a default fetch).
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

### 2026-10-13: 2.6 in production (merge 83feb51)
PageSpeed Insights web UI, 5 mobile runs and the desktop tab of the same 5 reports. PSI is
very noisy here (mobile 55–89); compare medians.

| Production PSI | Quick batch (n=3 / 2) | After 2.6 (n=5) |
|---|---|---|
| Mobile performance | 71 [71,65,72] | **74** [74,55,62,89,82] |
| Mobile FCP / LCP | 1.5 s / 4.5 s | 2.0 s / **3.3 s** [3.3,4.9,7.1,3.3,3.0] |
| Mobile TBT | 490 ms | 400 ms [640,1070,210,160,400] |
| Mobile Speed Index | 3.0 s | 4.1 s [4.1,4.6,7.8,2.5,3.3] |
| Desktop performance | 98–99 | 94 [81,100,94,98,76] |
| Desktop LCP / TBT | 0.9–1.0 s / 40–60 ms | 0.7 s / 180 ms [340,50,180,100,490] |

LCP is clearly better; FCP is later as expected (no early "Loading…" paint). The score swings
come mostly from TBT, which varies 5x between runs on the same build (desktop included), so
TBT work (2.1, 2.2) and the images (1.3) are next.

### 2026-10-13: 1.3 thumbnails in production (merge 596d46b)
PageSpeed Insights web UI, 5 mobile runs.

| Production PSI mobile | After 2.6 (n=5) | After 1.3 (n=5) |
|---|---|---|
| Performance | 74 [74,55,62,89,82] | **81** [65,88,66,85,81] |
| FCP | 2.0 s | 2.0 s [2.7,2.0,2.3,2.0,2.0] |
| LCP | 3.3 s [3.3,4.9,7.1,3.3,3.0] | 4.4 s [6.7,3.6,6.2,3.8,4.4] |
| TBT | 400 ms | 160 ms [80,20,260,160,160] |
| Speed Index | 4.1 s | 2.9 s [7.8,2.9,5.2,2.8,2.6] |
| "Improve image delivery" | ~780–840 KiB | ~330 KiB [360,307,360,331,278] |

Image bytes are down as planned, but LCP is still bimodal: good runs land at 3.6–4.4 s, bad
runs at 6–7 s. In a bad run the LCP element (`h1.hero-slogan`) showed 1,270 ms of "element
render delay" in PSI's own unthrottled load, i.e. the first paint waited for main-thread
JS, and the simulation then charges every request made before it. Reducing the JS that runs
before first paint (2.1, 2.2) is the next lever; `content-visibility: auto` on below-the-fold
sections may also make the first paint cheaper.

### 2026-10-15: SEO pass on the catalog pages (merges 4e27b6a and this one)
Googlebot's HTML for the 621 product pages (and RFQ/fair pages) had title, description,
canonical and robots inside `<body>` in a hidden Suspense segment, the visible part was
"Loading…", and every request was dynamic (`private, no-store`, 1.5–1.9 s).
- Detail pages are ISR now: metadata in `<head>`, content visible in the first HTML, CDN HIT in
  0.12–0.17 s after the first visit (was 1.5–1.9 s every time); missing records still 404.
- A Firestore error throws instead of rendering a 404 the cache would keep for an hour.
- `/api/revalidate` (owner or admin; fairs admin only) refreshes a page right after an edit or
  delete; wired into the product/request/fair update and delete hooks, the admin RFQ delete and
  the guest RFQ publish. Tested locally with Auth emulator tokens.
- `/requests` got its own title/description/canonical. `/products` and `/requests` moved into
  `(catalog)`, so no "Loading…" and no hidden segment there either.
- The `s-maxage` Cache-Control rule for detail pages in `next.config.mjs` was removed (it was
  overridden in production anyway).
- Not done: HS code / GTİP (no such field on products). Search Console resubmission is for the
  user (the Chrome profile has no Search Console property).

### 2026-10-21: re-audit and 4.1 startup requests
Production before the change: PSI mobile 63, 64 (LCP 7.9 / 6.6 s, render delay 2,250 / 1,290 ms),
desktop 99, 97. Local Lighthouse 13.5 mobile on production 61–64 (all runs with the delayed paint).

Local `next build && next start`, baseline = 34926bd in a separate worktree, cloudfunctions.net
blocked (no fake ad impressions), mobile runs alternated:

| Local mobile | Baseline (n=9) | 4.1 (n=4) |
|---|---|---|
| Performance, normal paint | 77–79 (median 78, 7 runs) | 79–82 (median 81) |
| Performance, delayed paint | 67, 68 (2 runs) | no delayed run in 4 |
| FCP / LCP (normal paint) | 2.11 s / 4.97 s | 1.66 s / 4.52 s |
| Speed Index | 3.3 s | 2.6 s |
| Requested before first paint | 911 KiB | 828 KiB |
| Desktop performance / FCP | 99 / 0.49 s | 99 / 0.41 s |

Headless click-through on the new build: no secondary Firestore queries or prefetches until ~3.3 s
without interaction, immediately on scroll; RFQ cards, prices and product links work.

## Open items outside this plan (from the same session)
- Unused components: `src/presentation/components/features/product/ProductCard/ProductCard.jsx`
  and `src/presentation/components/homepage/Products/HomepageProductCard.jsx` (the second shows
  Turkish "adet"). Candidates for deletion.
- `src/middleware.js`: delete, and move the login/register guest-redirect removal to the root
  `middleware.js` if still wanted.
- The admin "Delete" on an ad leaves `ads/{id}/dailyStats` behind (harmless).
