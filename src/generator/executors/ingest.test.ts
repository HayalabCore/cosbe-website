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
vi.mock('../sources/digest', () => ({
  buildDigest: vi.fn(async () => [{ label: 'all', points: [] }]),
}));

import { prisma } from '@/lib/prisma';
import { buildDigest } from '../sources/digest';
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
    expect(buildDigest).toHaveBeenCalled();
    expect(setSourceMeta).toHaveBeenCalledWith('s1', {
      digest: [{ label: 'all', points: [] }],
    });
    expect(setSourceStatus).toHaveBeenLastCalledWith('s1', 'ready');
  });

  it('reads the Japanese text of an article source', async () => {
    vi.mocked(getSource).mockResolvedValue({
      id: 's1',
      kind: 'article',
      articleId: 'a1',
      meta: {},
    } as never);
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
});
