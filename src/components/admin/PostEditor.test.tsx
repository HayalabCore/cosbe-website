import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, fireEvent, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { renderAdmin } from '@/test/render-admin';
import { listItem } from '@/test/fixtures/articles';
import type { Article } from '@/types';
import { AUTOSAVE_INTERVAL_MS } from './PostEditor';

const replace = vi.fn();
const refresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace, refresh, push: vi.fn() }),
  usePathname: () => '/admin/posts/new',
}));

vi.mock('next/dynamic', () => ({
  default: () => () => null,
}));

vi.mock('next/image', () => ({
  default: (props: { alt?: string; src?: string }) => {
    const { alt, src } = props;
    return <img alt={alt ?? ''} src={typeof src === 'string' ? src : ''} />;
  },
}));

vi.mock('@/components/admin/AdminViewArticleContext', () => ({
  useAdminViewArticleLink: () => ({ setViewArticleHref: vi.fn() }),
}));

const createArticleAction = vi.fn();
const updateArticleAction = vi.fn();
vi.mock('@/actions/articles', () => ({
  createArticleAction: (...a: unknown[]) => createArticleAction(...a),
  updateArticleAction: (...a: unknown[]) => updateArticleAction(...a),
}));

const translateArticleEnAction = vi.fn();
vi.mock('@/actions/block-translation', () => ({
  translateArticleEnAction: (...a: unknown[]) => translateArticleEnAction(...a),
  translateArticleMetaEnAction: vi.fn(),
  translateBlockEnAction: vi.fn(),
}));

import PostEditor from './PostEditor';

function article(overrides: Partial<Article> = {}): Article {
  const item = listItem();
  return {
    ...item,
    status: 'draft',
    blocks: [{ id: 'p1', type: 'paragraph', content: '<p>Hi</p>' }],
    toc: [],
    publishedAt: null,
    updatedAt: item.createdAt,
    ...overrides,
  };
}

function translateButtons() {
  return screen.getAllByRole('button', {
    name: 'Translate Entire Page to English',
  });
}

