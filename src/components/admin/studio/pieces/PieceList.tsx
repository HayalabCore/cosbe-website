'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useLocale, useTranslations } from 'next-intl';
import { FilePenLine, Plus, Search } from 'lucide-react';
import { listPiecesAction } from '@/actions/studio-pieces';
import { AdminTableSkeleton } from '@/components/admin/AdminSkeletons';
import type { PieceListItemDTO } from '@/lib/studio/piece-dto';
import { Badge, Button, EmptyState, relativeTime } from '../ui';
import NewArticleDialog from './NewArticleDialog';
import { STEPS, stepIndex, stepOf, type Step } from './steps';

type Filter = 'all' | 'active' | 'sent';

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

  useEffect(() => {
    void listPiecesAction().then(
      (r) => (r.ok ? setPieces(r.data) : setFailed(true)),
      () => setFailed(true)
    );
  }, []);

  const counts = useMemo(() => {
    const list = pieces ?? [];
    const sent = list.filter((p) => p.stage === 'handed_off').length;
    return { all: list.length, active: list.length - sent, sent };
  }, [pieces]);

  const shown = (pieces ?? []).filter((p) => {
    if (filter === 'active' && p.stage === 'handed_off') return false;
    if (filter === 'sent' && p.stage !== 'handed_off') return false;
    const q = query.trim().toLowerCase();
    return (
      !q ||
      p.title.toLowerCase().includes(q) ||
      p.projectName.toLowerCase().includes(q)
    );
  });

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
                onChange={(e) => setQuery(e.target.value)}
                placeholder={t('pieces.search')}
                aria-label={t('pieces.search')}
                className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm shadow-sm placeholder:text-slate-400 focus:border-primaryColor focus:outline-none focus:ring-2 focus:ring-primaryColor/15"
              />
            </div>
            <div className="flex items-center gap-1.5">
              {(['all', 'active', 'sent'] as const).map((f) => (
                <button
                  key={f}
                  type="button"
                  aria-pressed={filter === f}
                  onClick={() => setFilter(f)}
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
                  <th className="px-4 py-3">{t('pieces.columns.title')}</th>
                  <th className="w-64 px-4 py-3">
                    {t('pieces.columns.stage')}
                  </th>
                  <th className="w-40 px-4 py-3">
                    {t('pieces.columns.updated')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {shown.map((p) => (
                  <tr key={p.id} className="group relative hover:bg-slate-50">
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
                      className="px-4 py-3.5 text-slate-500"
                      title={new Date(p.updatedAt).toLocaleString(locale)}
                    >
                      {relativeTime(p.updatedAt, locale)}
                    </td>
                  </tr>
                ))}
                {shown.length === 0 && (
                  <tr>
                    <td
                      colSpan={3}
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
    </section>
  );
}
