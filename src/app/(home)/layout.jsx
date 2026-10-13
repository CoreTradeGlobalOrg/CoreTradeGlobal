/**
 * (home) route group — the homepage only.
 *
 * Same chrome as (main) (Navbar, Footer, widgets) but without
 * (main)/loading.jsx. React writes any Suspense boundary bigger than ~12 KB
 * out of order, even in static HTML: the loading fallback and the footer came
 * first and the real homepage sat in a hidden div until an inline script near
 * the end of the document swapped it in, so the hero heading (the mobile LCP
 * element) could not paint until most of the HTML had arrived. Without the
 * boundary the sections render in place. URLs are unchanged: route groups are
 * not part of the path.
 */

import MainLayout from '../(main)/layout';

export default function HomeLayout({ children }) {
  return <MainLayout>{children}</MainLayout>;
}
