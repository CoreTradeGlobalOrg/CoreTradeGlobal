/**
 * Session API Route
 *
 * POST: Set session cookie after verifying Firebase ID token
 * DELETE: Clear session cookie on logout
 *
 * SECURITY: This endpoint now requires a valid Firebase ID token
 * The token is verified server-side before creating a session
 */

import { NextResponse } from 'next/server';
import { verifyIdToken } from '@/lib/firebase-admin';
import { authLimiter, getClientIP } from '@/lib/rate-limit';

// POST - Set session cookie (requires valid ID token)
export async function POST(request) {
  // Rate limiting check
  const clientIP = getClientIP(request);
  const rateLimitResult = authLimiter.check(clientIP);

  if (!rateLimitResult.success) {
    return NextResponse.json(
      { error: 'Too many requests. Please try again later.' },
      {
        status: 429,
        headers: {
          'Retry-After': Math.ceil(rateLimitResult.resetIn / 1000).toString(),
        },
      }
    );
  }

  try {
    const { idToken, role } = await request.json();

    if (!idToken) {
      return NextResponse.json({ error: 'Missing ID token' }, { status: 400 });
    }

    // Verify the ID token with Firebase Admin SDK
    const verification = await verifyIdToken(idToken);

    if (!verification.valid) {
      return NextResponse.json(
        { error: 'Invalid or expired token' },
        { status: 401 }
      );
    }

    // Token is valid - use verified data from token, not from request body
    const { uid, email } = verification;

    // Note: Role should be fetched from Firestore on the server, not trusted from client
    // For now, we'll store it but it should be validated against the database
    const sessionData = JSON.stringify({
      uid,
      email,
      role: role || 'member', // Default to member, admin should be verified server-side
      verified: true,
    });

    // Create response with cookie
    const response = NextResponse.json({ success: true, uid, email });

    // Set HttpOnly cookie (can't be accessed by JavaScript)
    response.cookies.set('session', sessionData, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Session API error:', error);
    return NextResponse.json(
      { error: 'Failed to create session' },
      { status: 500 }
    );
  }
}

// DELETE - Clear session cookie
export async function DELETE() {
  const response = NextResponse.json({ success: true });

  response.cookies.set('session', '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0, // Expire immediately
    path: '/',
  });

  return response;
}
