import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/authz', () => ({ getCurrentAdmin: vi.fn() }));
vi.mock('next/navigation', () => ({
  redirect: vi.fn(() => {
    throw new Error('NEXT_REDIRECT');
  }),
}));
vi.mock('./ChangePasswordForm', () => ({ default: () => null }));

import ChangePasswordPage from './page';
import { getCurrentAdmin } from '@/lib/authz';
import { redirect } from 'next/navigation';

const user = { id: 'u', email: 'u@test.local' };

describe('ChangePasswordPage', () => {
  beforeEach(() => vi.clearAllMocks());

  it.each([
    [{ status: 'unauthenticated' }, '/admin'],
    [{ status: 'disabled', user }, '/admin?error=disabled'],
    [{ status: 'active', user }, '/admin/dashboard'],
  ])('redirects %o to %s', async (current, to) => {
    vi.mocked(getCurrentAdmin).mockResolvedValue(current as never);
    await expect(ChangePasswordPage()).rejects.toThrow('NEXT_REDIRECT');
    expect(redirect).toHaveBeenCalledWith(to);
  });

  it('renders the form while a change is required', async () => {
    vi.mocked(getCurrentAdmin).mockResolvedValue({
      status: 'must-change-password',
      user,
    } as never);
    const el = (await ChangePasswordPage()) as { props: { email: string } };
    expect(el.props.email).toBe('u@test.local');
  });
});
