/**
 * /api/analytics/hubspot/sync — upsert one Firestore user into
 * HubSpot as a contact, populating CTG custom properties.
 *
 * POST body: { uid: string }
 * Response:  { ok, hubspotId, created }
 *
 * The batch/bulk sync flavour is /sync/bulk (todo). Real-time
 * cloud-function triggers on user create/update land in a follow-up
 * once we've watched a few manual syncs run cleanly.
 */

import { NextResponse } from 'next/server';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/core/config/firebase.config';
import { COLLECTIONS } from '@/core/constants/collections';
import { upsertContact } from '@/lib/analytics/hubspotServer';

export async function POST(request) {
  const token = process.env.HUBSPOT_ACCESS_TOKEN;
  if (!token) {
    return NextResponse.json(
      { ok: false, error: 'HUBSPOT_ACCESS_TOKEN missing' },
      { status: 500 },
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON body' }, { status: 400 });
  }

  const uid = (body?.uid || '').trim();
  if (!uid) {
    return NextResponse.json({ ok: false, error: 'uid required' }, { status: 400 });
  }

  try {
    const snap = await getDoc(doc(db, COLLECTIONS.USERS, uid));
    if (!snap.exists()) {
      return NextResponse.json({ ok: false, error: 'User not found' }, { status: 404 });
    }
    const data = snap.data() || {};
    if (!data.email) {
      return NextResponse.json({ ok: false, error: 'User has no email' }, { status: 400 });
    }
    const user = { uid, ...data };

    const result = await upsertContact(user);
    if (result.skipped) {
      return NextResponse.json({ ok: true, skipped: true, reason: result.reason, email: result.email });
    }
    return NextResponse.json({ ok: true, hubspotId: result.hubspotId, created: result.created });
  } catch (err) {
    return NextResponse.json(
      { ok: false, error: err.message || 'Sync failed', status: err.status },
      { status: err.status && err.status >= 400 && err.status < 500 ? err.status : 502 },
    );
  }
}
