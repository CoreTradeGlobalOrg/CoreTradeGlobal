/**
 * News — SERVER metadata wrapper (see about-us/layout.js for rationale).
 * Article-level metadata still comes from src/app/(main)/news/[newsId].
 */

const CANONICAL_URL = 'https://www.coretradeglobal.com/news';

export const metadata = {
  title: 'Trade News — CoreTradeGlobal',
  description:
    'Global trade news, regulation updates, market moves, and industry insights curated for exporters and importers.',
  alternates: { canonical: CANONICAL_URL },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: CANONICAL_URL,
    title: 'Trade News — CoreTradeGlobal',
    description:
      'Global trade news, regulation updates, and market insights for B2B professionals.',
    siteName: 'CoreTradeGlobal',
    images: [{ url: 'https://www.coretradeglobal.com/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Trade News — CoreTradeGlobal',
    description: 'Global trade news and market insights.',
    images: ['https://www.coretradeglobal.com/og-image.png'],
  },
};

export default function NewsLayout({ children }) {
  return children;
}
