/**
 * Products — SERVER metadata wrapper (see about-us/layout.js for rationale).
 * Individual product pages have their own metadata under
 * src/app/(main)/product/[productId]/layout.
 */

const CANONICAL_URL = 'https://www.coretradeglobal.com/products';

export const metadata = {
  title: 'B2B Products Marketplace — CoreTradeGlobal',
  description:
    'Browse verified B2B products from suppliers around the world. Filter by category, country, and price to source what your business needs.',
  alternates: { canonical: CANONICAL_URL },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: CANONICAL_URL,
    title: 'B2B Products Marketplace — CoreTradeGlobal',
    description:
      'Verified B2B product listings from global suppliers, filterable by category, country, and price.',
    siteName: 'CoreTradeGlobal',
    images: [{ url: 'https://www.coretradeglobal.com/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'B2B Products Marketplace — CoreTradeGlobal',
    description: 'Verified B2B products from global suppliers.',
    images: ['https://www.coretradeglobal.com/og-image.png'],
  },
};

export default function ProductsLayout({ children }) {
  return children;
}
