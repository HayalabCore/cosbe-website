'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  deleteSourceAction,
  listSourcesAction,
  retryIngestAction,
} from '@/actions/studio-sources';
import { linkSourceAction } from '@/actions/studio-projects';
import type { SourceDTO } from '@/lib/studio/source-dto';
import AddSourceDialog from './AddSourceDialog';
import SourceStatusBadge from './SourceStatusBadge';

const POLL_MS = 3000;
const ACTIVE = new Set(['pending', 'processing']);

export default function SourceLibrary({
  projectId,
  linkedIds = [],
  onChanged,
}: {
  /** When set, new sources join this project and rows offer "Link". */
  projectId?: string;
  linkedIds?: string[];
  onChanged?: () => void;
}) {
  const t = useTranslations('admin.studio');
  const [query, setQuery] = useState('');
  const [sources, setSources] = useState<SourceDTO[]>([]);
  const [adding, setAdding] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);

  const [version, setVersion] = useState(0);
  const reload = () => setVersion((v) => v + 1);

  useEffect(() => {
    let cancelled = false;
    void listSourcesAction(query).then((result) => {
      // Ignore responses for a query the user has already changed.
      if (!cancelled && result.ok) setSources(result.data);
    });
    return () => {
      cancelled = true;
    };
  }, [query, version]);

  // Keep polling while anything is still ingesting. PDFs are never ingested:
  // only the uploading browser moves them on, so they are not polled.
  useEffect(() => {
    if (!sources.some((s) => s.kind !== 'pdf' && ACTIVE.has(s.status))) return;
    const timer = window.setTimeout(reload, POLL_MS);
    return () => window.clearTimeout(timer);
  }, [sources]);

  async function link(source: SourceDTO) {
    if (!projectId) return;
    const result = await linkSourceAction(projectId, source.id);
    if (!result.ok) {
      setNotice(t('addSource.failed'));
      return;
    }
    reload();
    onChanged?.();
  }

  async function remove(source: SourceDTO) {
    if (!window.confirm(t('library.confirmDelete', { title: source.title })))
      return;
    const result = await deleteSourceAction(source.id);
    if (!result.ok) {
      setNotice(
        result.error === 'LINKED'
          ? t('library.linkedError')
          : t('addSource.failed')
      );
      return;
    }
    setNotice(null);
    reload();
  }

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('library.search')}
          className="w-full max-w-sm rounded-md border border-slate-200 px-3 py-2 text-sm"
        />
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="rounded-lg bg-primaryColor px-4 py-2 text-sm font-semibold text-white hover:bg-primaryHover disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {t('library.add')}
        </button>
      </div>
      {notice && <p className="text-sm text-red-600">{notice}</p>}
      {sources.length === 0 ? (
        <p className="text-sm text-slate-500">{t('library.empty')}</p>
      ) : (
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-slate-500">
            <tr>
              <th className="py-2">{t('library.columns.title')}</th>
              <th>{t('library.columns.kind')}</th>
              <th>{t('library.columns.status')}</th>
              <th>{t('library.columns.size')}</th>
              <th>{t('library.columns.projects')}</th>
              <th />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {sources.map((s) => (
              <tr key={s.id}>
                <td className="py-2 font-medium text-slate-900">{s.title}</td>
                <td className="text-slate-600">{t(`kind.${s.kind}`)}</td>
                <td>
                  <SourceStatusBadge status={s.status} error={s.error} />
                </td>
                <td className="text-slate-600">
                  {s.charCount.toLocaleString()}
                </td>
                <td className="text-slate-600">{s.projectCount}</td>
                <td className="space-x-3 text-right">
                  {projectId && !linkedIds.includes(s.id) && (
                    <button
                      type="button"
                      onClick={() => void link(s)}
                      className="text-slate-700 underline"
                    >
                      {t('library.link')}
                    </button>
                  )}
                  {s.status === 'failed' && (
                    <button
                      type="button"
                      onClick={() => void retryIngestAction(s.id).then(reload)}
                      className="text-slate-700 underline"
                    >
                      {t('library.retry')}
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => void remove(s)}
                    className="text-red-600 underline"
                  >
                    {t('library.delete')}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
      {adding && (
        <AddSourceDialog
          projectId={projectId}
          onClose={() => setAdding(false)}
          onAdded={() => {
            setAdding(false);
            reload();
            onChanged?.();
          }}
        />
      )}
    </section>
  );
}
