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
import { Upload } from 'lucide-react';
import AdminDialog from '@/components/admin/access/AdminDialog';
import { Banner, Button, Field, TextArea, TextInput } from './ui';

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
    try {
      const result = await action();
      if (result.ok) onAdded();
      else setError(result.error === 'TOO_LARGE' ? t('tooLarge') : t('failed'));
    } catch {
      // A thrown action (network, request too large) must not freeze the form.
      setError(t('failed'));
    } finally {
      setBusy(false);
    }
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
    <AdminDialog title={t('title')} onClose={onClose}>
      <div className="space-y-4">
        <div
          role="tablist"
          aria-label={t('title')}
          className="flex gap-1 rounded-lg bg-slate-100 p-1"
        >
          {tabs.map((key) => (
            <button
              key={key}
              role="tab"
              aria-selected={tab === key}
              type="button"
              onClick={() => setTab(key)}
              className={`flex-1 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${tab === key ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-800'}`}
            >
              {t(key)}
            </button>
          ))}
        </div>

        {tab === 'text' && (
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              void run(() =>
                createTextSourceAction({ title, text, projectId })
              );
            }}
          >
            <Field label={t('titleLabel')} required>
              {(p) => (
                <TextInput
                  {...p}
                  value={title}
                  placeholder={t('titlePlaceholder')}
                  onChange={(e) => setTitle(e.target.value)}
                />
              )}
            </Field>
            <Field
              label={t('textLabel')}
              required
              hint={t('textHint', { count: text.length })}
            >
              {(p) => (
                <TextArea
                  {...p}
                  rows={10}
                  value={text}
                  placeholder={t('textPlaceholder')}
                  onChange={(e) => setText(e.target.value)}
                />
              )}
            </Field>
            {error && (
              <p role="alert" className="text-sm text-red-600">
                {error}
              </p>
            )}
            <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
              <Button variant="ghost" onClick={onClose}>
                {t('cancel')}
              </Button>
              <Button
                type="submit"
                variant="primary"
                busy={busy}
                disabled={!title.trim() || !text.trim()}
              >
                {t('save')}
              </Button>
            </div>
          </form>
        )}

        {tab === 'article' && (
          <div className="space-y-3">
            <p className="text-sm text-slate-500">{t('articleHint')}</p>
            <TextInput
              value={query}
              aria-label={t('articleSearch')}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('articleSearch')}
            />
            <ul className="max-h-72 divide-y divide-slate-100 overflow-auto rounded-lg border border-slate-200">
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
                    className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left text-sm hover:bg-slate-50 disabled:opacity-50"
                  >
                    <span className="truncate text-slate-800">{a.title}</span>
                    <span className="shrink-0 text-xs text-slate-400">
                      {a.category}
                    </span>
                  </button>
                </li>
              ))}
              {articles.length === 0 && (
                <li className="px-3 py-6 text-center text-sm text-slate-500">
                  {t('noArticles')}
                </li>
              )}
            </ul>
            {error && (
              <p role="alert" className="text-sm text-red-600">
                {error}
              </p>
            )}
          </div>
        )}

        {tab === 'pdf' && (
          <div className="space-y-3">
            <Banner tone="warning">{t('pdfHint')}</Banner>
            <label className="flex cursor-pointer flex-col items-center gap-2 rounded-xl border-2 border-dashed border-slate-300 px-6 py-8 text-center text-sm hover:border-primaryColor hover:bg-blue-50/40">
              <Upload className="h-6 w-6 text-slate-400" aria-hidden />
              <span className="font-semibold text-slate-700">{t('pdf')}</span>
              <span className="text-xs text-slate-500">{t('pdfLimit')}</span>
              <input
                type="file"
                accept="application/pdf"
                disabled={busy}
                aria-label={t('pdf')}
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) void uploadPdf(f);
                }}
                className="sr-only"
              />
            </label>
            {busy && (
              <p className="text-center text-sm text-slate-500">
                {t('uploading')}
              </p>
            )}
            {error && (
              <p role="alert" className="text-sm text-red-600">
                {error}
              </p>
            )}
          </div>
        )}
      </div>
    </AdminDialog>
  );
}