describe('PostEditor', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    vi.mocked(window.confirm).mockReturnValue(true);
    createArticleAction.mockResolvedValue({
      ok: true,
      id: 'new-id',
      slug: 'untitled',
    });
    updateArticleAction.mockResolvedValue({
      ok: true,
      id: 'art-1',
      slug: 'hello',
    });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('creates then replaces URL on first save', async () => {
    const user = userEvent.setup();
    renderAdmin(<PostEditor />);
    await user.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() => expect(createArticleAction).toHaveBeenCalled());
    expect(createArticleAction).toHaveBeenCalledWith(
      expect.anything(),
      { autoSuffixSlug: true }
    );
    expect(replace).toHaveBeenCalledWith('/admin/posts/new-id');
  });

  it('asks create not to suffix when the admin typed a slug', async () => {
    const user = userEvent.setup();
    renderAdmin(<PostEditor />);
    await user.type(
      screen.getAllByPlaceholderText('my-post-slug')[0],
      'pricing'
    );
    await user.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() => expect(createArticleAction).toHaveBeenCalled());
    expect(createArticleAction).toHaveBeenCalledWith(
      expect.objectContaining({ slug: 'pricing' }),
      { autoSuffixSlug: false }
    );
  });

  it('updates an existing article without create', async () => {
    const user = userEvent.setup();
    renderAdmin(<PostEditor initialArticle={article({ id: 'art-1' })} />);
    await user.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() => expect(updateArticleAction).toHaveBeenCalled());
    expect(createArticleAction).not.toHaveBeenCalled();
  });

  it('alerts on manual save failure', async () => {
    const user = userEvent.setup();
    createArticleAction.mockRejectedValue(new Error('nope'));
    renderAdmin(<PostEditor />);
    await user.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() =>
      expect(window.alert).toHaveBeenCalledWith('Save failed')
    );
  });

  it('alerts a friendly message when the slug is already taken', async () => {
    const user = userEvent.setup();
    createArticleAction.mockResolvedValue({
      ok: false,
      error: 'SLUG_CONFLICT',
    });
    renderAdmin(<PostEditor />);
    await user.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() =>
      expect(window.alert).toHaveBeenCalledWith(
        'This URL slug is already used by another post.'
      )
    );
    expect(replace).not.toHaveBeenCalled();
  });

  it('alerts saveFailed for opaque Next.js production errors', async () => {
    const user = userEvent.setup();
    createArticleAction.mockRejectedValue(
      new Error(
        'An error occurred in the Server Components render. The specific message is omitted in production builds to avoid leaking sensitive details. A digest property is included on this error instance which may provide additional details about the nature of the error.'
      )
    );
    renderAdmin(<PostEditor />);
    await user.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() =>
      expect(window.alert).toHaveBeenCalledWith('Save failed')
    );
  });

  it('keeps the persisted slug when the slug field is cleared', async () => {
    const user = userEvent.setup();
    renderAdmin(
      <PostEditor
        initialArticle={article({
          id: 'art-1',
          slug: 'something',
          title: 'AI????????????????????????',
        })}
      />
    );
    const slugInputs = screen.getAllByPlaceholderText('my-post-slug');
    await user.clear(slugInputs[0]);
    await user.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() => expect(updateArticleAction).toHaveBeenCalled());
    expect(updateArticleAction.mock.calls[0][1]).toEqual(
      expect.objectContaining({ slug: 'something' })
    );
  });

  it('does not translate when confirm is cancelled', async () => {
    const user = userEvent.setup();
    vi.mocked(window.confirm).mockReturnValue(false);
    renderAdmin(
      <PostEditor initialArticle={article({ id: 'art-1', title: 'T' })} />
    );
    await user.click(translateButtons()[0]);
    expect(translateArticleEnAction).not.toHaveBeenCalled();
  });

  it('alerts partial translation errors', async () => {
    const user = userEvent.setup();
    translateArticleEnAction.mockResolvedValue({
      titleEn: 'EN',
      excerptEn: '',
      blocks: [],
      errors: [{ blockId: 'p1', message: 'fail-block' }],
    });
    renderAdmin(
      <PostEditor initialArticle={article({ id: 'art-1', title: 'T' })} />
    );
    await user.click(translateButtons()[0]);
    await waitFor(() =>
      expect(String(vi.mocked(window.alert).mock.calls[0]?.[0])).toMatch(
        /fail-block/
      )
    );
  });

  it('does not autosave without persistedId', async () => {
    vi.useFakeTimers();
    renderAdmin(<PostEditor />);
    await vi.advanceTimersByTimeAsync(AUTOSAVE_INTERVAL_MS + 50);
    expect(updateArticleAction).not.toHaveBeenCalled();
    vi.useRealTimers();
  });

  it('does not autosave when the post is not dirty', async () => {
    vi.useFakeTimers();
    renderAdmin(
      <PostEditor initialArticle={article({ id: 'art-1', title: 'T' })} />
    );
    await act(async () => {
      await vi.advanceTimersByTimeAsync(AUTOSAVE_INTERVAL_MS + 50);
    });
    expect(updateArticleAction).not.toHaveBeenCalled();
  });

  it('does not autosave while a manual save is in flight', async () => {
    vi.useFakeTimers();
    updateArticleAction.mockImplementation(() => new Promise(() => {}));
    renderAdmin(
      <PostEditor initialArticle={article({ id: 'art-1', title: 'T' })} />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    fireEvent.change(screen.getByDisplayValue('T'), {
      target: { value: 'Tx' },
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(AUTOSAVE_INTERVAL_MS + 50);
    });
    expect(updateArticleAction).toHaveBeenCalledTimes(1);
  });

  it('swallows autosave failures (no alert)', async () => {
    vi.useFakeTimers();
    updateArticleAction.mockRejectedValue(new Error('autosave-fail'));
    renderAdmin(
      <PostEditor initialArticle={article({ id: 'art-1', title: 'T' })} />
    );
    fireEvent.change(screen.getByDisplayValue('T'), {
      target: { value: 'Tx' },
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(AUTOSAVE_INTERVAL_MS + 50);
    });
    expect(updateArticleAction).toHaveBeenCalled();
    expect(window.alert).not.toHaveBeenCalled();
    expect(screen.getByText('Autosave failed')).toBeInTheDocument();
  });

  it('shows an inline notice when autosave hits a slug conflict', async () => {
    vi.useFakeTimers();
    updateArticleAction.mockResolvedValue({
      ok: false,
      error: 'SLUG_CONFLICT',
    });
    renderAdmin(
      <PostEditor initialArticle={article({ id: 'art-1', title: 'T' })} />
    );
    fireEvent.change(screen.getByDisplayValue('T'), {
      target: { value: 'Tx' },
    });
    await act(async () => {
      await vi.advanceTimersByTimeAsync(AUTOSAVE_INTERVAL_MS + 50);
    });
    expect(window.alert).not.toHaveBeenCalled();
    const notice = screen.getByText(/Autosave failed.*slug in use/);
    expect(notice).toBeInTheDocument();
    expect(notice.className).not.toMatch(/\bhidden\b/);
  });

  it('does not overwrite a slug typed while save is in flight', async () => {
    let finish: (value: { ok: true; id: string; slug: string }) => void;
    updateArticleAction.mockImplementation(
      () =>
        new Promise((resolve) => {
          finish = resolve;
        })
    );
    renderAdmin(
      <PostEditor
        initialArticle={article({ id: 'art-1', slug: 'hello', title: 'T' })}
      />
    );
    fireEvent.click(screen.getByRole('button', { name: 'Save draft' }));
    const slugInput = screen.getAllByPlaceholderText('my-post-slug')[0];
    fireEvent.change(slugInput, { target: { value: 'typed-while-saving' } });
    await act(async () => {
      finish!({ ok: true, id: 'art-1', slug: 'hello' });
    });
    expect(slugInput).toHaveValue('typed-while-saving');
  });

  it('stamps publishedAt on first publish and keeps it later', async () => {
    const user = userEvent.setup();
    renderAdmin(
      <PostEditor initialArticle={article({ id: 'art-1', title: 'T' })} />
    );
    await user.click(screen.getByRole('button', { name: 'Publish' }));
    await waitFor(() => expect(updateArticleAction).toHaveBeenCalled());
    const first = updateArticleAction.mock.calls[0][1] as {
      publishedAt: string;
    };
    expect(first.publishedAt).toBeTruthy();
    updateArticleAction.mockClear();
    await user.click(screen.getByRole('button', { name: 'Update' }));
    await waitFor(() => expect(updateArticleAction).toHaveBeenCalled());
    const second = updateArticleAction.mock.calls[0][1] as {
      publishedAt: string;
    };
    expect(second.publishedAt).toBe(first.publishedAt);
  });

  it('clears publishedAt when saving a published post as draft', async () => {
    const user = userEvent.setup();
    renderAdmin(
      <PostEditor
        initialArticle={article({
          id: 'art-1',
          title: 'T',
          status: 'published',
          publishedAt: '2020-01-01T00:00:00.000Z',
        })}
      />
    );
    await user.click(screen.getByRole('button', { name: 'Save draft' }));
    await waitFor(() => expect(updateArticleAction).toHaveBeenCalled());
    const payload = updateArticleAction.mock.calls[0][1] as {
      status: string;
      publishedAt: string | null;
    };
    expect(payload.status).toBe('draft');
    expect(payload.publishedAt).toBeNull();
  });

  it('disables translate when there is nothing to translate', () => {
    renderAdmin(<PostEditor />);
    expect(translateButtons()[0]).toBeDisabled();
  });

  it('does not start a second translate while one is in flight', async () => {
    const user = userEvent.setup();
    translateArticleEnAction.mockImplementation(() => new Promise(() => {}));
    renderAdmin(
      <PostEditor initialArticle={article({ id: 'art-1', title: 'T' })} />
    );
    await user.click(translateButtons()[0]);
    const inFlight = await screen.findAllByRole('button', {
      name: /Translating/,
    });
    expect(translateArticleEnAction).toHaveBeenCalledTimes(1);
    expect(inFlight[0]).toBeDisabled();
    await user.click(inFlight[0]);
    expect(translateArticleEnAction).toHaveBeenCalledTimes(1);
  });
});
