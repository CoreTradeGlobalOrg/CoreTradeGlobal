import { Inter } from 'next/font/google';
import Script from 'next/script';
import './globals.css';
import { AuthProvider } from '@/presentation/contexts/AuthContext';
import { ProductViewProvider } from '@/presentation/contexts/ProductViewContext';
import { MessagesProvider } from '@/presentation/contexts/MessagesContext';
import { AnalyticsProvider } from '@/presentation/contexts/AnalyticsContext';
import { AnalyticsTracker } from '@/presentation/components/common/AnalyticsTracker/AnalyticsTracker';
import { Toaster } from 'react-hot-toast';

const GA_MEASUREMENT_ID = process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID;

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata = {
  metadataBase: new URL('https://coretradeglobal.com'),
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
    url: 'https://coretradeglobal.com',
    title: 'CoreTradeGlobal | B2B Trading Platform',
    description: 'B2B Trading Platform - Connect with businesses worldwide',
    siteName: 'CoreTradeGlobal',
    images: [
      {
        url: 'https://coretradeglobal.com/Core-png.png',
        width: 1200,
        height: 630,
        alt: 'Core Trade Global',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CoreTradeGlobal | B2B Trading Platform',
    description: 'B2B Trading Platform - Connect with businesses worldwide',
    creator: '@CoreTradeGlobal',
    images: ['https://coretradeglobal.com/Core-png.png'],
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
      </head>
      <body className={inter.className}>
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