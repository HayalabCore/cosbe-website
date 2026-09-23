import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RunContext } from '../runs/run-handler';

vi.mock('./piece-context', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./piece-context')>()),
  loadPiece: vi.fn(),
  loadTemplate: vi.fn(async () => null),
}));
vi.mock('../runs/runs-repository', () => ({
  isRunCancelled: vi.fn(async () => false),
}));
vi.mock('../pieces/pieces-repository', () => ({
  getPiece: vi.fn(),
  readPiece: vi.fn((p) => p),
  saveSection: vi.fn(),
  setStage: vi.fn(),
  takeSnapshot: vi.fn(),
  updatePiece: vi.fn(),
}));
vi.mock('../pieces/finish', () => ({
  finishArticle: vi.fn(async () => ({
    title: 'New',
    excerpt: 'E',
    seo: { title: 's', description: 'd', keywords: [] },
  })),
}));
vi.mock('../pieces/outline', () => ({
  loadOutlineMaterial: vi.fn(async () => ({ mode: 'chunks', chunks: [] })),
  planOutline: vi.fn(async () => ({ title: 'New', outline: [], gaps: [] })),
}));
vi.mock('../pieces/scope', () => ({
  buildScope: vi.fn(async () => ({ sourceIds: ['s'], charRanges: {} })),
}));

import { getPiece, updatePiece } from '../pieces/pieces-repository';
import { loadPiece } from './piece-context';
import { outlineExecutor } from './outline';
import { writeExecutor } from './write';

const piece = {
  id: 'p1',
  stage: 'review',
  titleEn: 'Old English',
  excerptEn: 'Old',
  brief: {
    goal: 'g',
    audience: '',
    keywords: [],
    tone: '',
    targetLength: 'auto',
  },
  selection: { sourceIds: ['s'], chapters: {} },
  outline: [
    {
      id: 'o',
      heading: 'H',
      intent: '',
      chunkIds: [],
      estChars: 1,
      kind: 'boilerplate',
      stale: false,
    },
  ],
  sections: [
    {
      outlineId: 'o',
      heading: 'H',
      blocks: [],
      flags: [],
      enStale: false,
      en: null,
    },
  ],
  templateId: null,
};

const ctx = () =>
  ({
    run: { id: 'r1', pieceId: 'p1', input: {} },
    signal: new AbortController().signal,
    step: vi.fn(async (_k: string, _o: number, fn: () => Promise<unknown>) =>
      fn()
    ),
    recordUsage: vi.fn(),
    ensureBudget: vi.fn(),
  }) as unknown as RunContext;

describe('regenerated Japanese metadata clears its English translation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(loadPiece).mockResolvedValue(piece as never);
    vi.mocked(getPiece).mockResolvedValue(piece as never);
  });

  it('the write finish step', async () => {
    const context = ctx();
    await writeExecutor(context);
    expect(context.step).toHaveBeenCalledWith(
      'finish',
      expect.any(Number),
      expect.any(Function),
      {
        promptVersion: 'finish.v1',
      }
    );
    expect(updatePiece).toHaveBeenCalledWith(
      'p1',
      expect.objectContaining({ title: 'New', titleEn: null, excerptEn: null }),
      'r1'
    );
  });

  it('the outline step', async () => {
    const context = ctx();
    await outlineExecutor(context);
    expect(context.step).toHaveBeenCalledWith(
      'outline',
      0,
      expect.any(Function),
      {
        promptVersion: 'outline.v1',
      }
    );
    expect(updatePiece).toHaveBeenCalledWith(
      'p1',
      expect.objectContaining({ title: 'New', titleEn: null, excerptEn: null }),
      'r1'
    );
  });
});
