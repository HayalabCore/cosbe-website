import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { renderAdmin } from '@/test/render-admin';
import { ALL_PERMISSIONS } from '@/lib/permissions';
import { PermissionsProvider } from '@/components/admin/PermissionsContext';
import adminEn from '../../../../messages/admin-en.json';

const replace = vi.fn();
const refresh = vi.fn();
let pathname = '/admin/dashboard';
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, refresh, push: vi.fn() }),
  usePathname: () => pathname,
}));

const signOut = vi.fn().mockResolvedValue(undefined);
vi.mock('@/lib/auth', () => ({
  signOut: (...a: unknown[]) => signOut(...a),
}));

vi.mock('@/lib/supabase/client', () => ({
  createBrowserSupabaseClient: () => ({}),
}));

import AdminProtectedShell from './AdminProtectedShell';

describe('AdminProtectedShell', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    pathname = '/admin/dashboard';
    document.cookie = 'admin_locale=; max-age=0; path=/';
  });

  it('renders sidebar links', () => {
    renderAdmin(
      <AdminProtectedShell userEmail="a@b.c" permissions={ALL_PERMISSIONS}>
        child
      </AdminProtectedShell>
    );
    expect(
      screen.getAllByRole('link', { name: 'All Posts' }).length
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByRole('link', { name: 'New Post' }).length
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByRole('link', { name: 'Import' }).length
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByRole('link', { name: 'Media' }).length
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByRole('link', { name: 'Translations' }).length
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByRole('link', { name: 'Users' }).length
    ).toBeGreaterThan(0);
    expect(
      screen.getAllByRole('link', { name: 'Roles' }).length
    ).toBeGreaterThan(0);
    const dashboard = screen.getAllByRole('link', { name: 'All Posts' })[0];
    const newPost = screen.getAllByRole('link', { name: 'New Post' })[0];
    expect(dashboard.className).toMatch(/bg-white\/10/);
    expect(newPost.className).not.toMatch(/bg-white\/10/);
  });

  it('signs out and replaces to /admin', async () => {
    const user = userEvent.setup();
    renderAdmin(
      <AdminProtectedShell userEmail="a@b.c" permissions={ALL_PERMISSIONS}>
        child
      </AdminProtectedShell>
    );
    await user.click(screen.getAllByRole('button', { name: 'Sign Out' })[0]);
    expect(signOut).toHaveBeenCalled();
    expect(replace).toHaveBeenCalledWith('/admin');
  });

  it('sets the admin_locale cookie to ja when JP is clicked', async () => {
    const user = userEvent.setup();
    renderAdmin(
      <AdminProtectedShell userEmail="a@b.c" permissions={ALL_PERMISSIONS}>
        child
      </AdminProtectedShell>
    );
    await user.click(screen.getAllByRole('button', { name: 'JP' })[0]);
    expect(document.cookie).toMatch(/admin_locale=ja/);
    expect(refresh).toHaveBeenCalled();
  });

  it('renders Japanese sidebar copy when the locale is ja', () => {
    renderAdmin(
      <AdminProtectedShell userEmail="a@b.c" permissions={ALL_PERMISSIONS}>
        child
      </AdminProtectedShell>,
      { locale: 'ja' }
    );
    expect(
      screen.getAllByRole('link', { name: 'すべての記事' }).length
    ).toBeGreaterThan(0);
  });

  it('opens and closes the mobile drawer', async () => {
    const user = userEvent.setup();
    renderAdmin(
      <AdminProtectedShell userEmail="a@b.c" permissions={ALL_PERMISSIONS}>
        child
      </AdminProtectedShell>
    );
    const menu = document.querySelector('header button');
    expect(menu).toBeTruthy();
    await user.click(menu as HTMLButtonElement);
    const overlay = document.querySelector('[class*="bg-black/50"]');
    expect(overlay).toBeTruthy();
    await user.click(overlay as HTMLElement);
    expect(document.querySelector('[class*="bg-black/50"]')).toBeNull();
  });

  it('refreshes the server tree after client-side navigation', () => {
    const { rerender } = renderAdmin(
      <AdminProtectedShell userEmail="a@b.c" permissions={ALL_PERMISSIONS}>
        child
      </AdminProtectedShell>
    );
    expect(refresh).not.toHaveBeenCalled();
    pathname = '/admin/users';
    rerender(
      <NextIntlClientProvider locale="en" messages={{ admin: adminEn }}>
        <PermissionsProvider permissions={ALL_PERMISSIONS}>
          <AdminProtectedShell userEmail="a@b.c" permissions={ALL_PERMISSIONS}>
            child
          </AdminProtectedShell>
        </PermissionsProvider>
      </NextIntlClientProvider>
    );
    expect(refresh).toHaveBeenCalled();
  });

  it('hides nav items the user has no permission for', () => {
    renderAdmin(
      <AdminProtectedShell userEmail="a@b.c" permissions={['media.upload']}>
        child
      </AdminProtectedShell>
    );
    expect(
      screen.getAllByRole('link', { name: 'Media' }).length
    ).toBeGreaterThan(0);
    expect(screen.queryByRole('link', { name: 'All Posts' })).toBeNull();
    expect(screen.queryByRole('link', { name: 'Users' })).toBeNull();
    expect(screen.queryByText('Access')).toBeNull();
    // View Site and Sign Out are always available
    expect(
      screen.getAllByRole('button', { name: 'Sign Out' }).length
    ).toBeGreaterThan(0);
  });
});
