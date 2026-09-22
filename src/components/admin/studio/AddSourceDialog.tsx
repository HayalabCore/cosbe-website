'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  createArticleSourceAction,
  createTextSourceAction,
  finishPdfUploadAction,
  listArticleChoicesAction,
  startPdfUploadAction,
} from '@/actions/studio-sources';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';

type Tab = 'text' | 'article' | 'pdf';
type Props = { projectId?: string; onClose: () => void; onAdded: () => void };

export default function AddSourceDialog({
  projectId,
  onClose,
  onAdded,
}: Props) {
  const t = useTranslations('admin.studio.addSource');
  const [tab, setTab] = useState<Tab>('text');
  const [title, setTitle] = useState('');
  const [text, setText] = useState('');
  const [query, setQuery] = useState('');
  const [articles, setArticles] = useState<
    Array<{ id: string; title: string; category: string }>
  >([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (tab !== 'article') return;
    const timer = window.setTimeout(async () => {
      const result = await listArticleChoicesAction(query);
      if (result.ok) setArticles(result.data);
    }, 250);
    return () => window.clearTimeout(timer);
  }, [tab, query]);

  async function run(action: () => Promise<{ ok: boolean; error?: string }>) {
    setBusy(true);
    setError(null);
    const result = await action();
    setBusy(false);
    if (result.ok) onAdded();
    else setError(result.error === 'TOO_LARGE' ? t('tooLarge') : t('failed'));
  }

  async function uploadPdf(file: File) {
    await run(async () => {
      const started = await startPdfUploadAction({
        filename: file.name,
        size: file.size,
        projectId,
      });
      if (!started.ok) return started;
      const { error: uploadError } = await createBrowserSupabaseClient()
        .storage.from('studio-sources')
        .uploadToSignedUrl(started.data.path, started.data.token, file, {
          contentType: 'application/pdf',
        });
      // Always report back: on a failed upload the server finds no file and
      // marks the source failed instead of leaving it pending.
      const finished = await finishPdfUploadAction(started.data.sourceId);
      if (uploadError) return { ok: false, error: 'FAILED' };
      return finished;
    });
  }

  const tabs: Tab[] = ['text', 'article', 'pdf'];
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('title')}
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
    >
      <div className="w-full max-w-xl space-y-4 rounded-lg bg-white p-6">
        <h2 className="text-lg font-semibold text-slate-900">{t('title')}</h2>
        <div role="tablist" className="flex gap-2">
          {tabs.map((key) => (
            <button
              key={key}
              role="tab"
              aria-selected={tab === key}
              type="button"
              onClick={() => setTab(key)}
              className={`rounded-md px-3 py-1.5 text-sm ${tab === key ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-700'}`}
            >
              {t(key)}
            </button>
          ))}
        </div>

        {tab === 'text' && (
          <form
            className="space-y-3"
            onSubmit={(e) => {
              e.preventDefault();
              void run(() =>
                createTextSourceAction({ title, text, projectId })
              );
            }}
          >
            <label className="block text-sm">
              {t('titleLabel')}
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              {t('textLabel')}
              <textarea
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={10}
                className="mt-1 w-full rounded-md border border-slate-200 px-3 py-2"
              />
            </label>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3 py-2 text-sm text-slate-600"
              >
                {t('cancel')}
              </button>
              <button
                type="submit"
                disabled={busy}
                className="rounded-lg bg-primaryColor px-4 py-2 text-sm font-semibold text-white hover:bg-primaryHover disabled:opacity-40 disabled:cursor-not-allowed"
              >
                {t('save')}
              </button>
            </div>
          </form>
        )}

        {tab === 'article' && (
          <div className="space-y-2">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('articleSearch')}
              className="w-full rounded-md border border-slate-200 px-3 py-2 text-sm"
            />
            <ul className="max-h-64 divide-y divide-slate-100 overflow-auto">
              {articles.map((a) => (
                <li key={a.id}>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void run(() =>
                        createArticleSourceAction({
                          articleId: a.id,
                          projectId,
                        })
                      )
                    }
                    className="w-full py-2 text-left text-sm hover:bg-slate-50"
                  >
                    {a.title}{' '}
                    <span className="text-xs text-slate-500">
                      ({a.category})
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {tab === 'pdf' && (
          <div className="space-y-2">
            <p className="text-sm text-slate-500">{t('pdfHint')}</p>
            <label className="block text-sm">
              {t('pdf')}
              <input
                type="file"
                accept="application/pdf"
                disabled={busy}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void uploadPdf(f);
                }}
                className="mt-1 block"
              />
            </label>
          </div>
        )}

        {error && <p className="text-sm text-red-600">{error}</p>}
      </div>
    </div>
  );
}
