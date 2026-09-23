'use client';

import { useEffect, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { FileText, Plus, RotateCw, Search, Trash2 } from 'lucide-react';
import {
  deleteSourceAction,
  listSourcesAction,
  retryIngestAction,
} from '@/actions/studio-sources';
import { linkSourceAction } from '@/actions/studio-projects';
import { AdminTableSkeleton } from '@/components/admin/AdminSkeletons';
import type { SourceDTO } from '@/lib/studio/source-dto';
import AddSourceDialog from './AddSourceDialog';
import ConfirmDialog from './ConfirmDialog';
import SourceStatusBadge from './SourceStatusBadge';
import { Button, EmptyState } from './ui';

const POLL_MS = 3000;
const ACTIVE = new Set(['pending', 'processing']);

/** A PDF upload unconfirmed for this long is settled by Retry. */
const STALE_UPLOAD_MS = 10 * 60_000;

function canRetry(s: SourceDTO): boolean {
  if (s.status === 'failed') return s.kind !== 'pdf';
  return (
    s.kind === 'pdf' &&
    s.status === 'pending' &&
    Date.now() - new Date(s.createdAt).getTime() > STALE_UPLOAD_MS
  );
}

/**
 * The source library. Without a project it manages sources (add, retry,
 * delete). With one, it is a picker: each row can be added to that project,
 * and nothing destructive is offered.
 */
export default function SourceLibrary({
  projectId,
  linkedIds = [],
  onChanged,
}: {
  projectId?: string;
  linkedIds?: string[];
  onChanged?: () => void;
}) {
  const t = useTranslations('admin.studio');
  const locale = useLocale();
  const picking = Boolean(projectId);
  const [query, setQuery] = useState('');
  const [sources, setSources] = useState<SourceDTO[] | null>(null);
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<SourceDTO | null>(null);
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
    if (!sources?.some((s) => s.kind !== 'pdf' && ACTIVE.has(s.status))) return;
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
    setDeleting(null);
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

  const rows = (sources ?? []).filter(
    (s) => !picking || !linkedIds.includes(s.id)
  );
  const empty = sources !== null && sources.length === 0 && !query;

  return (
    <section className="space-y-4">
      {!empty && (
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Search
              className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
              aria-hidden
            />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t('library.search')}
              aria-label={t('library.search')}
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm shadow-sm placeholder:text-slate-400 focus:border-primaryColor focus:outline-none focus:ring-2 focus:ring-primaryColor/15"
            />
          </div>
          {!picking && (
            <Button
              variant="primary"
              icon={<Plus className="h-4 w-4" aria-hidden />}
              onClick={() => setAdding(true)}
            >
              {t('library.add')}
            </Button>
          )}
        </div>
      )}
      {notice && (
        <p role="alert" className="text-sm text-red-600">
          {notice}
        </p>
      )}
      {sources === null ? (
        <AdminTableSkeleton
          rows={3}
          columns={4}
          aria-label={t('library.title')}
        />
      ) : empty ? (
        <EmptyState
          icon={<FileText className="h-5 w-5" aria-hidden />}
          title={t('library.emptyTitle')}
          action={
            !picking && (
              <Button
                variant="primary"
                icon={<Plus className="h-4 w-4" aria-hidden />}
                onClick={() => setAdding(true)}
              >
                {t('library.add')}
              </Button>
            )
          }
        >
          {t('library.empty')}
        </EmptyState>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
          <table className="w-full table-fixed text-sm">
            <thead className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold text-slate-500">
              <tr>
                <th className="px-4 py-3">{t('library.columns.title')}</th>
                <th className="hidden w-36 px-4 py-3 sm:table-cell">
                  {t('library.columns.status')}
                </th>
                {!picking && (
                  <th className="hidden w-28 whitespace-nowrap px-4 py-3 text-right md:table-cell">
                    {t('library.columns.size')}
                  </th>
                )}
                {!picking && (
                  <th className="hidden w-32 whitespace-nowrap px-4 py-3 text-right md:table-cell">
                    {t('library.columns.projects')}
                  </th>
                )}
                <th className="w-32 px-4 py-3">
                  <span className="sr-only">
                    {t('library.columns.actions')}
                  </span>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {rows.map((s) => (
                <tr key={s.id} className="group hover:bg-slate-50">
                  <td className="px-4 py-3">
                    <span className="block truncate font-semibold text-slate-900">
                      {s.title}
                    </span>
                    <span className="text-xs text-slate-500">
                      {t(`kind.${s.kind}`)}
                    </span>
                  </td>
                  <td className="hidden px-4 py-3 sm:table-cell">
                    <SourceStatusBadge status={s.status} error={s.error} />
                  </td>
                  {!picking && (
                    <td className="hidden px-4 py-3 text-right tabular-nums text-slate-600 md:table-cell">
                      {s.charCount.toLocaleString(locale)}
                    </td>
                  )}
                  {!picking && (
                    <td className="hidden px-4 py-3 text-right tabular-nums text-slate-600 md:table-cell">
                      {s.projectCount}
                    </td>
                  )}
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      {picking && (
                        <Button
                          size="sm"
                          icon={<Plus className="h-3.5 w-3.5" aria-hidden />}
                          onClick={() => void link(s)}
                        >
                          {t('library.link')}
                        </Button>
                      )}
                      {!picking && canRetry(s) && (
                        <Button
                          size="sm"
                          variant="ghost"
                          icon={
                            <RotateCw className="h-3.5 w-3.5" aria-hidden />
                          }
                          onClick={() =>
                            void retryIngestAction(s.id).then(reload)
                          }
                        >
                          {t('library.retry')}
                        </Button>
                      )}
                      {!picking && (
                        <button
                          type="button"
                          aria-label={t('library.delete')}
                          title={t('library.delete')}
                          onClick={() => setDeleting(s)}
                          className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 className="h-4 w-4" aria-hidden />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-8 text-center text-sm text-slate-500"
                  >
                    {picking && !query
                      ? t('library.allLinked')
                      : t('library.noMatch')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
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
      {deleting && (
        <ConfirmDialog
          title={t('library.deleteTitle')}
          confirmLabel={t('library.delete')}
          danger
          onClose={() => setDeleting(null)}
          onConfirm={() => void remove(deleting)}
        >
          <p>{t('library.confirmDelete', { title: deleting.title })}</p>
        </ConfirmDialog>
      )}
    </section>
  );
}
