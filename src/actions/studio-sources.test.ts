import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authed, TEST_USER, unauth } from '@/test/authz';

vi.mock('@/lib/authz', () => ({
  requirePermission: vi.fn(),
  requireAnyPermission: vi.fn(),
  requireActiveSession: vi.fn(),
}));
vi.mock('@/lib/studio/web-boss', () => ({
  getWebBoss: vi.fn(async () => ({})),
}));
vi.mock('@/generator/sources/enqueue-ingest', () => ({
  enqueueIngest: vi.fn(),
}));
vi.mock('@/generator/sources/sources-repository', () => ({
  createSource: vi.fn(async (input) => ({ id: 's1', ...input })),
  getSource: vi.fn(),
  listSources: vi.fn(async () => []),
  setSourceStatus: vi.fn(),
  countProjectLinks: vi.fn(async () => 0),
  deleteSource: vi.fn(),
  deleteSourceGuarded: vi.fn(async () => ({ result: 'OK', storagePath: null })),
  claimFailedSource: vi.fn(async () => true),
}));
vi.mock('@/generator/sources/projects-repository', () => ({
  linkSource: vi.fn(),
}));
vi.mock('@/lib/studio/source-storage', () => ({
  MAX_PDF_BYTES: 100,
  pdfStoragePath: vi.fn(() => 'pdf/s1/a.pdf'),
  createPdfUploadUrl: vi.fn(async () => ({
    path: 'pdf/s1/a.pdf',
    token: 'tok',
  })),
  pdfObjectExists: vi.fn(async () => true),
  removeSourceObject: vi.fn(),
}));
vi.mock('@/lib/prisma', () => ({
  prisma: {
    article: { findUnique: vi.fn(), findMany: vi.fn(async () => []) },
    studioSource: { update: vi.fn() },
    studioProject: {
      findUnique: vi.fn(async () => ({ id: PROJECT, archivedAt: null })),
    },
  },
}));

import { ALL_PERMISSIONS } from '@/lib/permissions';
import { prisma } from '@/lib/prisma';
import { enqueueIngest } from '@/generator/sources/enqueue-ingest';
import {
  claimFailedSource,
  createSource,
  deleteSource,
  deleteSourceGuarded,
  getSource,
  setSourceStatus,
} from '@/generator/sources/sources-repository';
import {
  pdfObjectExists,
  removeSourceObject,
} from '@/lib/studio/source-storage';
import { linkSource } from '@/generator/sources/projects-repository';
import {
  createArticleSourceAction,
  createTextSourceAction,
  deleteSourceAction,
  finishPdfUploadAction,
  retryIngestAction,
  startPdfUploadAction,
} from './studio-sources';

const PROJECT = '6f1c2b0e-8a8e-4f5e-9d4c-1f2a3b4c5d6e';
const ARTICLE = '7f1c2b0e-8a8e-4f5e-9d4c-1f2a3b4c5d6e';
const SOURCE = '8f1c2b0e-8a8e-4f5e-9d4c-1f2a3b4c5d6e';

