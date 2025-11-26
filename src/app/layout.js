import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/presentation/contexts/AuthContext';
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
  robots: {
    index: true,
    follow: true,
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: 'https://yourdomain.com',
    title: 'CoreTradeGlobal | B2B Trading Platform',
    description: 'B2B Trading Platform - Connect with businesses worldwide',
    siteName: 'CoreTradeGlobal',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CoreTradeGlobal | B2B Trading Platform',
    description: 'B2B Trading Platform - Connect with businesses worldwide',
    creator: '@CoreTradeGlobal',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className={inter.className}>
        <AuthProvider>
          {children}
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