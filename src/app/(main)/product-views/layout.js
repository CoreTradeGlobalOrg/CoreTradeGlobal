/**
 * Product Views — SERVER metadata wrapper.
 *
 * Private, per-member report page, so it stays out of search results
 * (also disallowed in robots.txt).
 */

export const metadata = {
  title: 'Product Views | CoreTradeGlobal',
  description: 'Your weekly product view report.',
  robots: { index: false, follow: false },
};

export default function ProductViewsLayout({ children }) {
  return children;
}
