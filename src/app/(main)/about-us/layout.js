/**
 * About Us — SERVER metadata wrapper.
 *
 * page.js is 'use client' so metadata must come from a sibling layout.
 * Without this override each subpage inherits the root layout's
 * `canonical: '/'` + `openGraph.url: https://www.coretradeglobal.com`,
 * which makes Google treat every page as a duplicate of the homepage.
 */

const CANONICAL_URL = 'https://www.coretradeglobal.com/about-us';

export const metadata = {
  title: 'About CoreTradeGlobal — Our Mission for Global B2B Trade',
  description:
    'Learn who CoreTradeGlobal is, what we build, and the mission behind our B2B platform connecting importers, exporters, and logistics providers worldwide.',
  alternates: { canonical: CANONICAL_URL },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: CANONICAL_URL,
    title: 'About CoreTradeGlobal — Our Mission for Global B2B Trade',
    description:
      'The people, mission, and vision behind CoreTradeGlobal — the B2B trade network for verified buyers and suppliers.',
    siteName: 'CoreTradeGlobal',
    images: [{ url: 'https://www.coretradeglobal.com/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'About CoreTradeGlobal',
    description: 'The mission and vision behind CoreTradeGlobal.',
    images: ['https://www.coretradeglobal.com/og-image.png'],
  },
};

export default function AboutUsLayout({ children }) {
  return children;
}
