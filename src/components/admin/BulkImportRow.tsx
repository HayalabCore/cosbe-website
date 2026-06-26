'use client';

import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';
import { blockSummary } from '@/components/admin/ImportPreviewFields';
import type { BulkRow } from '@/lib/legacy-import/bulk-state';

const STATUS_BADGE: Record<string, string> = {
  queued: 'bg-slate-100 text-slate-600',
  extracting: 'bg-blue-50 text-blue-700',
  ready: 'bg-emerald-100 text-emerald-700',
  error: 'bg-red-100 text-red-700',
  committing: 'bg-blue-50 text-blue-700',
  committed: 'bg-emerald-100 text-emerald-700',
  commitError: 'bg-red-100 text-red-700',
};

const STATUS_KEY: Record<string, string> = {
  queued: 'statusQueued',
  extracting: 'statusExtracting',
  ready: 'statusReady',
  error: 'statusError',
  committing: 'statusCommitting',
  committed: 'statusCommitted',
  commitError: 'statusCommitError',
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
  const inProgress = row.status === 'extracting' || row.status === 'committing';
  const collision = Boolean(p?.slugCollision) || duplicate;
  const summary = p ? blockSummary(p.blocks) : null;

  return (
    <tr className="border-b border-slate-100 hover:bg-slate-50/60">
      <td className="px-3 py-3">
        <input
          type="checkbox"
          className="h-4 w-4 accent-primaryColor"
          checked={row.included}
          disabled={row.status !== 'ready'}
          onChange={onToggleInclude}
        />
      </td>
      <td className="px-3 py-3">
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${STATUS_BADGE[row.status]}`}
        >
          {inProgress && (
            <Loader2 className="h-3 w-3 animate-spin" aria-hidden />
          )}
          {t(STATUS_KEY[row.status] as Parameters<typeof t>[0])}
        </span>
      </td>
      <td className="px-3 py-3 min-w-0">
        <div className="font-semibold text-slate-900 truncate max-w-md">
          {p?.title || (row.status === 'error' ? (row.error ?? '—') : '…')}
        </div>
        <div className="font-mono text-[11px] text-slate-400 truncate max-w-md">
          {shortUrl(row.url)}
        </div>
        {row.status === 'commitError' && row.error && (
          <div className="text-[11px] text-red-600 mt-0.5">{row.error}</div>
        )}
      </td>
      <td className="px-3 py-3">
        {p && (
          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-600">
            {p.category}
          </span>
        )}
      </td>
      <td className="px-3 py-3">
        {p && (
          <span
            className={`font-mono text-xs ${collision ? 'text-amber-700 font-semibold' : 'text-slate-600'}`}
          >
            {p.slug}
            {p.slugCollision && ` ⚠ ${t('collisionFlag')}`}
            {!p.slugCollision && duplicate && ` ⚠ ${t('duplicateFlag')}`}
          </span>
        )}
      </td>
      <td className="px-3 py-3 text-xs text-slate-500 whitespace-nowrap">
        {summary &&
          t('contentSummary', {
            blocks: summary.blocks,
            images: summary.images,
          })}
      </td>
      <td className="px-3 py-3 text-right whitespace-nowrap">
        {row.status === 'ready' || row.status === 'committed' ? (
          <button
            type="button"
            className="text-xs font-semibold text-primaryColor hover:text-primaryHover"
            onClick={onOpenPreview}
          >
            {t('preview')}
          </button>
        ) : row.status === 'error' || row.status === 'commitError' ? (
          <button
            type="button"
            className="text-xs font-semibold text-primaryColor hover:text-primaryHover"
            onClick={onRetry}
          >
            {t('retry')}
          </button>
        ) : null}
      </td>
    </tr>
  );
}
