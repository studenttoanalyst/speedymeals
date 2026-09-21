import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * SpeedyMeals Server-Side Route Protection Proxy (Next.js 16+ convention)
 * Enforces authentication and role verification for sensitive route boundaries:
 * - /admin/* requires an authenticated session with 'admin' role
 * - /restaurant/* requires an authenticated session with 'restaurant' role
 */

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('sm_access_token')?.value;
  const role = request.cookies.get('sm_user_role')?.value;

  // 1. Admin routes protection
  if (pathname.startsWith('/admin')) {
    const isLoginPage = pathname === '/admin/login';

    if (isLoginPage) {
      // If already logged in as admin, redirect directly to dashboard
      if (token && role === 'admin') {
        return NextResponse.redirect(new URL('/admin/dashboard', request.url));
      }
      return NextResponse.next();
    }

    // Require both token and admin role for any /admin sub-route
    if (!token || role !== 'admin') {
      const loginUrl = new URL('/admin/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // 2. Restaurant routes protection
  if (pathname.startsWith('/restaurant')) {
    const isLoginPage = pathname === '/restaurant/login';

    if (isLoginPage) {
      if (token && role === 'restaurant') {
        return NextResponse.redirect(new URL('/restaurant/dashboard', request.url));
      }
      return NextResponse.next();
    }

    if (!token || role !== 'restaurant') {
      const loginUrl = new URL('/restaurant/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/admin/:path*',
    '/restaurant/:path*',
  ],
};
