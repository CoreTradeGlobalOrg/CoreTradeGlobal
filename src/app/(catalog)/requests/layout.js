/**
 * Requests — SERVER metadata wrapper (see about-us/layout.js for rationale).
 * Individual RFQ pages have their own metadata in
 * src/app/(catalog)/request/[requestId]/page.jsx. The canonical also
 * covers the ?search= variants of this page.
 */

const CANONICAL_URL = 'https://www.coretradeglobal.com/requests';

export const metadata = {
  title: 'B2B Buying Requests (RFQs) | CoreTradeGlobal',
  description:
    'Browse active buying requests (RFQs) from verified B2B buyers worldwide. Find the products buyers need and send your quote.',
  alternates: { canonical: CANONICAL_URL },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: CANONICAL_URL,
    title: 'B2B Buying Requests (RFQs) | CoreTradeGlobal',
    description:
      'Active buying requests (RFQs) from verified B2B buyers worldwide. Find what buyers need and send your quote.',
    siteName: 'CoreTradeGlobal',
    images: [{ url: 'https://www.coretradeglobal.com/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'B2B Buying Requests (RFQs) | CoreTradeGlobal',
    description: 'Active buying requests (RFQs) from verified B2B buyers worldwide. Find what buyers need and send your quote.',
    images: ['https://www.coretradeglobal.com/og-image.png'],
  },
};

export default function RequestsLayout({ children }) {
  return children;
}
