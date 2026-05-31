import 'server-only';

import { unstable_cache } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { unflattenMessages } from '@/lib/translations/flatten';
import { type Locale } from '@/i18n/routing';

function isPlainObject(v: unknown): v is Record<string, unknown> {
  return typeof v === 'object' && v !== null && !Array.isArray(v);
}

async function loadJsonFallbackMessages(
  locale: Locale
): Promise<Record<string, unknown>> {
  if (locale === 'ja') {
    return (await import('../../../messages/ja.json')).default as Record<
      string,
      unknown
    >;
  }
  return (await import('../../../messages/en.json')).default as Record<
    string,
    unknown
  >;
}

/**
 * Build English messages: prefer EN values, use JA when EN key/string is missing or blank.
 */
export function mergeEnMessagesFromJa(
  en: Record<string, unknown>,
  ja: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...en };

  for (const key of Object.keys(ja)) {
    const jaVal = ja[key];
    const enVal = out[key];

    if (enVal === undefined) {
      out[key] = jaVal;
      continue;
    }

    if (typeof enVal === 'string' && typeof jaVal === 'string') {
      if (enVal.trim() === '' && jaVal.length > 0) {
        out[key] = jaVal;
      }
      continue;
    }

    if (Array.isArray(enVal) && Array.isArray(jaVal)) {
      out[key] = enVal.map((item, i) => {
        const j = jaVal[i];
        if (typeof item === 'string' && typeof j === 'string') {
          if (item.trim() === '' && j.length > 0) return j;
          return item;
        }
        if (isPlainObject(item) && isPlainObject(j)) {
          return mergeEnMessagesFromJa(
            item as Record<string, unknown>,
            j as Record<string, unknown>
          );
        }
        if (item === undefined && j !== undefined) {
          return j;
        }
        return item;
      });
      continue;
    }

    if (isPlainObject(enVal) && isPlainObject(jaVal)) {
      out[key] = mergeEnMessagesFromJa(
        enVal as Record<string, unknown>,
        jaVal as Record<string, unknown>
      );
    }
  }

  return out;
}

/** JSON provides new keys; DB values win on conflicts (editor updates). */
export function mergeDbOverJson(
  json: Record<string, unknown>,
  db: Record<string, unknown>
): Record<string, unknown> {
  const out: Record<string, unknown> = { ...json };

  for (const key of Object.keys(db)) {
    const dbVal = db[key];
    const jsonVal = out[key];

    if (isPlainObject(dbVal) && isPlainObject(jsonVal)) {
      out[key] = mergeDbOverJson(
        jsonVal as Record<string, unknown>,
        dbVal as Record<string, unknown>
      );
      continue;
    }

    out[key] = dbVal;
  }

  return out;
}

async function loadMessagesFromDbOrFallback(
  locale: Locale
): Promise<Record<string, unknown>> {
  const json = await loadJsonFallbackMessages(locale);

  try {
    const rows = await prisma.translation.findMany({
      where: { locale, isOrphaned: false },
      select: { keyPath: true, value: true },
    });
    if (rows.length === 0) {
      return json;
    }
    const db = unflattenMessages(rows) as Record<string, unknown>;
    return mergeDbOverJson(json, db);
  } catch {
    return json;
  }
}

/**
 * Cached message bundle for one locale (public site + admin base copy).
 */
export function getCachedMessagesForLocale(locale: Locale) {
  return unstable_cache(
    async () => loadMessagesFromDbOrFallback(locale),
    ['translations-db', locale, 'v2'],
    { tags: [`translations-${locale}`] }
  );
}

export async function loadMessagesForLocale(
  locale: Locale
): Promise<Record<string, unknown>> {
  const cached = getCachedMessagesForLocale(locale);
  const messages = await cached();

  if (locale === 'en') {
    const jaCached = getCachedMessagesForLocale('ja');
    const jaMessages = await jaCached();
    return mergeEnMessagesFromJa(messages, jaMessages);
  }

  return messages;
}
