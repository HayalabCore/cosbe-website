'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { signOut } from '@/lib/auth';
import AdminLocaleSwitcher, { AdminLocaleSwitcherLight } from '@/components/admin/AdminLocaleSwitcher';

function NavItem({
  href,
  active,
  icon,
  label,
  onClick,
}: {
  href?: string;
  active?: boolean;
  icon: React.ReactNode;
  label: string;
  onClick?: () => void;
}) {
  const cls = `flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
    active
      ? 'bg-white/10 text-white'
      : 'text-slate-400 hover:text-white hover:bg-white/8'
  }`;
  if (href) {
    return (
      <Link href={href} className={cls}>
        {icon}
        {label}
      </Link>
    );
  }
  return (
    <button type="button" className={cls} onClick={onClick}>
      {icon}
      {label}
    </button>
  );
}

function Sidebar({
  pathname,
  userEmail,
  onSignOut,
}: {
  pathname: string;
  userEmail: string | null;
  onSignOut: () => void;
}) {
  const t = useTranslations('admin.sidebar');
  const locale = useLocale();
  const initials = userEmail ? userEmail.slice(0, 2).toUpperCase() : 'AD';
  return (
    <div className="flex flex-col h-full py-4">
      {/* Logo */}
      <div className="px-5 mb-5 flex items-start justify-between gap-2">
        <Link href="/admin/dashboard" className="flex items-center gap-2.5 group min-w-0">
          <div className="w-7 h-7 rounded-lg bg-primaryColor flex items-center justify-center flex-shrink-0 shadow-sm">
            <span className="text-white font-bold text-xs leading-none">C</span>
          </div>
          <span className="text-white font-semibold text-sm tracking-tight truncate">{t('brand')}</span>
        </Link>
        <AdminLocaleSwitcher className="flex-shrink-0" />
      </div>

      <div className="mx-4 border-t border-white/10 mb-4" />

      <div className="px-3 mb-1">
        <p className="px-2 text-[10px] font-semibold uppercase tracking-widest text-slate-500 mb-1">{t('contentSection')}</p>
      </div>

      <div className="flex-1 px-3 space-y-0.5">
        <NavItem
          href="/admin/dashboard"
          active={pathname === '/admin/dashboard'}
          label={t('allPosts')}
          icon={
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          }
        />
        <NavItem
          href="/admin/posts/new"
          active={pathname === '/admin/posts/new'}
          label={t('newPost')}
          icon={
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
            </svg>
          }
        />
      </div>

      <div className="px-3 mt-4 space-y-0.5 border-t border-white/10 pt-4">
        <NavItem
          href={`/${locale}`}
          active={false}
          label={t('viewSite')}
          icon={
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
            </svg>
          }
        />
        <NavItem
          label={t('signOut')}
          onClick={onSignOut}
          icon={
            <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" strokeWidth={1.75} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          }
        />
      </div>

      {/* User pill */}
      {userEmail && (
        <div className="mx-3 mt-4 flex items-center gap-2.5 rounded-lg bg-white/5 px-3 py-2.5 border border-white/8">
          <div className="w-6 h-6 rounded-full bg-primaryColor/30 flex items-center justify-center flex-shrink-0">
            <span className="text-[10px] font-semibold text-primaryColor">{initials}</span>
          </div>
          <p className="text-xs text-slate-500 truncate min-w-0">{userEmail}</p>
        </div>
      )}
    </div>
  );
}

export default function AdminProtectedLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const tCommon = useTranslations('admin.common');
  const tSidebar = useTranslations('admin.sidebar');
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [ready, setReady] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    let cancelled = false;
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (cancelled) return;
      if (!session) {
        router.replace('/admin');
        return;
      }
      setUserEmail(session.user.email ?? null);
      setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, [router, supabase]);

  async function handleSignOut() {
    await signOut(supabase);
    router.replace('/admin');
    router.refresh();
  }

  if (!ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-50">
        <div className="flex items-center gap-2.5 text-slate-400">
          <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
          </svg>
          <span className="text-sm">{tCommon('loading')}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-slate-50">
      {/* Desktop sidebar */}
      <aside className="hidden lg:block w-56 bg-slate-950 fixed inset-y-0 left-0 z-30 flex-shrink-0">
        <Sidebar pathname={pathname} userEmail={userEmail} onSignOut={() => void handleSignOut()} />
      </aside>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Mobile drawer */}
      <aside
        className={`fixed inset-y-0 left-0 z-30 w-56 bg-slate-950 flex-shrink-0 transition-transform duration-200 lg:hidden ${
          mobileOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Sidebar pathname={pathname} userEmail={userEmail} onSignOut={() => void handleSignOut()} />
      </aside>

      {/* Content */}
      <div className="flex-1 lg:ml-56 flex flex-col min-h-screen">
        {/* Mobile top bar */}
        <header className="lg:hidden sticky top-0 z-20 flex items-center gap-3 px-4 h-14 bg-white border-b border-slate-200 shadow-sm">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="p-2 rounded-lg text-slate-500 hover:bg-slate-100 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <span className="font-semibold text-slate-900 text-sm flex-1 min-w-0 truncate">{tSidebar('brand')}</span>
          <AdminLocaleSwitcherLight className="flex-shrink-0" />
        </header>

        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
