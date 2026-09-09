import { render, type RenderOptions } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import adminEn from '../../messages/admin-en.json';
import adminJa from '../../messages/admin-ja.json';
import type { ReactElement } from 'react';

type RenderAdminOptions = RenderOptions & { locale?: 'en' | 'ja' };

/** Matches `src/app/admin/layout.tsx`: messages.admin = admin-{locale}.json. */
export function renderAdmin(
  ui: ReactElement,
  { locale = 'en', ...options }: RenderAdminOptions = {}
) {
  const admin = locale === 'ja' ? adminJa : adminEn;
  return render(
    <NextIntlClientProvider locale={locale} messages={{ admin }}>
      {ui}
    </NextIntlClientProvider>,
    options
  );
}
