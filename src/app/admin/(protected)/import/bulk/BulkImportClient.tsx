'use client';

import { useEffect, useMemo, useReducer, useState } from 'react';
import Link from 'next/link';
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
  bulkInit,
  bulkReducer,
  findDuplicateSlugs,
  initialBulkState,
  type BulkPhase,
} from '@/lib/legacy-import/bulk-state';
import BulkImportRow from '@/components/admin/BulkImportRow';
import BulkPreviewOverlay from '@/components/admin/BulkPreviewOverlay';

const CONCURRENCY = 4;
const STORAGE_KEY = 'cosbe.bulk-import.v1';
const MAX_PERSIST_BYTES = 4_000_000;

type SavedSession = {
  phase: BulkPhase;
  rows: ReturnType<typeof bulkInit>['rows'];
};

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

export default function BulkImportClient() {
  const t = useTranslations('admin.bulkImport');
  const router = useRouter();
  const [text, setText] = useState('');
  const [state, dispatch] = useReducer(bulkReducer, initialBulkState);
  const [expanded, setExpanded] = useState<string | null>(null);

  // Rehydrate from sessionStorage after mount so SSR and first client paint
  // render identically (input phase / empty rows) and avoid a hydration mismatch.
  useEffect(() => {
    const saved = readSession();
    if (saved) {
      dispatch({
        type: 'hydrate',
        state: {
          phase: saved.phase === 'input' ? 'review' : saved.phase,
          rows: saved.rows,
        },
      });
    }
  }, []);

  // Derive the serialized snapshot during render so persistence is a pure
  // write-only effect (no setState-in-effect). `null` = nothing to persist.
  const serialized = useMemo(() => {
    if (state.phase === 'input' || state.rows.length === 0) return null;
    try {
      return JSON.stringify({ phase: state.phase, rows: state.rows });
    } catch {
      return '';
    }
  }, [state]);

  const persistWarning =
    serialized !== null &&
    (serialized === '' || serialized.length > MAX_PERSIST_BYTES);

  useEffect(() => {
    if (serialized && serialized.length <= MAX_PERSIST_BYTES) {
      try {
        sessionStorage.setItem(STORAGE_KEY, serialized);
      } catch {
        /* quota/serialization failures are surfaced via persistWarning */
      }
    }
  }, [serialized]);

  const duplicateSlugs = useMemo(
    () => findDuplicateSlugs(state.rows),
    [state.rows]
  );

  const parsed = useMemo(() => parseBulkUrls(text), [text]);

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
    if (parsed.valid.length === 0) return;
    dispatch({ type: 'hydrate', state: bulkInit(parsed.valid) });
    // Defer so the reducer state is applied before we start mutating rows.
    await mapWithConcurrency(parsed.valid, CONCURRENCY, (url) =>
      extractUrl(url)
    );
  }

  async function commitRow(url: string) {
    const row = state.rows.find((r) => r.url === url);
    if (!row?.payload) return;
    dispatch({ type: 'setStatus', url, status: 'committing' });
    try {
      const { id } = await commitImportAction(row.payload);
      dispatch({ type: 'setCommitted', url, draftId: id });
    } catch (e) {
      dispatch({
        type: 'setStatus',
        url,
        status: 'commitError',
        error: e instanceof Error ? e.message : 'Import failed',
      });
    }
  }

  async function handleCommit() {
    const targets = state.rows
      .filter((r) => r.included && r.status === 'ready')
      .map((r) => r.url);
    if (targets.length === 0) return;
    await mapWithConcurrency(targets, CONCURRENCY, (url) => commitRow(url));
    dispatch({ type: 'setPhase', phase: 'summary' });
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

  function startNewBatch() {
    sessionStorage.removeItem(STORAGE_KEY);
    dispatch({ type: 'reset' });
    setText('');
    setExpanded(null);
  }

  // ---- INPUT PHASE ----
  if (state.phase === 'input') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-10">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-2xl font-bold text-slate-900">{t('title')}</h1>
          <Link
            href="/admin/import"
            className="text-sm font-semibold text-primaryColor hover:text-primaryHover"
          >
            {t('singleLink')}
          </Link>
        </div>
        <p className="text-sm text-slate-500 mb-8">{t('description')}</p>

        <label className="block text-xs font-semibold uppercase text-slate-500 mb-2">
          {t('urlsLabel')}
        </label>
        <textarea
          className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm font-mono min-h-[220px] mb-3"
          placeholder={`https://www.jp.cosbe.inc/useful-info/example/\nhttps://www.jp.cosbe.inc/news/example/`}
          value={text}
          onChange={(e) => setText(e.target.value)}
        />

        {parsed.valid.length > 0 && (
          <p className="text-xs text-emerald-700 mb-2">
            {t('validCount', { count: parsed.valid.length })}
          </p>
        )}
        {parsed.invalid.length > 0 && (
          <div className="mb-4 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
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

        <button
          type="button"
          disabled={parsed.valid.length === 0}
          onClick={() => void handleExtract()}
          className="rounded-lg bg-primaryColor px-4 py-2.5 text-sm font-semibold text-white hover:bg-primaryHover disabled:opacity-50"
        >
          {parsed.valid.length === 1
            ? t('extractOne')
            : t('extract', { count: parsed.valid.length })}
        </button>
      </div>
    );
  }

  // ---- SUMMARY PHASE ----
  if (state.phase === 'summary') {
    const committed = state.rows.filter((r) => r.status === 'committed');
    const failed = state.rows.filter((r) => r.status === 'commitError');
    return (
      <div className="max-w-3xl mx-auto px-4 py-10">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">
          {t('summaryTitle')}
        </h1>
        <p className="text-sm text-slate-600 mb-6">
          {t('summaryDone', { count: committed.length })}
        </p>

        <div className="rounded-xl border border-slate-200 bg-white divide-y divide-slate-100 mb-6">
          {committed.map((r) => (
            <div
              key={r.url}
              className="flex items-center justify-between px-4 py-3"
            >
              <span className="text-sm text-slate-800 truncate">
                {r.payload?.title}
              </span>
              <Link
                href={`/admin/posts/${r.draftId}`}
                className="text-xs font-semibold text-primaryColor hover:text-primaryHover whitespace-nowrap ml-3"
              >
                {t('viewDraft')} →
              </Link>
            </div>
          ))}
        </div>

        {failed.length > 0 && (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 mb-6">
            <p className="text-sm font-semibold text-red-800 mb-1">
              {t('summaryFailedTitle', { count: failed.length })}
            </p>
            <ul className="list-disc pl-5 text-xs text-red-700 space-y-0.5">
              {failed.map((r) => (
                <li key={r.url}>
                  {r.payload?.title || r.url} — {r.error}
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="button"
            onClick={startNewBatch}
            className="rounded-lg bg-primaryColor px-4 py-2 text-sm font-semibold text-white hover:bg-primaryHover"
          >
            {t('newBatch')}
          </button>
          <button
            type="button"
            onClick={() => router.push('/admin/dashboard')}
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            {t('backToDashboard')}
          </button>
        </div>
      </div>
    );
  }

  // ---- REVIEW PHASE ----
  const extracting = state.rows.some(
    (r) => r.status === 'queued' || r.status === 'extracting'
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-4">
        <h1 className="text-2xl font-bold text-slate-900">{t('title')}</h1>
        <button
          type="button"
          onClick={startNewBatch}
          className="text-sm font-semibold text-slate-500 hover:text-slate-800"
        >
          {t('newBatch')}
        </button>
      </div>

      <div className="flex items-center gap-3 flex-wrap rounded-xl border border-slate-200 bg-white px-4 py-3 mb-4">
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
          onClick={() => dispatch({ type: 'setBatchInclude', included: true })}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50"
        >
          {t('selectAllReady')}
        </button>
        <button
          type="button"
          onClick={() => dispatch({ type: 'setBatchInclude', included: false })}
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
          disabled={selectedCount === 0 || hasBlockingCollision || extracting}
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
              <th className="px-3 py-2.5 w-9" />
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
    </div>
  );
}
