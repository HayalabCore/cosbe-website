import { beforeEach, describe, expect, it, vi } from 'vitest';
import { listMedia, countMedia } from '@/lib/media-repository';
import { authed, unauth } from '@/test/authz';

vi.mock('@/lib/authz', () => ({
  requirePermission: vi.fn(),
  requireAnyPermission: vi.fn(),
  requireActiveSession: vi.fn(),
  UNAUTHORIZED_ERROR: 'Unauthorized',
  FORBIDDEN_ERROR: 'Forbidden',
}));

vi.mock('@/lib/media-repository', () => ({
  listMedia: vi.fn(),
  countMedia: vi.fn(),
}));

import { GET } from './route';
import { requireAnyPermission } from '@/lib/authz';

describe('GET /api/admin/media', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authed();
  });

  it('returns 401 when logged out', async () => {
    unauth();
    const res = await GET(new Request('http://localhost/api/admin/media'));
    expect(res.status).toBe(401);
  });

  it('returns 500 when authorization throws an unexpected error', async () => {
    vi.mocked(requireAnyPermission).mockRejectedValue(new Error('db down'));
    const res = await GET(new Request('http://localhost/api/admin/media'));
    expect(res.status).toBe(500);
  });

  it('returns 403 without media.upload or articles.edit', async () => {
    authed(['dashboard.view']);
    const res = await GET(new Request('http://localhost/api/admin/media'));
    expect(res.status).toBe(403);
  });

  it('clamps pageSize and page', async () => {
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
