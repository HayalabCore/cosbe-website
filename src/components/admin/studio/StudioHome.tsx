'use client';

import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import StudioTabs from './StudioTabs';
import SystemCheckCard from './SystemCheckCard';

/** Studio page frame: header, tabs, then the page body (overview by default). */
export default function StudioHome({ children }: { children?: ReactNode }) {
  const t = useTranslations('admin.studio');
  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <header>
        <h1 className="text-2xl font-bold text-slate-900">{t('title')}</h1>
        <p className="text-sm text-slate-500 mt-1">{t('subtitle')}</p>
      </header>
      <StudioTabs />
      {children ?? <SystemCheckCard />}
    </div>
  );
}
