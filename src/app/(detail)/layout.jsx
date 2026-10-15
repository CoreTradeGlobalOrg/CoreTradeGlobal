/**
 * (detail) route group — product, RFQ and fair detail pages.
 *
 * Same chrome as (main) (Navbar, Footer, widgets) but without
 * (main)/loading.jsx, and with no loading.jsx of its own. A loading
 * boundary makes React send the page content inside a hidden
 * <div id="S:0"> behind a visible "Loading…" (always, once the content is
 * over ~12 KB), so crawlers reading the HTML saw the loading screen first.
 * Without it the content is part of the first HTML, and a missing record
 * answers with a real 404. The pages are ISR (see product/[productId]/page.jsx),
 * so navigations are served from the cache and need no loading screen.
 * URLs are unchanged: route groups are not part of the path.
 */

import MainLayout from '../(main)/layout';

export default function DetailLayout({ children }) {
  return <MainLayout>{children}</MainLayout>;
}
