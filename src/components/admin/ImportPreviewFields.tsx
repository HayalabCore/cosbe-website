// src/components/admin/ImportPreviewFields.tsx
'use client';

import dynamic from 'next/dynamic';
import { useTranslations } from 'next-intl';
import CaseStudyMetaFields from '@/components/admin/CaseStudyMetaFields';
import type { ImportPreviewPayload } from '@/lib/legacy-import/types';
import type { CaseStudyMeta } from '@/types';

const BlockRenderer = dynamic(
  () => import('@/components/article/BlockRenderer'),
  { ssr: false }
);

const emptyCaseStudy: CaseStudyMeta = { aiModels: [] };

export function isoToDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  const tzOffset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
}

export function blockSummary(blocks: ImportPreviewPayload['blocks']) {
  return {
    blocks: blocks.length,
    images: blocks.filter((b) => b.type === 'image').length,
    tables: blocks.filter((b) => b.type === 'table').length,
    callouts: blocks.filter((b) => b.type === 'callout').length,
  };
}

type ImportPreviewFieldsProps = {
  value: ImportPreviewPayload;
  onChange: (patch: Partial<ImportPreviewPayload>) => void;
  onValidateSlug?: (slug: string) => void;
};

export default function ImportPreviewFields({
  value,
  onChange,
  onValidateSlug,
}: ImportPreviewFieldsProps) {
  const t = useTranslations('admin.import');
  const summary = blockSummary(value.blocks);
  const tagsStr = value.tags.join(', ');

  return (
    <div className="grid lg:grid-cols-2 gap-8">
      <div className="space-y-4">
        <div>
          <span className="inline-flex rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">
            {value.category}
          </span>
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
            {t('fieldTitle')}
          </label>
          <input
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            value={value.title}
            onChange={(e) => onChange({ title: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
            {t('fieldSlug')}
          </label>
          <input
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm font-mono"
            value={value.slug}
            onChange={(e) => onChange({ slug: e.target.value })}
            onBlur={(e) => onValidateSlug?.(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
            {t('fieldExcerpt')}
          </label>
          <textarea
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm min-h-[80px]"
            value={value.excerpt}
            onChange={(e) => onChange({ excerpt: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold uppercase text-slate-500 mb-1">
            {t('fieldPublishedAt')}
          </label>
          <input
            type="datetime-local"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
            value={isoToDatetimeLocal(value.publishedAt)}
            onChange={(e) =>
              onChange({
                publishedAt: e.target.value
                  ? new Date(e.target.value).toISOString()
                  : value.publishedAt,
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
              onChange({
                tags: e.target.value
                  .split(',')
                  .map((s) => s.trim())
                  .filter(Boolean),
              })
            }
          />
        </div>

        {value.featuredImageRemoteUrl && (
          <div>
            <p className="text-xs font-semibold uppercase text-slate-500 mb-2">
              {t('featuredImage')}
            </p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={value.featuredImageRemoteUrl}
              alt=""
              className="max-h-40 rounded-lg border border-slate-200 object-contain"
            />
            <p className="mt-1 text-xs text-slate-400">
              {t('featuredImageNote')}
            </p>
          </div>
        )}

        {value.category === 'case-study' && (
          <div className="rounded-xl border border-slate-200 bg-white p-4">
            <CaseStudyMetaFields
              value={value.caseStudyMeta ?? emptyCaseStudy}
              onChange={(patch) =>
                onChange({
                  caseStudyMeta: {
                    ...(value.caseStudyMeta ?? emptyCaseStudy),
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
            {value.title}
          </h2>
          {value.excerpt ? (
            <p className="text-sm text-slate-600 leading-relaxed">
              {value.excerpt}
            </p>
          ) : (
            <p className="text-sm text-slate-400 italic">{t('noExcerpt')}</p>
          )}
          {value.tags.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {value.tags.map((tag) => (
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
          {value.blocks.map((block) => (
            <BlockRenderer key={block.id} block={block} />
          ))}
        </div>
      </div>
    </div>
  );
}
