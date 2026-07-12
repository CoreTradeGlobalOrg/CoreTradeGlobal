/**
 * Pricing — SERVER metadata wrapper.
 *
 * page.js is 'use client' so metadata has to live in a sibling layout.
 * Sets its own canonical + openGraph URL so social scrapers surface
 * this page (and its OG image) instead of bouncing back to the homepage.
 */

const CANONICAL_URL = 'https://www.coretradeglobal.com/pricing';

export const metadata = {
  title: 'Pricing — Completely Free B2B Trading | CoreTradeGlobal',
  description:
    'CoreTradeGlobal is completely free — no commissions, no membership fees, no hidden costs. Optional advertising placements let brands showcase to a qualified global B2B audience.',
  alternates: { canonical: CANONICAL_URL },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: CANONICAL_URL,
    title: 'Pricing — Completely Free B2B Trading | CoreTradeGlobal',
    description:
      'CoreTradeGlobal is completely free — no commissions, no fees. Explore optional advertising spotlights to grow your brand across a qualified global B2B audience.',
    siteName: 'CoreTradeGlobal',
    images: [{ url: 'https://www.coretradeglobal.com/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Pricing — Completely Free B2B Trading | CoreTradeGlobal',
    description:
      'Zero commissions, zero fees. Optional advertising spotlights for brands who want more reach on a qualified global B2B audience.',
    images: ['https://www.coretradeglobal.com/og-image.png'],
  },
};

export default function PricingLayout({ children }) {
  return children;
}
