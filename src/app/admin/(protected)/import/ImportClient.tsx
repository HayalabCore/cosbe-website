'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { Loader2 } from 'lucide-react';
import dynamic from 'next/dynamic';
import {
  checkImportSlugAction,
  commitImportAction,
  previewImportAction,
} from '@/actions/legacy-import';
import { LEGACY_HOST, PATH_SEGMENT_TO_CATEGORY } from '@/lib/legacy-import';
import type { ImportPreviewPayload } from '@/lib/legacy-import/types';
import CaseStudyMetaFields from '@/components/admin/CaseStudyMetaFields';
import type { CaseStudyMeta } from '@/types';

const BlockRenderer = dynamic(
  () => import('@/components/article/BlockRenderer'),
  { ssr: false }
);

type Step = 'idle' | 'fetching' | 'previewing' | 'committing' | 'error';

const emptyCaseStudy: CaseStudyMeta = { aiModels: [] };

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

function isoToDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  const tzOffset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
}

function blockSummary(blocks: ImportPreviewPayload['blocks']) {
  const counts = {
    blocks: blocks.length,
    images: blocks.filter((b) => b.type === 'image').length,
    tables: blocks.filter((b) => b.type === 'table').length,
    callouts: blocks.filter((b) => b.type === 'callout').length,
  };
  return counts;
}

export default function ImportClient() {
  const t = useTranslations('admin.import');
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
    const summary = blockSummary(payload.blocks);
    const tagsStr = payload.tags.join(', ');

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

        <div className="grid lg:grid-cols-2 gap-8">
          <div className="space-y-4">
            <div>
              <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
                {payload.category}
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                {t('fieldTitle')}
              </label>
              <input
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={payload.title}
                onChange={(e) => updatePayload({ title: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                {t('fieldSlug')}
              </label>
              <input
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono"
                value={payload.slug}
                onChange={(e) => updatePayload({ slug: e.target.value })}
                onBlur={(e) => void validateSlug(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                {t('fieldExcerpt')}
              </label>
              <textarea
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm min-h-[80px]"
                value={payload.excerpt}
                onChange={(e) => updatePayload({ excerpt: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                {t('fieldPublishedAt')}
              </label>
              <input
                type="datetime-local"
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={isoToDatetimeLocal(payload.publishedAt)}
                onChange={(e) =>
                  updatePayload({
                    publishedAt: e.target.value
                      ? new Date(e.target.value).toISOString()
                      : payload.publishedAt,
                  })
                }
              />
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
                {t('fieldTags')}
              </label>
              <input
                className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
                value={tagsStr}
                onChange={(e) =>
                  updatePayload({
                    tags: e.target.value
                      .split(',')
                      .map((s) => s.trim())
                      .filter(Boolean),
                  })
                }
              />
            </div>

            {payload.featuredImageRemoteUrl && (
              <div>
                <p className="text-xs font-semibold uppercase text-slate-500 mb-2">
                  {t('featuredImage')}
                </p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={payload.featuredImageRemoteUrl}
                  alt=""
                  className="max-h-40 rounded-lg border border-slate-200 object-contain"
                />
                <p className="mt-1 text-xs text-slate-400">
                  {t('featuredImageNote')}
                </p>
              </div>
            )}

            {payload.category === 'case-study' && (
              <div className="rounded-xl border border-slate-200 bg-white p-4">
                <CaseStudyMetaFields
                  value={payload.caseStudyMeta ?? emptyCaseStudy}
                  onChange={(patch) =>
                    updatePayload({
                      caseStudyMeta: {
                        ...(payload.caseStudyMeta ?? emptyCaseStudy),
                        ...patch,
                      },
                    })
                  }
                />
              </div>
            )}
          </div>

          <div>
            <p className="text-xs font-semibold uppercase text-slate-500 mb-2">
              {t('listingPreview')}
            </p>
            <div className="rounded-xl border border-slate-200 bg-white p-6 mb-4">
              <h2 className="text-lg font-bold text-slate-900 mb-2">
                {payload.title}
              </h2>
              {payload.excerpt ? (
                <p className="text-sm text-slate-600 leading-relaxed">
                  {payload.excerpt}
                </p>
              ) : (
                <p className="text-sm text-slate-400 italic">
                  {t('noExcerpt')}
                </p>
              )}
              {payload.tags.length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {payload.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-medium text-slate-700"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>

            <p className="text-xs font-semibold uppercase text-slate-500 mb-2">
              {t('bodyPreview')}
            </p>
            <p className="text-sm text-slate-600 mb-3">
              {t('blockSummary', {
                blocks: summary.blocks,
                images: summary.images,
                tables: summary.tables,
                callouts: summary.callouts,
              })}
            </p>
            <div className="rounded-xl border border-slate-200 bg-white p-6 max-h-[70vh] overflow-y-auto">
              {payload.blocks.map((block) => (
                <BlockRenderer key={block.id} block={block} />
              ))}
            </div>
          </div>
        </div>

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
      <h1 className="text-2xl font-bold text-slate-900 mb-2">{t('title')}</h1>
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
