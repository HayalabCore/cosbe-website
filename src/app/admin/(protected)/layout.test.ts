import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  redirect: vi.fn(() => {
    throw new Error('NEXT_REDIRECT');
  }),
}));

vi.mock('./AdminProtectedShell', () => ({
  default: ({ children }: { children: unknown }) => children,
}));

import AdminProtectedLayout from './layout';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { redirect } from 'next/navigation';

describe('AdminProtectedLayout', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('redirects to /admin when there is no user', async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: null } }) },
    } as never);
    await expect(AdminProtectedLayout({ children: null })).rejects.toThrow(
      'NEXT_REDIRECT'
    );
    expect(redirect).toHaveBeenCalledWith('/admin');
  });

  it('renders children when authed', async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: { id: 'u' } } }) },
    } as never);
    const el = await AdminProtectedLayout({ children: 'ok' });
    expect(redirect).not.toHaveBeenCalled();
    expect(el).toBeTruthy();
  });
});
