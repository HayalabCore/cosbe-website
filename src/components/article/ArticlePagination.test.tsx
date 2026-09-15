import { describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { ReactNode } from 'react';

// next-intl's <Link> (from @/i18n/routing) builds an href as
// `/${locale}${href.pathname}` + query string. If a caller passes an href
// object without a `pathname`, that becomes `/en` + undefined = "/enundefined".
// This mock reproduces that exact contract so the test proves the component
// supplies a pathname. `usePathname()` returns the locale-stripped current path,
// matching next-intl on a /en/notice listing page.
const CURRENT_PATHNAME = '/notice';
const LOCALE = 'en';

vi.mock('@/i18n/routing', () => {
  function Link({
    href,
    children,
    ...rest
  }: {
    href: string | { pathname?: string; query?: Record<string, string | number> };
    children: ReactNode;
  }) {
    const pathname = typeof href === 'string' ? href : href.pathname;
    const query =
      typeof href === 'object' && href.query
        ? `?${new URLSearchParams(
            Object.fromEntries(
              Object.entries(href.query).map(([k, v]) => [k, String(v)])
            )
          ).toString()}`
        : '';
    // Template literal intentionally: an undefined pathname stringifies to
    // "undefined", reproducing the /enundefined bug on unfixed code.
    return (
      <a href={`/${LOCALE}${pathname}${query}`} {...rest}>
        {children}
      </a>
    );
  }
  return {
    Link,
    usePathname: () => CURRENT_PATHNAME,
  };
});

import ArticlePagination from './ArticlePagination';

describe('ArticlePagination', () => {
  it('links to the current listing path with a page query, never /enundefined', () => {
    render(
      <ArticlePagination currentPage={1} totalPages={3} />
    );

    for (const a of screen.getAllByRole('link')) {
      expect(a.getAttribute('href')).not.toContain('undefined');
    }

    expect(screen.getByRole('link', { name: '2' })).toHaveAttribute(
      'href',
      '/en/notice?page=2'
    );
  });

  it('points page 1 at the bare listing path', () => {
    render(
      <ArticlePagination currentPage={2} totalPages={3} />
    );

    expect(screen.getByRole('link', { name: '1' })).toHaveAttribute(
      'href',
      '/en/notice'
    );
  });
});
