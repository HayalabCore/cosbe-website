import { beforeEach, describe, expect, it, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import adminEn from '../../../messages/admin-en.json';
import adminJa from '../../../messages/admin-ja.json';
import AdminLocaleSwitcher from './AdminLocaleSwitcher';

const refresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh, push: vi.fn(), replace: vi.fn() }),
}));

function renderSwitcher(locale: 'en' | 'ja') {
  const admin = locale === 'ja' ? adminJa : adminEn;
  return render(
    <NextIntlClientProvider locale={locale} messages={{ admin }}>
      <AdminLocaleSwitcher />
    </NextIntlClientProvider>
  );
}

describe('AdminLocaleSwitcher', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    document.cookie = 'admin_locale=; max-age=0; path=/';
  });

  it('re-enables after the locale updates so the user can switch back', async () => {
    const user = userEvent.setup();
    const { rerender } = renderSwitcher('en');

    await user.click(screen.getByRole('button', { name: 'JP' }));
    expect(document.cookie).toMatch(/admin_locale=ja/);
    expect(refresh).toHaveBeenCalledTimes(1);

    rerender(
      <NextIntlClientProvider locale="ja" messages={{ admin: adminJa }}>
        <AdminLocaleSwitcher />
      </NextIntlClientProvider>
    );

    const en = screen.getByRole('button', { name: 'EN' });
    const jp = screen.getByRole('button', { name: 'JP' });
    expect(en).not.toBeDisabled();
    expect(jp).not.toBeDisabled();

    await user.click(en);
    expect(document.cookie).toMatch(/admin_locale=en/);
    expect(refresh).toHaveBeenCalledTimes(2);
  });
});
