/**
 * Join (landing) route layout — SERVER component.
 *
 * Provides per-route metadata so social scrapers (Facebook, LinkedIn) that
 * follow og:url or canonical don't bounce the click on the OG image back
 * to the homepage. The root layout defaults canonical=/ and
 * openGraph.url=https://www.coretradeglobal.com, so every subpage
 * inherits those unless overridden here.
 *
 * page.js is 'use client' and cannot export metadata; a sibling
 * layout.js keeps the metadata on the server side while page.js stays
 * interactive.
 */

const CANONICAL_URL = 'https://www.coretradeglobal.com/join';

export const metadata = {
  title: 'Join CoreTradeGlobal — Grow your B2B trade globally',
  description:
    'Sign up to CoreTradeGlobal and connect with verified buyers and suppliers worldwide. Free to join, showcase your products, and manage deals in one platform.',
  alternates: {
    canonical: CANONICAL_URL,
  },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: CANONICAL_URL,
    title: 'Join CoreTradeGlobal — Grow your B2B trade globally',
    description:
      'Sign up to CoreTradeGlobal and connect with verified buyers and suppliers worldwide.',
    siteName: 'CoreTradeGlobal',
    images: [
      {
        url: 'https://www.coretradeglobal.com/og-image.png',
        width: 1200,
        height: 630,
        alt: 'CoreTradeGlobal — Join the B2B trade network',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Join CoreTradeGlobal — Grow your B2B trade globally',
    description:
      'Sign up to CoreTradeGlobal and connect with verified buyers and suppliers worldwide.',
    images: ['https://www.coretradeglobal.com/og-image.png'],
  },
};

export default function JoinLayout({ children }) {
  return children;
}
