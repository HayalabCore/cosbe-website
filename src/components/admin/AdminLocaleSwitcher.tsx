'use client';

import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { ADMIN_LOCALE_COOKIE, type AdminLocale } from '@/lib/admin-locale';

function setCookie(name: string, value: string) {
  const maxAge = 60 * 60 * 24 * 365;
  document.cookie = `${name}=${encodeURIComponent(value)};path=/;max-age=${maxAge};SameSite=Lax`;
}

type Variant = 'dark' | 'light';

const STYLES: Record<
  Variant,
  { wrapper: string; active: string; inactive: string }
> = {
  dark: {
    wrapper: 'border-white/15 bg-white/5',
    active: 'bg-white/15 text-white',
    inactive: 'text-slate-500 hover:text-white',
  },
  light: {
    wrapper: 'border-slate-200 bg-white shadow-sm',
    active: 'bg-slate-900 text-white',
    inactive: 'text-slate-500 hover:text-slate-900',
  },
};

type Props = {
  variant?: Variant;
  className?: string;
};

export default function AdminLocaleSwitcher({
  variant = 'dark',
  className = '',
}: Props) {
  const router = useRouter();
  const locale = useLocale() as AdminLocale;
  const t = useTranslations('admin.common');
  const s = STYLES[variant];

  function switchTo(next: AdminLocale) {
    if (next === locale) return;
    setCookie(ADMIN_LOCALE_COOKIE, next);
    router.refresh();
  }

  return (
    <div
      className={`inline-flex rounded-lg border p-0.5 text-[11px] font-semibold ${s.wrapper} ${className}`}
      role="group"
      aria-label={t('language')}
    >
      <button
        type="button"
        onClick={() => switchTo('en')}
        className={`rounded-md px-2 py-1 transition-colors ${locale === 'en' ? s.active : s.inactive}`}
      >
        EN
      </button>
      <button
        type="button"
        onClick={() => switchTo('ja')}
        className={`rounded-md px-2 py-1 transition-colors ${locale === 'ja' ? s.active : s.inactive}`}
      >
        JP
      </button>
    </div>
  );
}

export function AdminLocaleSwitcherLight({
  className = '',
}: {
  className?: string;
}) {
  return <AdminLocaleSwitcher variant="light" className={className} />;
}
