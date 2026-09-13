import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('sm_access_token')?.value;
  const role = request.cookies.get('sm_user_role')?.value;

  // Admin routes protection
  if (pathname.startsWith('/admin')) {
    const isLoginPage = pathname === '/admin/login';

    if (isLoginPage) {
      if (token && role === 'admin') {
        return NextResponse.redirect(new URL('/admin/dashboard', request.url));
      }
      return NextResponse.next();
    }

    if (!token || role !== 'admin') {
      const loginUrl = new URL('/admin/login', request.url);
      loginUrl.searchParams.set('redirect', pathname);
      return NextResponse.redirect(loginUrl);
    }
  }

  // Restaurant routes protection
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
  matcher: ['/admin/:path*', '/restaurant/:path*'],
};
