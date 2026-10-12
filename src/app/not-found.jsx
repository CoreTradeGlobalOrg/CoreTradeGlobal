/**
 * Custom 404 page.
 *
 * Rendered for unknown URLs and for notFound() calls in routes without a
 * closer not-found file. It sits directly under the root layout (no (main)
 * layout around it), so it brings its own Navbar and Footer.
 */

import { Navbar } from '@/presentation/components/homepage/Navbar/Navbar';
import { Footer } from '@/presentation/components/homepage/Footer/Footer';
import { NotFoundContent } from '@/presentation/components/common/NotFoundContent/NotFoundContent';

export const metadata = {
  title: 'Page Not Found | CoreTradeGlobal',
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <>
      <Navbar />
      <NotFoundContent />
      <Footer />
    </>
  );
}
