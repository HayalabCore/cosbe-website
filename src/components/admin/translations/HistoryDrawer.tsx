'use client';

import { useState } from 'react';
import {
  X,
  Clock,
  RotateCcw,
  ChevronRight,
  Loader2,
  Trash2,
} from 'lucide-react';
import { useTranslations } from 'next-intl';
import { formatRelative } from '@/lib/format';
import {
  deleteTranslationHistoryItem,
  type TranslationHistoryItem,
} from '@/actions/translations';

type LocaleTab = 'ja' | 'en';

/* ─── single history entry card ───────────────────────────────── */

type EntryCardProps = {
  item: TranslationHistoryItem;
  locale: LocaleTab;
  isFirst: boolean;
  restoringId: string | null;
  onRestore: (id: string, locale: LocaleTab, value: string) => void;
  onDelete: (id: string) => void;
};

function EntryCard({
  item: h,
  locale,
  isFirst,
  restoringId,
  onRestore,
  onDelete,
}: EntryCardProps) {
  const t = useTranslations('admin.translationsEditor');
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const busy = restoringId !== null || deleting;

  async function handleDelete() {
    setDeleting(true);
    const res = await deleteTranslationHistoryItem({ historyId: h.id });
    if (res.ok) {
      onDelete(h.id);
    } else {
      alert(res.error);
      setDeleting(false);
      setConfirmDelete(false);
    }
  }

  return (
    <li className="relative">
      {/* timeline dot */}
      <span
        className={`absolute -left-[17px] top-[14px] h-2.5 w-2.5 rounded-full border-2 border-white ${
          isFirst ? 'bg-primaryColor' : 'bg-slate-300'
        }`}
      />

      <div
        className={`rounded-xl border p-3 transition-colors ${
          isFirst
            ? 'border-primaryColor/20 bg-primaryColor/5'
            : 'border-slate-100 bg-slate-50'
        }`}
      >
        {/* value preview */}
        <p className="line-clamp-3 text-xs leading-relaxed text-slate-700">
          {h.previousValue || (
            <span className="italic text-slate-400">(empty)</span>
          )}
        </p>

        {/* meta */}
        <div className="mt-2 flex items-center gap-2 text-[10px] text-slate-400">
          <span className="font-medium text-slate-500">
            {formatRelative(h.changedAt)}
          </span>
          {h.changedBy && (
            <>
              <ChevronRight className="h-3 w-3 flex-shrink-0" />
              <span className="truncate">{h.changedBy}</span>
            </>
          )}
        </div>

        {/* actions */}
        {confirmDelete ? (
          <div className="mt-3 flex items-center gap-2 rounded-lg border border-red-200 bg-red-50 px-2 py-1.5">
            <p className="flex-1 text-[10px] text-red-700">
              {t('deleteHistoryConfirm')}
            </p>
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleDelete()}
              className="flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-semibold text-red-700 hover:bg-red-100 disabled:opacity-50"
            >
              {deleting ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Trash2 className="h-3 w-3" />
              )}
              {t('deleteHistoryConfirmYes')}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setConfirmDelete(false)}
              className="rounded px-2 py-0.5 text-[10px] font-medium text-slate-500 hover:bg-red-100 disabled:opacity-50"
            >
              {t('deleteHistoryConfirmNo')}
            </button>
          </div>
        ) : (
          <div className="mt-2 flex items-center gap-1.5">
            <button
              type="button"
              disabled={busy}
              onClick={() => onRestore(h.id, locale, h.previousValue)}
              className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-medium text-slate-600 shadow-sm hover:border-primaryColor hover:text-primaryColor disabled:opacity-50"
            >
              {restoringId === h.id ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <RotateCcw className="h-3 w-3" />
              )}
              {t('restore')}
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => setConfirmDelete(true)}
              className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-[10px] font-medium text-slate-500 shadow-sm hover:border-red-300 hover:text-red-600 disabled:opacity-50"
            >
              <Trash2 className="h-3 w-3" />
              {t('deleteHistory')}
            </button>
          </div>
        )}
      </div>
    </li>
  );
}

