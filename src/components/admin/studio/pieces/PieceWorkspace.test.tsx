import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderAdmin } from '@/test/render-admin';

const base = {
  id: 'p1', projectId: 'pr', templateId: null, stage: 'writing', title: '', titleEn: null, excerpt: null, excerptEn: null,
  seo: null, brief: { goal: 'g', audience: '', keywords: [], tone: '', targetLength: 'auto' },
  selection: { sourceIds: ['s'], chapters: {} },
  outline: [{ id: 'o1', heading: 'A', intent: '', chunkIds: [], estChars: 1, kind: 'source', stale: false }, { id: 'o2', heading: 'B', intent: '', chunkIds: [], estChars: 1, kind: 'source', stale: false }],
  gaps: [], sections: [], category: 'notice', authorId: null, articleId: null, handedOffAt: null, createdById: null,
  createdAt: '', updatedAt: '', lastRunError: null, article: null,
  activeRun: { id: 'r', kind: 'write', status: 'running', error: null, steps: [{ key: 'prepare', status: 'succeeded' }, { key: 'section:o1', status: 'succeeded' }, { key: 'section:o2', status: 'running' }] },
};

vi.mock('@/actions/studio-pieces', () => ({
  getPieceAction: vi.fn(async () => ({ ok: true, data: base })),
  cancelRunAction: vi.fn(async () => ({ ok: true, data: undefined })),
  listSnapshotsAction: vi.fn(async () => ({ ok: true, data: [] })),
  listPieceChoicesAction: vi.fn(async () => ({ ok: true, data: { sources: [], templates: [], authors: [] } })),
}));

import PieceWorkspace from './PieceWorkspace';

describe('PieceWorkspace', () => {
  it('shows the writing progress for the active run', async () => {
    renderAdmin(<PieceWorkspace pieceId="p1" />);
    expect(await screen.findByText('Section 2 of 2')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
  });
});
