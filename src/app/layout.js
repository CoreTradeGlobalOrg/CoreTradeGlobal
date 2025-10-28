import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ 
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata = {
  title: 'Coming Soon | CoreTradeGlobal',
  description: 'We\'re building something amazing. Subscribe to our newsletter to be the first to know when we launch!',
  keywords: ['startup', 'coming soon', 'newsletter', 'launch', 'subscribe'],
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
    title: 'Coming Soon | CoreTradeGlobal',
    description: 'We\'re building something amazing. Subscribe to be the first to know!',
    siteName: 'CoreTradeGlobal',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Coming Soon | CoreTradeGlobal',
    description: 'We\'re building something amazing. Subscribe to be the first to know!',
    creator: '@CoreTradeGlobal',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable}>
      <body className={inter.className}>{children}</body>
    </html>
  );
}