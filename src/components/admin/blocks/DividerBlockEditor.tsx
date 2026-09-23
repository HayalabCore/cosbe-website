'use client';

import { useTranslations } from 'next-intl';

export default function DividerBlockEditor() {
  const t = useTranslations('admin.divider');
  return (
    <div role="separator" aria-label={t('label')} className="py-3">
      <div className="border-t border-slate-300" />
    </div>
  );
}
