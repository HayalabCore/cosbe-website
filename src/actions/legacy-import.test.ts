import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authedUser, unauth } from '@/test/require-user';
import {
  ImageRehostError,
  SlugCollisionError,
  type ImportCommitPayload,
} from '@/lib/legacy-import/types';

vi.mock('@/lib/require-user', () => ({
  requireUser: vi.fn(),
}));

vi.mock('@/lib/article-revalidation', () => ({
  revalidateArticlePaths: vi.fn(),
}));

vi.mock('@/lib/legacy-import', () => ({
  previewImport: vi.fn(),
  isImportSlugAvailable: vi.fn(),
}));

vi.mock('@/lib/legacy-import/rehost', () => ({
  rehostImportImages: vi.fn(),
}));

vi.mock('@/lib/articles', () => ({
  createArticleRecord: vi.fn(),
}));

import {
  checkImportSlugAction,
  commitImportAction,
  previewImportAction,
} from './legacy-import';
import { isImportSlugAvailable, previewImport } from '@/lib/legacy-import';
import { rehostImportImages } from '@/lib/legacy-import/rehost';
import { createArticleRecord } from '@/lib/articles';

const payload: ImportCommitPayload = {
  sourceUrl: 'https://www.jp.cosbe.inc/useful-info/hello/',
  category: 'useful-info',
  slug: 'imp',
  slugCollision: false,
  title: 'T',
  excerpt: '',
  featuredImageRemoteUrl: null,
  publishedAt: '2026-01-01T00:00:00.000Z',
  tags: [],
  blocks: [],
  warnings: [],
};

describe('legacy-import actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authedUser();
  });

  it('preview/check/commit unauthorized', async () => {
    unauth();
    await expect(previewImportAction('https://x')).rejects.toThrow(
      'Unauthorized'
    );
    await expect(checkImportSlugAction('s')).rejects.toThrow('Unauthorized');
    await expect(commitImportAction(payload)).rejects.toThrow('Unauthorized');
  });

  it('commit throws SlugCollisionError when slug taken', async () => {
    vi.mocked(isImportSlugAvailable).mockResolvedValue(false);
    await expect(commitImportAction(payload)).rejects.toBeInstanceOf(
      SlugCollisionError
    );
  });

  it('commit creates a draft and concatenates rehost warnings', async () => {
    vi.mocked(isImportSlugAvailable).mockResolvedValue(true);
    vi.mocked(rehostImportImages).mockResolvedValue({
      featuredImageUrl: null,
      blocks: payload.blocks,
      warnings: ['rehost-w'],
    });
    vi.mocked(createArticleRecord).mockResolvedValue('id-1');
    const result = await commitImportAction({
      ...payload,
      warnings: ['preview-w'],
    });
    expect(result.warnings).toEqual(['preview-w', 'rehost-w']);
    expect(vi.mocked(createArticleRecord).mock.calls[0][0].status).toBe(
      'draft'
    );
  });

  it('surfaces ImageRehostError message', async () => {
    vi.mocked(isImportSlugAvailable).mockResolvedValue(true);
    vi.mocked(rehostImportImages).mockRejectedValue(
      new ImageRehostError('bad-image', ['https://x'])
    );
    await expect(commitImportAction(payload)).rejects.toThrow('bad-image');
  });

  it('previewImportAction calls previewImport when authed', async () => {
    vi.mocked(previewImport).mockResolvedValue(payload);
    await previewImportAction(payload.sourceUrl);
    expect(previewImport).toHaveBeenCalledWith(payload.sourceUrl);
  });
});
