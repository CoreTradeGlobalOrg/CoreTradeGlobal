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
  preload: true,
  adjustFontFallback: 'Arial',
});

export const metadata = {
  metadataBase: new URL('https://www.coretradeglobal.com'),
  title: 'CoreTradeGlobal | B2B Trading Platform',
  description: 'B2B Trading Platform - Connect with businesses, manage products, and trade globally',
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
    description: 'B2B Trading Platform - Connect with businesses worldwide',
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
    description: 'B2B Trading Platform - Connect with businesses worldwide',
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
          .main-content-reservation{min-height:6500px}
          .homepage{min-height:6500px}
          @media (max-width:1024px){.main-content-reservation,.homepage{min-height:5000px}}
          @media (max-width:600px){.main-content-reservation,.homepage{min-height:0}}
        ` }} />
        {GA_MEASUREMENT_ID && (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${GA_MEASUREMENT_ID}`}
              strategy="afterInteractive"
            />
            <Script id="google-analytics" strategy="afterInteractive">
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
          <Script id="microsoft-clarity" strategy="afterInteractive">
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