/**
 * (detail) route group — same chrome as (main) (Navbar, Footer, widgets)
 * but WITHOUT (main)/loading.jsx.
 *
 * loading.jsx wraps every (main) page in a Suspense boundary, so the
 * response starts streaming with a 200 before the page runs and notFound()
 * can only inject a noindex tag. Pages that must answer a missing record
 * with a real 404 status (product detail) live here instead; URLs are
 * unchanged because route groups do not appear in the path.
 */

import MainLayout from '../(main)/layout';

export default function DetailLayout({ children }) {
  return <MainLayout>{children}</MainLayout>;
}
