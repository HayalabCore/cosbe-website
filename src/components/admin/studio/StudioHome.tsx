'use client';

import { useState, type ReactNode } from 'react';
import { useTranslations } from 'next-intl';
import { Activity } from 'lucide-react';
import AdminDialog from '@/components/admin/access/AdminDialog';
import PieceList from './pieces/PieceList';
import StudioTabs from './StudioTabs';
import SystemCheckCard from './SystemCheckCard';
import { Button } from './ui';

/** Studio page frame: title, the worker check, tabs, then the page body. */
export default function StudioHome({ children }: { children?: ReactNode }) {
  const t = useTranslations('admin.studio');
  const [checking, setChecking] = useState(false);
  return (
    <div className="mx-auto max-w-7xl px-6 py-8">
      <header className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{t('title')}</h1>
          <p className="mt-0.5 text-sm text-slate-500">{t('subtitle')}</p>
        </div>
        <Button
          variant="ghost"
          size="sm"
          icon={<Activity className="h-3.5 w-3.5" aria-hidden />}
          onClick={() => setChecking(true)}
        >
          {t('systemCheck.open')}
        </Button>
      </header>
      <StudioTabs />
      <div className="mt-6">{children ?? <PieceList />}</div>
      {checking && (
        <AdminDialog
          title={t('systemCheck.title')}
          onClose={() => setChecking(false)}
        >
          <SystemCheckCard />
        </AdminDialog>
      )}
    </div>
  );
}
