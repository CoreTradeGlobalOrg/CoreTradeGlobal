/**
 * Fairs Listing — Server Shell
 *
 * The interactive filter/search UI lives in FairsClient. This shell
 * fetches the fair list via firebase-admin so the SSR HTML Googlebot
 * sees includes every fair name, date, and location — fixing the
 * previous soft-404 verdict (the old 'use client' page served a bare
 * SPA shell with just the search bar).
 *
 * Metadata is set in layout.js (title, canonical, OpenGraph) so this
 * file stays focused on the data fetch.
 */

import { getAdminFirestore } from '@/lib/firebase-admin';
import { FairsClient } from './FairsClient';

// Revalidate hourly — fair edits and status transitions (upcoming →
// ongoing → past) flow into the cached HTML without a redeploy.
export const revalidate = 3600;

// Firestore Timestamp objects aren't serializable across the server/client
// boundary. Walk the plain-object tree and convert anything that looks
// like a Timestamp into an ISO string — FairsClient's `d?.toDate ? ...
// : new Date(d)` ternary handles the ISO case transparently.
function toPlain(obj) {
  if (!obj) return null;
  return JSON.parse(
    JSON.stringify(obj, (_, value) => {
      if (value && typeof value === 'object' && typeof value._seconds === 'number') {
        return new Date(value._seconds * 1000).toISOString();
      }
      if (value && typeof value === 'object' && typeof value.toDate === 'function') {
        return value.toDate().toISOString();
      }
      return value;
    })
  );
}

async function fetchAllFairs() {
  try {
    // Mirror the client-side repo: active (ongoing + upcoming) and past
    // via the cron-maintained `status` field. Keep the limits identical
    // so the server-shell list matches what the client would re-fetch.
    const db = getAdminFirestore();
    const [activeSnap, pastSnap] = await Promise.all([
      db.collection('fairs').where('status', 'in', ['upcoming', 'ongoing']).limit(200).get(),
      db.collection('fairs').where('status', '==', 'past').orderBy('startDate', 'desc').limit(100).get(),
    ]);
    const docs = [...activeSnap.docs, ...pastSnap.docs].map((d) => ({ id: d.id, ...d.data() }));
    return toPlain(docs) || [];
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('[fairs page] fetch failed:', err);
    return [];
  }
}

export default async function FairsPage() {
  const initialFairs = await fetchAllFairs();
  return <FairsClient initialFairs={initialFairs} />;
}
