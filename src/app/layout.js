import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/presentation/contexts/AuthContext';
import { ProductViewProvider } from '@/presentation/contexts/ProductViewContext';
import { MessagesProvider } from '@/presentation/contexts/MessagesContext';
import { Toaster } from 'react-hot-toast';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata = {
  title: 'CoreTradeGlobal | B2B Trading Platform',
  description: 'B2B Trading Platform - Connect with businesses, manage products, and trade globally',
  keywords: ['B2B', 'trading', 'platform', 'business', 'products', 'requests'],
  authors: [{ name: 'CoreTradeGlobal' }],
  creator: 'CoreTradeGlobal',
  publisher: 'CoreTradeGlobal',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'CoreTradeGlobal',
  },
  robots: {
    index: true,
    follow: true,
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
      <body className={inter.className}>
        <AuthProvider>
          <MessagesProvider>
            <ProductViewProvider>
              {children}
            </ProductViewProvider>
          </MessagesProvider>
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