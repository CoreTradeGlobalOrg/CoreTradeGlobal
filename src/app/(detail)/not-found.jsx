/**
 * 404 for the (detail) group. The group layout already draws Navbar and
 * Footer, so only the content goes here (the root not-found would add a
 * second Navbar).
 */

import { NotFoundContent } from '@/presentation/components/common/NotFoundContent/NotFoundContent';

export const metadata = {
  title: 'Page Not Found | CoreTradeGlobal',
  robots: { index: false, follow: true },
};

export default function DetailNotFound() {
  return <NotFoundContent />;
}
