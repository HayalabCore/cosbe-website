'use server';

import { revalidateTag } from 'next/cache';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { prisma } from '@/lib/prisma';
import { translateToEnglish } from '@/lib/openai-translate';
import { namespaceFromKeyPath } from '@/lib/translations/flatten';

const LOCALES = ['ja', 'en'] as const;
export type TranslationLocale = (typeof LOCALES)[number];

async function requireUser() {
  const supabase = await createServerSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error('Unauthorized');
  return user;
}

function assertValidKeyPath(keyPath: string) {
  if (!keyPath || keyPath.length > 512) {
    throw new Error('Invalid key path');
  }
  if (!/^[a-zA-Z0-9_.-]+$/.test(keyPath)) {
    throw new Error('Invalid key path characters');
  }
}

function assertLocale(locale: string): asserts locale is TranslationLocale {
  if (!LOCALES.includes(locale as TranslationLocale)) {
    throw new Error('Invalid locale');
  }
}

export async function listTranslationNamespaces(): Promise<string[]> {
  await requireUser();
  try {
    const rows = await prisma.translation.findMany({
      distinct: ['namespace'],
      select: { namespace: true },
      orderBy: { namespace: 'asc' },
    });
    return rows.map((r) => r.namespace);
  } catch {
    return [];
  }
}

export type TranslationPairRow = {
  keyPath: string;
  ja: string;
  en: string;
  updatedAtJa: string | null;
  updatedAtEn: string | null;
};

function groupLocaleRows(
  rows: Array<{
    keyPath: string;
    locale: string;
    value: string;
    updatedAt: Date;
  }>
): TranslationPairRow[] {
  const map = new Map<
    string,
    { ja?: string; en?: string; updatedAtJa?: Date; updatedAtEn?: Date }
  >();
  for (const r of rows) {
    let e = map.get(r.keyPath);
    if (!e) {
      e = {};
      map.set(r.keyPath, e);
    }
    if (r.locale === 'ja') {
      e.ja = r.value;
      e.updatedAtJa = r.updatedAt;
    } else if (r.locale === 'en') {
      e.en = r.value;
      e.updatedAtEn = r.updatedAt;
    }
  }
  return [...map.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([keyPath, v]) => ({
      keyPath,
      ja: v.ja ?? '',
      en: v.en ?? '',
      updatedAtJa: v.updatedAtJa?.toISOString() ?? null,
      updatedAtEn: v.updatedAtEn?.toISOString() ?? null,
    }));
}

export async function listTranslationRowsForNamespace(
  namespace: string
): Promise<TranslationPairRow[]> {
  await requireUser();
  if (!namespace || namespace.length > 200) {
    throw new Error('Invalid namespace');
  }
  try {
    const rows = await prisma.translation.findMany({
      where: { namespace, locale: { in: [...LOCALES] } },
      orderBy: [{ keyPath: 'asc' }, { locale: 'asc' }],
      select: { keyPath: true, locale: true, value: true, updatedAt: true },
    });
    return groupLocaleRows(rows);
  } catch {
    return [];
  }
}

