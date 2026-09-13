import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authed, TEST_USER, unauth } from '@/test/authz';

vi.mock('@/lib/authz', () => ({
  requirePermission: vi.fn(),
  requireAnyPermission: vi.fn(),
  requireActiveSession: vi.fn(),
}));

vi.mock('@/lib/admin-users-repository', () => ({
  setMustChangePassword: vi.fn(),
}));

import { changeOwnPasswordAction } from './account';
import { setMustChangePassword } from '@/lib/admin-users-repository';

describe('changeOwnPasswordAction', () => {
  beforeEach(() => vi.clearAllMocks());

  const input = {
    currentPassword: 'temporary-pass',
    password: 'my-own-password',
  };

  it('updates the password with the user session and clears the flag', async () => {
    const ctx = authed([]);
    ctx.supabase.auth.signInWithPassword.mockResolvedValue({
      data: {},
      error: null,
    });
    ctx.supabase.auth.updateUser.mockResolvedValue({ data: {}, error: null });
    expect(await changeOwnPasswordAction(input)).toEqual({
      ok: true,
      data: undefined,
    });
    expect(ctx.supabase.auth.signInWithPassword).toHaveBeenCalledWith({
      email: TEST_USER.email,
      password: 'temporary-pass',
    });
    expect(ctx.supabase.auth.updateUser).toHaveBeenCalledWith({
      password: 'my-own-password',
    });
    expect(setMustChangePassword).toHaveBeenCalledWith(TEST_USER.id, false);
  });

  it('accepts a current password shorter than 12 characters', async () => {
    const ctx = authed([]);
    ctx.supabase.auth.signInWithPassword.mockResolvedValue({
      data: {},
      error: null,
    });
    ctx.supabase.auth.updateUser.mockResolvedValue({ data: {}, error: null });
    expect(
      await changeOwnPasswordAction({
        currentPassword: 'old-pass',
        password: 'my-own-password',
      })
    ).toEqual({ ok: true, data: undefined });
  });

  it('rejects a wrong current password', async () => {
    const ctx = authed([]);
    ctx.supabase.auth.signInWithPassword.mockResolvedValue({
      data: {},
      error: { message: 'invalid' },
    });
    expect(await changeOwnPasswordAction(input)).toEqual({
      ok: false,
      error: 'WRONG_PASSWORD',
    });
    expect(ctx.supabase.auth.updateUser).not.toHaveBeenCalled();
  });

  it('maps same_password and weak_password', async () => {
    const ctx = authed([]);
    ctx.supabase.auth.signInWithPassword.mockResolvedValue({
      data: {},
      error: null,
    });
    ctx.supabase.auth.updateUser.mockResolvedValueOnce({
      data: {},
      error: { code: 'same_password' },
    });
    expect(await changeOwnPasswordAction(input)).toEqual({
      ok: false,
      error: 'SAME_PASSWORD',
    });
    ctx.supabase.auth.updateUser.mockResolvedValueOnce({
      data: {},
      error: { code: 'weak_password' },
    });
    expect(await changeOwnPasswordAction(input)).toEqual({
      ok: false,
      error: 'WEAK_PASSWORD',
    });
    expect(setMustChangePassword).not.toHaveBeenCalled();
  });

  it('rejects short passwords without calling Supabase', async () => {
    const ctx = authed([]);
    expect(
      await changeOwnPasswordAction({
        currentPassword: 'short',
        password: 'short',
      })
    ).toEqual({
      ok: false,
      error: 'INVALID_INPUT',
    });
    expect(ctx.supabase.auth.signInWithPassword).not.toHaveBeenCalled();
    expect(ctx.supabase.auth.updateUser).not.toHaveBeenCalled();
  });

  it('throws when signed out', async () => {
    unauth();
    await expect(changeOwnPasswordAction(input)).rejects.toThrow(
      'Unauthorized'
    );
  });
});
