import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PUBLIC_PATHS = ['/login'];
const PROTECTED_PREFIX = '/dashboard';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get('auth_token')?.value;

  const isPublicPath = PUBLIC_PATHS.some(path => pathname.startsWith(path));
  const isProtectedPath =
    pathname.startsWith(PROTECTED_PREFIX) ||
    pathname.startsWith('/print') ||
    pathname === '/';

  if (!token && isProtectedPath) {
    const loginUrl = new URL('/login', request.url);
    if (pathname !== '/') {
      loginUrl.searchParams.set('redirect', pathname);
    }
    return NextResponse.redirect(loginUrl);
  }

  if (token && isPublicPath) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  if (token && pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|icons|offline|manifest.webmanifest|sw.js|workbox-).*)',
  ],
};
