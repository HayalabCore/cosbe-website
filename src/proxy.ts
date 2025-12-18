import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

// Next.js 16 uses proxy.ts instead of middleware.ts (deprecated)
// next-intl's createMiddleware works with both conventions
export default createMiddleware(routing);

export const config = {
  // Match only internationalized pathnames
  // Exclude API routes, static files, and Next.js internals
  matcher: ['/', '/(ja|en)/:path*']
};

