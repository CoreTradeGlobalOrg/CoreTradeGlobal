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

// Routes only for logistics_provider, insurance_provider, or admin
const providerRoutes = ['/provider'];

// Routes only for lawyer or admin (use '/lawyer/' to avoid matching '/lawyers' directory)
const lawyerRoutes = ['/lawyer/'];

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
  const userRole = session?.role;

  // Check route types
  const isProtectedRoute = protectedRoutes.some((route) =>
    pathname.startsWith(route)
  );
  const isAdminRoute = adminRoutes.some((route) =>
    pathname.startsWith(route)
  );
  const isProviderRoute = providerRoutes.some((route) =>
    pathname.startsWith(route)
  );
  const isLawyerRoute = lawyerRoutes.some((route) =>
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
      // Not an admin - redirect to forbidden
      return NextResponse.redirect(new URL('/forbidden', request.url));
    }
  }

  // Provider routes - require logistics_provider, insurance_provider, or admin
  if (isProviderRoute) {
    if (!isAuthenticated) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
    const isProvider =
      userRole === 'logistics_provider' ||
      userRole === 'insurance_provider' ||
      isAdmin;
    if (!isProvider) {
      return NextResponse.redirect(new URL('/forbidden', request.url));
    }
  }

  // Lawyer routes - require lawyer or admin
  if (isLawyerRoute) {
    if (!isAuthenticated) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
    const isLawyer = userRole === 'lawyer' || isAdmin;
    if (!isLawyer) {
      return NextResponse.redirect(new URL('/forbidden', request.url));
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
