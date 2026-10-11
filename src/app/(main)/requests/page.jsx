/**
 * Requests Listing — Server Shell
 *
 * Companion to /products/page.jsx. Fetches the top active requests
 * via firebase-admin so Googlebot's first HTML of /requests contains
 * real `/request/<id>` links instead of the client-only skeleton it
 * was previously served. Interactive filter/search lives in
 * RequestsPageClient.
 */

import { getAdminFirestore } from '@/lib/firebase-admin';
import { RequestsPageClient } from './RequestsPageClient';

export const revalidate = 3600;

async function fetchInitialRequests(limit = 60) {
  try {
    const snap = await getAdminFirestore()
      .collection('requests')
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
    console.error('[/requests] initial fetch failed:', err);
    return [];
  }
}

export default async function RequestsPage({ searchParams }) {
  const [initialRequests, sp] = await Promise.all([
    fetchInitialRequests(60),
    Promise.resolve(searchParams).then((s) => s || {}),
  ]);
  return <RequestsPageClient initialRequests={initialRequests} initialSearchParams={sp} />;
}
