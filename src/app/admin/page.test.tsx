import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderAdmin } from '@/test/render-admin';

const push = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, refresh: vi.fn(), replace: vi.fn() }),
}));

const signIn = vi.fn();
const signOut = vi.fn().mockResolvedValue(undefined);
vi.mock('@/lib/auth', () => ({
  signIn: (...a: unknown[]) => signIn(...a),
  signOut: (...a: unknown[]) => signOut(...a),
}));

vi.mock('@/lib/supabase/client', () => ({
  createBrowserSupabaseClient: () => ({}),
}));

import AdminLoginPage from './page';

describe('AdminLoginPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState(null, '', '/admin');
  });

  it('shows the disabled message and signs out for ?error=disabled', async () => {
    window.history.replaceState(null, '', '/admin?error=disabled');
    renderAdmin(<AdminLoginPage />);
    expect(
      await screen.findByText(
        'Your access has been disabled. Contact an administrator.'
      )
    ).toBeInTheDocument();
    expect(signOut).toHaveBeenCalled();
  });

  it('maps the banned sign-in error to the disabled message', async () => {
    signIn.mockResolvedValue({
      error: new Error('User is banned'),
      code: 'user_banned',
    });
    const user = userEvent.setup();
    renderAdmin(<AdminLoginPage />);
    await user.type(screen.getByLabelText('Email'), 'a@b.c');
    await user.type(screen.getByLabelText('Password'), 'secret-password');
    await user.click(screen.getByRole('button', { name: 'Sign in →' }));
    await waitFor(() =>
      expect(
        screen.getByText(
          'Your access has been disabled. Contact an administrator.'
        )
      ).toBeInTheDocument()
    );
    expect(push).not.toHaveBeenCalled();
  });

  it('toggles password visibility', async () => {
    const user = userEvent.setup();
    renderAdmin(<AdminLoginPage />);
    const input = screen.getByLabelText('Password');
    expect(input).toHaveAttribute('type', 'password');
    await user.click(screen.getByRole('button', { name: 'Show password' }));
    expect(input).toHaveAttribute('type', 'text');
  });

  it('keeps signing in after a successful login', async () => {
    signIn.mockResolvedValue({ error: null });
    const user = userEvent.setup();
    renderAdmin(<AdminLoginPage />);
    await user.type(screen.getByLabelText('Email'), 'a@b.c');
    await user.type(screen.getByLabelText('Password'), 'secret-password');
    await user.click(screen.getByRole('button', { name: 'Sign in →' }));
    await waitFor(() =>
      expect(push).toHaveBeenCalledWith('/admin/dashboard')
    );
    expect(
      screen.getByRole('button', { name: 'Signing in…' })
    ).toBeDisabled();
  });
});
