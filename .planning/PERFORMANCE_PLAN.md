# Homepage Performance Plan

Created 2026-10-12 from Lighthouse 13.5 runs on https://www.coretradeglobal.com (homepage).
Nothing in this plan has been implemented yet.

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

### 1.1 Stop loading the Firebase Auth iframe on every page load
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

### 1.2 Remove render-blocking CSS
- **Problem**: 4 CSS files (45 KiB) block first paint; Lighthouse estimates 1.6 s on mobile.
- **Fix**: try Next.js 16 `experimental.inlineCss: true` in `next.config.mjs`.
- **Trade-off**: bigger HTML, CSS not shared from cache between pages. Measure before keeping it.

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
  `fetchpriority="high"` and no lazy loading.
- **Note**: the biggest work item: upload flow, a function and a backfill.

### 1.4 Globe
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

### 2.3 Preconnects
- 5 preconnects (Lighthouse wants at most 4). Remove the self `preconnect "/"`; after 1.1 also
  `core-trade-global.firebaseapp.com`; the Clarity preconnect is pointless with `lazyOnload`.
  Keep `firestore.googleapis.com` and `firebasestorage.googleapis.com`.
  Preconnects are in `src/app/layout.js`.

### 2.4 Jank
- Forced reflow of about 160 ms and 4 non-composited animations (desktop). Record a Performance
  trace to find them. Suspects: currency ticker, hero cards. Move animations to
  `transform` / `opacity`.

## Priority 3: small score fixes
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
  can only produce a 200 with noindex.
- Global `a { color: ... }` in `globals.css` overrides Tailwind text colors on links; set the
  color inline (`style={{ color, WebkitTextFillColor }}`).
- The Chrome extension may be disconnected; headless Chrome via
  `--remote-debugging-port` plus Node's built-in WebSocket works for click-through tests.

## Open items outside this plan (from the same session)
- Unused components: `src/presentation/components/features/product/ProductCard/ProductCard.jsx`
  and `src/presentation/components/homepage/Products/HomepageProductCard.jsx` (the second shows
  Turkish "adet"). Candidates for deletion.
- `src/middleware.js`: delete, and move the login/register guest-redirect removal to the root
  `middleware.js` if still wanted.
- The admin "Delete" on an ad leaves `ads/{id}/dailyStats` behind (harmless).
