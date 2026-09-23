'use client';

import type { ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import AdminDialog from '@/components/admin/access/AdminDialog';
import { Button } from './ui';

/** Asks before an action that replaces work or cannot be taken back. */
export default function ConfirmDialog({
  title,
  children,
  confirmLabel,
  danger = false,
  busy = false,
  onConfirm,
  onClose,
}: {
  title: string;
  children: ReactNode;
  confirmLabel: string;
  danger?: boolean;
  busy?: boolean;
  onConfirm: () => void;
  onClose: () => void;
}) {
  const t = useTranslations('admin.studio');
  return (
    <AdminDialog title={title} onClose={onClose}>
      <div className="space-y-5">
        <div className="space-y-2 text-sm leading-relaxed text-slate-600">
          {children}
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <Button variant="ghost" onClick={onClose}>
            {t('confirm.cancel')}
          </Button>
          <Button
            variant={danger ? 'danger' : 'primary'}
            busy={busy}
            onClick={onConfirm}
            autoFocus
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </AdminDialog>
  );
}
