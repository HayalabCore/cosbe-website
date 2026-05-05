'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useDebouncedValue } from '@/hooks/use-debounced-value';
import { namespaceFromKeyPath } from '@/lib/translations/flatten';
import {
  listTranslationRowsForNamespace,
  searchTranslationRows,
  type TranslationPairRow,
} from '@/actions/translations';
import { TranslationRow } from './TranslationRow';

type Props = {
  initialNamespaces: string[];
  initialRows: TranslationPairRow[];
};

export default function TranslationsEditor({
  initialNamespaces,
  initialRows,
}: Props) {
  const t = useTranslations('admin.translationsEditor');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebouncedValue(search, 350);
  const [activeNamespace, setActiveNamespace] = useState<string | null>(
    initialNamespaces[0] ?? null
  );
  // pre-populated from the server — no loading flicker on first render
  const [rows, setRows] = useState<TranslationPairRow[]>(initialRows);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  // true only for the very first effect run; SSR data is already in state
  const isInitialMountRef = useRef(true);

  const inSearchMode = debouncedSearch.trim().length > 0;

  useEffect(() => {
    // On the initial mount, the first namespace rows came from SSR — skip the fetch.
    if (isInitialMountRef.current && !inSearchMode) {
      isInitialMountRef.current = false;
      return;
    }
    isInitialMountRef.current = false;

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
          {/* search */}
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

          {/* namespace tabs (hidden while searching) */}
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
