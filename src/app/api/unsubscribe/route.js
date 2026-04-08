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
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { rateLimit, getClientIP } from '@/lib/rate-limit';

const unsubscribeLimiter = rateLimit({ maxRequests: 5, windowMs: 60 * 1000 });
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Standard UTM parameters. Values must be short and URL-safe.
const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
const UTM_VALUE_RE = /^[a-zA-Z0-9._+\-/]{1,128}$/;

function sanitizeUtms(body) {
  const clean = {};
  for (const key of UTM_KEYS) {
    const raw = typeof body?.[key] === 'string' ? body[key].trim() : '';
    if (raw && UTM_VALUE_RE.test(raw)) {
      clean[key] = raw;
    }
  }
  return clean;
}

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

  const utms = sanitizeUtms(body);

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

    // First-touch UTMs: set once on first unsubscribe, never overwritten.
    if (!snap.exists) {
      updateData.unsubscribedAt = now;
      if (utms.utm_source) updateData.firstUtmSource = utms.utm_source;
      if (utms.utm_medium) updateData.firstUtmMedium = utms.utm_medium;
      if (utms.utm_campaign) updateData.firstUtmCampaign = utms.utm_campaign;
      if (utms.utm_content) updateData.firstUtmContent = utms.utm_content;
      if (utms.utm_term) updateData.firstUtmTerm = utms.utm_term;
    }

    // Multi-touch: arrayUnion dedupes campaigns seen across repeat clicks.
    if (utms.utm_campaign) {
      updateData.campaigns = FieldValue.arrayUnion(utms.utm_campaign);
    }
    if (utms.utm_source) {
      updateData.utmSources = FieldValue.arrayUnion(utms.utm_source);
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
