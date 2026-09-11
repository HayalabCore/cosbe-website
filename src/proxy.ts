import createMiddleware from 'next-intl/middleware';
import { type NextRequest, NextResponse } from 'next/server';
import { routing } from './i18n/routing';
import { updateSession } from './lib/supabase/middleware';

const intlMiddleware = createMiddleware(routing);

// Firebase App Hosting serves every backend on a *.hosted.app URL (and Cloud Run
// on *.run.app). Those are duplicates of the production domain, so keep search
// engines out of them — otherwise they compete with cosbe.inc in the index.
function isPreviewHost(host: string | null): boolean {
  if (!host) return false;
  return host.endsWith('.hosted.app') || host.endsWith('.run.app');
}

export default async function proxy(request: NextRequest) {
  const response = request.nextUrl.pathname.startsWith('/admin')
    ? updateSession(request, NextResponse.next({ request }))
    : intlMiddleware(request);

  const res = await response;

  if (isPreviewHost(request.headers.get('host'))) {
    res.headers.set('X-Robots-Tag', 'noindex, nofollow');
  }

  return res;
}

export const config = {
  // Run for all non-static routes except api/_next/_vercel; /admin is included so
  // updateSession refreshes Supabase cookies on admin navigations.
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
