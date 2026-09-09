import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authedUser, unauth } from '@/test/require-user';
import { createPayload } from '@/test/fixtures/articles';

vi.mock('@/lib/require-user', () => ({
  requireUser: vi.fn(),
}));

vi.mock('@/lib/article-revalidation', () => ({
  revalidateArticlePaths: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

vi.mock('@/lib/articles', () => ({
  createArticleRecord: vi.fn(),
  updateArticleRecord: vi.fn(),
  archiveArticleRecord: vi.fn(),
  deleteArticleRecord: vi.fn(),
  getArticleByIdAdmin: vi.fn(),
  getArticleSlugCategoryById: vi.fn(),
  getArticles: vi.fn(),
  countArticles: vi.fn(),
  getArticleStatusCounts: vi.fn(),
  publishArticleRecord: vi.fn(),
  unpublishArticleRecord: vi.fn(),
  publishArticlesRecord: vi.fn(),
  unpublishArticlesRecord: vi.fn(),
  archiveArticlesRecord: vi.fn(),
  deleteArticlesRecord: vi.fn(),
}));

import {
  archiveArticleAction,
  archiveArticlesAction,
  createArticleAction,
  deleteArticlesAction,
  getArticleByIdAction,
  hardDeleteArticleAction,
  listArticlesAdminAction,
  publishArticleAction,
  publishArticlesAction,
  restoreArticleAction,
  unpublishArticleAction,
  unpublishArticlesAction,
  updateArticleAction,
} from './articles';
import * as articles from '@/lib/articles';
import { requireUser } from '@/lib/require-user';

describe('article actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authedUser();
  });

  it('createArticleAction throws Unauthorized when logged out', async () => {
    unauth();
    await expect(createArticleAction(createPayload())).rejects.toThrow(
      'Unauthorized'
    );
    expect(articles.createArticleRecord).not.toHaveBeenCalled();
  });

  it('createArticleAction persists the normalized payload', async () => {
    vi.mocked(articles.createArticleRecord).mockResolvedValue('new-id');
    const id = await createArticleAction(
      createPayload({ titleEn: '   ', toc: [{ id: 'x', level: 2, text: 't' }] })
    );
    expect(id).toBe('new-id');
    const sent = vi.mocked(articles.createArticleRecord).mock.calls[0][0];
    expect(sent.titleEn).toBeUndefined();
    expect(sent.toc).toEqual([]);
  });

  it('createArticleAction throws Zod details on empty title', async () => {
    await expect(
      createArticleAction(createPayload({ title: '   ' }))
    ).rejects.toThrow(/Invalid article data/);
    expect(articles.createArticleRecord).not.toHaveBeenCalled();
  });

  it('updateArticleAction throws Zod details on invalid status', async () => {
    await expect(
      updateArticleAction('id-1', { status: 'bogus' as never })
    ).rejects.toThrow(/Invalid article data/);
  });

  it('updateArticleAction documents current behavior: valid extra keys are not the parsed object', async () => {
    vi.mocked(articles.updateArticleRecord).mockResolvedValue(undefined);
    const raw = { title: 'Ok', extra: 'still-passed' };
    await updateArticleAction('id-1', raw as never);
    expect(articles.updateArticleRecord).toHaveBeenCalledWith('id-1', raw);
  });

  it('restore/publish/unpublish throw Not found when missing', async () => {
    vi.mocked(articles.getArticleSlugCategoryById).mockResolvedValue(null);
    await expect(restoreArticleAction('missing')).rejects.toThrow('Not found');
    await expect(publishArticleAction('missing')).rejects.toThrow('Not found');
    await expect(unpublishArticleAction('missing')).rejects.toThrow(
      'Not found'
    );
  });

  it('empty bulk ids are no-ops', async () => {
    await publishArticlesAction([]);
    await unpublishArticlesAction([]);
    await archiveArticlesAction([]);
    await deleteArticlesAction([]);
    expect(articles.publishArticlesRecord).not.toHaveBeenCalled();
    expect(articles.unpublishArticlesRecord).not.toHaveBeenCalled();
    expect(articles.archiveArticlesRecord).not.toHaveBeenCalled();
    expect(articles.deleteArticlesRecord).not.toHaveBeenCalled();
  });

  it('listArticlesAdminAction clamps page and pageSize', async () => {
    vi.mocked(articles.getArticles).mockResolvedValue([]);
    vi.mocked(articles.countArticles).mockResolvedValue(0);
    vi.mocked(articles.getArticleStatusCounts).mockResolvedValue({
      total: 0,
      published: 0,
      draft: 0,
      archived: 0,
    });
    await listArticlesAdminAction({ page: 0, pageSize: 999 });
    expect(articles.getArticles).toHaveBeenCalledWith(
      expect.objectContaining({ page: 1, pageSize: 100 }),
      true
    );
  });

  it('archive and hardDelete require a user', async () => {
    unauth();
    await expect(
      archiveArticleAction('id', 'slug', 'useful-info')
    ).rejects.toThrow('Unauthorized');
    await expect(
      hardDeleteArticleAction('id', 'slug', 'useful-info')
    ).rejects.toThrow('Unauthorized');
  });

  it('getArticleByIdAction requires a user then loads the article', async () => {
    vi.mocked(articles.getArticleByIdAdmin).mockResolvedValue(null);
    await getArticleByIdAction('art-1');
    expect(requireUser).toHaveBeenCalled();
    expect(articles.getArticleByIdAdmin).toHaveBeenCalledWith('art-1');

    unauth();
    await expect(getArticleByIdAction('art-1')).rejects.toThrow('Unauthorized');
  });

  it('bulk publish calls the record helper when ids are present', async () => {
    vi.mocked(articles.publishArticlesRecord).mockResolvedValue(undefined);
    await publishArticlesAction(['a', 'b']);
    expect(articles.publishArticlesRecord).toHaveBeenCalledWith(['a', 'b']);
    expect(requireUser).toHaveBeenCalled();
  });
});
