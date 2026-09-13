import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authed, unauth } from '@/test/authz';

vi.mock('@/lib/authz', () => ({
  requirePermission: vi.fn(),
  requireAnyPermission: vi.fn(),
  requireActiveSession: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

vi.mock('@/lib/media-repository', () => ({
  createMediaRecord: vi.fn(),
  getMediaById: vi.fn(),
  deleteMediaRecord: vi.fn(),
}));

vi.mock('@/lib/storage', () => ({
  deleteFromGallery: vi.fn(),
}));

import { deleteMediaAction, recordMediaAction } from './media';
import * as mediaRepo from '@/lib/media-repository';
import { deleteFromGallery } from '@/lib/storage';

describe('media actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authed();
  });

  it('recordMediaAction throws Unauthorized when logged out', async () => {
    unauth();
    await expect(
      recordMediaAction({ filename: 'a.png', url: 'https://x/a.png' })
    ).rejects.toThrow('Unauthorized');
  });

  it('recordMediaAction persists metadata when authed', async () => {
    const row = {
      id: 'm1',
      filename: 'a.png',
      url: 'https://x/a.png',
      size: 1,
      mimeType: 'image/png',
      alt: '',
      createdAt: new Date(),
    };
    vi.mocked(mediaRepo.createMediaRecord).mockResolvedValue(row as never);
    const result = await recordMediaAction({
      filename: 'a.png',
      url: 'https://x/a.png',
    });
    expect(result).toEqual(row);
    expect(mediaRepo.createMediaRecord).toHaveBeenCalled();
  });

  it('deleteMediaAction throws Not found when missing', async () => {
    vi.mocked(mediaRepo.getMediaById).mockResolvedValue(null);
    await expect(deleteMediaAction('missing')).rejects.toThrow('Not found');
  });

  it('deleteMediaAction succeeds even if storage delete fails', async () => {
    vi.mocked(mediaRepo.getMediaById).mockResolvedValue({
      id: 'm1',
      url: 'https://x/a.png',
    } as never);
    vi.mocked(mediaRepo.deleteMediaRecord).mockResolvedValue({} as never);
    vi.mocked(deleteFromGallery).mockRejectedValue(new Error('storage'));
    await expect(deleteMediaAction('m1')).resolves.toBeUndefined();
    expect(mediaRepo.deleteMediaRecord).toHaveBeenCalledWith('m1');
  });

  it('deleteMediaAction is Forbidden without media.delete', async () => {
    authed(['media.upload']);
    await expect(deleteMediaAction('m1')).rejects.toThrow('Forbidden');
    expect(mediaRepo.deleteMediaRecord).not.toHaveBeenCalled();
  });
});
