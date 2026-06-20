/**
 * LinkedIn OAuth — Start
 *
 * GET /api/auth/linkedin/start?redirect=/some/path
 *
 * Generates a CSRF state, stores it (+ the post-login redirect target) in
 * httpOnly cookies, and redirects the browser to LinkedIn's authorization
 * endpoint ("Sign In with LinkedIn using OpenID Connect").
 */

import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const LINKEDIN_AUTH_URL = 'https://www.linkedin.com/oauth/v2/authorization';

function getOrigin(request) {
  const host = request.headers.get('host') || '';
  const proto = host.includes('localhost')
    ? 'http'
    : request.headers.get('x-forwarded-proto') || 'https';
  return `${proto}://${host}`;
}

export async function GET(request) {
  const origin = getOrigin(request);
  const clientId = process.env.LINKEDIN_CLIENT_ID;

  if (!clientId) {
    return NextResponse.redirect(`${origin}/login?error=linkedin_config`);
  }

  const { searchParams } = new URL(request.url);
  const redirectTarget = searchParams.get('redirect') || '/';
  // mode=connect links LinkedIn to the already-signed-in user (profile page);
  // default mode signs the user in / signs them up.
  const mode = searchParams.get('mode') === 'connect' ? 'connect' : 'signin';
  const state = crypto.randomUUID();
  const redirectUri = `${origin}/api/auth/linkedin/callback`;

  const authUrl = new URL(LINKEDIN_AUTH_URL);
  authUrl.searchParams.set('response_type', 'code');
  authUrl.searchParams.set('client_id', clientId);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('state', state);
  authUrl.searchParams.set('scope', 'openid profile email');

  const res = NextResponse.redirect(authUrl.toString());
  const cookieOpts = {
    httpOnly: true,
    secure: origin.startsWith('https'),
    sameSite: 'lax',
    path: '/',
    maxAge: 600, // 10 minutes
  };
  res.cookies.set('li_oauth_state', state, cookieOpts);
  res.cookies.set('li_redirect', redirectTarget, cookieOpts);
  res.cookies.set('li_mode', mode, cookieOpts);
  return res;
}
