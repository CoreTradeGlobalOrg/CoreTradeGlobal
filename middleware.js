/**
 * Next.js Middleware
 *
 * Automatically protects routes that require authentication
 * Runs BEFORE the page loads
 */

import { NextResponse } from 'next/server';

// Routes that require authentication (admin only now - products/requests are public with view limits)
const protectedRoutes = ['/dashboard', '/admin', '/messages'];

// Routes only for guests (redirects to dashboard if already logged in)
const guestOnlyRoutes = ['/login', '/register'];

export function middleware(request) {
  const { pathname } = request.nextUrl;

  // Get session cookie (we'll set this after login)
  const session = request.cookies.get('session')?.value;

  // Check if route is protected
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // Check if route is guest-only
  const isGuestOnlyRoute = guestOnlyRoutes.some((route) =>
    pathname.startsWith(route)
  );

  // Redirect to login if trying to access protected route without session
  if (isProtectedRoute && !session) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect to dashboard if trying to access guest-only route with session
  if (isGuestOnlyRoute && session) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
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
