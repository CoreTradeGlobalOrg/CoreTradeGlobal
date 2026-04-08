/**
 * POST /api/unsubscribe/one-click?email=foo@bar.com
 *
 * RFC 8058 one-click unsubscribe endpoint.
 *
 * Referenced only from email headers, NOT from the visible email body:
 *   List-Unsubscribe: <https://coretradeglobal.com/api/unsubscribe/one-click?email=foo@bar.com&utm_*>, <mailto:unsubscribe@coretradeglobal.com>
 *   List-Unsubscribe-Post: List-Unsubscribe=One-Click
 *
 * Mailbox providers (Gmail, Yahoo, Outlook) POST to this URL when the user
 * clicks their native "Unsubscribe" button. No human form interaction —
 * the request has body "List-Unsubscribe=One-Click" per RFC 8058.
 *
 * The visible footer link in the email body should point to /unsubscribe
 * (confirm-button page) instead — keeps email prefetchers from accidentally
 * unsubscribing users.
 *
 * GET requests to this URL redirect to /unsubscribe so curious humans
 * land on the confirm page rather than auto-unsubscribing.
 */

import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { Timestamp, FieldValue } from 'firebase-admin/firestore';
import { getAdminFirestore } from '@/lib/firebase-admin';
import { rateLimit, getClientIP } from '@/lib/rate-limit';

// Higher ceiling than the confirm endpoint — mailbox providers may batch
// multiple requests from the same egress IP.
const oneClickLimiter = rateLimit({ maxRequests: 60, windowMs: 60 * 1000 });

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const UTM_KEYS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_content', 'utm_term'];
const UTM_VALUE_RE = /^[a-zA-Z0-9._+\-/]{1,128}$/;

function sanitizeUtmsFromParams(searchParams) {
  const clean = {};
  for (const key of UTM_KEYS) {
    const raw = (searchParams.get(key) || '').trim();
    if (raw && UTM_VALUE_RE.test(raw)) {
      clean[key] = raw;
    }
  }
  return clean;
}

async function recordUnsubscribe(request, rawEmail, utms) {
  const emailLower = rawEmail.toLowerCase();
  const docId = crypto.createHash('sha256').update(emailLower).digest('hex');
  const clientIP = getClientIP(request);
  const ipHash = crypto.createHash('sha256').update(clientIP || '').digest('hex');

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
    source: 'one-click',
  };

  // First-touch UTMs: set once, never overwritten.
  if (!snap.exists) {
    updateData.unsubscribedAt = now;
    if (utms.utm_source) updateData.firstUtmSource = utms.utm_source;
    if (utms.utm_medium) updateData.firstUtmMedium = utms.utm_medium;
    if (utms.utm_campaign) updateData.firstUtmCampaign = utms.utm_campaign;
    if (utms.utm_content) updateData.firstUtmContent = utms.utm_content;
    if (utms.utm_term) updateData.firstUtmTerm = utms.utm_term;
  }

  // Multi-touch arrays: dedup across repeat clicks.
  if (utms.utm_campaign) {
    updateData.campaigns = FieldValue.arrayUnion(utms.utm_campaign);
  }
  if (utms.utm_source) {
    updateData.utmSources = FieldValue.arrayUnion(utms.utm_source);
  }

  await ref.set(updateData, { merge: true });
}

export async function POST(request) {
  const clientIP = getClientIP(request);
  const rl = oneClickLimiter.check(clientIP);
  if (!rl.success) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 });
  }

  const { searchParams } = new URL(request.url);
  const rawEmail = (searchParams.get('email') || '').trim();
  if (!rawEmail || !EMAIL_RE.test(rawEmail) || rawEmail.length > 254) {
    return NextResponse.json({ error: 'Invalid email' }, { status: 400 });
  }

  try {
    const utms = sanitizeUtmsFromParams(searchParams);
    await recordUnsubscribe(request, rawEmail, utms);
    // RFC 8058 expects a 200 OK. Body is ignored by mailbox providers.
    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('One-click unsubscribe failed:', err);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

// GET → redirect curious humans to the confirm page. This also
// protects against email prefetchers that would otherwise trigger
// an accidental unsubscribe just by previewing the message.
export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const redirectUrl = new URL('/unsubscribe', request.url);

  const email = (searchParams.get('email') || '').trim();
  if (email) redirectUrl.searchParams.set('email', email);

  for (const key of UTM_KEYS) {
    const v = searchParams.get(key);
    if (v) redirectUrl.searchParams.set(key, v);
  }

  return NextResponse.redirect(redirectUrl.toString(), 302);
}
