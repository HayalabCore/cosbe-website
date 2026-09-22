'use client';

import { useTranslations } from 'next-intl';
import SystemCheckCard from './SystemCheckCard';

export default function StudioHome() {
  const t = useTranslations('admin.studio');
  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">{t('title')}</h1>
        <p className="text-sm text-slate-500 mt-1">{t('subtitle')}</p>
      </header>
      <p className="text-sm text-slate-600">{t('comingSoon')}</p>
      <SystemCheckCard />
    </div>
  );
}
