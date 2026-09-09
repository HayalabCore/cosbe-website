import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { listMedia, countMedia } from '@/lib/media-repository';

vi.mock('@/lib/supabase/server', () => ({
  createServerSupabaseClient: vi.fn(),
}));

vi.mock('@/lib/media-repository', () => ({
  listMedia: vi.fn(),
  countMedia: vi.fn(),
}));

import { GET } from './route';

describe('GET /api/admin/media', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 401 when logged out', async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: null } }) },
    } as never);
    const res = await GET(new Request('http://localhost/api/admin/media'));
    expect(res.status).toBe(401);
  });

  it('clamps pageSize and page', async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: { id: 'u' } } }) },
    } as never);
    vi.mocked(listMedia).mockResolvedValue([]);
    vi.mocked(countMedia).mockResolvedValue(0);
    await GET(
      new Request('http://localhost/api/admin/media?page=0&pageSize=999')
    );
    expect(listMedia).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, pageSize: 100 })
    );
  });
});
