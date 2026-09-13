import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderAdmin } from '@/test/render-admin';

const push = vi.fn();
const refresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push, refresh, replace: vi.fn() }),
}));

const signOut = vi.fn().mockResolvedValue(undefined);
vi.mock('@/lib/auth', () => ({
  signOut: (...a: unknown[]) => signOut(...a),
}));
vi.mock('@/lib/supabase/client', () => ({
  createBrowserSupabaseClient: () => ({}),
}));

const changeOwnPasswordAction = vi.fn();
vi.mock('@/actions/account', () => ({
  changeOwnPasswordAction: (...a: unknown[]) => changeOwnPasswordAction(...a),
}));

import ChangePasswordForm from './ChangePasswordForm';

async function fill(current: string, pw: string, confirm: string) {
  const user = userEvent.setup();
  renderAdmin(<ChangePasswordForm email="u@test.local" />);
  await user.type(screen.getByLabelText('Current password'), current);
  await user.type(screen.getByLabelText('New password'), pw);
  await user.type(screen.getByLabelText('Confirm new password'), confirm);
  await user.click(screen.getByRole('button', { name: 'Save password' }));
}

describe('ChangePasswordForm', () => {
  beforeEach(() => vi.clearAllMocks());

  it('validates length and match before calling the action', async () => {
    await fill('short', 'short', 'short');
    expect(screen.getByText('Use at least 12 characters.')).toBeInTheDocument();
    expect(changeOwnPasswordAction).not.toHaveBeenCalled();
  });

  it('accepts a current password shorter than 12 characters', async () => {
    changeOwnPasswordAction.mockResolvedValue({ ok: true, data: undefined });
    await fill('old', 'a-long-password-1', 'a-long-password-1');
    expect(changeOwnPasswordAction).toHaveBeenCalledWith({
      currentPassword: 'old',
      password: 'a-long-password-1',
    });
  });

  it('shows a mismatch error', async () => {
    await fill('temporary-pass', 'a-long-password-1', 'a-long-password-2');
    expect(screen.getByText('Passwords don’t match.')).toBeInTheDocument();
  });

  it('goes to the dashboard on success', async () => {
    changeOwnPasswordAction.mockResolvedValue({ ok: true, data: undefined });
    await fill('temporary-pass', 'a-long-password-1', 'a-long-password-1');
    await waitFor(() => expect(push).toHaveBeenCalledWith('/admin/dashboard'));
    expect(changeOwnPasswordAction).toHaveBeenCalledWith({
      currentPassword: 'temporary-pass',
      password: 'a-long-password-1',
    });
  });

  it('shows translated action errors', async () => {
    changeOwnPasswordAction.mockResolvedValue({
      ok: false,
      error: 'SAME_PASSWORD',
    });
    await fill('temporary-pass', 'a-long-password-1', 'a-long-password-1');
    expect(
      await screen.findByText(
        'Choose a password different from your current one.'
      )
    ).toBeInTheDocument();
    expect(push).not.toHaveBeenCalled();
  });

  it('signs out and returns to login', async () => {
    const user = userEvent.setup();
    renderAdmin(<ChangePasswordForm email="u@test.local" />);
    await user.click(screen.getByRole('button', { name: 'Sign out' }));
    await waitFor(() => expect(signOut).toHaveBeenCalled());
    expect(push).toHaveBeenCalledWith('/admin');
  });
});
