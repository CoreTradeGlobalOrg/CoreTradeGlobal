/**
 * 404 for the (detail) group (product detail). notFound() in these pages
 * renders here, inside the group layout that already draws Navbar/Footer,
 * so only the content goes here (the root not-found would add a second
 * Navbar). The HTTP status is a real 404 because this group has no
 * loading.jsx; like every page under MainLayout, the HTML itself is
 * rendered on the client.
 */

import { NotFoundContent } from '@/presentation/components/common/NotFoundContent/NotFoundContent';

export const metadata = {
  title: 'Page Not Found | CoreTradeGlobal',
  robots: { index: false, follow: true },
};

export default function DetailNotFound() {
  return <NotFoundContent />;
}
