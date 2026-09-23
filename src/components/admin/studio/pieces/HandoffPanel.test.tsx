import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderAdmin } from '@/test/render-admin';

vi.mock('next/navigation', () => ({ useRouter: () => ({ push: vi.fn() }) }));
vi.mock('@/actions/studio-pieces', () => ({ duplicatePieceAction: vi.fn() }));

import HandoffPanel from './HandoffPanel';

describe('HandoffPanel', () => {
  it('links to the editor and shows the tracked status', () => {
    renderAdmin(<HandoffPanel piece={{ id: 'p1', articleId: 'a1', article: { id: 'a1', status: 'published', slug: 'ai' }, category: 'notice' } as never} busy={false} refresh={vi.fn()} />);
    expect(screen.getByRole('link', { name: 'Open in editor' })).toHaveAttribute('href', '/admin/posts/a1');
    expect(screen.getByText('Post status: Published')).toBeInTheDocument();
  });

  it('says when the post was deleted', () => {
    renderAdmin(<HandoffPanel piece={{ id: 'p1', articleId: null, article: null, category: 'notice' } as never} busy={false} refresh={vi.fn()} />);
    expect(screen.getByText('Post status: Post deleted')).toBeInTheDocument();
  });

  it('links to the public page in the category the post has now', () => {
    renderAdmin(<HandoffPanel piece={{ id: 'p1', articleId: 'a1', article: { id: 'a1', status: 'published', slug: 'ai', category: 'case-study' }, category: 'notice' } as never} busy={false} refresh={vi.fn()} />);
    expect(screen.getByRole('link', { name: 'View on site' }).getAttribute('href')).toContain('ai');
    expect(screen.getByRole('link', { name: 'View on site' }).getAttribute('href')).not.toContain('notice');
  });
});
