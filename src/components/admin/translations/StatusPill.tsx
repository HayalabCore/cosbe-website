'use client';

import { Loader2 } from 'lucide-react';
import { useTranslations } from 'next-intl';
import type { SaveStatus } from '@/hooks/use-autosave';

const STATUS_CLASSES: Record<Exclude<SaveStatus, 'idle'>, string> = {
  saving: 'text-slate-400',
  saved: 'text-emerald-600',
  error: 'text-red-600',
};

const STATUS_KEYS: Record<
  Exclude<SaveStatus, 'idle'>,
  'saving' | 'saved' | 'error'
> = {
  saving: 'saving',
  saved: 'saved',
  error: 'error',
};

type Props = {
  status: SaveStatus;
};

export function StatusPill({ status }: Props) {
  const t = useTranslations('admin.translationsEditor');

  if (status === 'idle') return null;

  return (
    <span
      className={`flex items-center gap-1 text-xs font-medium ${STATUS_CLASSES[status]}`}
    >
      {status === 'saving' && <Loader2 className="h-3 w-3 animate-spin" />}
      {t(STATUS_KEYS[status])}
    </span>
  );
}
