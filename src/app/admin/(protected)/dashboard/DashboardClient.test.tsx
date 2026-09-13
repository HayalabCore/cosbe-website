import { beforeEach, describe, expect, it, vi } from 'vitest';
import { screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderAdmin } from '@/test/render-admin';
import { listItem } from '@/test/fixtures/articles';
import type { ArticleListItem } from '@/types';

const refresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ refresh, replace: vi.fn(), push: vi.fn() }),
  usePathname: () => '/admin/dashboard',
}));

const archiveArticleAction = vi.fn();
const archiveArticlesAction = vi.fn();
const deleteArticlesAction = vi.fn();
const publishArticleAction = vi.fn();
const publishArticlesAction = vi.fn();
const restoreArticleAction = vi.fn();
const unpublishArticleAction = vi.fn();
const unpublishArticlesAction = vi.fn();

vi.mock('@/actions/articles', () => ({
  archiveArticleAction: (...a: unknown[]) => archiveArticleAction(...a),
  archiveArticlesAction: (...a: unknown[]) => archiveArticlesAction(...a),
  deleteArticlesAction: (...a: unknown[]) => deleteArticlesAction(...a),
  publishArticleAction: (...a: unknown[]) => publishArticleAction(...a),
  publishArticlesAction: (...a: unknown[]) => publishArticlesAction(...a),
  restoreArticleAction: (...a: unknown[]) => restoreArticleAction(...a),
  unpublishArticleAction: (...a: unknown[]) => unpublishArticleAction(...a),
  unpublishArticlesAction: (...a: unknown[]) => unpublishArticlesAction(...a),
}));

import DashboardClient from './DashboardClient';

const draft = listItem({
  id: 'd1',
  title: 'Draft Post',
  slug: 'draft-post',
  status: 'draft',
});
const published = listItem({
  id: 'p1',
  title: 'Live Post',
  slug: 'live-post',
  status: 'published',
  publishedAt: '2026-01-02T00:00:00.000Z',
});
const archived = listItem({
  id: 'a1',
  title: 'Old Post',
  slug: 'old-post',
  status: 'archived',
  category: 'case-study',
});

