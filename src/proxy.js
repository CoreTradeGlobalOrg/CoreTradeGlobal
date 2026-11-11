/**
 * Next.js Proxy (the file convention formerly called middleware)
 *
 * Automatically protects routes that require authentication
 * Runs BEFORE the page loads - server-side protection
 */

import { NextResponse } from 'next/server';

// Routes that require authentication
// /admin lives here (not in adminRoutes) because the middleware relies on the
// session cookie's role field, which can lag Firestore whenever a token has
// not yet rotated (custom claims are cached for up to an hour, cookies live
// 7 days). The /admin page component runs its own role check against the
// AuthContext profile — which reads from Firestore directly — so the client
// guard is authoritative for the admin check. Middleware still enforces auth.
const protectedRoutes = ['/dashboard', '/messages', '/settings', '/admin'];

// Reserved for routes we ever add that need pure server-side admin gating.
const adminRoutes = [];

// No guest-only redirect for /login and /register. It sent signed-in users
// from /login back to '/' whenever the session cookie was present, and on
// Chrome/Opera the Navbar can briefly show Login/Register to a signed-in
// user while AuthContext hydrates, so clicking either link looked like the
// page reloading in place. LoginForm sends users on after they actually
// sign in. (This was fixed on 2026-07-31 in src/middleware.js, which Next
// never loaded; the root middleware.js was the live file.)

/**
 * Parse session cookie and return user data
 */
function getSessionData(request) {
  try {
    const sessionCookie = request.cookies.get('session')?.value;
    if (!sessionCookie) return null;
    return JSON.parse(sessionCookie);
  } catch {
    return null;
  }
}

export function proxy(request) {
  const { pathname } = request.nextUrl;

  // Get session data from cookie
  const session = getSessionData(request);
  const isAuthenticated = !!session?.uid;
  const isAdmin = session?.role === 'admin';

  // Check route types
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );
  const isAdminRoute = adminRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // Admin routes - require admin role
  if (isAdminRoute) {
    if (!isAuthenticated) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
    if (!isAdmin) {
      // Not an admin - redirect to home
      return NextResponse.redirect(new URL('/', request.url));
    }
  }

  // Protected routes - require authentication
  if (isProtectedRoute && !isAuthenticated) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

// Configure which routes middleware runs on.
//
// Previously this ran middleware on EVERY page (except api/_next/favicon).
// Side effect: every rendered route came back with
//     cache-control: private, no-cache, no-store, max-age=0, must-revalidate
// because Next.js treats any middleware-touched response as per-request
// dynamic. That killed CDN caching for /product/[id], /request/[id] and
// the rest of the public surface, so Googlebot was hitting cold Firestore
// reads on every crawl and crawl budget stayed tiny.
//
// Narrowing the matcher to the handful of routes that actually need an
// auth decision (protectedRoutes above) lets the public
// routes keep their `revalidate = 3600` cache. Everything else runs
// through middleware exactly as before.
export const config = {
  matcher: [
    '/dashboard/:path*',
    '/messages/:path*',
    '/settings/:path*',
    '/admin/:path*',
  ],
};
