import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderAdmin } from '@/test/render-admin';

const replace = vi.fn();
const refresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, refresh, push: vi.fn() }),
  usePathname: () => '/admin/dashboard',
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
    document.cookie = 'admin_locale=; max-age=0; path=/';
  });

  it('renders sidebar links', () => {
    renderAdmin(
      <AdminProtectedShell userEmail="a@b.c">child</AdminProtectedShell>
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
  });

  it('signs out and replaces to /admin', async () => {
    const user = userEvent.setup();
    renderAdmin(
      <AdminProtectedShell userEmail="a@b.c">child</AdminProtectedShell>
    );
    await user.click(screen.getAllByRole('button', { name: 'Sign Out' })[0]);
    expect(signOut).toHaveBeenCalled();
    expect(replace).toHaveBeenCalledWith('/admin');
  });

  it('sets the admin_locale cookie to ja when JP is clicked', async () => {
    const user = userEvent.setup();
    renderAdmin(
      <AdminProtectedShell userEmail="a@b.c">child</AdminProtectedShell>
    );
    await user.click(screen.getAllByRole('button', { name: 'JP' })[0]);
    expect(document.cookie).toMatch(/admin_locale=ja/);
  });

  it('opens and closes the mobile drawer', async () => {
    const user = userEvent.setup();
    renderAdmin(
      <AdminProtectedShell userEmail="a@b.c">child</AdminProtectedShell>
    );
    const menu = document.querySelector('header button');
    expect(menu).toBeTruthy();
    await user.click(menu as HTMLButtonElement);
    const overlay = document.querySelector('[class*="bg-black/50"]');
    expect(overlay).toBeTruthy();
    await user.click(overlay as HTMLElement);
    expect(document.querySelector('[class*="bg-black/50"]')).toBeNull();
  });
});
