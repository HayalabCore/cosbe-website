import { defineRouting } from 'next-intl/routing';
import { createNavigation } from 'next-intl/navigation';

export const routing = defineRouting({
  // A list of all locales that are supported
  locales: ['en', 'ja'],

  // Used when no locale matches
  defaultLocale: 'en',

  // Always show locale prefix in URL for better SEO
  localePrefix: 'always'
});

// Lightweight wrappers around Next.js' navigation APIs
// that will consider the routing configuration
export const { Link, redirect, usePathname, useRouter } =
  createNavigation(routing);

// Export types for better type safety
export type Locale = (typeof routing.locales)[number];

