/**
 * docExists(collection, id) → true | false | null
 *
 * Server-side existence check used by detail-route layouts to answer a
 * missing record with a real 404 before any loading boundary starts the
 * response. null means "could not tell" (Firestore error): callers must
 * NOT treat that as missing, so a transient error never turns into a 404.
 * Wrapped in React cache() so one request does at most one read per doc.
 */

import { cache } from 'react';
import { getAdminFirestore } from '@/lib/firebase-admin';

export const docExists = cache(async (collection, id) => {
  if (!id || typeof id !== 'string' || id.includes('/')) return false;
  try {
    const snap = await getAdminFirestore().collection(collection).doc(id).get();
    return snap.exists;
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error(`[docExists] ${collection}/${id} lookup failed:`, err);
    return null;
  }
});
