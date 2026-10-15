/**
 * Revalidate API Route
 *
 * POST { kind: 'product' | 'request' | 'fair', id }
 * Authorization: Bearer <Firebase ID token>
 *
 * Product, RFQ and fair detail pages are ISR (cached for up to an hour).
 * The app calls this after an edit or delete (src/lib/revalidatePublicPage.js)
 * so the cached page is rebuilt on its next visit instead of waiting for
 * the hour to pass.
 *
 * Who may call it:
 *  - the record exists: its owner (userId) or an admin; fairs admin only
 *  - the record is gone: any signed-in user. Revalidating a deleted
 *    record's page only turns the cached page into a 404 sooner.
 */

import { NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { getAdminFirestore, verifyIdToken } from '@/lib/firebase-admin';
import { apiLimiter, getClientIP } from '@/lib/rate-limit';
import { ROLES } from '@/core/constants/roles';

// firebase-admin is Node-only (see api/auth/session/route.js)
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const PAGES = {
  product: { collection: 'products', ownerField: 'userId' },
  request: { collection: 'requests', ownerField: 'userId' },
  fair: { collection: 'fairs', ownerField: null }, // admin-managed
};

export async function POST(request) {
  const rateLimitResult = apiLimiter.check(getClientIP(request));
  if (!rateLimitResult.success) {
    return NextResponse.json({ error: 'Too many requests. Please try again later.' }, { status: 429 });
  }

  const header = request.headers.get('authorization') || '';
  const idToken = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!idToken) {
    return NextResponse.json({ error: 'Missing ID token' }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }
  const { kind, id } = body || {};
  const page = Object.hasOwn(PAGES, kind) ? PAGES[kind] : null;
  if (!page || typeof id !== 'string' || !id || id.length > 128 || id.includes('/')) {
    return NextResponse.json({ error: 'Invalid kind or id' }, { status: 400 });
  }

  const verification = await verifyIdToken(idToken);
  if (!verification.valid) {
    return NextResponse.json({ error: 'Invalid or expired token' }, { status: 401 });
  }

  try {
    const snap = await getAdminFirestore().collection(page.collection).doc(id).get();
    if (snap.exists) {
      const isAdmin = verification.role === ROLES.ADMIN;
      const isOwner = page.ownerField && snap.get(page.ownerField) === verification.uid;
      if (!isAdmin && !isOwner) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
    }

    revalidatePath(`/${kind}/${id}`);
    return NextResponse.json({ revalidated: true });
  } catch (err) {
    console.error('[revalidate] failed:', err);
    return NextResponse.json({ error: 'Revalidation failed' }, { status: 500 });
  }
}
