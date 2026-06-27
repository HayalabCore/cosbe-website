'use client';

import { useEffect, useMemo, useReducer, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';
import {
  checkImportSlugAction,
  commitImportAction,
  previewImportAction,
} from '@/actions/legacy-import';
import { parseBulkUrls } from '@/lib/legacy-import/bulk';
import { mapWithConcurrency } from '@/lib/concurrency';
import {
  bulkReducer,
  findDuplicateSlugs,
  initialBulkState,
  type BulkRow,
} from '@/lib/legacy-import/bulk-state';
import { PATH_SEGMENT_TO_CATEGORY } from '@/lib/legacy-import';
import BulkImportRow from '@/components/admin/BulkImportRow';
import BulkPreviewOverlay from '@/components/admin/BulkPreviewOverlay';
import RecentImports from '@/components/admin/RecentImports';
import type { ArticleListItem } from '@/types';

const CONCURRENCY = 4;
const STORAGE_KEY = 'cosbe.bulk-import.v1';
const MAX_PERSIST_BYTES = 4_000_000;

type SavedSession = { rows: BulkRow[] };

function readSession(): SavedSession | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw) as SavedSession;
    return saved.rows?.length ? saved : null;
  } catch {
    return null;
  }
}

type Props = { recentImports: ArticleListItem[] };

