import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authed, unauth } from '@/test/authz';
import { createPayload } from '@/test/fixtures/articles';
import { prismaUniqueConflict } from '@/test/prisma-error';
import { revalidateArticlePaths } from '@/lib/article-revalidation';

vi.mock('@/lib/authz', () => ({
  requirePermission: vi.fn(),
  requireAnyPermission: vi.fn(),
  requireActiveSession: vi.fn(),
}));

vi.mock('@/lib/article-revalidation', () => ({
  revalidateArticlePaths: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

vi.mock('@/lib/articles', () => ({
  allocateUniqueSlug: vi.fn(async (slug: string) => slug),
  createArticleRecord: vi.fn(),
  updateArticleRecord: vi.fn(),
  archiveArticleRecord: vi.fn(),
  deleteArticleRecord: vi.fn(),
  getArticleByIdAdmin: vi.fn(),
  getArticleSlugCategoryById: vi.fn(),
  getArticleMetasByIds: vi.fn(),
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
import { requireAnyPermission, requirePermission } from '@/lib/authz';

describe('article actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authed();
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
    const result = await createArticleAction(
      createPayload({ titleEn: '   ', toc: [{ id: 'x', level: 2, text: 't' }] })
    );
    expect(result).toEqual({ ok: true, id: 'new-id', slug: 'hello' });
    const sent = vi.mocked(articles.createArticleRecord).mock.calls[0][0];
    expect(sent.titleEn).toBeUndefined();
    expect(sent.toc).toEqual([]);
  });

  it('createArticleAction suffixes a taken derived slug when autoSuffixSlug is set', async () => {
    vi.mocked(articles.allocateUniqueSlug).mockResolvedValue('hello-2');
    vi.mocked(articles.createArticleRecord).mockResolvedValue('new-id');
    await expect(
      createArticleAction(createPayload(), { autoSuffixSlug: true })
    ).resolves.toEqual({
      ok: true,
      id: 'new-id',
      slug: 'hello-2',
    });
    expect(articles.createArticleRecord).toHaveBeenCalledWith(
      expect.objectContaining({ slug: 'hello-2' })
    );
  });

  it('createArticleAction does not rewrite a typed slug', async () => {
    vi.mocked(articles.createArticleRecord).mockResolvedValue('new-id');
    await expect(createArticleAction(createPayload())).resolves.toEqual({
      ok: true,
      id: 'new-id',
      slug: 'hello',
    });
    expect(articles.allocateUniqueSlug).not.toHaveBeenCalled();
  });

  it('createArticleAction returns SLUG_CONFLICT when a typed slug is taken', async () => {
    vi.mocked(articles.createArticleRecord).mockRejectedValue(
      prismaUniqueConflict(['slug'])
    );
    await expect(createArticleAction(createPayload())).resolves.toEqual({
      ok: false,
      error: 'SLUG_CONFLICT',
    });
    expect(articles.allocateUniqueSlug).not.toHaveBeenCalled();
  });

  it('createArticleAction does not treat an author unique conflict as a slug conflict', async () => {
    vi.mocked(articles.createArticleRecord).mockRejectedValue(
      prismaUniqueConflict(['name', 'designation'])
    );
    await expect(createArticleAction(createPayload())).resolves.toEqual({
      ok: false,
      error: 'SAVE_FAILED',
    });
  });

  it('updateArticleAction returns SLUG_CONFLICT for a slug P2002', async () => {
    vi.mocked(articles.getArticleSlugCategoryById).mockResolvedValue({
      slug: 'hello',
      category: 'useful-info',
      status: 'draft',
    });
    vi.mocked(articles.updateArticleRecord).mockRejectedValue(
      prismaUniqueConflict(['slug'])
    );
    await expect(updateArticleAction('id-1', { slug: 'ai' })).resolves.toEqual({
      ok: false,
      error: 'SLUG_CONFLICT',
    });
  });

  it('updateArticleAction revalidates the previous slug when it changes', async () => {
    vi.mocked(articles.getArticleSlugCategoryById).mockResolvedValue({
      slug: 'old-slug',
      category: 'useful-info',
      status: 'draft',
    });
    vi.mocked(articles.updateArticleRecord).mockResolvedValue(undefined);
    await expect(
      updateArticleAction('id-1', { slug: 'new-slug', category: 'useful-info' })
    ).resolves.toEqual({ ok: true, id: 'id-1', slug: 'new-slug' });
    expect(revalidateArticlePaths).toHaveBeenCalledWith(
      ['new-slug', 'old-slug'],
      'useful-info'
    );
  });

  it('updateArticleAction revalidates the old category path when category changes', async () => {
    vi.mocked(articles.getArticleSlugCategoryById).mockResolvedValue({
      slug: 'same-slug',
      category: 'useful-info',
      status: 'draft',
    });
    vi.mocked(articles.updateArticleRecord).mockResolvedValue(undefined);
    await updateArticleAction('id-1', {
      slug: 'same-slug',
      category: 'case-study',
    });
    expect(revalidateArticlePaths).toHaveBeenCalledWith(
      'same-slug',
      'useful-info'
    );
    expect(revalidateArticlePaths).toHaveBeenCalledWith(
      'same-slug',
      'case-study'
    );
  });

  it('updateArticleAction does not revalidate the old slug under the new category', async () => {
    vi.mocked(articles.getArticleSlugCategoryById).mockResolvedValue({
      slug: 'old-slug',
      category: 'useful-info',
      status: 'draft',
    });
    vi.mocked(articles.updateArticleRecord).mockResolvedValue(undefined);
    await updateArticleAction('id-1', {
      slug: 'new-slug',
      category: 'case-study',
    });
    expect(revalidateArticlePaths).toHaveBeenCalledWith(
      'old-slug',
      'useful-info'
    );
    expect(revalidateArticlePaths).toHaveBeenCalledWith(
      'new-slug',
      'case-study'
    );
    expect(revalidateArticlePaths).not.toHaveBeenCalledWith(
      expect.arrayContaining(['old-slug']),
      'case-study'
    );
  });

  it('updateArticleAction fails when the article is missing', async () => {
    vi.mocked(articles.getArticleSlugCategoryById).mockResolvedValue(null);
    await expect(
      updateArticleAction('missing', { title: 'Ok' })
    ).resolves.toEqual({ ok: false, error: 'SAVE_FAILED' });
    expect(articles.updateArticleRecord).not.toHaveBeenCalled();
  });

  it('createArticleAction returns Zod details on empty title', async () => {
    await expect(
      createArticleAction(createPayload({ title: '   ' }))
    ).resolves.toMatchObject({
      ok: false,
      error: expect.stringMatching(/Invalid article data/),
    });
    expect(articles.createArticleRecord).not.toHaveBeenCalled();
  });

  it('updateArticleAction returns Zod details on invalid status', async () => {
    await expect(
      updateArticleAction('id-1', { status: 'bogus' as never })
    ).resolves.toMatchObject({
      ok: false,
      error: expect.stringMatching(/Invalid article data/),
    });
  });

  it('updateArticleAction persists the validated patch and drops unknown keys', async () => {
    vi.mocked(articles.getArticleSlugCategoryById).mockResolvedValue({
      slug: 'hello',
      category: 'useful-info',
      status: 'draft',
    });
    vi.mocked(articles.updateArticleRecord).mockResolvedValue(undefined);
    const raw = { title: 'Ok', extra: 'still-passed' };
    await updateArticleAction('id-1', raw as never);
    expect(articles.updateArticleRecord).toHaveBeenCalledWith('id-1', {
      title: 'Ok',
    });
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
    expect(requireAnyPermission).toHaveBeenCalledWith(
      'dashboard.view',
      'articles.edit'
    );
    expect(articles.getArticleByIdAdmin).toHaveBeenCalledWith('art-1');

    unauth();
    await expect(getArticleByIdAction('art-1')).rejects.toThrow('Unauthorized');
  });

  it('bulk publish calls the record helper when ids are present', async () => {
    vi.mocked(articles.getArticleMetasByIds).mockResolvedValue([
      {
        id: 'a',
        slug: 'a',
        category: 'useful-info',
        status: 'draft',
      },
      {
        id: 'b',
        slug: 'b',
        category: 'useful-info',
        status: 'draft',
      },
    ]);
    vi.mocked(articles.publishArticlesRecord).mockResolvedValue(undefined);
    await publishArticlesAction(['a', 'b']);
    expect(articles.publishArticlesRecord).toHaveBeenCalledWith(['a', 'b']);
    expect(requirePermission).toHaveBeenCalledWith('articles.publish');
  });

  it('cannot publish an archived article without articles.archive', async () => {
    authed(['articles.publish']);
    vi.mocked(articles.getArticleSlugCategoryById).mockResolvedValue({
      slug: 'hello',
      category: 'useful-info',
      status: 'archived',
    });
    await expect(publishArticleAction('id')).rejects.toThrow('Forbidden');
    expect(articles.publishArticleRecord).not.toHaveBeenCalled();
  });

  it('cannot archive a published article without articles.publish', async () => {
    authed(['articles.archive']);
    vi.mocked(articles.getArticleSlugCategoryById).mockResolvedValue({
      slug: 'hello',
      category: 'useful-info',
      status: 'published',
    });
    await expect(
      archiveArticleAction('id', 'hello', 'useful-info')
    ).rejects.toThrow('Forbidden');
    expect(articles.archiveArticleRecord).not.toHaveBeenCalled();
  });

  it('cannot delete a published article without articles.archive', async () => {
    authed(['articles.delete']);
    vi.mocked(articles.getArticleSlugCategoryById).mockResolvedValue({
      slug: 'hello',
      category: 'useful-info',
      status: 'published',
    });
    await expect(
      hardDeleteArticleAction('id', 'hello', 'useful-info')
    ).rejects.toThrow('Forbidden');
    expect(articles.deleteArticleRecord).not.toHaveBeenCalled();
  });

  it('deleting an already-archived article needs only articles.delete', async () => {
    authed(['articles.delete']);
    vi.mocked(articles.getArticleSlugCategoryById).mockResolvedValue({
      slug: 'hello',
      category: 'useful-info',
      status: 'archived',
    });
    await hardDeleteArticleAction('id', 'hello', 'useful-info');
    expect(articles.deleteArticleRecord).toHaveBeenCalledWith('id');
  });

  it('publish actions are Forbidden without articles.publish', async () => {
    authed(['dashboard.view', 'articles.edit']);
    await expect(publishArticleAction('id')).rejects.toThrow('Forbidden');
    await expect(publishArticlesAction(['a'])).rejects.toThrow('Forbidden');
    expect(articles.publishArticlesRecord).not.toHaveBeenCalled();
  });

  it('delete actions are Forbidden without articles.delete', async () => {
    authed(['dashboard.view', 'articles.archive']);
    await expect(deleteArticlesAction(['a'])).rejects.toThrow('Forbidden');
    await expect(
      hardDeleteArticleAction('id', 'slug', 'useful-info')
    ).rejects.toThrow('Forbidden');
  });

  it('createArticleAction with status published needs articles.publish', async () => {
    authed(['articles.edit']);
    await expect(
      createArticleAction(createPayload({ status: 'published' }))
    ).rejects.toThrow('Forbidden');
    expect(articles.createArticleRecord).not.toHaveBeenCalled();
  });

  it('createArticleAction as draft needs only articles.edit', async () => {
    authed(['articles.edit']);
    vi.mocked(articles.createArticleRecord).mockResolvedValue('new-id');
    const result = await createArticleAction(
      createPayload({ status: 'draft' })
    );
    expect(result).toMatchObject({ ok: true });
  });

  it('updateArticleAction changing draft -> published needs articles.publish', async () => {
    authed(['articles.edit']);
    vi.mocked(articles.getArticleSlugCategoryById).mockResolvedValue({
      slug: 'hello',
      category: 'useful-info',
      status: 'draft',
    });
    await expect(
      updateArticleAction('id', { status: 'published' })
    ).rejects.toThrow('Forbidden');
    expect(articles.updateArticleRecord).not.toHaveBeenCalled();
  });

  it('updateArticleAction keeping published status needs only articles.edit', async () => {
    authed(['articles.edit']);
    vi.mocked(articles.getArticleSlugCategoryById).mockResolvedValue({
      slug: 'hello',
      category: 'useful-info',
      status: 'published',
    });
    vi.mocked(articles.updateArticleRecord).mockResolvedValue(
      undefined as never
    );
    const result = await updateArticleAction('id', {
      status: 'published',
      title: 'Changed',
    });
    expect(result).toMatchObject({ ok: true });
  });
});
