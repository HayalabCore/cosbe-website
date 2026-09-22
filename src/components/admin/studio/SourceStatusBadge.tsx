'use client';

import { useTranslations } from 'next-intl';
import type { SourceStatus } from '@/generator/sources/source-types';

const TONE: Record<SourceStatus, string> = {
  pending: 'bg-slate-100 text-slate-600',
  processing: 'bg-blue-50 text-blue-700',
  ready: 'bg-emerald-50 text-emerald-700',
  stored: 'bg-slate-100 text-slate-600',
  needs_transcript: 'bg-amber-50 text-amber-700',
  failed: 'bg-red-50 text-red-700',
};

export default function SourceStatusBadge({
  status,
  error,
}: {
  status: SourceStatus;
  error?: string | null;
}) {
  const t = useTranslations('admin.studio.status');
  return (
    <span
      title={error ?? undefined}
      className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${TONE[status]}`}
    >
      {t(status)}
    </span>
  );
}
