import { NextRequest, NextResponse } from 'next/server';

// TODO: replace with real JWT verification against auth token cookie
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const isAdminRoute = pathname.startsWith('/admin') && pathname !== '/admin/login';
  const isRestaurantRoute = pathname.startsWith('/restaurant') && pathname !== '/restaurant/login';

  // TODO: check auth cookie/JWT here.
  // if (isAdminRoute && !hasValidAdminToken(request)) return NextResponse.redirect(new URL('/admin/login', request.url));
  // if (isRestaurantRoute && !hasValidRestaurantToken(request)) return NextResponse.redirect(new URL('/restaurant/login', request.url));

  // Placeholder pass-through — wire real auth check here before MVP launch.
  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!api|_next/static|_next/image|favicon.ico|assets).*)',
  ],
};
