import { screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderAdmin } from '@/test/render-admin';

vi.mock('@/actions/studio-pieces', () => ({
  saveOutlineAction: vi.fn(async () => ({ ok: true, data: undefined })),
  startRunAction: vi.fn(async () => ({ ok: true, data: { runId: 'r' } })),
}));

import { saveOutlineAction, startRunAction } from '@/actions/studio-pieces';
import OutlinePanel from './OutlinePanel';

const piece = {
  id: 'p1', stage: 'outline', gaps: ['事例がない'],
  outline: [
    { id: 'a', heading: '課題', intent: 'why', chunkIds: ['k1', 'k2'], estChars: 300, kind: 'source', stale: false },
    { id: 'b', heading: '手順', intent: 'how', chunkIds: ['k3'], estChars: 300, kind: 'source', stale: false },
  ],
} as never;

describe('OutlinePanel', () => {
  beforeEach(() => vi.clearAllMocks());

  it('shows gaps and passage counts', () => {
    renderAdmin(<OutlinePanel piece={piece} busy={false} refresh={vi.fn()} />);
    expect(screen.getByText('事例がない')).toBeInTheDocument();
    expect(screen.getByText('2 passages')).toBeInTheDocument();
  });

  it('reorders, edits and saves, then writes', async () => {
    const refresh = vi.fn();
    renderAdmin(<OutlinePanel piece={piece} busy={false} refresh={refresh} />);
    await userEvent.click(screen.getAllByRole('button', { name: 'Move down' })[0]);
    const heading = screen.getAllByLabelText('Heading')[1];
    await userEvent.clear(heading);
    await userEvent.type(heading, '課題（改）');
    await userEvent.click(screen.getByRole('button', { name: 'Save outline' }));
    expect(saveOutlineAction).toHaveBeenCalledWith('p1', [
      expect.objectContaining({ id: 'b' }),
      expect.objectContaining({ id: 'a', heading: '課題（改）' }),
    ]);
    await userEvent.click(screen.getByRole('button', { name: 'Write article' }));
    expect(startRunAction).toHaveBeenCalledWith('p1', 'write');
  });
});
