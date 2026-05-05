import { cookies } from 'next/headers';
import { NextIntlClientProvider } from 'next-intl';
import type { AbstractIntlMessages } from 'next-intl';
import adminEn from '../../../messages/admin-en.json';
import adminJa from '../../../messages/admin-ja.json';
import {
  ADMIN_LOCALE_COOKIE,
  parseAdminLocale,
  type AdminLocale,
} from '@/lib/admin-locale';
import { loadMessagesForLocale } from '@/lib/translations/load-messages';

async function buildMessages(
  locale: AdminLocale
): Promise<AbstractIntlMessages> {
  const base = await loadMessagesForLocale(locale);
  const admin = locale === 'ja' ? adminJa : adminEn;
  return { ...base, admin } as unknown as AbstractIntlMessages;
}

export default async function AdminRootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const locale = parseAdminLocale(cookieStore.get(ADMIN_LOCALE_COOKIE)?.value);
  const messages = await buildMessages(locale);

  return (
    <NextIntlClientProvider locale={locale} messages={messages}>
      <div className="min-h-screen bg-slate-100 text-slate-900">{children}</div>
    </NextIntlClientProvider>
  );
}
