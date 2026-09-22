'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useTranslations } from 'next-intl';

const TABS = [
  { key: 'overview', href: '/admin/studio' },
  { key: 'library', href: '/admin/studio/library' },
  { key: 'projects', href: '/admin/studio/projects' },
] as const;

export default function StudioTabs() {
  const t = useTranslations('admin.studio.tabs');
  const pathname = usePathname() ?? '';
  return (
    <nav className="flex gap-4 border-b border-slate-200 text-sm">
      {TABS.map((tab) => {
        const active =
          tab.href === '/admin/studio'
            ? pathname === tab.href
            : pathname.startsWith(tab.href);
        return (
          <Link
            key={tab.key}
            href={tab.href}
            className={`-mb-px border-b-2 px-1 pb-2 ${active ? 'border-slate-900 font-medium text-slate-900' : 'border-transparent text-slate-500'}`}
          >
            {t(tab.key)}
          </Link>
        );
      })}
    </nav>
  );
}
