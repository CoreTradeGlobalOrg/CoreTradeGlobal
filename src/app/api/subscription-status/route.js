/**
 * GET /api/subscription-status
 *
 * Returns the email subscription status for a given email address.
 * Checks the unsubscribes collection (Phase 9 pattern) to determine if the user
 * has previously unsubscribed.
 *
 * Query params:
 *   email - The email address to check
 *
 * Returns:
 *   { subscribed: boolean }
 *   subscribed: true  = email is NOT in unsubscribes (actively subscribed)
 *   subscribed: false = email IS in unsubscribes (has unsubscribed)
 */

import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { getAdminFirestore } from '@/lib/firebase-admin';

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const rawEmail = searchParams.get('email');

  // If no email param provided, default to subscribed
  if (!rawEmail) {
    return NextResponse.json({ subscribed: true });
  }

  const emailLower = rawEmail.trim().toLowerCase();

  // Empty after trim — default to subscribed
  if (!emailLower) {
    return NextResponse.json({ subscribed: true });
  }

  // Hash email with SHA-256 (same pattern as Phase 9 unsubscribe CF)
  const docId = crypto.createHash('sha256').update(emailLower).digest('hex');

  try {
    const db = getAdminFirestore();
    const snap = await db.collection('unsubscribes').doc(docId).get();

    // subscribed = true means NOT in unsubscribes (i.e., doc does not exist)
    return NextResponse.json({ subscribed: !snap.exists });
  } catch (err) {
    console.error('subscription-status check failed:', err);
    // On error, default to subscribed (safe default — don't incorrectly suppress)
    return NextResponse.json({ subscribed: true });
  }
}