export async function searchTranslationRows(
  query: string,
  limit = 500
): Promise<TranslationPairRow[]> {
  await requireUser();
  const q = query.trim();
  if (q.length < 1) {
    return [];
  }
  try {
    const matches = await prisma.translation.findMany({
      where: {
        OR: [
          { keyPath: { contains: q, mode: 'insensitive' } },
          { value: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: { keyPath: true },
      take: limit * 2,
    });
    const uniqueKeys = [...new Set(matches.map((m) => m.keyPath))].slice(
      0,
      limit
    );
    if (uniqueKeys.length === 0) {
      return [];
    }
    const rows = await prisma.translation.findMany({
      where: { keyPath: { in: uniqueKeys }, locale: { in: [...LOCALES] } },
      orderBy: [{ keyPath: 'asc' }, { locale: 'asc' }],
      select: { keyPath: true, locale: true, value: true, updatedAt: true },
    });
    return groupLocaleRows(rows);
  } catch {
    return [];
  }
}

export async function saveTranslation(input: {
  keyPath: string;
  locale: string;
  value: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    const user = await requireUser();
    assertValidKeyPath(input.keyPath);
    assertLocale(input.locale);
    const value = input.value;
    if (value.length > 50_000) {
      throw new Error('Value too long');
    }

    const namespace = namespaceFromKeyPath(input.keyPath);

    await prisma.$transaction(async (tx) => {
      const existing = await tx.translation.findUnique({
        where: {
          keyPath_locale: { keyPath: input.keyPath, locale: input.locale },
        },
      });

      if (!existing) {
        throw new Error(
          'Unknown translation key. Add it to messages/*.json and run yarn db:seed-translations.'
        );
      }

      if (existing.value !== value) {
        await tx.translationHistory.create({
          data: {
            keyPath: input.keyPath,
            locale: input.locale,
            previousValue: existing.value,
            changedBy: user.email ?? user.id,
          },
        });
      }

      await tx.translation.update({
        where: {
          keyPath_locale: { keyPath: input.keyPath, locale: input.locale },
        },
        data: {
          value,
          namespace,
          updatedBy: user.email ?? user.id,
        },
      });
    });

    revalidateTag(`translations-${input.locale}`, 'default');
    if (input.locale === 'ja') {
      revalidateTag('translations-en', 'default');
    }
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Save failed';
    return { ok: false, error: message };
  }
}

export type TranslationHistoryItem = {
  id: string;
  previousValue: string;
  changedBy: string | null;
  changedAt: string;
};

export async function getTranslationHistory(input: {
  keyPath: string;
  locale: string;
  limit?: number;
}): Promise<TranslationHistoryItem[]> {
  await requireUser();
  assertValidKeyPath(input.keyPath);
  assertLocale(input.locale);
  const limit = Math.min(input.limit ?? 10, 50);
  try {
    const rows = await prisma.translationHistory.findMany({
      where: { keyPath: input.keyPath, locale: input.locale },
      orderBy: { changedAt: 'desc' },
      take: limit,
      select: {
        id: true,
        previousValue: true,
        changedBy: true,
        changedAt: true,
      },
    });
    return rows.map((r) => ({
      id: r.id,
      previousValue: r.previousValue,
      changedBy: r.changedBy,
      changedAt: r.changedAt.toISOString(),
    }));
  } catch {
    return [];
  }
}

export async function translateKeyToEnglish(input: {
  keyPath: string;
}): Promise<{ ok: true; en: string } | { ok: false; error: string }> {
  try {
    await requireUser();
    assertValidKeyPath(input.keyPath);

    const jaRow = await prisma.translation.findUnique({
      where: { keyPath_locale: { keyPath: input.keyPath, locale: 'ja' } },
    });
    if (!jaRow) {
      throw new Error('No Japanese source row for this key');
    }

    const en = await translateToEnglish(jaRow.value);
    const save = await saveTranslation({
      keyPath: input.keyPath,
      locale: 'en',
      value: en,
    });
    if (!save.ok) {
      throw new Error(save.error);
    }
    return { ok: true, en };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Translation failed';
    return { ok: false, error: message };
  }
}

export async function deleteTranslationHistoryItem(input: {
  historyId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireUser();
    if (!input.historyId) throw new Error('Invalid history ID');
    await prisma.translationHistory.delete({
      where: { id: input.historyId },
    });
    return { ok: true };
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Delete failed';
    return { ok: false, error: message };
  }
}

export async function restoreTranslation(input: {
  historyId: string;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  try {
    await requireUser();
    const row = await prisma.translationHistory.findUnique({
      where: { id: input.historyId },
    });
    if (!row) {
      throw new Error('History entry not found');
    }
    assertLocale(row.locale);
    return await saveTranslation({
      keyPath: row.keyPath,
      locale: row.locale,
      value: row.previousValue,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Restore failed';
    return { ok: false, error: message };
  }
}
