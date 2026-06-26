'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import { X } from 'lucide-react';
import ImportPreviewFields from '@/components/admin/ImportPreviewFields';
import type { BulkRow } from '@/lib/legacy-import/bulk-state';
import type { ImportPreviewPayload } from '@/lib/legacy-import/types';

type BulkPreviewOverlayProps = {
  row: BulkRow;
  duplicate: boolean;
  onClose: () => void;
  onPatch: (patch: Partial<ImportPreviewPayload>) => void;
  onValidateSlug: (slug: string) => void;
  onToggleInclude: () => void;
};

export default function BulkPreviewOverlay({
  row,
  duplicate,
  onClose,
  onPatch,
  onValidateSlug,
  onToggleInclude,
}: BulkPreviewOverlayProps) {
  const t = useTranslations('admin.bulkImport');

  // Close on Escape.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const p = row.payload;
  if (!p || typeof document === 'undefined') return null;

  const collision = Boolean(p.slugCollision) || duplicate;

  const content = (
    <>
      <div
        className="fixed inset-0 z-[210] bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div
        className="fixed inset-4 md:inset-8 lg:inset-12 z-[211] flex flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="bulk-preview-title"
      >
        <div className="flex items-center gap-3 px-5 py-3 border-b border-slate-100 bg-slate-50/80">
          <div className="min-w-0 flex-1">
            <h2
              id="bulk-preview-title"
              className="text-base font-semibold text-slate-900 truncate"
            >
              {p.title || t('preview')}
            </h2>
            <p className="font-mono text-[11px] text-slate-400 truncate">
              {p.slug}
              {p.slugCollision && ` ⚠ ${t('collisionFlag')}`}
              {!p.slugCollision && duplicate && ` ⚠ ${t('duplicateFlag')}`}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex-shrink-0 rounded-lg p-1.5 text-slate-500 hover:bg-slate-100 hover:text-slate-800"
            aria-label={t('close')}
          >
            <X className="h-5 w-5" aria-hidden />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-5">
          <ImportPreviewFields
            value={p}
            onChange={onPatch}
            onValidateSlug={onValidateSlug}
          />
        </div>

        <div className="flex items-center justify-between gap-3 px-5 py-3 border-t border-slate-100 bg-slate-50/80">
          <label
            className={`inline-flex items-center gap-2 text-sm font-medium ${
              row.status === 'ready'
                ? 'text-slate-700 cursor-pointer'
                : 'text-slate-400 cursor-not-allowed'
            }`}
          >
            <input
              type="checkbox"
              className="h-4 w-4 accent-primaryColor"
              checked={row.included}
              disabled={row.status !== 'ready'}
              onChange={onToggleInclude}
            />
            {t('includeInImport')}
          </label>
          <button
            type="button"
            onClick={onClose}
            className={`rounded-lg px-4 py-2 text-sm font-semibold ${
              collision
                ? 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'
                : 'bg-primaryColor text-white hover:bg-primaryHover'
            }`}
          >
            {t('close')}
          </button>
        </div>
      </div>
    </>
  );

  return createPortal(content, document.body);
}