describe('DashboardClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(window.confirm).mockReturnValue(true);
    archiveArticleAction.mockResolvedValue(undefined);
    archiveArticlesAction.mockResolvedValue(undefined);
    deleteArticlesAction.mockResolvedValue(undefined);
    publishArticleAction.mockResolvedValue(undefined);
    restoreArticleAction.mockResolvedValue(undefined);
    unpublishArticleAction.mockResolvedValue(undefined);
  });

  it('shows empty copy when there are no posts', () => {
    renderAdmin(<DashboardClient items={[]} />);
    expect(screen.getByText('No posts found')).toBeInTheDocument();
    expect(
      screen.getByText('Create your first post to get started.')
    ).toBeInTheDocument();
  });

  it('shows filtered empty copy on search miss', async () => {
    const user = userEvent.setup();
    renderAdmin(<DashboardClient items={[draft]} />);
    await user.type(
      screen.getByPlaceholderText('Search by title…'),
      'zzzz-no-match'
    );
    expect(screen.getByText('Try adjusting your filters.')).toBeInTheDocument();
  });

  it('status filter hides non-matching rows', async () => {
    const user = userEvent.setup();
    renderAdmin(<DashboardClient items={[draft, published]} />);
    await user.click(screen.getByRole('button', { name: 'Published1' }));
    expect(screen.queryByText('Draft Post')).not.toBeInTheDocument();
    expect(screen.getByText('Live Post')).toBeInTheDocument();
  });

  it('category filter hides other categories', async () => {
    const user = userEvent.setup();
    renderAdmin(<DashboardClient items={[draft, archived]} />);
    await user.selectOptions(screen.getAllByRole('combobox')[0], 'case-study');
    expect(screen.queryByText('Draft Post')).not.toBeInTheDocument();
    expect(screen.getByText('Old Post')).toBeInTheDocument();
  });

  it('published row shows unpublish, not publish', () => {
    renderAdmin(<DashboardClient items={[published]} />);
    expect(screen.getByTitle('Unpublish')).toBeInTheDocument();
    expect(screen.queryByTitle('Publish')).not.toBeInTheDocument();
  });

  it('archived row shows restore, not archive', () => {
    renderAdmin(<DashboardClient items={[archived]} />);
    expect(screen.getByTitle('Restore to draft')).toBeInTheDocument();
    expect(screen.queryByTitle('Archive')).not.toBeInTheDocument();
  });

  it('archive confirm cancel does not call the action', async () => {
    const user = userEvent.setup();
    vi.mocked(window.confirm).mockReturnValue(false);
    renderAdmin(<DashboardClient items={[draft]} />);
    await user.click(screen.getByTitle('Archive'));
    expect(archiveArticleAction).not.toHaveBeenCalled();
  });

  it('bulk archive confirm cancel does not call the action', async () => {
    const user = userEvent.setup();
    vi.mocked(window.confirm).mockReturnValue(false);
    renderAdmin(<DashboardClient items={[draft]} />);
    await user.click(screen.getByLabelText('Select row'));
    const bulkArchive = screen
      .getAllByRole('button', { name: 'Archive' })
      .find((el) => el.textContent?.trim() === 'Archive');
    await user.click(bulkArchive!);
    expect(archiveArticlesAction).not.toHaveBeenCalled();
  });

  it('bulk delete confirm cancel does not call the action', async () => {
    const user = userEvent.setup();
    vi.mocked(window.confirm).mockReturnValue(false);
    renderAdmin(<DashboardClient items={[draft]} />);
    await user.click(screen.getByLabelText('Select row'));
    const bulkDelete = screen
      .getAllByRole('button', { name: 'Delete' })
      .find((el) => el.textContent?.trim() === 'Delete');
    await user.click(bulkDelete!);
    expect(deleteArticlesAction).not.toHaveBeenCalled();
  });

  it('hides the bulk bar when nothing is selected', () => {
    renderAdmin(<DashboardClient items={[draft]} />);
    expect(screen.queryByText(/selected/i)).not.toBeInTheDocument();
  });

  it('shows an alert when a row action fails', async () => {
    const user = userEvent.setup();
    publishArticleAction.mockRejectedValue(new Error('boom'));
    renderAdmin(<DashboardClient items={[draft]} />);
    await user.click(screen.getByTitle('Publish'));
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent(
        'Something went wrong. Try again.'
      )
    );
  });

  it('disables previous on the first of multiple pages', () => {
    const items: ArticleListItem[] = Array.from({ length: 21 }, (_, i) =>
      listItem({
        id: `n${i}`,
        slug: `n-${i}`,
        title: `Post ${i}`,
      })
    );
    renderAdmin(<DashboardClient items={items} />);
    expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled();
  });

  it('disables next on the last of multiple pages', async () => {
    const user = userEvent.setup();
    const items: ArticleListItem[] = Array.from({ length: 21 }, (_, i) =>
      listItem({
        id: `n${i}`,
        slug: `n-${i}`,
        title: `Post ${i}`,
      })
    );
    renderAdmin(<DashboardClient items={items} />);
    await user.click(screen.getByRole('button', { name: 'Next' }));
    expect(screen.getByRole('button', { name: 'Previous' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
  });

  it('disables row actions while a row action is in flight', async () => {
    const user = userEvent.setup();
    const draft2 = listItem({
      id: 'd2',
      title: 'Draft Two',
      slug: 'draft-two',
      status: 'draft',
    });
    publishArticleAction.mockImplementation(() => new Promise(() => {}));
    renderAdmin(<DashboardClient items={[draft, draft2]} />);
    const busyRow = screen.getByText('Draft Post').closest('tr');
    await user.click(within(busyRow!).getByTitle('Publish'));
    await waitFor(() =>
      expect(within(busyRow!).getByTitle('Publish')).toBeDisabled()
    );
    expect(within(busyRow!).getByTitle('Archive')).toBeDisabled();
    const idleRow = screen.getByText('Draft Two').closest('tr');
    expect(within(idleRow!).getByTitle('Publish')).toBeEnabled();
  });

  it('hides Publish on archived posts without articles.archive', () => {
    renderAdmin(<DashboardClient items={[archived]} />, {
      permissions: ['dashboard.view', 'articles.publish'],
    });
    expect(screen.queryByTitle('Publish')).toBeNull();
  });

  it('shows Publish on archived posts when the user can also archive', () => {
    renderAdmin(<DashboardClient items={[archived]} />, {
      permissions: ['dashboard.view', 'articles.publish', 'articles.archive'],
    });
    expect(screen.getByTitle('Publish')).toBeInTheDocument();
  });

  it('hides bulk Publish when the selection includes archived posts without articles.archive', async () => {
    const user = userEvent.setup();
    renderAdmin(<DashboardClient items={[archived]} />, {
      permissions: ['dashboard.view', 'articles.publish'],
    });
    await user.click(screen.getByLabelText('Select row'));
    expect(
      screen.queryByRole('button', { name: 'Publish' })
    ).not.toBeInTheDocument();
  });

  it('shows Published as soon as publish succeeds, before refresh', async () => {
    const user = userEvent.setup();
    renderAdmin(<DashboardClient items={[draft]} />);
    const row = screen.getByText('Draft Post').closest('tr');
    await user.click(within(row!).getByTitle('Publish'));
    await waitFor(() =>
      expect(within(row!).getByText('Published')).toBeInTheDocument()
    );
    expect(within(row!).getByTitle('Unpublish')).toBeInTheDocument();
    expect(refresh).toHaveBeenCalled();
  });

  it('shows Draft as soon as unpublish succeeds, before refresh', async () => {
    const user = userEvent.setup();
    renderAdmin(<DashboardClient items={[published]} />);
    const row = screen.getByText('Live Post').closest('tr');
    await user.click(within(row!).getByTitle('Unpublish'));
    await waitFor(() =>
      expect(within(row!).getByText('Draft')).toBeInTheDocument()
    );
    expect(within(row!).getByTitle('Publish')).toBeInTheDocument();
  });

  it('shows Archived as soon as archive succeeds, before refresh', async () => {
    const user = userEvent.setup();
    renderAdmin(<DashboardClient items={[draft]} />);
    const row = screen.getByText('Draft Post').closest('tr');
    await user.click(within(row!).getByTitle('Archive'));
    await waitFor(() =>
      expect(within(row!).getByText('Archived')).toBeInTheDocument()
    );
    expect(within(row!).getByTitle('Restore to draft')).toBeInTheDocument();
  });

  it('shows Draft as soon as restore succeeds, before refresh', async () => {
    const user = userEvent.setup();
    renderAdmin(<DashboardClient items={[archived]} />);
    const row = screen.getByText('Old Post').closest('tr');
    await user.click(within(row!).getByTitle('Restore to draft'));
    await waitFor(() =>
      expect(within(row!).getByText('Draft')).toBeInTheDocument()
    );
    expect(within(row!).getByTitle('Archive')).toBeInTheDocument();
  });

  it('removes rows as soon as bulk delete succeeds, before refresh', async () => {
    const user = userEvent.setup();
    renderAdmin(<DashboardClient items={[draft]} />);
    await user.click(screen.getByLabelText('Select row'));
    const bulkDelete = screen
      .getAllByRole('button', { name: 'Delete' })
      .find((el) => el.textContent?.trim() === 'Delete');
    await user.click(bulkDelete!);
    await waitFor(() =>
      expect(screen.queryByText('Draft Post')).not.toBeInTheDocument()
    );
    expect(refresh).toHaveBeenCalled();
  });

  it('hides publish/archive controls without those permissions', () => {
    renderAdmin(<DashboardClient items={[draft, published]} />, {
      permissions: ['dashboard.view', 'articles.edit'],
    });
    expect(screen.queryByTitle('Publish')).toBeNull();
    expect(screen.queryByTitle('Unpublish')).toBeNull();
    expect(screen.queryByTitle('Archive')).toBeNull();
    expect(screen.getAllByTitle('Edit').length).toBeGreaterThan(0);
  });
});
