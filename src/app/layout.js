import { Inter } from 'next/font/google';
import Script from 'next/script';
import './globals.css';
import { AuthProvider } from '@/presentation/contexts/AuthContext';
import { ProductViewProvider } from '@/presentation/contexts/ProductViewContext';
import { MessagesProvider } from '@/presentation/contexts/MessagesContext';
import { AnalyticsProvider } from '@/presentation/contexts/AnalyticsContext';
import { InstrumentationHead, InstrumentationTail } from './InstrumentationStack';
import { DeferredAnalytics } from '@/presentation/components/common/DeferredAnalytics/DeferredAnalytics';

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID;
const CLARITY_PROJECT_ID = process.env.NEXT_PUBLIC_CLARITY_PROJECT_ID;

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  // 'optional' is the CLS-safe display mode: browsers try to load Inter
  // inside a 100ms window and, if it isn't there in time, fall back to the
  // system font for the WHOLE page load with no mid-page swap. Speed
  // Insights kept attributing 0.4 CLS to the footer paragraph — every
  // paragraph reflowed the moment the 1.75s font swap fired. 'optional'
  // ends that class of shift entirely.
  display: 'optional',
  // preload: false — Lighthouse flagged the ~84 KiB woff2 as sitting at
  // the top of a 3,114 ms critical-path chain and warned that the
  // resource was preloaded but not used within a few seconds of load.
  // Under 'optional' the browser gives up in ~100 ms and paints with
  // Arial for the rest of the load anyway, so shipping the preload
  // hint only guaranteed the bandwidth cost without a matching win.
  // Returning visitors still pick Inter from cache; first-time slow-
  // network visitors keep the metric-matched Arial fallback below.
  preload: false,
  adjustFontFallback: 'Arial',
});

