import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderAdmin } from '@/test/render-admin';
import WritingPanel from './WritingPanel';

describe('WritingPanel', () => {
  it('shows the run’s own total while later step rows do not exist yet', () => {
    const outline = ['a', 'b', 'c', 'd'].map((id) => ({ id, heading: id, stale: false }));
    const piece = {
      outline,
      sections: [{ outlineId: 'a' }],
      // Step rows are created when each step starts, so only these exist.
      activeRun: {
        kind: 'write',
        targets: 3,
        steps: [
          { key: 'prepare', status: 'succeeded' },
          { key: 'section:b', status: 'running' },
        ],
      },
    } as never;
    renderAdmin(<WritingPanel piece={piece} busy refresh={vi.fn()} />);
    expect(screen.getByText('Section 1 of 3')).toBeInTheDocument();
  });
});
