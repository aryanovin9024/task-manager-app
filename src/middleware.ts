import { NextResponse, type NextRequest } from 'next/server';
import { SESSION_COOKIE_NAME, SESSION_DURATION_SECONDS } from '@/lib/session-constants';

/**
 * Edge middleware. Prisma is not available here, so this only checks whether a
 * session cookie is *present* — the authoritative check (does the session row
 * exist, has it expired, does the user still exist) happens in `requireUser()`
 * on the server. See DECISIONS.md §5.
 *
 * It also slides the cookie forward on every request, which is the half of the
 * sliding-session behaviour that Server Components cannot do themselves.
 */
const PUBLIC_PATHS = new Set(['/login', '/signup']);

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;
  const isPublic = PUBLIC_PATHS.has(pathname);

  if (!token && !isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.search = '';
    if (pathname !== '/') {
      url.searchParams.set('next', `${pathname}${search}`);
    }
    return NextResponse.redirect(url);
  }

  if (token && isPublic) {
    const url = request.nextUrl.clone();
    url.pathname = '/dashboard';
    url.search = '';
    return NextResponse.redirect(url);
  }

  const response = NextResponse.next();

  if (token) {
    response.cookies.set({
      name: SESSION_COOKIE_NAME,
      value: token,
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      path: '/',
      maxAge: SESSION_DURATION_SECONDS,
    });
  }

  return response;
}

export const config = {
  matcher: [
    // Everything except Next internals, static assets, and the files an
    // installable app has to be able to fetch while signed out — the manifest
    // and the service worker are requested before anyone has a session, and
    // redirecting them to /login silently breaks installation.
    '/((?!api/health|_next/static|_next/image|favicon.ico|manifest\\.webmanifest|sw\\.js|offline\\.html|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|txt)$).*)',
  ],
};
