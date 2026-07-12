import { Inter } from 'next/font/google';
import Script from 'next/script';
import { SpeedInsights } from '@vercel/speed-insights/next';
import { Analytics } from '@vercel/analytics/next';
import './globals.css';
import { AuthProvider } from '@/presentation/contexts/AuthContext';
import { ProductViewProvider } from '@/presentation/contexts/ProductViewContext';
import { MessagesProvider } from '@/presentation/contexts/MessagesContext';
import { AnalyticsProvider } from '@/presentation/contexts/AnalyticsContext';
import { AnalyticsTracker } from '@/presentation/components/common/AnalyticsTracker/AnalyticsTracker';
import { WebVitals } from '@/presentation/components/common/WebVitals/WebVitals';
import { Toaster } from 'react-hot-toast';

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
  description: 'CoreTradeGlobal is the end-to-end B2B trade network for verified buyers and suppliers worldwide — source products, publish RFQs, and manage logistics, insurance, and payments from a single platform.',
  keywords: ['B2B', 'trading', 'platform', 'business', 'products', 'requests'],
  authors: [{ name: 'CoreTradeGlobal' }],
  creator: 'CoreTradeGlobal',
  publisher: 'CoreTradeGlobal',
  manifest: '/manifest.json',
  alternates: {
    canonical: '/',
  },
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
    description: 'CoreTradeGlobal connects verified B2B buyers and suppliers worldwide — source products, publish RFQs, and manage deals, logistics, insurance, and payments in one platform.',
    siteName: 'CoreTradeGlobal',
    images: [
      {
        url: 'https://www.coretradeglobal.com/og-image.png',
        width: 1200,
        height: 630,
        alt: 'CoreTradeGlobal — B2B Global Trading Platform',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CoreTradeGlobal | B2B Trading Platform',
    description: 'CoreTradeGlobal connects verified B2B buyers and suppliers worldwide — source products, publish RFQs, and manage deals, logistics, insurance, and payments in one platform.',
    creator: '@CoreTradeGlobal',
    images: ['https://www.coretradeglobal.com/og-image.png'],
  },
};

export const viewport = {
  themeColor: '#FFD700',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        {/* Warm up TLS to origins we always hit from the homepage — the
            first Firestore listen and the first company/product image
            are on the LCP critical path. crossOrigin is omitted on the
            authenticated APIs because the SDK issues credentialed
            requests; a crossOrigin='anonymous' preconnect creates a
            different connection than the credentialed one that ends up
            handling the real request, which is why Lighthouse marked
            the earlier version as "unused preconnect". */}
        <link rel="preconnect" href="https://firebase.googleapis.com" />
        <link rel="preconnect" href="https://firestore.googleapis.com" />
        <link rel="preconnect" href="https://firebasestorage.googleapis.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://firebaseinstallations.googleapis.com" />
        {/* Clarity's tag script fetches from scripts.clarity.ms after
            the tag is injected. Lighthouse flagged ~160 ms LCP savings
            from preconnecting because the CDN handshake was cold. */}
        {CLARITY_PROJECT_ID && (
          <link rel="preconnect" href="https://scripts.clarity.ms" crossOrigin="anonymous" />
        )}
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
        <style dangerouslySetInnerHTML={{ __html: `
          body{display:flex;flex-direction:column;min-height:100vh}
          body>*{flex-shrink:0}
          .footer-section{margin-top:auto}
          /* Homepage reservation — React 19 streams (main)/page via a
             BAILOUT_TO_CLIENT_SIDE_RENDERING placeholder that ships an
             empty <div hidden> in the SSR HTML; without this clamp the
             footer paints at ~y=396 during hydration and only settles
             at ~y=4600 once the client tree renders (~0.4 CLS). Value =
             hero 780 + products 740 + rfqs 540 + showcase 580 +
             companies 460 + categories 240 + fairs 585 + news 620 =
             4545, rounded up to 4600 with a thin buffer. */
          .main-content-reservation{min-height:4600px}
          @media (max-width:1024px){.main-content-reservation{min-height:4000px}}
          @media (max-width:600px){.main-content-reservation{min-height:0}}
        ` }} />
        {/* Analytics stack moved to strategy="lazyOnload" — the browser
            defers fetch/eval until the window load event, so gtag.js
            (~157 KiB) and Clarity's tag no longer sit on the LCP
            critical path. Lighthouse called gtag out for 315 KiB total
            with 177 KiB unused; deferring pays that whole cost after
            the user can already see the page. Both are pure telemetry
            with no first-paint dependency, so lazy is safe. */}
        {GA_MEASUREMENT_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
              strategy="lazyOnload"
            />
            <Script id="google-analytics" strategy="lazyOnload">
              {`
                window.dataLayer = window.dataLayer || [];
                function gtag(){dataLayer.push(arguments);}
                gtag('js', new Date());
                gtag('config', '${GA_MEASUREMENT_ID}');
              `}
            </Script>
          </>
        )}
        {CLARITY_PROJECT_ID && (
          <Script id="microsoft-clarity" strategy="lazyOnload">
            {`
              (function(c,l,a,r,i,t,y){
                  c[a]=c[a]||function(){(c[a].q=c[a].q||[]).push(arguments)};
                  t=l.createElement(r);t.async=1;t.src="https://www.clarity.ms/tag/"+i;
                  y=l.getElementsByTagName(r)[0];y.parentNode.insertBefore(t,y);
              })(window, document, "clarity", "script", "${CLARITY_PROJECT_ID}");
            `}
          </Script>
        )}
      </head>
      <body className={inter.className}>
        <WebVitals />
        <SpeedInsights />
        <Analytics />
        <AuthProvider>
          <AnalyticsProvider>
            <MessagesProvider>
              <ProductViewProvider>
                {children}
                <AnalyticsTracker />
              </ProductViewProvider>
            </MessagesProvider>
          </AnalyticsProvider>
        </AuthProvider>
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#363636',
              color: '#fff',
            },
            success: {
              duration: 3000,
              iconTheme: {
                primary: '#10b981',
                secondary: '#fff',
              },
            },
            error: {
              duration: 4000,
              iconTheme: {
                primary: '#ef4444',
                secondary: '#fff',
              },
            },
          }}
        />
      </body>
    </html>
  );
}