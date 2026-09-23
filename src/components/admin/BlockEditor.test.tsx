import { describe, expect, it, vi } from 'vitest';
import { screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderAdmin } from '@/test/render-admin';
import type { ContentBlock } from '@/types';

vi.mock('@/actions/block-translation', () => ({
  translateBlockEnAction: vi.fn(),
}));

import BlockEditor from './BlockEditor';

// The insert menu tracks its own size to stay on screen; jsdom has no
// ResizeObserver.
vi.stubGlobal(
  'ResizeObserver',
  class {
    observe() {}
    disconnect() {}
  }
);

const heading: ContentBlock = {
  id: 'h1',
  type: 'heading',
  level: 2,
  content: 'Intro',
};

describe('BlockEditor canvas', () => {
  it('inserts the best match for a typed search', async () => {
    const user = userEvent.setup();
    const onChange = vi.fn();
    renderAdmin(<BlockEditor blocks={[heading]} onChange={onChange} />);

    await user.click(screen.getByRole('button', { name: /Insert block/ }));
    const search = screen.getByRole('combobox', { name: 'Search blocks' });
    await user.type(search, 'ta');
    // A name match ranks above a description match ("citation").
    const options = within(
      screen.getByRole('listbox', { name: 'Insert block' })
    ).getAllByRole('option');
    expect(options[0]).toHaveTextContent('Table');
    await user.keyboard('{Enter}');

    const next = onChange.mock.calls[0][0] as ContentBlock[];
    expect(next.map((b) => b.type)).toEqual(['heading', 'table']);
  });

  it('moves a block’s language controls into its toolbar', () => {
    renderAdmin(<BlockEditor blocks={[heading]} onChange={vi.fn()} />);
    const toolbar = screen.getByRole('toolbar', { name: 'Heading' });
    expect(
      within(toolbar).getByRole('button', { name: 'English' })
    ).toBeInTheDocument();
    expect(
      within(toolbar).getByRole('button', { name: 'Generate English' })
    ).toBeInTheDocument();
    // Only once: nothing is left above the field.
    expect(screen.getAllByRole('button', { name: 'English' })).toHaveLength(1);
  });
});