export default function BulkImportClient({ recentImports }: Props) {
  const t = useTranslations('admin.bulkImport');
  const router = useRouter();
  const [text, setText] = useState('');
  const [state, dispatch] = useReducer(bulkReducer, initialBulkState);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [result, setResult] = useState<number | null>(null);

  // Rehydrate the working queue from sessionStorage after mount (SSR-safe).
  useEffect(() => {
    const saved = readSession();
    if (saved) dispatch({ type: 'hydrate', state: { rows: saved.rows } });
  }, []);

  // Persist the queue; derive the snapshot during render (write-only effect).
  const serialized = useMemo(() => {
    if (state.rows.length === 0) return null;
    try {
      return JSON.stringify({ rows: state.rows });
    } catch {
      return '';
    }
  }, [state]);

  const persistWarning =
    serialized !== null &&
    (serialized === '' || serialized.length > MAX_PERSIST_BYTES);

  useEffect(() => {
    if (serialized === null) {
      sessionStorage.removeItem(STORAGE_KEY);
      return;
    }
    if (serialized && serialized.length <= MAX_PERSIST_BYTES) {
      try {
        sessionStorage.setItem(STORAGE_KEY, serialized);
      } catch {
        /* quota errors surfaced via persistWarning */
      }
    }
  }, [serialized]);

  const duplicateSlugs = useMemo(
    () => findDuplicateSlugs(state.rows),
    [state.rows]
  );
  const parsed = useMemo(() => parseBulkUrls(text), [text]);

  const recentSourceUrls = useMemo(
    () => new Set(recentImports.map((a) => a.sourceUrl).filter(Boolean)),
    [recentImports]
  );

  const counts = useMemo(() => {
    let ready = 0;
    let errors = 0;
    let collisions = 0;
    for (const r of state.rows) {
      if (r.status === 'ready') ready++;
      if (r.status === 'error' || r.status === 'commitError') errors++;
      if (
        r.payload?.slugCollision ||
        (r.payload && duplicateSlugs.has(r.payload.slug))
      )
        collisions++;
    }
    return { total: state.rows.length, ready, errors, collisions };
  }, [state.rows, duplicateSlugs]);

  const selectedCount = state.rows.filter(
    (r) => r.included && r.status === 'ready'
  ).length;
  const activeRow = state.rows.find((r) => r.url === expanded);
  const hasBlockingCollision = state.rows.some(
    (r) =>
      r.included &&
      r.status === 'ready' &&
      r.payload &&
      (r.payload.slugCollision || duplicateSlugs.has(r.payload.slug))
  );
  const extracting = state.rows.some(
    (r) => r.status === 'queued' || r.status === 'extracting'
  );

  async function extractUrl(url: string) {
    dispatch({ type: 'setStatus', url, status: 'extracting' });
    try {
      const payload = await previewImportAction(url);
      dispatch({ type: 'setPayload', url, payload });
    } catch (e) {
      dispatch({
        type: 'setStatus',
        url,
        status: 'error',
        error: e instanceof Error ? e.message : 'Extraction failed',
      });
    }
  }

  async function handleExtract() {
    const queued = new Set(state.rows.map((r) => r.url));
    const fresh = parsed.valid.filter(
      (u) => !queued.has(u) && !recentSourceUrls.has(u)
    );
    if (fresh.length === 0) return;
    setResult(null);
    dispatch({ type: 'addUrls', urls: fresh });
    setText('');
    await mapWithConcurrency(fresh, CONCURRENCY, (url) => extractUrl(url));
  }

  async function commitRow(url: string): Promise<string | null> {
    const row = state.rows.find((r) => r.url === url);
    if (!row?.payload) return null;
    dispatch({ type: 'setStatus', url, status: 'committing' });
    try {
      await commitImportAction(row.payload);
      return url;
    } catch (e) {
      dispatch({
        type: 'setStatus',
        url,
        status: 'commitError',
        error: e instanceof Error ? e.message : 'Import failed',
      });
      return null;
    }
  }

  async function handleCommit() {
    const targets = state.rows
      .filter((r) => r.included && r.status === 'ready')
      .map((r) => r.url);
    if (targets.length === 0) return;
    const settled = await mapWithConcurrency(targets, CONCURRENCY, (url) =>
      commitRow(url)
    );
    const ok = settled.flatMap((r) =>
      r.status === 'fulfilled' && r.value ? [r.value] : []
    );
    if (ok.length > 0) {
      dispatch({ type: 'removeUrls', urls: ok });
      setResult(ok.length);
      router.refresh(); // refresh the "Recently imported" list
    }
  }

  async function validateSlug(url: string, slug: string) {
    const trimmed = slug.trim();
    if (!trimmed) return;
    try {
      const available = await checkImportSlugAction(trimmed);
      dispatch({
        type: 'patchPayload',
        url,
        patch: { slugCollision: !available },
      });
    } catch {
      /* keep current state on network error */
    }
  }

  function clearQueue() {
    dispatch({ type: 'reset' });
    setExpanded(null);
  }

  const hasQueue = state.rows.length > 0;

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <h1 className="text-xl font-bold text-slate-900 mb-1">{t('title')}</h1>
      <p className="text-sm text-slate-500 mb-6">{t('description')}</p>

      {/* Import card */}
      <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-6">
        <div className="flex items-start gap-3 mb-5">
          <div className="w-10 h-10 rounded-lg bg-primaryColor/10 flex items-center justify-center flex-shrink-0">
            <svg
              className="w-5 h-5 text-primaryColor"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.75}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12"
              />
            </svg>
          </div>
          <h2 className="text-sm font-semibold text-slate-900 pt-2">
            {t('urlsLabel')}
          </h2>
        </div>

        <textarea
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2.5 text-sm font-mono text-slate-900 placeholder:text-slate-400 focus:border-primaryColor focus:outline-none focus:ring-2 focus:ring-primaryColor/15 transition-all min-h-[160px]"
          placeholder={`https://www.jp.cosbe.inc/useful-info/example/\nhttps://www.jp.cosbe.inc/news/example/`}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />

        <div className="mt-2 min-h-[1.25rem]">
          {parsed.valid.length > 0 && (
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
              {t('validCount', { count: parsed.valid.length })}
            </span>
          )}
        </div>

        {parsed.invalid.length > 0 && (
          <div className="mt-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
            <p className="font-semibold mb-1">
              {t('invalidTitle', { count: parsed.invalid.length })}
            </p>
            <ul className="list-disc pl-5 space-y-0.5">
              {parsed.invalid.slice(0, 8).map((i) => (
                <li key={i.line} className="font-mono break-all">
                  {i.line}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="mt-5 flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
          <p className="text-xs text-slate-400">
            <span className="font-medium text-slate-500">
              {t('supportedLabel')}:
            </span>{' '}
            <span className="font-mono">
              {Object.keys(PATH_SEGMENT_TO_CATEGORY).join(' · ')}
            </span>
          </p>
          <button
            type="button"
            disabled={parsed.valid.length === 0}
            onClick={() => void handleExtract()}
            className="inline-flex items-center gap-2 rounded-lg bg-primaryColor px-4 py-2.5 text-sm font-semibold text-white hover:bg-primaryHover disabled:opacity-50 transition-colors shadow-sm flex-shrink-0"
          >
            {hasQueue
              ? t('addToQueue', { count: parsed.valid.length })
              : parsed.valid.length === 1
                ? t('extractOne')
                : t('extract', { count: parsed.valid.length })}
          </button>
        </div>
      </div>

      {result !== null && (
        <div className="mt-4 flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-800">
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          {t('importedResult', { count: result })}
        </div>
      )}

      {/* Working queue */}
      {hasQueue && (
        <div className="mt-8">
          <div className="mb-3 flex items-center gap-3 flex-wrap rounded-xl border border-slate-200 bg-white px-4 py-3">
            <p className="text-sm text-slate-600">
              {t('statsSummary', {
                total: counts.total,
                ready: counts.ready,
                errors: counts.errors,
                collisions: counts.collisions,
              })}
            </p>
            <div className="flex-1" />
            <button
              type="button"
              onClick={() =>
                dispatch({ type: 'setBatchInclude', included: true })
              }
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              {t('selectAllReady')}
            </button>
            <button
              type="button"
              onClick={() =>
                dispatch({ type: 'setBatchInclude', included: false })
              }
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
            >
              {t('deselectAll')}
            </button>
            {counts.errors > 0 && (
              <button
                type="button"
                onClick={() =>
                  void mapWithConcurrency(
                    state.rows
                      .filter((r) => r.status === 'error')
                      .map((r) => r.url),
                    CONCURRENCY,
                    (url) => extractUrl(url)
                  )
                }
                className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
              >
                {t('retryFailed', { count: counts.errors })}
              </button>
            )}
            <button
              type="button"
              onClick={clearQueue}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-500 hover:bg-slate-50"
            >
              {t('clearQueue')}
            </button>
            <button
              type="button"
              disabled={
                selectedCount === 0 || hasBlockingCollision || extracting
              }
              onClick={() => void handleCommit()}
              className="inline-flex items-center gap-2 rounded-lg bg-primaryColor px-4 py-2 text-sm font-semibold text-white hover:bg-primaryHover disabled:opacity-50"
            >
              {extracting && (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              )}
              {t('commit', { count: selectedCount })}
            </button>
          </div>

          {persistWarning && (
            <p className="text-xs text-amber-700 mb-3">{t('tooLargeToSave')}</p>
          )}

          <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left">
                  <th className="px-4 py-2.5 w-9" />
                  <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 w-28">
                    {t('colStatus')}
                  </th>
                  <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    {t('colTitle')}
                  </th>
                  <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 w-28">
                    {t('colCategory')}
                  </th>
                  <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    {t('colSlug')}
                  </th>
                  <th className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                    {t('colContent')}
                  </th>
                  <th className="px-3 py-2.5 w-20" />
                </tr>
              </thead>
              <tbody>
                {state.rows.map((row) => (
                  <BulkImportRow
                    key={row.url}
                    row={row}
                    duplicate={Boolean(
                      row.payload && duplicateSlugs.has(row.payload.slug)
                    )}
                    onOpenPreview={() => setExpanded(row.url)}
                    onToggleInclude={() =>
                      dispatch({ type: 'toggleInclude', url: row.url })
                    }
                    onRetry={() => void extractUrl(row.url)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeRow && (
        <BulkPreviewOverlay
          row={activeRow}
          duplicate={Boolean(
            activeRow.payload && duplicateSlugs.has(activeRow.payload.slug)
          )}
          onClose={() => setExpanded(null)}
          onPatch={(patch) =>
            dispatch({ type: 'patchPayload', url: activeRow.url, patch })
          }
          onValidateSlug={(slug) => void validateSlug(activeRow.url, slug)}
          onToggleInclude={() =>
            dispatch({ type: 'toggleInclude', url: activeRow.url })
          }
        />
      )}

      <RecentImports items={recentImports} />
    </div>
  );
}
