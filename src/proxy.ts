import createMiddleware from 'next-intl/middleware';
import { type NextRequest, NextResponse } from 'next/server';
import { routing } from './i18n/routing';
import { updateSession } from './lib/supabase/middleware';

const intlMiddleware = createMiddleware(routing);

export default async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname.startsWith('/admin')) {
    const res = NextResponse.next({ request });
    return updateSession(request, res);
  }

  return intlMiddleware(request);
}

export const config = {
  // Run for all non-static routes except api/_next/_vercel; /admin is included so
  // updateSession refreshes Supabase cookies on admin navigations.
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
