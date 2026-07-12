/**
 * Thank-you — SERVER metadata wrapper.
 *
 * Confirmation surface after a submitted advertising inquiry. Kept
 * out of search indexes — there's nothing here to rank on and we
 * don't want people landing on the success page without going through
 * the funnel.
 */

const CANONICAL_URL = 'https://www.coretradeglobal.com/pricing/inquire/thank-you';

export const metadata = {
  title: 'Inquiry Received — CoreTradeGlobal',
  description: 'Thanks for your advertising inquiry. Our team will follow up within 1 business day.',
  alternates: { canonical: CANONICAL_URL },
  robots: { index: false, follow: false },
};

export default function ThankYouLayout({ children }) {
  return children;
}
