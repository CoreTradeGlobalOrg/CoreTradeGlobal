/**
 * revalidatePublicPage(kind, id) — ask the server to rebuild the cached
 * public page of a product, RFQ or fair after it was edited or deleted
 * (see src/app/api/revalidate/route.js). Call it after the write
 * succeeded. Never throws: the page refreshes on its own within the hour
 * anyway, so a failure here must not fail the edit.
 *
 * @param {'product' | 'request' | 'fair'} kind
 * @param {string} id
 */

import { getAuthAsync } from '@/core/config/firebase.config';

export async function revalidatePublicPage(kind, id) {
  try {
    const auth = await getAuthAsync();
    const idToken = await auth.currentUser?.getIdToken();
    if (!idToken || !id) return;

    const response = await fetch('/api/revalidate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify({ kind, id }),
    });
    if (!response.ok) {
      console.error(`revalidatePublicPage(${kind}, ${id}) failed: HTTP ${response.status}`);
    }
  } catch (err) {
    console.error(`revalidatePublicPage(${kind}, ${id}) failed:`, err);
  }
}
