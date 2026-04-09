import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { decryptSession } from '@/lib/session';

export function proxy(request: NextRequest) {
  const authCookie = request.cookies.get('koha_patron_auth');
  
  let isValidSession = false;
  if (authCookie?.value) {
    try {
      isValidSession = !!decryptSession(authCookie.value);
    } catch {
      isValidSession = false;
    }
  }

  const pathname = request.nextUrl.pathname;
  const isDashboardRoute = pathname.startsWith('/dashboard');
  const isApiRoute = pathname.startsWith('/api/');
  const isLoginRoute = pathname === '/login';

  // 1. If trying to access protected route WITHOUT a valid cookie
  if ((isDashboardRoute || isApiRoute) && !isValidSession) {
    if (isApiRoute) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  // 2. If trying to access login WITH a cookie, redirect to dashboard
  if (isLoginRoute && isValidSession) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/login', '/api/:path*'],
};