/**
 * Runs before this segment's loading.jsx, so a missing Product can still
 * answer with a real 404 status. A failed lookup (null) renders the page
 * as usual; only a confirmed "does not exist" becomes a 404.
 */

import { notFound } from 'next/navigation';
import { docExists } from '@/lib/docExists';

export default async function ProductLayout({ children, params }) {
  const { productId } = await params;
  if ((await docExists('products', productId)) === false) notFound();
  return children;
}
