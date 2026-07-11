/**
 * Login — SERVER metadata wrapper.
 *
 * Same rationale as about-us/layout.js: page.jsx is 'use client' so its
 * metadata must live in a sibling layout, and without an explicit
 * canonical + openGraph.url every subpage inherits `/`.
 */

const CANONICAL_URL = 'https://www.coretradeglobal.com/login';

export const metadata = {
  title: 'Sign in — CoreTradeGlobal',
  description:
    'Sign in to your CoreTradeGlobal account to manage your products, RFQs, and deals on the B2B trade network.',
  alternates: { canonical: CANONICAL_URL },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: CANONICAL_URL,
    title: 'Sign in — CoreTradeGlobal',
    description:
      'Sign in to your CoreTradeGlobal account and continue on the B2B trade platform.',
    siteName: 'CoreTradeGlobal',
    images: [{ url: 'https://www.coretradeglobal.com/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Sign in — CoreTradeGlobal',
    description: 'Sign in to CoreTradeGlobal.',
    images: ['https://www.coretradeglobal.com/og-image.png'],
  },
};

export default function LoginLayout({ children }) {
  return children;
}
