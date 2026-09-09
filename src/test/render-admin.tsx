import { render, type RenderOptions } from '@testing-library/react';
import { NextIntlClientProvider } from 'next-intl';
import adminEn from '../../messages/admin-en.json';
import type { ReactElement } from 'react';

/** Matches `src/app/admin/layout.tsx`: messages.admin = admin-en.json. */
export function renderAdmin(ui: ReactElement, options?: RenderOptions) {
  return render(
    <NextIntlClientProvider locale="en" messages={{ admin: adminEn }}>
      {ui}
    </NextIntlClientProvider>,
    options
  );
}
