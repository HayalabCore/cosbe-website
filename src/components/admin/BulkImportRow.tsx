'use client';

import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';
import { blockSummary } from '@/components/admin/ImportPreviewFields';
import AdminCheckbox from '@/components/admin/AdminCheckbox';
import type { BulkRow, BulkRowStatus } from '@/lib/legacy-import/bulk-state';

const CATEGORY_CLS: Record<string, string> = {
  'useful-info': 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
  'case-study': 'bg-purple-50 text-purple-700 ring-1 ring-purple-200',
  video: 'bg-rose-50 text-rose-700 ring-1 ring-rose-200',
  notice: 'bg-amber-50 text-amber-700 ring-1 ring-amber-200',
};

const STATUS_META: Record<
  BulkRowStatus,
  { dot: string; cls: string; key: string; spin?: boolean }
> = {
  queued: {
    dot: 'bg-slate-300',
    cls: 'bg-slate-100 text-slate-500 ring-1 ring-slate-200',
    key: 'statusQueued',
  },
  extracting: {
    dot: 'bg-blue-400',
    cls: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
    key: 'statusExtracting',
    spin: true,
  },
  ready: {
    dot: 'bg-emerald-500',
    cls: 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200',
    key: 'statusReady',
  },
  error: {
    dot: 'bg-red-500',
    cls: 'bg-red-50 text-red-700 ring-1 ring-red-200',
    key: 'statusError',
  },
  committing: {
    dot: 'bg-blue-400',
    cls: 'bg-blue-50 text-blue-700 ring-1 ring-blue-200',
    key: 'statusCommitting',
    spin: true,
  },
  commitError: {
    dot: 'bg-red-500',
    cls: 'bg-red-50 text-red-700 ring-1 ring-red-200',
    key: 'statusCommitError',
  },
};

type BulkImportRowProps = {
  row: BulkRow;
  duplicate: boolean;
  onOpenPreview: () => void;
  onToggleInclude: () => void;
  onRetry: () => void;
};

function shortUrl(url: string): string {
  try {
    return new URL(url).pathname;
  } catch {
    return url;
  }
}

export default function BulkImportRow({
  row,
  duplicate,
  onOpenPreview,
  onToggleInclude,
  onRetry,
}: BulkImportRowProps) {
  const t = useTranslations('admin.bulkImport');
  const p = row.payload;
  const st = STATUS_META[row.status];
  const collision = Boolean(p?.slugCollision) || duplicate;
  const summary = p ? blockSummary(p.blocks) : null;
  const previewable = row.status === 'ready';
  const retryable = row.status === 'error' || row.status === 'commitError';

  return (
    <tr className="group border-b border-slate-100 last:border-0 hover:bg-slate-50/70 transition-colors">
      <td className="px-4 py-3.5 align-top">
        <AdminCheckbox
          aria-label="Include in import"
          className="mt-0.5"
          checked={row.included}
          disabled={row.status !== 'ready'}
          onChange={onToggleInclude}
        />
      </td>

      <td className="px-3 py-3.5 align-top">
        <span
          className={`inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium whitespace-nowrap ${st.cls}`}
        >
          {st.spin ? (
            <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
          ) : (
            <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
          )}
          {t(st.key as Parameters<typeof t>[0])}
        </span>
      </td>

      <td className="px-3 py-3.5 align-top min-w-0">
        {previewable ? (
          <button
            type="button"
            onClick={onOpenPreview}
            className="block max-w-md truncate text-left font-semibold text-slate-900 hover:text-primaryColor transition-colors"
          >
            {p?.title || '—'}
          </button>
        ) : (
          <div
            className={`max-w-md truncate font-semibold ${
              row.status === 'error' ? 'text-red-700' : 'text-slate-400'
            }`}
          >
            {p?.title || (row.status === 'error' ? (row.error ?? '—') : '…')}
          </div>
        )}
        <div className="mt-0.5 max-w-md truncate font-mono text-[11px] text-slate-400">
          {shortUrl(row.url)}
        </div>
        {row.status === 'commitError' && row.error && (
          <div className="mt-0.5 text-[11px] text-red-600">{row.error}</div>
        )}
      </td>

      <td className="px-3 py-3.5 align-top">
        {p && (
          <span
            className={`inline-flex items-center rounded-md px-2 py-1 text-[11px] font-medium whitespace-nowrap ${
              CATEGORY_CLS[p.category] ?? 'bg-slate-100 text-slate-600'
            }`}
          >
            {p.category}
          </span>
        )}
      </td>

      <td className="px-3 py-3.5 align-top">
        {p && (
          <div className="flex flex-col gap-1">
            <span className="font-mono text-xs text-slate-600">{p.slug}</span>
            {collision && (
              <span className="inline-flex w-fit items-center gap-1 rounded-md bg-amber-50 px-1.5 py-0.5 text-[10px] font-semibold text-amber-700 ring-1 ring-amber-200">
                {p.slugCollision ? t('collisionFlag') : t('duplicateFlag')}
              </span>
            )}
          </div>
        )}
      </td>

      <td className="px-3 py-3.5 align-top text-xs text-slate-500 whitespace-nowrap">
        {summary &&
          t('contentSummary', {
            blocks: summary.blocks,
            images: summary.images,
          })}
      </td>

      <td className="px-4 py-3.5 align-top text-right whitespace-nowrap">
        {previewable ? (
          <button
            type="button"
            className="rounded-md px-2 py-1 text-xs font-semibold text-primaryColor hover:bg-primaryColor/8 transition-colors"
            onClick={onOpenPreview}
          >
            {t('preview')}
          </button>
        ) : retryable ? (
          <button
            type="button"
            className="rounded-md px-2 py-1 text-xs font-semibold text-primaryColor hover:bg-primaryColor/8 transition-colors"
            onClick={onRetry}
          >
            {t('retry')}
          </button>
        ) : null}
      </td>
    </tr>
  );
}
