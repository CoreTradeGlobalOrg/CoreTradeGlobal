/**
 * Answers a missing Product with a real 404 for this segment and its /edit
 * page. A failed lookup (null) renders the page as usual; only a confirmed
 * "does not exist" becomes a 404.
 */

import { notFound } from 'next/navigation';
import { docExists } from '@/lib/docExists';

export default async function ProductLayout({ children, params }) {
  const { productId } = await params;
  if ((await docExists('products', productId)) === false) notFound();
  return children;
}