describe('studio source actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authed();
  });

  it('requires a session and studio.use', async () => {
    unauth();
    await expect(
      createTextSourceAction({ title: 't', text: 'x' })
    ).rejects.toThrow('Unauthorized');
    authed(['articles.edit']);
    await expect(
      createTextSourceAction({ title: 't', text: 'x' })
    ).rejects.toThrow('Forbidden');
  });

  it('creates a text source, links it and enqueues ingest', async () => {
    const result = await createTextSourceAction({
      title: 'メモ',
      text: '本文',
      projectId: PROJECT,
    });
    expect(result).toEqual({ ok: true, data: { sourceId: 's1' } });
    expect(createSource).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'text',
        title: 'メモ',
        text: '本文',
        createdById: TEST_USER.id,
      })
    );
    expect(linkSource).toHaveBeenCalledWith(PROJECT, 's1', TEST_USER.id);
    expect(enqueueIngest).toHaveBeenCalledWith(
      expect.anything(),
      's1',
      TEST_USER.id,
      2 // the text length sizes the ingest token ceiling
    );
  });

  it('accepts a maximum-size Japanese source and sizes its ingest ceiling', async () => {
    const text = 'あ'.repeat(400_000);
    expect(
      (await createTextSourceAction({ title: '長い書き起こし', text })).ok
    ).toBe(true);
    expect(enqueueIngest).toHaveBeenCalledWith(
      expect.anything(),
      's1',
      TEST_USER.id,
      400_000
    );
  });

  it('does not create a source for a missing project', async () => {
    vi.mocked(prisma.studioProject.findUnique).mockResolvedValueOnce(null);
    expect(
      await createTextSourceAction({
        title: 't',
        text: 'x',
        projectId: PROJECT,
      })
    ).toEqual({ ok: false, error: 'NOT_FOUND' });
    expect(createSource).not.toHaveBeenCalled();
    expect(enqueueIngest).not.toHaveBeenCalled();
  });

  it('deletes the source when linking fails', async () => {
    vi.mocked(linkSource).mockRejectedValueOnce(new Error('missing project'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(
      await createTextSourceAction({
        title: 't',
        text: 'x',
        projectId: PROJECT,
      })
    ).toEqual({ ok: false, error: 'FAILED' });
    expect(deleteSource).toHaveBeenCalledWith('s1');
    expect(enqueueIngest).not.toHaveBeenCalled();
  });

  it('rejects empty text', async () => {
    expect(await createTextSourceAction({ title: 't', text: '   ' })).toEqual({
      ok: false,
      error: 'INVALID_INPUT',
    });
  });

  it('creates an article source titled after the article', async () => {
    vi.mocked(prisma.article.findUnique).mockResolvedValue({
      id: ARTICLE,
      title: '記事',
    } as never);
    expect((await createArticleSourceAction({ articleId: ARTICLE })).ok).toBe(
      true
    );
    expect(createSource).toHaveBeenCalledWith(
      expect.objectContaining({
        kind: 'article',
        title: '記事',
        articleId: ARTICLE,
      })
    );
  });

  it('refuses PDFs over the size limit', async () => {
    expect(
      await startPdfUploadAction({ filename: 'a.pdf', size: 101 })
    ).toEqual({ ok: false, error: 'TOO_LARGE' });
  });

  it('removes the new PDF source when the upload URL cannot be created', async () => {
    const { createPdfUploadUrl } = await import('@/lib/studio/source-storage');
    vi.mocked(createPdfUploadUrl).mockRejectedValueOnce(
      new Error('The related resource does not exist')
    );
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await startPdfUploadAction({ filename: 'a.pdf', size: 10 })).toEqual(
      { ok: false, error: 'FAILED' }
    );
    expect(deleteSource).toHaveBeenCalledWith('s1');
    expect(linkSource).not.toHaveBeenCalled();
  });

  it('signs a PDF upload and stores it on finish', async () => {
    const started = await startPdfUploadAction({ filename: 'a.pdf', size: 10 });
    expect(started).toEqual({
      ok: true,
      data: { sourceId: 's1', path: 'pdf/s1/a.pdf', token: 'tok' },
    });
    vi.mocked(getSource).mockResolvedValue({
      id: SOURCE,
      kind: 'pdf',
      storagePath: 'pdf/s1/a.pdf',
    } as never);
    expect(await finishPdfUploadAction(SOURCE)).toEqual({
      ok: true,
      data: undefined,
    });
    expect(setSourceStatus).toHaveBeenCalledWith(SOURCE, 'stored');
  });

  it('passes who may delete shared sources to the guarded delete', async () => {
    authed(ALL_PERMISSIONS.filter((p) => p !== 'studio.sources.delete'));
    vi.mocked(deleteSourceGuarded).mockResolvedValueOnce({
      result: 'LINKED',
      storagePath: null,
    });
    expect(await deleteSourceAction(SOURCE)).toEqual({
      ok: false,
      error: 'LINKED',
    });
    expect(deleteSourceGuarded).toHaveBeenCalledWith(SOURCE, {
      id: TEST_USER.id,
      canDeleteShared: false,
    });
    authed();
    expect((await deleteSourceAction(SOURCE)).ok).toBe(true);
    expect(deleteSourceGuarded).toHaveBeenLastCalledWith(SOURCE, {
      id: TEST_USER.id,
      canDeleteShared: true,
    });
  });

  it('still reports success when only the stored file could not be removed', async () => {
    vi.mocked(deleteSourceGuarded).mockResolvedValueOnce({
      result: 'OK',
      storagePath: 'pdf/x.pdf',
    });
    vi.mocked(removeSourceObject).mockRejectedValueOnce(
      new Error('storage down')
    );
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect((await deleteSourceAction(SOURCE)).ok).toBe(true);
  });

  it('marks the source failed when it cannot be queued', async () => {
    vi.mocked(enqueueIngest).mockRejectedValueOnce(new Error('queue down'));
    vi.spyOn(console, 'error').mockImplementation(() => {});
    expect(await createTextSourceAction({ title: 't', text: 'x' })).toEqual({
      ok: false,
      error: 'FAILED',
    });
    expect(setSourceStatus).toHaveBeenCalledWith(
      's1',
      'failed',
      'Could not queue processing.'
    );
  });

  it('retries only failed sources, claimed atomically', async () => {
    vi.mocked(getSource).mockResolvedValue({
      id: SOURCE,
      kind: 'text',
      status: 'ready',
      charCount: 1234,
    } as never);
    vi.mocked(claimFailedSource).mockResolvedValueOnce(false);
    expect(await retryIngestAction(SOURCE)).toEqual({
      ok: false,
      error: 'INVALID_INPUT',
    });
    expect(enqueueIngest).not.toHaveBeenCalled();
    expect((await retryIngestAction(SOURCE)).ok).toBe(true);
    expect(enqueueIngest).toHaveBeenCalledWith(
      expect.anything(),
      SOURCE,
      TEST_USER.id,
      1234
    );
  });

  it('settles a PDF whose upload was never confirmed', async () => {
    vi.mocked(getSource).mockResolvedValue({
      id: SOURCE,
      kind: 'pdf',
      status: 'pending',
      storagePath: 'pdf/x.pdf',
      createdAt: new Date(Date.now() - 11 * 60_000),
    } as never);
    vi.mocked(pdfObjectExists).mockResolvedValueOnce(true);
    expect((await retryIngestAction(SOURCE)).ok).toBe(true);
    expect(setSourceStatus).toHaveBeenCalledWith(SOURCE, 'stored');
    expect(enqueueIngest).not.toHaveBeenCalled();
  });
});
