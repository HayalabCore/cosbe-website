import type { Metadata } from 'next';
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { notFound } from 'next/navigation';
import { routing, type Locale } from '@/i18n/routing';
import { Navbar, Footer } from '@/components';
import LocaleHtmlLang from '@/components/shared/LocaleHtmlLang';

export const metadata: Metadata = {
  keywords: [
    'AI',
    'transformation',
    'consulting',
    'business',
    'innovation',
    'CosBE',
  ],
  openGraph: {
    type: 'website',
    siteName: 'CosBE',
    locale: 'en_US',
  },
};

export function generateStaticParams() {
  return routing.locales.map((locale) => ({ locale }));
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;

  // Ensure that the incoming `locale` is valid
  if (!routing.locales.includes(locale as Locale)) {
    notFound();
  }

  // Providing all messages to the client
  // side is the easiest way to get started
  const messages = await getMessages();

  return (
    <NextIntlClientProvider messages={messages}>
      <LocaleHtmlLang locale={locale} />
      <Navbar />
      {children}
      <Footer />
    </NextIntlClientProvider>
  );
}
