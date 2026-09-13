import { beforeEach, describe, expect, it, vi } from 'vitest';
import { authed, unauth } from '@/test/authz';

vi.mock('@/lib/authz', () => ({
  requirePermission: vi.fn(),
  requireAnyPermission: vi.fn(),
  requireActiveSession: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

const translateToEnglish = vi.fn();
vi.mock('@/lib/openai-translate', () => ({
  translateToEnglish: (...a: unknown[]) => translateToEnglish(...a),
}));

vi.mock('@/lib/prisma', () => {
  const translation = {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    update: vi.fn(),
  };
  const translationHistory = {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    delete: vi.fn(),
  };
  const tx = { translation, translationHistory };
  return {
    prisma: {
      translation,
      translationHistory,
      $transaction: vi.fn(async (fn: (t: typeof tx) => unknown) => fn(tx)),
    },
  };
});

import {
  deleteTranslationHistoryItem,
  getTranslationHistory,
  listTranslationNamespaces,
  listTranslationRowsForNamespace,
  restoreTranslation,
  saveTranslation,
  searchTranslationRows,
  translateKeyToEnglish,
} from './translations';
import { prisma } from '@/lib/prisma';

describe('translation actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    authed();
  });

  it('list/search throw Unauthorized when logged out', async () => {
    unauth();
    await expect(listTranslationNamespaces()).rejects.toThrow('Unauthorized');
    await expect(listTranslationRowsForNamespace('nav')).rejects.toThrow(
      'Unauthorized'
    );
    await expect(searchTranslationRows('q')).rejects.toThrow('Unauthorized');
    await expect(
      getTranslationHistory({ keyPath: 'a.b', locale: 'ja' })
    ).rejects.toThrow('Unauthorized');
  });

  it('mutating actions return ok:false Unauthorized when logged out', async () => {
    unauth();
    await expect(
      saveTranslation({ keyPath: 'a.b', locale: 'en', value: 'x' })
    ).resolves.toEqual({ ok: false, error: 'Unauthorized' });
    await expect(translateKeyToEnglish({ keyPath: 'a.b' })).resolves.toEqual({
      ok: false,
      error: 'Unauthorized',
    });
    await expect(
      deleteTranslationHistoryItem({ historyId: 'h1' })
    ).resolves.toEqual({ ok: false, error: 'Unauthorized' });
    await expect(restoreTranslation({ historyId: 'h1' })).resolves.toEqual({
      ok: false,
      error: 'Unauthorized',
    });
  });

  it('saveTranslation returns ok when the key exists', async () => {
    vi.mocked(prisma.translation.findUnique).mockResolvedValue({
      value: 'old',
      keyPath: 'nav.home',
      locale: 'en',
    } as never);
    vi.mocked(prisma.translation.update).mockResolvedValue({} as never);
    vi.mocked(prisma.translationHistory.create).mockResolvedValue({} as never);
    await expect(
      saveTranslation({ keyPath: 'nav.home', locale: 'en', value: 'Home' })
    ).resolves.toEqual({ ok: true });
  });

  it('saveTranslation returns error for unknown keys', async () => {
    vi.mocked(prisma.translation.findUnique).mockResolvedValue(null);
    const res = await saveTranslation({
      keyPath: 'nav.home',
      locale: 'en',
      value: 'Home',
    });
    expect(res.ok).toBe(false);
  });

  it('translateKeyToEnglish uses mocked OpenAI', async () => {
    vi.mocked(prisma.translation.findUnique)
      .mockResolvedValueOnce({ value: 'こんにちは' } as never)
      .mockResolvedValueOnce({
        value: 'old',
        keyPath: 'nav.home',
        locale: 'en',
      } as never);
    vi.mocked(prisma.translation.update).mockResolvedValue({} as never);
    translateToEnglish.mockResolvedValue('Hello');
    await expect(
      translateKeyToEnglish({ keyPath: 'nav.home' })
    ).resolves.toEqual({
      ok: true,
      en: 'Hello',
    });
  });

  it('translateKeyToEnglish returns the OpenAI error', async () => {
    vi.mocked(prisma.translation.findUnique).mockResolvedValue({
      value: 'こんにちは',
    } as never);
    translateToEnglish.mockRejectedValue(new Error('quota'));
    await expect(
      translateKeyToEnglish({ keyPath: 'nav.home' })
    ).resolves.toEqual({
      ok: false,
      error: 'quota',
    });
  });

  it('restoreTranslation returns not-found for missing history', async () => {
    vi.mocked(prisma.translationHistory.findUnique).mockResolvedValue(null);
    await expect(restoreTranslation({ historyId: 'missing' })).resolves.toEqual(
      {
        ok: false,
        error: 'History entry not found',
      }
    );
  });

  it('listTranslationNamespaces returns distinct namespaces', async () => {
    vi.mocked(prisma.translation.findMany).mockResolvedValue([
      { namespace: 'nav' },
      { namespace: 'footer' },
    ] as never);
    await expect(listTranslationNamespaces()).resolves.toEqual([
      'nav',
      'footer',
    ]);
  });

  it('getTranslationHistory maps rows to ISO dates', async () => {
    vi.mocked(prisma.translationHistory.findMany).mockResolvedValue([
      {
        id: 'h1',
        previousValue: 'old',
        changedBy: 'admin@test.local',
        changedAt: new Date('2026-01-01T00:00:00.000Z'),
      },
    ] as never);
    await expect(
      getTranslationHistory({ keyPath: 'nav.home', locale: 'en' })
    ).resolves.toEqual([
      {
        id: 'h1',
        previousValue: 'old',
        changedBy: 'admin@test.local',
        changedAt: '2026-01-01T00:00:00.000Z',
      },
    ]);
  });

  it('deleteTranslationHistoryItem deletes the row', async () => {
    vi.mocked(prisma.translationHistory.delete).mockResolvedValue({} as never);
    await expect(
      deleteTranslationHistoryItem({ historyId: 'h1' })
    ).resolves.toEqual({ ok: true });
    expect(prisma.translationHistory.delete).toHaveBeenCalledWith({
      where: { id: 'h1' },
    });
  });

  it('deleteTranslationHistoryItem fails without translations.history.delete', async () => {
    authed(['translations.edit']);
    const res = await deleteTranslationHistoryItem({ historyId: 'h1' });
    expect(res.ok).toBe(false);
  });
});