export const metadata = {
  metadataBase: new URL('https://www.coretradeglobal.com'),
  title: 'CoreTradeGlobal | B2B Trading Platform',
  description: 'CoreTradeGlobal is the end-to-end B2B trade network for verified buyers and suppliers worldwide. Source products, publish RFQs, and manage logistics, insurance, and payments from a single platform.',
  keywords: ['B2B', 'trading', 'platform', 'business', 'products', 'requests'],
  authors: [{ name: 'CoreTradeGlobal' }],
  creator: 'CoreTradeGlobal',
  publisher: 'CoreTradeGlobal',
  manifest: '/manifest.json',
  // `alternates.canonical` intentionally NOT set at the root level.
  // Next.js propagates the root canonical to every descendant page, so
  // hard-coding '/' here made every /product/:id, /request/:id, and
  // /profile/:id claim the homepage as its canonical URL — Google
  // treated them as duplicates of "/" and dropped them from the
  // index. Each dynamic page now supplies its own canonical via
  // generateMetadata; static pages fall back to metadataBase + the
  // route path, which is exactly what we want.
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || '',
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'CoreTradeGlobal',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://www.coretradeglobal.com',
    title: 'CoreTradeGlobal | B2B Trading Platform',
    description: 'CoreTradeGlobal connects verified B2B buyers and suppliers worldwide. Source products, publish RFQs, and manage deals, logistics, insurance, and payments in one platform.',
    siteName: 'CoreTradeGlobal',
    images: [
      {
        url: 'https://www.coretradeglobal.com/og-image.png',
        width: 1200,
        height: 630,
        alt: 'CoreTradeGlobal: B2B Global Trading Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CoreTradeGlobal | B2B Trading Platform',
    description: 'CoreTradeGlobal connects verified B2B buyers and suppliers worldwide. Source products, publish RFQs, and manage deals, logistics, insurance, and payments in one platform.',
    creator: '@CoreTradeGlobal',
    images: ['https://www.coretradeglobal.com/og-image.png'],
  },
};

export const viewport = {
  themeColor: '#FFD700',
  width: 'device-width',
  initialScale: 1,
  // `maximumScale: 1` used to be set here to stop iOS Safari from
  // auto-zooming form inputs, but PageSpeed / WCAG flag it as an
  // accessibility failure — low-vision users lose the pinch-to-zoom
  // affordance. Dropped; form-input font-size ≥ 16px handles the iOS
  // auto-zoom case without disabling user zoom.
};

// suppressHydrationWarning on <html> only silences root-element mismatches
// caused by browser extensions (Dark Reader, Grammarly, etc.) that stamp
// <html>/<body> attributes and a <style> child before React hydrates. It
// does NOT propagate — component-level mismatches inside the tree still
// throw normally, so real hydration bugs stay visible.
export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <head suppressHydrationWarning>
        {/* Warm up TLS to origins we always hit from the homepage — the
            first Firestore listen and the first company/product image
            are on the LCP critical path. crossOrigin is omitted on the
            authenticated APIs because the SDK issues credentialed
            requests; a crossOrigin='anonymous' preconnect creates a
            different connection than the credentialed one that ends up
            handling the real request, which is why Lighthouse marked
            the earlier version as "unused preconnect".

            Preconnect is expensive (TLS + TCP + DNS) — Google recommends
            ≤ 4. So we split by criticality: origins on the LCP path get
            preconnect, origins needed later (app check installations) get
            the much cheaper dns-prefetch. next/font adds one more
            preconnect (to "/") because the Inter font is not preloaded.

            Removed: firebase.googleapis.com — Lighthouse flagged it as
            an unused preconnect on the homepage (the SDK reaches the
            Google servers via other origins first).

            Removed: core-trade-global.firebaseapp.com and apis.google.com
            (the Firebase Auth popup iframe and its gapi loader). Auth no
            longer loads that iframe on page load, only on pages with a
            Google button (see firebase.config.js).

            Removed: scripts.clarity.ms. Clarity loads seconds after the
            page settles, long after a head preconnect would have gone idle. */}
        <link rel="preconnect" href="https://firebasestorage.googleapis.com" crossOrigin="anonymous" />
        <link rel="preconnect" href="https://firestore.googleapis.com" />
        <link rel="dns-prefetch" href="https://www.googleapis.com" />
        <link rel="dns-prefetch" href="https://firebaseinstallations.googleapis.com" />
        {/* Critical CLS reservation.
            Real-browser CLS is already 0 with these rules in homepage.css /
            globals.css, but Lighthouse's slow-network simulation AND
            Turbopack dev-mode's async CSS chunks both deliver the
            stylesheet after first paint — the footer briefly lands at
            Y≈413 (right below the navbar), then snaps to Y=6500 once
            the stylesheet arrives, and the browser attributes the trip
            to <footer> with a ~0.4 CLS score. Inlining these here ships
            them inside the HTML document so browsers apply them during
            the initial parse, independent of external CSS latency.

            The body block also duplicates the sticky-footer scaffold
            from globals.css so the footer is pinned to viewport-bottom
            from the first paint even before that stylesheet loads. */}
        <style suppressHydrationWarning dangerouslySetInnerHTML={{ __html: `
          body{display:flex;flex-direction:column;min-height:100vh}
          body>*{flex-shrink:0}
          .footer-section{margin-top:auto}
          /* Tagline: matches homepage.css mobile rule. Duplicated
             inline so the tagline is hidden from first paint even
             before the ~30 KiB homepage.css chunk arrives — Lighthouse
             was seeing a 15 px hero shift when the stylesheet landed
             late and the tagline collapsed on mobile. */
          @media (max-width:768px){.tagline-section{display:none}}
          /* Homepage reservation — historically (main)/page was a
             'use client' component, which forced React 19 to ship an
             empty <div hidden> BAILOUT_TO_CLIENT_SIDE_RENDERING
             placeholder in the SSR HTML. Without this clamp the footer
             painted at ~y=396 on first paint and only settled once the
             client tree hydrated (~0.4 CLS on mobile). Value = hero 780
             + products 740 + rfqs 540 + showcase 580 + companies 460 +
             categories 240 + fairs 585 = 3925, rounded to 3980 with a
             thin buffer. News was retired Sept 2026 — the old 4600
             reservation left ~620 px of blank space under Fairs.

             The homepage is a server component in the (home) route group
             now, outside (main)/loading.jsx, so its sections are in the
             HTML before the footer. Until 2026-10-13 that loading
             boundary shipped the fallback and the footer first; mobile
             reserving 0 here measured 0.40 CLS in local Lighthouse runs.
             Mobile keeps one viewport height as a cheap guard. Not more:
             the real mobile content is ~4600 px, but a fixed clamp risks
             a blank strip at the bottom. */
          .main-content-reservation{min-height:3980px}
          @media (max-width:1024px){.main-content-reservation{min-height:3400px}}
          @media (max-width:600px){.main-content-reservation{min-height:100vh}}
        ` }} />
        {/* Analytics: only the gtag() / clarity() queues are defined here, so
            the page_view config and early identifyClarity() calls are kept.
            The tags themselves (gtag.js ~177 KiB, Clarity) are injected by
            <DeferredAnalytics> once the page has settled (load + 3 s, or the
            first scroll / tap / key). With lazyOnload they still landed
            ~0.25 s after load on a fast build, inside the window Lighthouse
            charges to LCP on mobile. */}
        {(GA_MEASUREMENT_ID || CLARITY_PROJECT_ID) && (
          <Script id="analytics-queues" strategy="beforeInteractive">
            {`
              ${GA_MEASUREMENT_ID ? `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              window.gtag = gtag;
              gtag('js', new Date());
              gtag('config', '${GA_MEASUREMENT_ID}');` : ''}
              ${CLARITY_PROJECT_ID ? `
              window.clarity = window.clarity || function(){(window.clarity.q = window.clarity.q || []).push(arguments);};` : ''}
            `}
          </Script>
        )}
      </head>
      <body className={inter.className} suppressHydrationWarning>
        <InstrumentationHead />
        <AuthProvider>
          <AnalyticsProvider>
            <MessagesProvider>
              <ProductViewProvider>
                {children}
                <InstrumentationTail />
                <DeferredAnalytics gaId={GA_MEASUREMENT_ID} clarityId={CLARITY_PROJECT_ID} />
              </ProductViewProvider>
            </MessagesProvider>
          </AnalyticsProvider>
        </AuthProvider>
      </body>
    </html>
  );
}