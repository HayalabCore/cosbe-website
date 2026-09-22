import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RunContext } from '../runs/run-handler';

vi.mock('./piece-context', async (importOriginal) => {
  const actual = await importOriginal<typeof import('./piece-context')>();
  return {
    ...actual,
    loadPiece: vi.fn(),
    loadTemplate: vi.fn(),
  };
});
vi.mock('../pieces/stages', () => ({
  canStartWriting: vi.fn(() => null),
  canTranslate: vi.fn(() => null),
}));
vi.mock('../runs/runs-repository', () => ({
  isRunCancelled: vi.fn(),
}));
vi.mock('../pieces/pieces-repository', () => ({
  getPiece: vi.fn(),
  readPiece: vi.fn((p) => p),
  saveSection: vi.fn(),
  setStage: vi.fn(),
  takeSnapshot: vi.fn(),
  updatePiece: vi.fn(),
}));
vi.mock('../pieces/write-section', () => ({ writeSection: vi.fn() }));
vi.mock('../pieces/finish', () => ({ finishArticle: vi.fn() }));
vi.mock('../pieces/translate', () => ({
  translateSection: vi.fn(),
  translateMeta: vi.fn(),
}));
vi.mock('../retrieval/search', () => ({ searchSources: vi.fn(async () => []) }));
vi.mock('../pieces/scope', () => ({
  buildScope: vi.fn(),
  getChunks: vi.fn(async () => []),
}));

import { isRunCancelled } from '../runs/runs-repository';
import { setStage } from '../pieces/pieces-repository';
import { loadPiece } from './piece-context';
import { writeExecutor } from './write';
import { translateExecutor } from './translate';

function basePiece(overrides: Record<string, unknown> = {}) {
  return {
    id: 'p1',
    projectId: 'proj',
    stage: 'outline',
    brief: { goal: '', audience: '', keywords: [], tone: '', targetLength: 'auto' },
    selection: { sourceIds: [], chapters: {} },
    outline: [
      {
        id: 's1',
        heading: 'H',
        intent: '',
        chunkIds: [],
        estChars: 100,
        kind: 'source',
        stale: false,
      },
    ],
    sections: [],
    templateId: null,
    ...overrides,
  };
}

function ctx(runOverrides: Record<string, unknown> = {}): RunContext {
  return {
    run: {
      id: 'r1',
      pieceId: 'p1',
      input: {},
      ...runOverrides,
    } as RunContext['run'],
    signal: new AbortController().signal,
    step: vi.fn(async (_k, _o, fn) => fn()) as RunContext['step'],
    recordUsage: vi.fn(),
  };
}

describe('cancel restores previous stage', () => {
  beforeEach(() => vi.clearAllMocks());

  it('write restores outline stage when cancelled before sections', async () => {
    vi.mocked(loadPiece).mockResolvedValue(basePiece({ stage: 'outline' }) as never);
    vi.mocked(isRunCancelled).mockResolvedValue(true);
    await writeExecutor(ctx());
    expect(setStage).toHaveBeenCalledWith('p1', 'writing');
    expect(setStage).toHaveBeenLastCalledWith('p1', 'outline');
  });

  it('translate restores review stage when cancelled before sections', async () => {
    vi.mocked(loadPiece).mockResolvedValue(
      basePiece({
        stage: 'review',
        sections: [
          {
            outlineId: 's1',
            heading: 'H',
            flags: [],
            enStale: false,
            en: null,
            blocks: [{ type: 'paragraph', sentences: [{ text: 'x', cite: [], connective: true }] }],
          },
        ],
      }) as never
    );
    vi.mocked(isRunCancelled).mockResolvedValue(true);
    await translateExecutor(ctx());
    expect(setStage).toHaveBeenCalledWith('p1', 'translating');
    expect(setStage).toHaveBeenLastCalledWith('p1', 'review');
  });
});
