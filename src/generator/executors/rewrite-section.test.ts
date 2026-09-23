import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { RunContext } from '../runs/run-handler';
import type { Section } from '../pieces/piece-types';

vi.mock('./piece-context', async (importOriginal) => ({
  ...(await importOriginal<typeof import('./piece-context')>()),
  loadPiece: vi.fn(),
  loadTemplate: vi.fn(async () => null),
}));
vi.mock('../pieces/pieces-repository', () => ({
  saveSection: vi.fn(),
  setStage: vi.fn(),
  takeSnapshot: vi.fn(),
}));
vi.mock('../pieces/write-section', () => ({ writeSection: vi.fn() }));
vi.mock('./write', () => ({ chunksForSection: vi.fn(async () => []) }));

import { saveSection, setStage } from '../pieces/pieces-repository';
import { writeSection } from '../pieces/write-section';
import { loadPiece } from './piece-context';
import { rewriteSectionExecutor } from './rewrite-section';

const en = { heading: 'H', blocks: [] };
const section: Section = {
  outlineId: 's1',
  heading: 'H',
  flags: [],
  enStale: false,
  en,
  blocks: [{ type: 'heading3', text: 'x' }],
};

function piece(stage: string) {
  return {
    id: 'p1',
    stage,
    brief: {
      goal: '',
      audience: '',
      keywords: [],
      tone: '',
      targetLength: 'auto',
    },
    selection: { sourceIds: [], chapters: {} },
    outline: [
      {
        id: 's1',
        heading: 'H',
        intent: '',
        chunkIds: [],
        estChars: 1,
        kind: 'boilerplate',
        stale: false,
      },
    ],
    sections: [section],
    templateId: null,
  };
}

const ctx = (): RunContext =>
  ({
    run: {
      id: 'r1',
      pieceId: 'p1',
      input: { sectionId: 's1', instruction: 'shorter' },
    },
    signal: new AbortController().signal,
    step: vi.fn(async (_k: string, _o: number, fn: () => Promise<unknown>) =>
      fn()
    ),
    recordUsage: vi.fn(),
    ensureBudget: vi.fn(),
  }) as unknown as RunContext;

describe('rewrite section executor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(writeSection).mockResolvedValue({ ...section, en: null });
  });

  it('moves a ready piece back to review because its EN is now stale', async () => {
    vi.mocked(loadPiece).mockResolvedValue(piece('ready') as never);
    await rewriteSectionExecutor(ctx());
    expect(saveSection).toHaveBeenCalledWith(
      'p1',
      expect.objectContaining({ enStale: true, en }),
      'r1'
    );
    expect(setStage).toHaveBeenCalledWith('p1', 'review', 'r1');
  });

  it('leaves a review piece in review', async () => {
    vi.mocked(loadPiece).mockResolvedValue(piece('review') as never);
    await rewriteSectionExecutor(ctx());
    expect(setStage).not.toHaveBeenCalled();
  });
});
