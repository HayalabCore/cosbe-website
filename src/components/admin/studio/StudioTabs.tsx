'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';

const TABS = [
  { key: 'overview', href: '/admin/studio', match: ['/admin/studio/pieces'] },
  { key: 'projects', href: '/admin/studio/projects', match: [] },
  { key: 'library', href: '/admin/studio/library', match: [] },
  { key: 'templates', href: '/admin/studio/templates', match: [] },
] as const;

export default function StudioTabs() {
  const t = useTranslations('admin.studio.tabs');
  const pathname = usePathname() ?? '';
  return (
    <nav
      aria-label={t('label')}
      className="flex gap-6 border-b border-slate-200 text-sm"
    >
      {TABS.map((tab) => {
        const active =
          tab.href === '/admin/studio'
            ? pathname === tab.href ||
              tab.match.some((m) => pathname.startsWith(m))
            : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.key}
            href={tab.href}
            aria-current={active ? 'page' : undefined}
            className={`-mb-px border-b-2 pb-2.5 font-medium transition-colors ${active ? 'border-primaryColor text-slate-900' : 'border-transparent text-slate-500 hover:text-slate-800'}`}
          >
            {t(tab.key)}
          </Link>
        );
      })}
    </nav>
  );
}
