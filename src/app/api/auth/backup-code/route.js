/**
 * Backup Code Verification API
 *
 * Verifies a backup code against hashed codes in Firestore,
 * marks it as used, and returns a custom token for sign-in.
 */

import { NextResponse } from 'next/server';
import { getAdminAuth, getAdminFirestore } from '@/lib/firebase-admin';

export async function POST(request) {
  try {
    const { email, backupCode } = await request.json();

    if (!email || !backupCode) {
      return NextResponse.json(
        { error: 'Email and backup code are required' },
        { status: 400 }
      );
    }

    const normalizedCode = backupCode.trim().toUpperCase();

    const adminAuth = getAdminAuth();
    const db = getAdminFirestore();

    // Look up user by email
    let userRecord;
    try {
      userRecord = await adminAuth.getUserByEmail(email);
    } catch {
      return NextResponse.json(
        { error: 'Invalid backup code' },
        { status: 401 }
      );
    }

    const uid = userRecord.uid;

    // Get stored backup codes from Firestore
    const backupCodesDoc = await db
      .collection('users')
      .doc(uid)
      .collection('security')
      .doc('backupCodes')
      .get();

    if (!backupCodesDoc.exists) {
      return NextResponse.json(
        { error: 'No backup codes found. Please contact support.' },
        { status: 401 }
      );
    }

    const { codes } = backupCodesDoc.data();

    // Hash the provided code and check against stored hashes
    const crypto = await import('crypto');
    const hashedInput = crypto
      .createHash('sha256')
      .update(normalizedCode)
      .digest('hex');

    const matchIndex = codes.findIndex((c) => c === hashedInput);

    if (matchIndex === -1) {
      return NextResponse.json(
        { error: 'Invalid backup code' },
        { status: 401 }
      );
    }

    // Remove the used code so it can't be reused
    const updatedCodes = [...codes];
    updatedCodes.splice(matchIndex, 1);

    await db
      .collection('users')
      .doc(uid)
      .collection('security')
      .doc('backupCodes')
      .update({ codes: updatedCodes });

    // Create a custom token for the user (bypasses MFA)
    const customToken = await adminAuth.createCustomToken(uid);

    return NextResponse.json({
      customToken,
      remainingCodes: updatedCodes.length,
    });
  } catch (error) {
    console.error('[backup-code] Verification error:', error);
    return NextResponse.json(
      { error: 'Verification failed. Please try again.' },
      { status: 500 }
    );
  }
}
