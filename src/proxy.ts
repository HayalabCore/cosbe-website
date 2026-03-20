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

  const intlResponse = intlMiddleware(request);
  return updateSession(request, intlResponse);
}

export const config = {
  // Exclude /admin so next-intl does not rewrite it to /[locale]/admin
  matcher: ['/((?!api|_next|_vercel|admin|.*\\..*).*)'],
};
