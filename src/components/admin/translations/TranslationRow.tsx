'use client';

import { useCallback, useEffect, useState } from 'react';
import { Clock, Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { useAutosave } from '@/hooks/use-autosave';
import { StatusPill } from './StatusPill';
import { HistoryDrawer } from './HistoryDrawer';
import {
  getTranslationHistory,
  restoreTranslation,
  saveTranslation,
  translateKeyToEnglish,
  type TranslationHistoryItem,
  type TranslationPairRow,
} from '@/actions/translations';

type Props = {
  row: TranslationPairRow;
};

export function TranslationRow({ row }: Props) {
  const t = useTranslations('admin.translationsEditor');

  const [ja, setJa] = useState(row.ja);
  const [en, setEn] = useState(row.en);
  const [translateBusy, setTranslateBusy] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [histJa, setHistJa] = useState<TranslationHistoryItem[] | null>(null);
  const [histEn, setHistEn] = useState<TranslationHistoryItem[] | null>(null);

  // sync when the parent switches namespace tab
  useEffect(() => {
    setJa(row.ja);
    setEn(row.en);
  }, [row.keyPath, row.ja, row.en]);

  const saveJa = useCallback(
    async (value: string) => {
      const res = await saveTranslation({
        keyPath: row.keyPath,
        locale: 'ja',
        value,
      });
      return res.ok;
    },
    [row.keyPath]
  );

  const saveEn = useCallback(
    async (value: string) => {
      const res = await saveTranslation({
        keyPath: row.keyPath,
        locale: 'en',
        value,
      });
      return res.ok;
    },
    [row.keyPath]
  );

  const jaAutosave = useAutosave(row.ja, saveJa, { debounceMs: 1000 });
  const enAutosave = useAutosave(row.en, saveEn, { debounceMs: 1000 });

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
        enAutosave.markSaved(res.en);
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
      jaAutosave.markSaved(previousValue);
    } else {
      setEn(previousValue);
      enAutosave.markSaved(previousValue);
    }
    setHistoryOpen(false);
  }

  function handleDeleteHistoryItem(id: string, locale: 'ja' | 'en') {
    if (locale === 'ja') {
      setHistJa((prev) => prev?.filter((h) => h.id !== id) ?? prev);
    } else {
      setHistEn((prev) => prev?.filter((h) => h.id !== id) ?? prev);
    }
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
          onDeleteItem={handleDeleteHistoryItem}
          onClose={() => setHistoryOpen(false)}
        />
      )}

      <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition-shadow hover:shadow-md">
        {/* row header */}
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

        {/* locale textareas */}
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
                jaAutosave.onChange(v);
              }}
              onBlur={(e) => jaAutosave.onBlur(e.currentTarget.value)}
              spellCheck={false}
            />
            <div className="mt-1 flex h-4 justify-end">
              <StatusPill status={jaAutosave.status} />
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
                enAutosave.onChange(v);
              }}
              onBlur={(e) => enAutosave.onBlur(e.currentTarget.value)}
              spellCheck={false}
            />
            <div className="mt-1 flex h-4 justify-end">
              <StatusPill status={enAutosave.status} />
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
