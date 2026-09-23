'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import {
  Archive,
  ArchiveRestore,
  FilePenLine,
  Plus,
  Search,
  Trash2,
} from 'lucide-react';
import {
  archivePieceAction,
  changePiecesAction,
  deletePieceAction,
  listPiecesAction,
  restorePieceAction,
} from '@/actions/studio-pieces';
import type { StudioResult } from '@/lib/studio/action-types';
import AdminBulkBar, {
  AdminBulkBarButton,
} from '@/components/admin/AdminBulkBar';
import AdminCheckbox from '@/components/admin/AdminCheckbox';
import ConfirmDialog from '../ConfirmDialog';
import { errorText } from './errorText';
import { AdminTableSkeleton } from '@/components/admin/AdminSkeletons';
import type { PieceListItemDTO } from '@/lib/studio/piece-dto';
import { Badge, Button, EmptyState, relativeTime } from '../ui';
import NewArticleDialog from './NewArticleDialog';
import { STEPS, stepIndex, stepOf, type Step } from './steps';

type Filter = 'all' | 'active' | 'sent' | 'archived';

/** Four segments, filled up to the piece's step; the label names that step. */
function Progress({ piece }: { piece: PieceListItemDTO }) {
  const t = useTranslations('admin.studio');
  if (piece.stage === 'handed_off') {
    const status = piece.articleStatus ?? 'removed';
    const tone =
      status === 'published' ? 'green' : status === 'removed' ? 'red' : 'blue';
    return <Badge tone={tone}>{t(`pieces.tracked.${status}`)}</Badge>;
  }
  const step = stepOf(piece.stage);
  const at = stepIndex(step);
  const working = piece.stage === 'writing' || piece.stage === 'translating';
  return (
    <div className="flex items-center gap-3">
      <div className="flex gap-1" aria-hidden>
        {STEPS.map((s, i) => (
          <span
            key={s}
            className={`h-1.5 w-6 rounded-full ${i < at ? 'bg-emerald-400' : i === at ? 'bg-primaryColor' : 'bg-slate-200'}`}
          />
        ))}
      </div>
      <span className="text-sm text-slate-600">
        {working ? t(`stages.${piece.stage}`) : t(`steps.${step as Step}`)}
      </span>
    </div>
  );
}

