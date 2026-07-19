/**
 * Advertising — SERVER metadata wrapper.
 *
 * page.js is 'use client' so metadata has to live in a sibling layout.
 * Sets its own canonical + openGraph URL so social scrapers surface
 * this page (and its OG image) instead of bouncing back to the homepage.
 */

const CANONICAL_URL = 'https://www.coretradeglobal.com/advertising';

export const metadata = {
  title: 'Advertising & Sponsorship Options | CoreTradeGlobal',
  description:
    'Reach qualified B2B buyers with Featured Product, Hero Section, Carousel Brand, and Featured Company placements — flat weekly rates, no commissions.',
  alternates: { canonical: CANONICAL_URL },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: CANONICAL_URL,
    title: 'Advertising & Sponsorship Options | CoreTradeGlobal',
    description:
      'Featured Product, Hero, Carousel, and Featured Company spotlights across our qualified global B2B audience. Flat weekly rates, no commissions.',
    siteName: 'CoreTradeGlobal',
    images: [{ url: 'https://www.coretradeglobal.com/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Advertising & Sponsorship Options | CoreTradeGlobal',
    description:
      'Featured Product, Hero, Carousel, and Featured Company spotlights across our qualified global B2B audience.',
    images: ['https://www.coretradeglobal.com/og-image.png'],
  },
};

export default function AdvertisingLayout({ children }) {
  return children;
}
