'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';
import {
  checkImportSlugAction,
  commitImportAction,
  previewImportAction,
} from '@/actions/legacy-import';
import { LEGACY_HOST, PATH_SEGMENT_TO_CATEGORY } from '@/lib/legacy-import';
import type { ImportPreviewPayload } from '@/lib/legacy-import/types';
import ImportPreviewFields from '@/components/admin/ImportPreviewFields';

type Step = 'idle' | 'fetching' | 'previewing' | 'committing' | 'error';

function detectCategory(url: string): string | null {
  try {
    const parsed = new URL(url.trim());
    if (parsed.hostname !== LEGACY_HOST) return null;
    const segment = parsed.pathname.split('/').filter(Boolean)[0] ?? '';
    return PATH_SEGMENT_TO_CATEGORY[segment] ?? null;
  } catch {
    return null;
  }
}

export default function ImportClient() {
  const t = useTranslations('admin.import');
  const tb = useTranslations('admin.bulkImport');
  const router = useRouter();
  const [step, setStep] = useState<Step>('idle');
  const [url, setUrl] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [payload, setPayload] = useState<ImportPreviewPayload | null>(null);

  const detectedCategory = useMemo(() => detectCategory(url), [url]);
  const canFetch = Boolean(detectedCategory && url.trim());

  async function handleFetch() {
    if (!canFetch) return;
    setStep('fetching');
    setError(null);
    try {
      const result = await previewImportAction(url.trim());
      setPayload(result);
      setStep('previewing');
    } catch (e) {
      setError(e instanceof Error ? e.message : t('fetchFailed'));
      setStep('error');
    }
  }

  async function handleCommit() {
    if (!payload) return;
    setStep('committing');
    setError(null);
    try {
      const { id } = await commitImportAction(payload);
      router.replace(`/admin/posts/${id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : t('commitFailed'));
      setStep('previewing');
    }
  }

  function updatePayload(patch: Partial<ImportPreviewPayload>) {
    setPayload((prev) => (prev ? { ...prev, ...patch } : prev));
  }

  async function validateSlug(slug: string) {
    const trimmed = slug.trim();
    if (!trimmed) return;
    try {
      const available = await checkImportSlugAction(trimmed);
      updatePayload({ slugCollision: !available });
    } catch {
      /* keep current collision state on network error */
    }
  }

  if (step === 'previewing' || step === 'committing') {
    if (!payload) return null;

    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <h1 className="text-2xl font-bold text-slate-900 mb-2">
          {t('previewTitle')}
        </h1>
        <p className="text-sm text-slate-500 mb-6">{payload.sourceUrl}</p>

        {payload.warnings.length > 0 && (
          <div className="mb-6 rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
            <p className="font-semibold mb-1">{t('warningsTitle')}</p>
            <ul className="list-disc pl-5 space-y-1">
              {payload.warnings.map((w) => (
                <li key={w}>{w}</li>
              ))}
            </ul>
          </div>
        )}

        {payload.slugCollision && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
            {t('slugCollision')}
          </div>
        )}

        <ImportPreviewFields
          value={payload}
          onChange={updatePayload}
          onValidateSlug={(slug) => void validateSlug(slug)}
        />

        <div className="mt-8 flex flex-wrap gap-3">
          <button
            type="button"
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            disabled={step === 'committing'}
            onClick={() => {
              setPayload(null);
              setStep('idle');
            }}
          >
            {t('cancel')}
          </button>
          <button
            type="button"
            className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            disabled={step === 'committing'}
            onClick={() => void handleFetch()}
          >
            {t('refetch')}
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-lg bg-primaryColor px-4 py-2 text-sm font-semibold text-white hover:bg-primaryHover disabled:opacity-50"
            disabled={step === 'committing' || payload.slugCollision}
            onClick={() => void handleCommit()}
          >
            {step === 'committing' ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                {t('committing')}
              </>
            ) : (
              t('createDraft')
            )}
          </button>
        </div>

        {error && (
          <p className="mt-4 text-sm text-red-600" role="alert">
            {error}
          </p>
        )}
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-10">
      <div className="flex items-center justify-between mb-2">
        <h1 className="text-2xl font-bold text-slate-900">{t('title')}</h1>
        <Link
          href="/admin/import/bulk"
          className="text-sm font-semibold text-primaryColor hover:text-primaryHover"
        >
          {tb('multipleLink')}
        </Link>
      </div>
      <p className="text-sm text-slate-500 mb-8">{t('description')}</p>

      <label className="block text-xs font-semibold uppercase text-slate-500 mb-2">
        {t('urlLabel')}
      </label>
      <input
        type="url"
        className="w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm mb-2"
        placeholder={`https://${LEGACY_HOST}/useful-info/example/`}
        value={url}
        onChange={(e) => setUrl(e.target.value)}
      />
      {detectedCategory ? (
        <p className="text-xs text-emerald-700 mb-4">
          {t('detectedCategory', { category: detectedCategory })}
        </p>
      ) : url.trim() ? (
        <p className="text-xs text-red-600 mb-4">{t('invalidUrl')}</p>
      ) : null}

      {step === 'error' && error && (
        <div className="mb-4 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
          {error}
        </div>
      )}

      <button
        type="button"
        disabled={!canFetch || step === 'fetching'}
        onClick={() => void handleFetch()}
        className="rounded-lg bg-primaryColor px-4 py-2.5 text-sm font-semibold text-white hover:bg-primaryHover disabled:opacity-50"
      >
        {step === 'fetching' ? t('fetching') : t('fetchPreview')}
      </button>
    </div>
  );
}
