/**
 * POST /api/resubscribe
 *
 * Removes an email from the unsubscribe list (re-subscribes).
 * Deletes the Firestore document so the email is no longer suppressed.
 */

import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { rateLimit, getClientIP } from '@/lib/rate-limit';

const resubscribeLimiter = rateLimit({ maxRequests: 5, windowMs: 60 * 1000 });
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request) {
  const clientIP = getClientIP(request);
  const rl = resubscribeLimiter.check(clientIP);
  if (!rl.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again in a minute.' },
      { status: 429 }
    );
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const rawEmail = typeof body?.email === 'string' ? body.email.trim() : '';
  if (!rawEmail || !EMAIL_RE.test(rawEmail) || rawEmail.length > 254) {
    return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
  }

  const emailLower = rawEmail.toLowerCase();
  const docId = crypto.createHash('sha256').update(emailLower).digest('hex');

  try {
    const db = getAdminFirestore();
    const ref = db.collection('unsubscribes').doc(docId);
    await ref.delete();

    return NextResponse.json({ success: true, email: rawEmail });
  } catch (err) {
    console.error('Resubscribe failed:', err);
    return NextResponse.json(
      { error: 'Failed to resubscribe. Please try again.' },
      { status: 500 }
    );
  }
}
