/**
 * POST /api/unsubscribe
 *
 * Records a cold-email unsubscribe request.
 * - Rate limited by IP (5 req/min)
 * - Validates email format
 * - Idempotent: first request sets unsubscribedAt, later ones only update lastClickAt
 * - Stores hashed IP (not raw) for audit
 */

import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { Timestamp } from 'firebase-admin/firestore';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { rateLimit, getClientIP } from '@/lib/rate-limit';

const unsubscribeLimiter = rateLimit({ maxRequests: 5, windowMs: 60 * 1000 });
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request) {
  const clientIP = getClientIP(request);
  const rl = unsubscribeLimiter.check(clientIP);
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
  const ipHash = crypto.createHash('sha256').update(clientIP || '').digest('hex');

  try {
    const db = getAdminFirestore();
    const ref = db.collection('unsubscribes').doc(docId);
    const snap = await ref.get();

    const now = Timestamp.now();
    const updateData = {
      email: rawEmail,
      emailLower,
      lastClickAt: now,
      ipHash,
      userAgent: request.headers.get('user-agent') || '',
      source: 'self-serve',
    };
    if (!snap.exists) {
      updateData.unsubscribedAt = now;
    }

    await ref.set(updateData, { merge: true });

    return NextResponse.json({ success: true, email: rawEmail });
  } catch (err) {
    console.error('Unsubscribe write failed:', err);
    return NextResponse.json(
      { error: 'Failed to record unsubscribe. Please try again.' },
      { status: 500 }
    );
  }
}
