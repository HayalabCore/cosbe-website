import createMiddleware from 'next-intl/middleware';
import { type NextRequest, NextResponse } from 'next/server';
import { routing } from './i18n/routing';
import { updateSession } from './lib/supabase/middleware';

const intlMiddleware = createMiddleware(routing);

// Firebase App Hosting serves every backend on a *.hosted.app URL (and Cloud Run
// on *.run.app). Those are duplicates of the production domain, so keep search
// engines out of them — otherwise they compete with cosbe.inc in the index.
//
// App Hosting is a reverse proxy: `host` is always the internal backend name
// (*.hosted.app), even for requests to the custom domain. The hostname the
// visitor actually typed arrives in `x-forwarded-host`, so that has to win —
// reading `host` alone would noindex the production domain too.
//
// Deliberately a blocklist, not an allowlist: if these headers are ever missing
// or renamed, the fallback is "indexable", which is the safe direction to fail.
function isPreviewHost(request: NextRequest): boolean {
  const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host');
  if (!host) return false;
  // Strip any port, and take the first entry if a proxy chain appended several.
  const hostname = host.split(',')[0].trim().split(':')[0].toLowerCase();
  return hostname.endsWith('.hosted.app') || hostname.endsWith('.run.app');
}

export default async function proxy(request: NextRequest) {
  const response = request.nextUrl.pathname.startsWith('/admin')
    ? updateSession(request, NextResponse.next({ request }))
    : intlMiddleware(request);

  const res = await response;

  if (isPreviewHost(request)) {
    res.headers.set('X-Robots-Tag', 'noindex, nofollow');
  }

  return res;
}

export const config = {
  // Run for all non-static routes except api/_next/_vercel; /admin is included so
  // updateSession refreshes Supabase cookies on admin navigations.
  matcher: ['/((?!api|_next|_vercel|.*\\..*).*)'],
};
