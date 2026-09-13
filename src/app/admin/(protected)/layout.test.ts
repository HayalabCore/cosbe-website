import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/authz', () => ({
  getCurrentAdmin: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn(() => {
    throw new Error('NEXT_REDIRECT');
  }),
}));

vi.mock('./AdminProtectedShell', () => ({
  default: (props: { children: unknown; permissions: string[] }) => props,
}));

import AdminProtectedLayout from './layout';
import { getCurrentAdmin } from '@/lib/authz';
import { redirect } from 'next/navigation';

const user = { id: 'u', email: 'u@test.local' };

describe('AdminProtectedLayout', () => {
  beforeEach(() => vi.clearAllMocks());

  it('redirects to /admin when unauthenticated', async () => {
    vi.mocked(getCurrentAdmin).mockResolvedValue({
      status: 'unauthenticated',
    });
    await expect(AdminProtectedLayout({ children: null })).rejects.toThrow(
      'NEXT_REDIRECT'
    );
    expect(redirect).toHaveBeenCalledWith('/admin');
  });

  it('redirects disabled users to the login page with an error', async () => {
    vi.mocked(getCurrentAdmin).mockResolvedValue({
      status: 'disabled',
      user,
    } as never);
    await expect(AdminProtectedLayout({ children: null })).rejects.toThrow(
      'NEXT_REDIRECT'
    );
    expect(redirect).toHaveBeenCalledWith('/admin?error=disabled');
  });

  it('redirects to change-password when required', async () => {
    vi.mocked(getCurrentAdmin).mockResolvedValue({
      status: 'must-change-password',
      user,
    } as never);
    await expect(AdminProtectedLayout({ children: null })).rejects.toThrow(
      'NEXT_REDIRECT'
    );
    expect(redirect).toHaveBeenCalledWith('/admin/change-password');
  });

  it('renders the shell with the permission list when active', async () => {
    vi.mocked(getCurrentAdmin).mockResolvedValue({
      status: 'active',
      user,
      actor: {
        userId: 'u',
        permissions: new Set(['dashboard.view']),
        isSuperAdmin: false,
      },
    } as never);
    const el = (await AdminProtectedLayout({ children: 'ok' })) as {
      props: { permissions: string[]; userEmail: string };
    };
    expect(redirect).not.toHaveBeenCalled();
    expect(el.props.permissions).toEqual(['dashboard.view']);
    expect(el.props.userEmail).toBe('u@test.local');
  });
});
