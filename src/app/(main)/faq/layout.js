/**
 * FAQ — SERVER metadata wrapper (see about-us/layout.js for rationale).
 */

const CANONICAL_URL = 'https://www.coretradeglobal.com/faq';

export const metadata = {
  title: 'CoreTradeGlobal FAQ — Answers to your B2B trade questions',
  description:
    'Everything you need to know about CoreTradeGlobal: registration, listing products, RFQs, logistics, insurance, verification, and more.',
  alternates: { canonical: CANONICAL_URL },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: CANONICAL_URL,
    title: 'CoreTradeGlobal FAQ',
    description:
      'Common questions about CoreTradeGlobal — registration, listing products, RFQs, logistics, insurance, verification, deals, and platform features answered in one place.',
    siteName: 'CoreTradeGlobal',
    images: [{ url: 'https://www.coretradeglobal.com/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'CoreTradeGlobal FAQ',
    description: 'Answers to common questions about CoreTradeGlobal — registration, listings, RFQs, deals, logistics, and platform features.',
    images: ['https://www.coretradeglobal.com/og-image.png'],
  },
};

export default function FaqLayout({ children }) {
  return children;
}
