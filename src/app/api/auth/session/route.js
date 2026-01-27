/**
 * Session API Route
 *
 * POST: Set session cookie after login
 * DELETE: Clear session cookie on logout
 */

import { NextResponse } from 'next/server';

// POST - Set session cookie
export async function POST(request) {
  try {
    const { uid, role, email } = await request.json();

    if (!uid) {
      return NextResponse.json({ error: 'Missing user data' }, { status: 400 });
    }

    // Create session data
    const sessionData = JSON.stringify({ uid, role, email });

    // Create response with cookie
    const response = NextResponse.json({ success: true });

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
    return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
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
