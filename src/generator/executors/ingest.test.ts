import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../sources/sources-repository', () => ({
  getSource: vi.fn(),
  setSourceStatus: vi.fn(),
  setSourceText: vi.fn(),
  setSourceMeta: vi.fn(),
  replaceChunks: vi.fn(),
}));
vi.mock('@/lib/prisma', () => ({
  prisma: { article: { findUnique: vi.fn() } },
}));
vi.mock('@/ai/generate', () => ({
  embedTexts: vi.fn(async (values: string[]) => values.map(() => [0.1])),
}));
vi.mock('../sources/digest', async (importOriginal) => ({
  ...(await importOriginal<typeof import('../sources/digest')>()),
  digestGroup: vi.fn(async (group: Array<{ label: string }>) => ({
    label: group[0].label,
    points: [],
  })),
}));

import { prisma } from '@/lib/prisma';
import { digestGroup } from '../sources/digest';
import {
  getSource,
  replaceChunks,
  setSourceMeta,
  setSourceStatus,
  setSourceText,
} from '../sources/sources-repository';
import type { RunContext } from '../runs/run-handler';
import { NonRetryableRunError } from '../runs/run-types';
import { ingestExecutor } from './ingest';

function ctx(sourceId: string | null = 's1'): RunContext {
  return {
    run: { id: 'r1', sourceId } as RunContext['run'],
    signal: new AbortController().signal,
    step: vi.fn(async (_k, _o, fn) => fn()) as RunContext['step'],
    recordUsage: vi.fn(),
    ensureBudget: vi.fn(),
  };
}

describe('ingestExecutor', () => {
  beforeEach(() => vi.clearAllMocks());

  it('requires a source id', async () => {
    await expect(ingestExecutor(ctx(null))).rejects.toBeInstanceOf(
      NonRetryableRunError
    );
  });

  it('chunks, embeds and digests a text source, then marks it ready', async () => {
    vi.mocked(getSource).mockResolvedValue({
      id: 's1',
      kind: 'text',
      text: 'まず課題を定義します。次に小さく試します。',
      meta: {},
    } as never);
    await ingestExecutor(ctx());
    expect(setSourceStatus).toHaveBeenNthCalledWith(1, 's1', 'processing');
    expect(setSourceText).toHaveBeenCalledWith(
      's1',
      expect.objectContaining({ language: 'ja' })
    );
    expect(replaceChunks).toHaveBeenCalledWith(
      's1',
      [expect.objectContaining({ ordinal: 0, embedding: [0.1] })],
      expect.any(String)
    );
    expect(digestGroup).toHaveBeenCalled();
    expect(setSourceMeta).toHaveBeenCalledWith('s1', {
      digest: [{ label: 'all', points: [] }],
    });
    expect(setSourceStatus).toHaveBeenLastCalledWith('s1', 'ready');
  });

  it('reads the Japanese text of an article source', async () => {
    const article = { id: 's1', kind: 'article', articleId: 'a1', meta: {} };
    vi.mocked(getSource)
      .mockResolvedValueOnce(article as never)
      // After extract, the row holds the stored snapshot.
      .mockResolvedValue({ ...article, text: '記事の本文です。' } as never);
    vi.mocked(prisma.article.findUnique).mockResolvedValue({
      blocks: [
        { id: 'p', type: 'paragraph', content: '<p>記事の本文です。</p>' },
      ],
    } as never);
    await ingestExecutor(ctx());
    expect(setSourceText).toHaveBeenCalledWith(
      's1',
      expect.objectContaining({ text: '記事の本文です。' })
    );
  });

  it('fails without retry when the source text is empty', async () => {
    vi.mocked(getSource).mockResolvedValue({
      id: 's1',
      kind: 'text',
      text: '  ',
      meta: {},
    } as never);
    await expect(ingestExecutor(ctx())).rejects.toBeInstanceOf(
      NonRetryableRunError
    );
    expect(setSourceStatus).toHaveBeenLastCalledWith(
      's1',
      'failed',
      'The source has no text.'
    );
  });

  it('leaves PDFs stored and does nothing else', async () => {
    vi.mocked(getSource).mockResolvedValue({
      id: 's1',
      kind: 'pdf',
      meta: {},
    } as never);
    await ingestExecutor(ctx());
    expect(setSourceStatus).toHaveBeenCalledWith('s1', 'stored');
    expect(replaceChunks).not.toHaveBeenCalled();
  });

  it('builds chunks from the stored snapshot when a retry skips extract', async () => {
    const stored = '保存された本文です。';
    vi.mocked(getSource).mockResolvedValue({
      id: 's1',
      kind: 'article',
      articleId: 'a1',
      text: stored,
      meta: {},
    } as never);
    // The article was edited after the first attempt extracted it.
    vi.mocked(prisma.article.findUnique).mockResolvedValue({
      blocks: [
        { id: 'p', type: 'paragraph', content: '<p>編集後の本文。</p>' },
      ],
    } as never);
    const context = ctx();
    context.step = vi.fn(
      async (key: string, _o: number, fn: () => Promise<unknown>) =>
        key === 'extract'
          ? {
              charCount: stored.length,
              segments: [
                { start: 0, end: stored.length, locator: { blockId: 'p' } },
              ],
            }
          : fn()
    ) as RunContext['step'];
    await ingestExecutor(context);
    expect(prisma.article.findUnique).not.toHaveBeenCalled();
    expect(replaceChunks).toHaveBeenCalledWith(
      's1',
      [expect.objectContaining({ text: stored, locator: { blockId: 'p' } })],
      expect.any(String)
    );
  });

  it('digests each group as its own step and saves the assembled digest', async () => {
    vi.mocked(getSource).mockResolvedValue({
      id: 's1',
      kind: 'text',
      text: 'まず課題を定義します。',
      meta: {},
    } as never);
    const context = ctx();
    await ingestExecutor(context);
    const keys = vi.mocked(context.step).mock.calls.map((c) => c[0]);
    expect(keys).toEqual(['extract', 'chunk-embed', 'digest:0', 'digest']);
  });

  it('resumes from an extract step recorded before segments were stored', async () => {
    const stored = '古い形式の本文です。';
    vi.mocked(getSource).mockResolvedValue({
      id: 's1',
      kind: 'text',
      text: stored,
      meta: {},
    } as never);
    const context = ctx();
    context.step = vi.fn(
      async (key: string, _o: number, fn: () => Promise<unknown>) =>
        key === 'extract' ? { charCount: stored.length } : fn()
    ) as RunContext['step'];
    await ingestExecutor(context);
    expect(replaceChunks).toHaveBeenCalledWith(
      's1',
      [expect.objectContaining({ text: stored })],
      expect.any(String)
    );
  });
});
