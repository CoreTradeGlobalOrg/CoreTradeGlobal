/**
 * LinkedIn OAuth — Callback
 *
 * GET /api/auth/linkedin/callback?code=...&state=...
 *
 * Validates state, exchanges the code for tokens, fetches the OIDC userinfo,
 * resolves or creates a Firebase user by email (auto-link), mints a Firebase
 * custom token, and redirects to /social-callback with the token in the URL
 * fragment (fragments are not sent to servers/logs).
 *
 * Migration note: only createCustomToken / getUserByEmail are Firebase-specific.
 * The OAuth exchange + userinfo logic is portable to any backend.
 */

import { NextResponse } from 'next/server';
import { getAdminAuth, getAdminFirestore } from '@/lib/firebase-admin';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const TOKEN_URL = 'https://www.linkedin.com/oauth/v2/accessToken';
const USERINFO_URL = 'https://api.linkedin.com/v2/userinfo';

function getOrigin(request) {
  const host = request.headers.get('host') || '';
  const proto = host.includes('localhost')
    ? 'http'
    : request.headers.get('x-forwarded-proto') || 'https';
  return `${proto}://${host}`;
}

export async function GET(request) {
  const origin = getOrigin(request);
  const { searchParams } = new URL(request.url);
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const providerError = searchParams.get('error');

  const cookieState = request.cookies.get('li_oauth_state')?.value;
  const redirectTarget = request.cookies.get('li_redirect')?.value || '/';
  const mode = request.cookies.get('li_mode')?.value === 'connect' ? 'connect' : 'signin';

  const clearCookies = (res) => {
    res.cookies.delete('li_oauth_state');
    res.cookies.delete('li_redirect');
    res.cookies.delete('li_mode');
    return res;
  };

  const fail = (reason) => {
    console.error('[linkedin/callback]', reason);
    // On connect-mode failure, return to the profile with an error flag.
    const target = mode === 'connect'
      ? `${origin}${redirectTarget.startsWith('/') ? redirectTarget : '/'}?linkedin=error`
      : `${origin}/login?error=linkedin`;
    return clearCookies(NextResponse.redirect(target));
  };

  if (providerError) return fail(`provider error: ${providerError}`);
  if (!code || !state || !cookieState || state !== cookieState) {
    return fail('invalid state or missing code');
  }

  const clientId = process.env.LINKEDIN_CLIENT_ID;
  const clientSecret = process.env.LINKEDIN_CLIENT_SECRET;
  if (!clientId || !clientSecret) return fail('missing LinkedIn config');

  const redirectUri = `${origin}/api/auth/linkedin/callback`;

  try {
    // 1. Exchange authorization code for tokens
    const tokenRes = await fetch(TOKEN_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
      }),
    });
    if (!tokenRes.ok) return fail(`token exchange failed (${tokenRes.status})`);
    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;
    if (!accessToken) return fail('no access_token in token response');

    // 2. Fetch OIDC userinfo
    const userRes = await fetch(USERINFO_URL, {
      headers: { Authorization: `Bearer ${accessToken}` },
    });
    if (!userRes.ok) return fail(`userinfo failed (${userRes.status})`);
    const profile = await userRes.json();

    const email = profile.email;
    if (!email) return fail('no email in LinkedIn profile');
    const emailVerified = profile.email_verified !== false;
    const displayName =
      profile.name ||
      [profile.given_name, profile.family_name].filter(Boolean).join(' ') ||
      email;
    const photoURL = profile.picture || undefined;

    // ── Connect mode: attach LinkedIn metadata to the signed-in user ──
    if (mode === 'connect') {
      const session = (() => {
        try {
          const raw = request.cookies.get('session')?.value;
          return raw ? JSON.parse(raw) : null;
        } catch {
          return null;
        }
      })();
      if (!session?.uid) return fail('connect mode but no active session');

      await getAdminFirestore().collection('users').doc(session.uid).update({
        linkedinConnected: true,
        linkedinName: displayName,
        linkedinMemberId: profile.sub || null,
        linkedinPicture: photoURL || null,
        linkedinConnectedAt: new Date(),
        updatedAt: new Date(),
      });

      const dest = `${origin}${redirectTarget.startsWith('/') ? redirectTarget : '/'}?linkedin=connected`;
      return clearCookies(NextResponse.redirect(dest));
    }

    // 3. Resolve or create the Firebase user by email (auto-link)
    const adminAuth = getAdminAuth();
    let uid;
    try {
      const existing = await adminAuth.getUserByEmail(email);
      // Prevent hijacking an existing account with an unverified LinkedIn email.
      if (!emailVerified) return fail('linkedin email not verified for existing account');
      uid = existing.uid;
    } catch (e) {
      if (e.code === 'auth/user-not-found') {
        const created = await adminAuth.createUser({
          email,
          emailVerified,
          displayName,
          ...(photoURL ? { photoURL } : {}),
        });
        uid = created.uid;
      } else {
        throw e;
      }
    }

    // 4. Mint a Firebase custom token
    const customToken = await adminAuth.createCustomToken(uid, { authProvider: 'linkedin' });

    // 5. Hand the token to the client via the URL fragment
    const dest =
      `${origin}/social-callback#token=${encodeURIComponent(customToken)}` +
      `&redirect=${encodeURIComponent(redirectTarget)}`;
    return clearCookies(NextResponse.redirect(dest));
  } catch (err) {
    return fail(err?.message || 'unexpected error');
  }
}
