'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { X, Clock, RotateCcw, ChevronRight, Loader2 } from 'lucide-react';
import { namespaceFromKeyPath } from '@/lib/translations/flatten';
import {
  getTranslationHistory,
  listTranslationRowsForNamespace,
  restoreTranslation,
  saveTranslation,
  searchTranslationRows,
  translateKeyToEnglish,
  type TranslationHistoryItem,
  type TranslationPairRow,
} from '@/actions/translations';

/* ─── helpers ─────────────────────────────────────────────────── */

function useDebouncedValue<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const timer = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);
  return debounced;
}

function formatRelative(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1) return 'just now';
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return new Date(iso).toLocaleDateString();
}

/* ─── History drawer ───────────────────────────────────────────── */

type HistoryDrawerProps = {
  keyPath: string;
  histJa: TranslationHistoryItem[] | null;
  histEn: TranslationHistoryItem[] | null;
  onRestore: (id: string, locale: 'ja' | 'en', value: string) => Promise<void>;
  onClose: () => void;
};

function HistoryDrawer({
  keyPath,
  histJa,
  histEn,
  onRestore,
  onClose,
}: HistoryDrawerProps) {
  const t = useTranslations('admin.translationsEditor');
  const [restoringId, setRestoringId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'ja' | 'en'>('ja');

  async function handleRestore(id: string, locale: 'ja' | 'en', value: string) {
    setRestoringId(id);
    await onRestore(id, locale, value);
    setRestoringId(null);
  }

  const items = activeTab === 'ja' ? histJa : histEn;
  const label = activeTab === 'ja' ? t('historyJa') : t('historyEn');

  return (
    <>
      {/* backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* panel */}
      <div className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-white shadow-2xl">
        {/* header */}
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 flex-shrink-0 text-slate-500" />
              <p className="text-sm font-semibold text-slate-900">
                {t('history')}
              </p>
            </div>
            <code className="mt-1 block truncate text-[11px] text-slate-400">
              {keyPath}
            </code>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* locale tabs */}
        <div className="flex border-b border-slate-100 px-5">
          {(['ja', 'en'] as const).map((loc) => (
            <button
              key={loc}
              type="button"
              onClick={() => setActiveTab(loc)}
              className={`-mb-px border-b-2 px-4 py-3 text-xs font-semibold transition-colors ${
                activeTab === loc
                  ? 'border-primaryColor text-primaryColor'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {loc === 'ja' ? `🇯🇵 ${t('historyJa')}` : `🇬🇧 ${t('historyEn')}`}
            </button>
          ))}
        </div>

        {/* list */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {items === null ? (
            <div className="flex h-32 items-center justify-center">
              <Loader2 className="h-5 w-5 animate-spin text-slate-300" />
            </div>
          ) : items.length === 0 ? (
            <div className="flex h-32 flex-col items-center justify-center gap-2 text-center">
              <Clock className="h-8 w-8 text-slate-200" />
              <p className="text-sm text-slate-400">{t('noHistory')}</p>
              <p className="text-xs text-slate-300">
                {`Changes to the ${label} copy will appear here.`}
              </p>
            </div>
          ) : (
            <ol className="relative space-y-1 border-l border-slate-100 pl-4">
              {items.map((h, idx) => (
                <li key={h.id} className="relative">
                  {/* timeline dot */}
                  <span
                    className={`absolute -left-[17px] top-[14px] h-2.5 w-2.5 rounded-full border-2 border-white ${
                      idx === 0 ? 'bg-primaryColor' : 'bg-slate-300'
                    }`}
                  />

                  <div
                    className={`rounded-xl border p-3 transition-colors ${
                      idx === 0
                        ? 'border-primaryColor/20 bg-primaryColor/5'
                        : 'border-slate-100 bg-slate-50'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="line-clamp-3 flex-1 text-xs leading-relaxed text-slate-700">
                        {h.previousValue || (
                          <span className="italic text-slate-400">(empty)</span>
                        )}
                      </p>
                      <button
                        type="button"
                        disabled={restoringId !== null}
                        onClick={() =>
                          void handleRestore(h.id, activeTab, h.previousValue)
                        }
                        className="flex flex-shrink-0 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-medium text-slate-600 shadow-sm hover:border-primaryColor hover:text-primaryColor disabled:opacity-50"
                      >
                        {restoringId === h.id ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <RotateCcw className="h-3 w-3" />
                        )}
                        {t('restore')}
                      </button>
                    </div>

                    <div className="mt-2 flex items-center gap-2 text-[10px] text-slate-400">
                      <span className="font-medium text-slate-500">
                        {formatRelative(h.changedAt)}
                      </span>
                      {h.changedBy && (
                        <>
                          <ChevronRight className="h-3 w-3" />
                          <span className="truncate">{h.changedBy}</span>
                        </>
                      )}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>

        <p className="border-t border-slate-100 px-5 py-3 text-center text-[10px] text-slate-400">
          Showing last {items?.length ?? 0} changes · restored values create a
          new history entry
        </p>
      </div>
    </>
  );
}

/* ─── save-status pill ─────────────────────────────────────────── */

type RowSaveStatus = 'idle' | 'saving' | 'saved' | 'error';

function StatusPill({
  status,
  t,
}: {
  status: RowSaveStatus;
  t: ReturnType<typeof useTranslations>;
}) {
  if (status === 'idle') return null;
  const map: Record<Exclude<RowSaveStatus, 'idle'>, string> = {
    saving: 'text-slate-400',
    saved: 'text-emerald-600',
    error: 'text-red-600',
  };
  const labelKey: Record<
    Exclude<RowSaveStatus, 'idle'>,
    Parameters<typeof t>[0]
  > = {
    saving: 'saving',
    saved: 'saved',
    error: 'error',
  };
  return (
    <span
      className={`flex items-center gap-1 text-xs font-medium ${map[status]}`}
    >
      {status === 'saving' && <Loader2 className="h-3 w-3 animate-spin" />}
      {t(labelKey[status])}
    </span>
  );
}

/* ─── translation row ──────────────────────────────────────────── */

function TranslationRow({ row }: { row: TranslationPairRow }) {
  const t = useTranslations('admin.translationsEditor');

  const [ja, setJa] = useState(row.ja);
  const [en, setEn] = useState(row.en);
  const [jaStatus, setJaStatus] = useState<RowSaveStatus>('idle');
  const [enStatus, setEnStatus] = useState<RowSaveStatus>('idle');
  const [translateBusy, setTranslateBusy] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [histJa, setHistJa] = useState<TranslationHistoryItem[] | null>(null);
  const [histEn, setHistEn] = useState<TranslationHistoryItem[] | null>(null);

  const jaTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const enTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // track the value that was last persisted to DB so we skip no-op saves
  const savedJa = useRef(row.ja);
  const savedEn = useRef(row.en);

  // sync when the parent row changes (namespace tab switch)
  useEffect(() => {
    setJa(row.ja);
    setEn(row.en);
    savedJa.current = row.ja;
    savedEn.current = row.en;
  }, [row.keyPath, row.ja, row.en]);

  const flushSave = useCallback(
    async (locale: 'ja' | 'en', value: string) => {
      const savedRef = locale === 'ja' ? savedJa : savedEn;
      // skip if nothing changed since last successful save
      if (value === savedRef.current) return;

      const setStatus = locale === 'ja' ? setJaStatus : setEnStatus;
      setStatus('saving');
      const res = await saveTranslation({
        keyPath: row.keyPath,
        locale,
        value,
      });
      if (res.ok) {
        savedRef.current = value;
        setStatus('saved');
        window.setTimeout(() => setStatus('idle'), 2000);
      } else {
        setStatus('error');
        console.error(res.error);
      }
    },
    [row.keyPath]
  );

  const scheduleJaSave = useCallback(
    (next: string) => {
      if (jaTimer.current) clearTimeout(jaTimer.current);
      jaTimer.current = setTimeout(() => void flushSave('ja', next), 600);
    },
    [flushSave]
  );

  const scheduleEnSave = useCallback(
    (next: string) => {
      if (enTimer.current) clearTimeout(enTimer.current);
      enTimer.current = setTimeout(() => void flushSave('en', next), 600);
    },
    [flushSave]
  );

  useEffect(
    () => () => {
      if (jaTimer.current) clearTimeout(jaTimer.current);
      if (enTimer.current) clearTimeout(enTimer.current);
    },
    []
  );

  useEffect(() => {
    if (!historyOpen) {
      setHistJa(null);
      setHistEn(null);
      return;
    }
    let cancelled = false;
    (async () => {
      const [j, e] = await Promise.all([
        getTranslationHistory({
          keyPath: row.keyPath,
          locale: 'ja',
          limit: 10,
        }),
        getTranslationHistory({
          keyPath: row.keyPath,
          locale: 'en',
          limit: 10,
        }),
      ]);
      if (!cancelled) {
        setHistJa(j);
        setHistEn(e);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [historyOpen, row.keyPath]);

  async function handleTranslate() {
    setTranslateBusy(true);
    try {
      const res = await translateKeyToEnglish({ keyPath: row.keyPath });
      if (res.ok) {
        setEn(res.en);
        savedEn.current = res.en;
        setEnStatus('saved');
        window.setTimeout(() => setEnStatus('idle'), 2000);
      } else {
        alert(res.error);
      }
    } finally {
      setTranslateBusy(false);
    }
  }

  async function handleRestore(
    historyId: string,
    locale: 'ja' | 'en',
    previousValue: string
  ) {
    const res = await restoreTranslation({ historyId });
    if (!res.ok) {
      alert(res.error);
      return;
    }
    if (locale === 'ja') {
      setJa(previousValue);
      savedJa.current = previousValue;
    } else {
      setEn(previousValue);
      savedEn.current = previousValue;
    }
    setHistoryOpen(false);
  }

  const hasHistory =
    (histJa !== null && histJa.length > 0) ||
    (histEn !== null && histEn.length > 0);

  return (
    <>
      {historyOpen && (
        <HistoryDrawer
          keyPath={row.keyPath}
          histJa={histJa}
          histEn={histEn}
          onRestore={handleRestore}
          onClose={() => setHistoryOpen(false)}
        />
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <code className="break-all text-xs text-slate-400">
            {row.keyPath}
          </code>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={translateBusy}
              onClick={() => void handleTranslate()}
              className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700 disabled:opacity-50"
            >
              {translateBusy && <Loader2 className="h-3 w-3 animate-spin" />}
              {translateBusy ? t('translating') : t('translateToEn')}
            </button>
            <button
              type="button"
              onClick={() => setHistoryOpen(true)}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                hasHistory
                  ? 'border-primaryColor/30 bg-primaryColor/5 text-primaryColor hover:bg-primaryColor/10'
                  : 'border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700'
              }`}
            >
              <Clock className="h-3 w-3" />
              {t('history')}
            </button>
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div>
            <span className="mb-1 block text-xs font-semibold text-slate-600">
              🇯🇵 {t('jaLabel')}
            </span>
            <textarea
              className="min-h-[88px] w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-primaryColor focus:bg-white focus:ring-1 focus:ring-primaryColor"
              value={ja}
              onChange={(e) => {
                const v = e.target.value;
                setJa(v);
                scheduleJaSave(v);
              }}
              onBlur={(e) => {
                if (jaTimer.current) clearTimeout(jaTimer.current);
                void flushSave('ja', e.currentTarget.value);
              }}
              spellCheck={false}
            />
            <div className="mt-1 flex h-4 justify-end">
              <StatusPill status={jaStatus} t={t} />
            </div>
          </div>
          <div>
            <span className="mb-1 block text-xs font-semibold text-slate-600">
              🇬🇧 {t('enLabel')}
            </span>
            <textarea
              className="min-h-[88px] w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-primaryColor focus:bg-white focus:ring-1 focus:ring-primaryColor"
              value={en}
              onChange={(e) => {
                const v = e.target.value;
                setEn(v);
                scheduleEnSave(v);
              }}
              onBlur={(e) => {
                if (enTimer.current) clearTimeout(enTimer.current);
                void flushSave('en', e.currentTarget.value);
              }}
              spellCheck={false}
            />
            <div className="mt-1 flex h-4 justify-end">
              <StatusPill status={enStatus} t={t} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

/* ─── main editor ──────────────────────────────────────────────── */

export default function TranslationsEditor({
  initialNamespaces,
}: {
  initialNamespaces: string[];
}) {
  const t = useTranslations('admin.translationsEditor');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 350);
  const [activeNamespace, setActiveNamespace] = useState<string | null>(
    initialNamespaces[0] ?? null
  );
  const [rows, setRows] = useState<TranslationPairRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const inSearchMode = debouncedSearch.trim().length > 0;

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setLoadError(null);
      try {
        if (inSearchMode) {
          const r = await searchTranslationRows(debouncedSearch.trim(), 500);
          if (!cancelled) setRows(r);
        } else if (activeNamespace) {
          const r = await listTranslationRowsForNamespace(activeNamespace);
          if (!cancelled) setRows(r);
        } else if (!cancelled) {
          setRows([]);
        }
      } catch {
        if (!cancelled) {
          setLoadError(t('loadRowsError'));
          setRows([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [activeNamespace, debouncedSearch, inSearchMode, t]);

  const namespaceTabs = useMemo(
    () =>
      initialNamespaces.map((ns) => (
        <button
          key={ns}
          type="button"
          disabled={inSearchMode}
          onClick={() => setActiveNamespace(ns)}
          className={`flex-shrink-0 rounded-full px-4 py-1.5 text-xs font-medium transition-colors ${
            !inSearchMode && activeNamespace === ns
              ? 'bg-slate-900 text-white'
              : 'bg-slate-100 text-slate-600 hover:bg-slate-200 disabled:opacity-40'
          }`}
        >
          {ns}
        </button>
      )),
    [activeNamespace, initialNamespaces, inSearchMode]
  );

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          {t('title')}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-slate-600">{t('subtitle')}</p>
      </header>

      {initialNamespaces.length === 0 ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
          {t('emptyDb')}
        </div>
      ) : (
        <div className="space-y-6">
          <div>
            <label className="block">
              <span className="sr-only">{t('searchPlaceholder')}</span>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={t('searchPlaceholder')}
                className="w-full max-w-xl rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm shadow-sm outline-none focus:border-primaryColor focus:ring-1 focus:ring-primaryColor"
              />
            </label>
          </div>

          {!inSearchMode && (
            <div className="flex flex-wrap items-center gap-2 overflow-x-auto pb-1">
              <span className="text-xs font-semibold uppercase tracking-wide text-slate-400">
                {t('namespaceLabel')}
              </span>
              {namespaceTabs}
            </div>
          )}

          {loadError && (
            <p className="text-sm text-red-600" role="alert">
              {loadError}
            </p>
          )}

          {loading ? (
            <div className="flex items-center gap-2 py-8 text-sm text-slate-400">
              <Loader2 className="h-4 w-4 animate-spin" />
              {t('loadingRows')}
            </div>
          ) : rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-slate-400">
              {t('noResults')}
            </p>
          ) : (
            <div className="space-y-4">
              {inSearchMode
                ? rows.map((row) => (
                    <div key={row.keyPath}>
                      <p className="mb-1 text-[10px] font-medium uppercase tracking-wide text-slate-400">
                        {namespaceFromKeyPath(row.keyPath)}
                      </p>
                      <TranslationRow row={row} />
                    </div>
                  ))
                : rows.map((row) => (
                    <TranslationRow key={row.keyPath} row={row} />
                  ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