export default function PieceList() {
  const t = useTranslations('admin.studio');
  const locale = useLocale();
  const [pieces, setPieces] = useState<PieceListItemDTO[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [creating, setCreating] = useState(false);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [deleting, setDeleting] = useState<PieceListItemDTO | null>(null);
  const [rowBusy, setRowBusy] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [selected, setSelected] = useState<Set<string>>(() => new Set());
  const [bulkPending, setBulkPending] = useState(false);
  const [bulkDeleting, setBulkDeleting] = useState(false);

  const load = useCallback(
    () =>
      listPiecesAction().then(
        (r) => (r.ok ? setPieces(r.data) : setFailed(true)),
        () => setFailed(true)
      ),
    []
  );
  useEffect(() => {
    void load();
  }, [load]);

  async function act(id: string, action: () => Promise<StudioResult<unknown>>) {
    setRowBusy(id);
    setNotice(null);
    try {
      const r = await action();
      if (!r.ok) setNotice(errorText(t, r));
    } catch {
      setNotice(errorText(t, { error: 'FAILED' }));
    }
    await load();
    setRowBusy(null);
  }

  const counts = useMemo(() => {
    const list = pieces ?? [];
    const live = list.filter((p) => !p.archived);
    const sent = live.filter((p) => p.stage === 'handed_off').length;
    return {
      all: live.length,
      active: live.length - sent,
      sent,
      archived: list.length - live.length,
    };
  }, [pieces]);

  const shown = (pieces ?? []).filter((p) => {
    // Archived pieces appear only under their own filter.
    if ((filter === 'archived') !== Boolean(p.archived)) return false;
    if (filter === 'active' && p.stage === 'handed_off') return false;
    if (filter === 'sent' && p.stage !== 'handed_off') return false;
    const q = query.trim().toLowerCase();
    return (
      !q ||
      p.title.toLowerCase().includes(q) ||
      p.projectName.toLowerCase().includes(q)
    );
  });

  // Only rows on screen can be acted on; changing the view starts over.
  const chosen = shown.filter((p) => selected.has(p.id));
  const allChosen = shown.length > 0 && chosen.length === shown.length;
  const clearSelection = () => setSelected(new Set());
  function toggle(id: string) {
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function runBulk(kind: 'archive' | 'restore' | 'delete') {
    const ids = chosen.map((p) => p.id);
    setBulkPending(true);
    setNotice(null);
    try {
      const r = await changePiecesAction(kind, ids);
      if (!r.ok) setNotice(errorText(t, r));
      else {
        const problems = [
          r.data.busy > 0 && t('bulk.skippedBusy', { count: r.data.busy }),
          r.data.failed > 0 && t('bulk.failed', { count: r.data.failed }),
        ].filter(Boolean);
        if (problems.length) setNotice(problems.join(' '));
      }
    } catch {
      setNotice(errorText(t, { error: 'FAILED' }));
    }
    clearSelection();
    setBulkDeleting(false);
    await load();
    setBulkPending(false);
  }

  const newButton = (
    <Button
      variant="primary"
      icon={<Plus className="h-4 w-4" aria-hidden />}
      onClick={() => setCreating(true)}
    >
      {t('pieces.new')}
    </Button>
  );

  return (
    <section className="space-y-5">
      {failed && (
        <p role="alert" className="text-sm text-red-600">
          {t('workspace.errors.FAILED')}
        </p>
      )}
      {notice && (
        <p role="alert" className="text-sm text-red-600">
          {notice}
        </p>
      )}
      {pieces === null && !failed ? (
        <AdminTableSkeleton
          rows={4}
          columns={3}
          aria-label={t('pieces.loading')}
        />
      ) : pieces && pieces.length === 0 ? (
        <EmptyState
          icon={<FilePenLine className="h-5 w-5" aria-hidden />}
          title={t('pieces.emptyTitle')}
          action={newButton}
        >
          {t('pieces.emptyBody')}
        </EmptyState>
      ) : (
        <>
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative min-w-[220px] flex-1">
              <Search
                className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
                aria-hidden
              />
              <input
                type="search"
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  clearSelection();
                }}
                placeholder={t('pieces.search')}
                aria-label={t('pieces.search')}
                className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm shadow-sm placeholder:text-slate-400 focus:border-primaryColor focus:outline-none focus:ring-2 focus:ring-primaryColor/15"
              />
            </div>
            <div className="flex items-center gap-1.5">
              {(['all', 'active', 'sent', 'archived'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  aria-pressed={filter === f}
                  onClick={() => {
                    setFilter(f);
                    clearSelection();
                  }}
                  className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${filter === f ? 'bg-primaryColor text-white' : 'bg-white text-slate-500 ring-1 ring-slate-200 hover:bg-slate-50'}`}
                >
                  {t(`pieces.filters.${f}`)}
                  <span className="tabular-nums opacity-70">{counts[f]}</span>
                </button>
              ))}
            </div>
            {newButton}
          </div>
          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="w-full table-fixed text-sm">
              <thead className="border-b border-slate-100 bg-slate-50 text-left text-xs font-semibold text-slate-500">
                <tr>
                  <th className="w-10 py-3 pl-4">
                    <AdminCheckbox
                      aria-label={t('bulk.selectAll')}
                      checked={allChosen}
                      indeterminate={chosen.length > 0 && !allChosen}
                      disabled={shown.length === 0}
                      onChange={() =>
                        setSelected(
                          allChosen
                            ? new Set()
                            : new Set(shown.map((p) => p.id))
                        )
                      }
                    />
                  </th>
                  <th className="px-4 py-3">{t('pieces.columns.title')}</th>
                  <th className="w-64 px-4 py-3">
                    {t('pieces.columns.stage')}
                  </th>
                  <th className="w-40 px-4 py-3">
                    {t('pieces.columns.updated')}
                  </th>
                  <th className="w-24 px-4 py-3">
                    <span className="sr-only">
                      {t('library.columns.actions')}
                    </span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {shown.map((p) => (
                  <tr
                    key={p.id}
                    className={`group relative ${selected.has(p.id) ? 'bg-blue-50/50' : 'hover:bg-slate-50'}`}
                  >
                    {/* Above the row link so ticking a row does not open it. */}
                    <td className="relative z-10 py-3.5 pl-4">
                      <AdminCheckbox
                        aria-label={t('bulk.selectRow', {
                          title: p.title || t('pieces.untitled'),
                        })}
                        checked={selected.has(p.id)}
                        onChange={() => toggle(p.id)}
                      />
                    </td>
                    <td className="px-4 py-3.5">
                      <Link
                        href={`/admin/studio/pieces/${p.id}`}
                        className="block truncate font-semibold text-slate-900 after:absolute after:inset-0 focus-visible:outline-none group-hover:text-primaryDark"
                      >
                        {p.title || t('pieces.untitled')}
                      </Link>
                      <span className="mt-0.5 block truncate text-xs text-slate-500">
                        {p.projectName}
                      </span>
                    </td>
                    <td className="px-4 py-3.5">
                      <Progress piece={p} />
                    </td>
                    <td
                      className="whitespace-nowrap px-4 py-3.5 text-slate-500"
                      title={new Date(p.updatedAt).toLocaleString(locale)}
                    >
                      {relativeTime(p.updatedAt, locale)}
                    </td>
                    <td className="relative z-10 px-4 py-3.5">
                      {/* Above the row link, like the posts dashboard's row actions. */}
                      <div className="flex justify-end gap-0.5">
                        {p.archived ? (
                          <>
                            <button
                              type="button"
                              title={t('archive.restore')}
                              aria-label={t('archive.restoreNamed', {
                                title: p.title || t('pieces.untitled'),
                              })}
                              disabled={rowBusy === p.id}
                              onClick={() =>
                                void act(p.id, () => restorePieceAction(p.id))
                              }
                              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-emerald-50 hover:text-emerald-600 disabled:opacity-40"
                            >
                              <ArchiveRestore className="h-4 w-4" aria-hidden />
                            </button>
                            <button
                              type="button"
                              title={t('archive.delete')}
                              aria-label={t('archive.deleteNamed', {
                                title: p.title || t('pieces.untitled'),
                              })}
                              disabled={rowBusy === p.id}
                              onClick={() => setDeleting(p)}
                              className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-red-50 hover:text-red-600 disabled:opacity-40"
                            >
                              <Trash2 className="h-4 w-4" aria-hidden />
                            </button>
                          </>
                        ) : (
                          <button
                            type="button"
                            title={t('archive.archive')}
                            aria-label={t('archive.archiveNamed', {
                              title: p.title || t('pieces.untitled'),
                            })}
                            disabled={rowBusy === p.id}
                            onClick={() =>
                              void act(p.id, () => archivePieceAction(p.id))
                            }
                            className="rounded-lg p-1.5 text-slate-400 transition-colors hover:bg-amber-50 hover:text-amber-600 disabled:opacity-40"
                          >
                            <Archive className="h-4 w-4" aria-hidden />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
                {shown.length === 0 && (
                  <tr>
                    <td
                      colSpan={5}
                      className="px-4 py-8 text-center text-sm text-slate-500"
                    >
                      {t('pieces.noMatch')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
      {creating && <NewArticleDialog onClose={() => setCreating(false)} />}
      <AdminBulkBar
        count={chosen.length}
        label={t('bulk.selected', { count: chosen.length })}
        clearLabel={t('bulk.clear')}
        onClear={clearSelection}
      >
        {filter === 'archived' ? (
          <>
            <AdminBulkBarButton
              disabled={bulkPending}
              onClick={() => void runBulk('restore')}
            >
              {t('bulk.restore')}
            </AdminBulkBarButton>
            <AdminBulkBarButton
              tone="danger"
              disabled={bulkPending}
              onClick={() => setBulkDeleting(true)}
            >
              {t('bulk.delete')}
            </AdminBulkBarButton>
          </>
        ) : (
          <AdminBulkBarButton
            disabled={bulkPending}
            onClick={() => void runBulk('archive')}
          >
            {t('bulk.archive')}
          </AdminBulkBarButton>
        )}
      </AdminBulkBar>
      {bulkDeleting && (
        <ConfirmDialog
          title={t('bulk.deleteTitle', { count: chosen.length })}
          confirmLabel={t('bulk.delete')}
          danger
          busy={bulkPending}
          onClose={() => setBulkDeleting(false)}
          onConfirm={() => void runBulk('delete')}
        >
          <p>{t('bulk.deleteBody')}</p>
          {chosen.some((p) => p.stage === 'handed_off') && (
            <p>{t('bulk.deleteKeepsPosts')}</p>
          )}
        </ConfirmDialog>
      )}
      {deleting && (
        <ConfirmDialog
          title={t('archive.deleteTitle')}
          confirmLabel={t('archive.delete')}
          danger
          busy={rowBusy === deleting.id}
          onClose={() => setDeleting(null)}
          onConfirm={() => {
            const target = deleting;
            void act(target.id, () => deletePieceAction(target.id)).then(() =>
              setDeleting(null)
            );
          }}
        >
          <p>
            {t('archive.deleteBody', {
              title: deleting.title || t('pieces.untitled'),
            })}
          </p>
          {deleting.stage === 'handed_off' && (
            <p>{t('archive.deleteKeepsPost')}</p>
          )}
        </ConfirmDialog>
      )}
    </section>
  );
}
