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

  it('returns the list payload when authed', async () => {
    vi.mocked(createServerSupabaseClient).mockResolvedValue({
      auth: { getUser: async () => ({ data: { user: { id: 'u' } } }) },
    } as never);
    vi.mocked(listMedia).mockResolvedValue([
      {
        id: 'm1',
        filename: 'pic.png',
        url: 'https://cdn.example/pic.png',
        size: 10,
        mimeType: 'image/png',
        alt: '',
        createdAt: new Date('2026-01-01T00:00:00.000Z'),
      },
    ] as never);
    vi.mocked(countMedia).mockResolvedValue(1);
    const res = await GET(new Request('http://localhost/api/admin/media'));
    expect(res.status).toBe(200);
    await expect(res.json()).resolves.toEqual({
      items: [
        {
          id: 'm1',
          filename: 'pic.png',
          url: 'https://cdn.example/pic.png',
          size: 10,
          mimeType: 'image/png',
          alt: '',
          createdAt: '2026-01-01T00:00:00.000Z',
        },
      ],
      total: 1,
      page: 1,
      pageSize: 24,
      totalPages: 1,
    });
  });
});
