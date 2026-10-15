/**
 * Products Listing — Server Shell
 *
 * The interactive page (search, filters, pagination, URL sync) lives
 * in ProductsPageClient. This shell fetches the top N active products
 * via firebase-admin so the SSR HTML Googlebot sees contains real
 * `/product/<firestoreId>` links — previously the page was fully
 * 'use client' and served only skeleton cards to the crawler, so
 * /products contributed nothing to catalog discovery.
 *
 * Metadata (title/canonical/OG) is set in layout.js so this file
 * stays focused on the data fetch.
 */

import { getAdminFirestore } from '@/lib/firebase-admin';
import { ProductsPageClient } from './ProductsPageClient';

export const revalidate = 3600;

async function fetchInitialProducts(limit = 60) {
  try {
    const snap = await getAdminFirestore()
      .collection('products')
      .where('status', '==', 'active')
      .orderBy('createdAt', 'desc')
      .limit(limit)
      .get();
    const docs = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
    return JSON.parse(
      JSON.stringify(docs, (_, value) => {
        if (value && typeof value === 'object' && typeof value._seconds === 'number') {
          return new Date(value._seconds * 1000).toISOString();
        }
        if (value && typeof value === 'object' && typeof value.toDate === 'function') {
          return value.toDate().toISOString();
        }
        return value;
      })
    );
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[/products] initial fetch failed:', err);
    return [];
  }
}

export default async function ProductsPage({ searchParams }) {
  // Pass searchParams through so the client doesn't need useSearchParams
  // for its initial render — that hook triggers Next's Suspense bailout
  // and strips the whole product grid out of the SSR'd HTML.
  const [initialProducts, sp] = await Promise.all([
    fetchInitialProducts(60),
    Promise.resolve(searchParams).then((s) => s || {}),
  ]);
  return <ProductsPageClient initialProducts={initialProducts} initialSearchParams={sp} />;
}