/* ─── full history list ────────────────────────────────────────── */

type HistoryListProps = {
  items: TranslationHistoryItem[] | null;
  locale: LocaleTab;
  label: string;
  restoringId: string | null;
  onRestore: (id: string, locale: LocaleTab, value: string) => void;
  onDelete: (id: string) => void;
};

function HistoryList({
  items,
  locale,
  label,
  restoringId,
  onRestore,
  onDelete,
}: HistoryListProps) {
  const t = useTranslations('admin.translationsEditor');

  if (items === null) {
    return (
      <div className="flex h-32 items-center justify-center">
        <Loader2 className="h-5 w-5 animate-spin text-slate-300" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="flex h-40 flex-col items-center justify-center gap-2 text-center">
        <Clock className="h-8 w-8 text-slate-200" />
        <p className="text-sm text-slate-400">{t('noHistory')}</p>
        <p className="text-xs text-slate-300">
          {`Changes to the ${label} copy will appear here.`}
        </p>
      </div>
    );
  }

  return (
    <ol className="relative space-y-1 border-l border-slate-100 pl-4">
      {items.map((h, idx) => (
        <EntryCard
          key={h.id}
          item={h}
          locale={locale}
          isFirst={idx === 0}
          restoringId={restoringId}
          onRestore={onRestore}
          onDelete={onDelete}
        />
      ))}
    </ol>
  );
}

/* ─── drawer shell ─────────────────────────────────────────────── */

export type HistoryDrawerProps = {
  keyPath: string;
  histJa: TranslationHistoryItem[] | null;
  histEn: TranslationHistoryItem[] | null;
  onRestore: (
    id: string,
    locale: 'ja' | 'en',
    previousValue: string
  ) => Promise<void>;
  onDeleteItem: (id: string, locale: 'ja' | 'en') => void;
  onClose: () => void;
};

export function HistoryDrawer({
  keyPath,
  histJa,
  histEn,
  onRestore,
  onDeleteItem,
  onClose,
}: HistoryDrawerProps) {
  const t = useTranslations('admin.translationsEditor');
  const [activeTab, setActiveTab] = useState<LocaleTab>('ja');
  const [restoringId, setRestoringId] = useState<string | null>(null);

  async function handleRestore(id: string, locale: LocaleTab, value: string) {
    setRestoringId(id);
    await onRestore(id, locale, value);
    setRestoringId(null);
  }

  const items = activeTab === 'ja' ? histJa : histEn;
  const totalItems = items?.length ?? 0;

  const TABS: { id: LocaleTab; flag: string; label: string }[] = [
    { id: 'ja', flag: '🇯🇵', label: t('historyJa') },
    { id: 'en', flag: '🇬🇧', label: t('historyEn') },
  ];

  return (
    <>
      {/* backdrop */}
      <div
        className="fixed inset-0 z-40 bg-black/30 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* slide-over panel */}
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
          {TABS.map(({ id, flag, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              className={`-mb-px border-b-2 px-4 py-3 text-xs font-semibold transition-colors ${
                activeTab === id
                  ? 'border-primaryColor text-primaryColor'
                  : 'border-transparent text-slate-500 hover:text-slate-800'
              }`}
            >
              {flag} {label}
            </button>
          ))}
        </div>

        {/* history list */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <HistoryList
            items={items}
            locale={activeTab}
            label={activeTab === 'ja' ? t('historyJa') : t('historyEn')}
            restoringId={restoringId}
            onRestore={(id, locale, value) =>
              void handleRestore(id, locale, value)
            }
            onDelete={(id) => onDeleteItem(id, activeTab)}
          />
        </div>

        {/* footer */}
        <p className="border-t border-slate-100 px-5 py-3 text-center text-[10px] text-slate-400">
          {`Showing last ${totalItems} change${totalItems !== 1 ? 's' : ''} · restored values create a new history entry`}
        </p>
      </div>
    </>
  );
}
