/**
 * Become a Partner — SERVER metadata wrapper.
 *
 * page.js is 'use client', so metadata lives here. Unlike the ad inquiry
 * form this page is meant to rank: "become a partner" is how logistics
 * firms and country representatives look for platforms to work with.
 */

const CANONICAL_URL = 'https://www.coretradeglobal.com/partnership';
const TITLE = 'Become a Partner | CoreTradeGlobal';
const DESCRIPTION =
  'Partner with CoreTradeGlobal as a logistics or insurance provider, technology or media partner, country representative or referral partner. Tell us about your company and our team will get back to you.';

export const metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: CANONICAL_URL },
  openGraph: {
    type: 'website',
    locale: 'en_US',
    url: CANONICAL_URL,
    title: TITLE,
    description: DESCRIPTION,
    siteName: 'CoreTradeGlobal',
    images: [{ url: 'https://www.coretradeglobal.com/og-image.png', width: 1200, height: 630 }],
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
    images: ['https://www.coretradeglobal.com/og-image.png'],
  },
};

export default function PartnershipLayout({ children }) {
  return children;
}
