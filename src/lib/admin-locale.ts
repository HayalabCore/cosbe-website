export const ADMIN_LOCALE_COOKIE = 'admin_locale';

export type AdminLocale = 'en' | 'ja';

export function parseAdminLocale(value: string | undefined): AdminLocale {
  return value === 'ja' ? 'ja' : 'en';
}
