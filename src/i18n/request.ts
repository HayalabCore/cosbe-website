import { getRequestConfig } from 'next-intl/server';
import { routing, type Locale } from './routing';
import { loadMessagesForLocale } from '@/lib/translations/load-messages';

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  if (!locale || !routing.locales.includes(locale as Locale)) {
    locale = routing.defaultLocale;
  }

  const validLocale = locale as Locale;
  const messages = await loadMessagesForLocale(validLocale);

  return {
    locale: validLocale,
    messages,
    getMessageFallback({ namespace, key }) {
      return `[${namespace ? `${namespace}.` : ''}${key}]`;
    },
  };
});
