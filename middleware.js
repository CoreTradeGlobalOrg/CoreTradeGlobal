/**
 * Next.js Middleware
 *
 * Automatically protects routes that require authentication
 * Runs BEFORE the page loads - server-side protection
 */

import { NextResponse } from 'next/server';

// Routes that require authentication
const protectedRoutes = ['/dashboard', '/messages'];

// Routes that require admin role
const adminRoutes = ['/admin'];

// Routes only for guests (redirects to home if already logged in)
const guestOnlyRoutes = ['/login', '/register'];

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

export function middleware(request) {
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
  const isGuestOnlyRoute = guestOnlyRoutes.some((route) =>
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

  // Guest-only routes - redirect to home if already logged in
  if (isGuestOnlyRoute && isAuthenticated) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
}

// Configure which routes middleware runs on
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
