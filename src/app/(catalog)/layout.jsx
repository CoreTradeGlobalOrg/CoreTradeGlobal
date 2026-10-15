/**
 * (catalog) route group — the public catalog: the /products and /requests
 * listings and the product, RFQ and fair detail pages.
 *
 * Same chrome as (main) (Navbar, Footer, widgets) but without
 * (main)/loading.jsx, and with no loading.jsx of its own. A loading
 * boundary makes React send the page content inside a hidden
 * <div id="S:0"> behind a visible "Loading…" (always, once the content is
 * over ~12 KB), so crawlers reading the HTML saw the loading screen first.
 * Without it the content is part of the first HTML, and a missing record
 * answers with a real 404. The detail pages are ISR (see
 * product/[productId]/page.jsx), so navigations to them are served from the
 * cache. Keeping listings and details in one group also means going from a
 * listing to a detail page does not remount the layout.
 * URLs are unchanged: route groups are not part of the path.
 */

import MainLayout from '../(main)/layout';

export default function CatalogLayout({ children }) {
  return <MainLayout>{children}</MainLayout>;
}
