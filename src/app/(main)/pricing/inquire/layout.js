/**
 * Inquire — SERVER metadata wrapper.
 *
 * Placement inquiry form for advertising tiers. Keeps SEO neutral —
 * this is a transactional page, not something we want ranking in
 * search results for competitive terms. Canonical still points at
 * itself so social scrapers land here (from the Pricing page CTA) and
 * not on the homepage.
 */

const CANONICAL_URL = 'https://www.coretradeglobal.com/pricing/inquire';

export const metadata = {
  title: 'Advertising Placement Inquiry — CoreTradeGlobal',
  description:
    'Reach a qualified global B2B audience with Featured Products, Hero Spotlight, or Carousel Brand placements. Tell us about your campaign and our team will follow up within 1 business day.',
  alternates: { canonical: CANONICAL_URL },
  robots: { index: false, follow: true },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: CANONICAL_URL,
    title: 'Advertising Placement Inquiry — CoreTradeGlobal',
    description:
      'Reach a qualified global B2B audience with Featured Products, Hero Spotlight, or Carousel Brand placements.',
    siteName: 'CoreTradeGlobal',
    images: [{ url: 'https://www.coretradeglobal.com/og-image.png', width: 1200, height: 630 }],
  },
};

export default function InquireLayout({ children }) {
  return children;
}
