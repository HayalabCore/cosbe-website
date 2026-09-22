import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderAdmin } from '@/test/render-admin';

vi.mock('@/actions/studio-pieces', () => ({
  rewriteSectionAction: vi.fn(async () => ({ ok: true, data: { runId: 'r' } })),
  startRunAction: vi.fn(async () => ({ ok: true, data: { runId: 'r' } })),
  createDraftPostAction: vi.fn(async () => ({ ok: true, data: { articleId: 'a' } })),
  getChunksAction: vi.fn(async () => ({ ok: true, data: [{ id: 'k1', sourceTitle: 'メモ', text: '課題を一つに絞ります', locator: {} }] })),
}));

import { getChunksAction, rewriteSectionAction } from '@/actions/studio-pieces';
import ReviewPanel from './ReviewPanel';

const piece = {
  id: 'p1', stage: 'review', title: 'AI導入',
  outline: [{ id: 'o1', heading: '課題', intent: '', chunkIds: ['k1'], estChars: 1, kind: 'source', stale: false }],
  sections: [{
    outlineId: 'o1', heading: '課題', enStale: false, en: null, flags: ['No citation for "x".'],
    blocks: [{ type: 'paragraph', sentences: [
      { text: 'まず課題を絞ります。', cite: ['k1'], connective: false },
      { text: 'では次へ。', cite: [], connective: true },
    ] }],
  }],
} as never;

describe('ReviewPanel', () => {
  beforeEach(() => vi.clearAllMocks());

  it('renders sentences with citation markers and flags', () => {
    renderAdmin(<ReviewPanel piece={piece} busy={false} refresh={vi.fn()} />);
    expect(screen.getByText('まず課題を絞ります。')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Source 1' })).toBeInTheDocument();
    expect(screen.getByText('No citation for "x".')).toBeInTheDocument();
  });

  it('shows the cited passage on demand', async () => {
    renderAdmin(<ReviewPanel piece={piece} busy={false} refresh={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Source 1' }));
    expect(getChunksAction).toHaveBeenCalledWith(['k1']);
    expect(await screen.findByText('課題を一つに絞ります')).toBeInTheDocument();
  });

  it('runs a section action', async () => {
    renderAdmin(<ReviewPanel piece={piece} busy={false} refresh={vi.fn()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Shorten' }));
    expect(rewriteSectionAction).toHaveBeenCalledWith('p1', { sectionId: 'o1', instruction: 'Make this section about half as long.' });
  });
});
