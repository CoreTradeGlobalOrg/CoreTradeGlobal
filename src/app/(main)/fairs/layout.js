/**
 * Fairs — SERVER metadata wrapper (see about-us/layout.js for rationale).
 */

const CANONICAL_URL = 'https://www.coretradeglobal.com/fairs';

export const metadata = {
  title: 'International Trade Fairs Calendar — CoreTradeGlobal',
  description:
    'Discover upcoming, ongoing, and past international trade fairs, expos, and B2B events by date, location, and industry.',
  alternates: { canonical: CANONICAL_URL },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: CANONICAL_URL,
    title: 'International Trade Fairs Calendar — CoreTradeGlobal',
    description:
      'Upcoming trade fairs, expos, and B2B events across the world — filtered by date, location, and industry.',
    siteName: 'CoreTradeGlobal',
    images: [{ url: 'https://www.coretradeglobal.com/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Trade Fairs Calendar — CoreTradeGlobal',
    description: 'Upcoming international trade fairs and B2B events.',
    images: ['https://www.coretradeglobal.com/og-image.png'],
  },
};

export default function FairsLayout({ children }) {
  return children;
}
