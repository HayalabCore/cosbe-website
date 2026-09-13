import { render, type RenderOptions } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import adminEn from '../../messages/admin-en.json';
import adminJa from '../../messages/admin-ja.json';
import type { ReactElement } from 'react';
import { PermissionsProvider } from '@/components/admin/PermissionsContext';
import { ALL_PERMISSIONS, type Permission } from '@/lib/permissions';

type RenderAdminOptions = RenderOptions & {
  locale?: 'en' | 'ja';
  /** Defaults to every permission so existing component tests see all controls. */
  permissions?: readonly Permission[];
};

/** Matches `src/app/admin/layout.tsx`: messages.admin = admin-{locale}.json. */
export function renderAdmin(
  ui: ReactElement,
  {
    locale = 'en',
    permissions = ALL_PERMISSIONS,
    ...options
  }: RenderAdminOptions = {}
) {
  const admin = locale === 'ja' ? adminJa : adminEn;
  return render(
    <NextIntlClientProvider locale={locale} messages={{ admin }}>
      <PermissionsProvider permissions={permissions}>{ui}</PermissionsProvider>
    </NextIntlClientProvider>,
    options
  );
}
