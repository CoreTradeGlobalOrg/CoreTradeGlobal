/**
 * (detail) route group — product and RFQ detail pages.
 *
 * Same chrome as (main) (Navbar, Footer, widgets) but without
 * (main)/loading.jsx. That loading boundary wraps every (main) page, so
 * responses start streaming with a 200 before the page runs and notFound()
 * can only add a noindex tag. Here each detail segment checks that its
 * record exists in its own layout (above its own loading.jsx), so a missing
 * product or RFQ answers with a real 404 and navigations still show the
 * loading screen. URLs are unchanged: route groups are not part of the path.
 */

import MainLayout from '../(main)/layout';

export default function DetailLayout({ children }) {
  return <MainLayout>{children}</MainLayout>;
}
