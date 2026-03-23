'use client';

import { useCallback, useMemo, useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import type { ArticleSEO, ArticleStatus, ContentCategory } from '@/types';
import type { SupabaseClient } from '@supabase/supabase-js';
import { createFallbackSlug, imageSrcOrFallback, normalizeSlugInput } from '@/lib/article-utils';
import ImageUpload from './ImageUpload';

const CATEGORY_VALUES: ContentCategory[] = ['useful-info', 'case-study', 'video', 'notice'];

const STATUSES: { value: ArticleStatus; dot: string }[] = [
  { value: 'draft', dot: 'bg-amber-400' },
  { value: 'published', dot: 'bg-emerald-500' },
  { value: 'archived', dot: 'bg-slate-400' },
];

export type PostMetaPatch = {
  title?: string;
  slug?: string;
  excerpt?: string;
  featuredImage?: string;
  category?: ContentCategory;
  tags?: string;
  status?: ArticleStatus;
  authorName?: string;
  authorDesignation?: string;
  seo?: ArticleSEO;
};

type Props = {
  supabase: SupabaseClient;
  draftId: string;
  title: string;
  slug: string;
  featuredImage: string;
  category: ContentCategory;
  tags: string;
  status: ArticleStatus;
  authorName: string;
  authorDesignation: string;
  seo: ArticleSEO;
  onChange: (patch: PostMetaPatch) => void;
};

const INPUT_CLS = 'w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primaryColor focus:bg-white focus:outline-none focus:ring-2 focus:ring-primaryColor/15 transition-all';
const LABEL_CLS = 'block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5';

function SectionHeader({
  label,
  icon,
  open,
  onToggle,
}: {
  label: string;
  icon: React.ReactNode;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center justify-between py-3 px-4 text-left hover:bg-slate-50 transition-colors"
    >
      <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
        <span className="text-slate-400">{icon}</span>
        {label}
      </span>
      <svg
        className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
        fill="none"
        stroke="currentColor"
        strokeWidth={2.5}
        viewBox="0 0 24 24"
      >
        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
      </svg>
    </button>
  );
}

export default function PostMetaForm({
  supabase,
  draftId,
  title,
  slug,
  featuredImage,
  category,
  tags,
  status,
  authorName,
  authorDesignation,
  seo,
  onChange,
}: Props) {
  const t = useTranslations('admin.meta');

  const categoryLabel = useCallback(
    (value: ContentCategory) => {
      if (value === 'useful-info') return t('categoryUsefulInfo');
      if (value === 'case-study') return t('categoryCaseStudy');
      if (value === 'video') return t('categoryVideo');
      if (value === 'notice') return t('categoryNotice');
      return value;
    },
    [t]
  );

  const statusLabel = useCallback(
    (value: ArticleStatus) => {
      if (value === 'draft') return t('statusDraft');
      if (value === 'published') return t('statusPublished');
      if (value === 'archived') return t('statusArchived');
      return value;
    },
    [t]
  );

  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    publish: true,
    media: true,
    organize: true,
    author: false,
    seo: false,
  });

  function toggle(key: string) {
    setOpenSections((s) => ({ ...s, [key]: !s[key] }));
  }

  const previewSrc = imageSrcOrFallback(featuredImage, '');

  const previewPath = useMemo(() => {
    const resolved = createFallbackSlug(slug || title);
    return `/${resolved}`;
  }, [slug, title]);

  return (
    <div className="divide-y divide-slate-100">
      {/* Publishing */}
      <div>
        <SectionHeader
          label={t('publishing')}
          open={openSections.publish}
          onToggle={() => toggle('publish')}
          icon={
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
          }
        />
        {openSections.publish && (
          <div className="px-4 pb-4 space-y-3">
            <div>
              <label className={LABEL_CLS}>{t('status')}</label>
              <div className="flex flex-col gap-1">
                {STATUSES.map((s) => (
                  <label
                    key={s.value}
                    className={`flex items-center gap-2.5 rounded-lg border px-3 py-2 cursor-pointer transition-colors ${
                      status === s.value
                        ? 'border-primaryColor bg-primaryColor/5'
                        : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="status"
                      value={s.value}
                      checked={status === s.value}
                      onChange={() => onChange({ status: s.value })}
                      className="sr-only"
                    />
                    <span className={`w-2 h-2 rounded-full flex-shrink-0 ${s.dot}`} />
                    <span className={`text-sm font-medium ${status === s.value ? 'text-primaryColor' : 'text-slate-700'}`}>
                      {statusLabel(s.value)}
                    </span>
                    {status === s.value && (
                      <svg className="w-3.5 h-3.5 text-primaryColor ml-auto" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                      </svg>
                    )}
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className={LABEL_CLS}>{t('urlSlug')}</label>
              <input
                className={`${INPUT_CLS} font-mono text-xs`}
                placeholder={t('slugPlaceholder')}
                value={slug}
                onChange={(e) => onChange({ slug: normalizeSlugInput(e.target.value) })}
              />
              <p className="mt-1 text-[10px] text-slate-400">{t('slugHint')}</p>
              <div className="mt-2 rounded-lg border border-slate-100 bg-slate-50/80 px-2.5 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-500 mb-1">
                  {t('urlPreview')}
                </p>
                <p className="min-w-0 break-all font-mono text-[11px] text-slate-700 leading-snug">
                  {previewPath}
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Featured Image */}
      <div>
        <SectionHeader
          label={t('featuredImage')}
          open={openSections.media}
          onToggle={() => toggle('media')}
          icon={
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          }
        />
        {openSections.media && (
          <div className="px-4 pb-4 space-y-2.5">
            {previewSrc ? (
              <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-slate-100 group">
                <Image src={previewSrc} alt="" fill className="object-cover" sizes="280px" />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                  <button
                    type="button"
                    onClick={() => onChange({ featuredImage: '' })}
                    className="opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1.5 rounded-lg bg-white/90 px-2.5 py-1.5 text-xs font-semibold text-red-600 shadow"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    {t('remove')}
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-200 py-6 gap-2 bg-slate-50">
                <svg className="w-7 h-7 text-slate-300" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <ImageUpload
                  supabase={supabase}
                  articleId={draftId}
                  label={t('uploadFeaturedImage')}
                  onUploaded={(url) => onChange({ featuredImage: url })}
                />
              </div>
            )}
            <input
              className={`${INPUT_CLS} text-xs`}
              placeholder={t('pasteImageUrl')}
              value={featuredImage}
              onChange={(e) => onChange({ featuredImage: e.target.value })}
            />
          </div>
        )}
      </div>

      {/* Organization */}
      <div>
        <SectionHeader
          label={t('organization')}
          open={openSections.organize}
          onToggle={() => toggle('organize')}
          icon={
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
            </svg>
          }
        />
        {openSections.organize && (
          <div className="px-4 pb-4 space-y-3">
            <div>
              <label className={LABEL_CLS}>{t('category')}</label>
              <div className="grid grid-cols-2 gap-1.5">
                {CATEGORY_VALUES.map((value) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => onChange({ category: value })}
                    className={`rounded-lg border py-2 text-xs font-medium transition-colors ${
                      category === value
                        ? 'border-primaryColor bg-primaryColor/8 text-primaryColor'
                        : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                    }`}
                  >
                    {categoryLabel(value)}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className={LABEL_CLS}>{t('tags')}</label>
              <input
                className={INPUT_CLS}
                placeholder={t('tagsPlaceholder')}
                value={tags}
                onChange={(e) => onChange({ tags: e.target.value })}
              />
              <p className="mt-1 text-[10px] text-slate-400">{t('tagsHint')}</p>
            </div>
          </div>
        )}
      </div>

      {/* Author */}
      <div>
        <SectionHeader
          label={t('author')}
          open={openSections.author}
          onToggle={() => toggle('author')}
          icon={
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          }
        />
        {openSections.author && (
          <div className="px-4 pb-4 space-y-3">
            <div>
              <label className={LABEL_CLS}>{t('authorName')}</label>
              <input
                className={INPUT_CLS}
                placeholder={t('authorNamePlaceholder')}
                value={authorName}
                onChange={(e) => onChange({ authorName: e.target.value })}
              />
            </div>
            <div>
              <label className={LABEL_CLS}>{t('authorRole')}</label>
              <input
                className={INPUT_CLS}
                placeholder={t('authorRolePlaceholder')}
                value={authorDesignation}
                onChange={(e) => onChange({ authorDesignation: e.target.value })}
              />
            </div>
          </div>
        )}
      </div>

      {/* SEO */}
      <div>
        <SectionHeader
          label={t('seo')}
          open={openSections.seo}
          onToggle={() => toggle('seo')}
          icon={
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          }
        />
        {openSections.seo && (
          <div className="px-4 pb-4 space-y-3">
            <div>
              <label className={LABEL_CLS}>{t('metaTitle')}</label>
              <input
                className={INPUT_CLS}
                placeholder={t('metaTitlePlaceholder')}
                value={seo.metaTitle ?? ''}
                onChange={(e) => onChange({ seo: { ...seo, metaTitle: e.target.value } })}
              />
              {(seo.metaTitle ?? '').length > 0 && (
                <p className={`mt-1 text-[10px] ${(seo.metaTitle ?? '').length > 60 ? 'text-amber-600' : 'text-slate-400'}`}>
                  {t('metaChars', { count: (seo.metaTitle ?? '').length })}
                </p>
              )}
            </div>
            <div>
              <label className={LABEL_CLS}>{t('metaDescription')}</label>
              <textarea
                className={`${INPUT_CLS} min-h-[80px] resize-y`}
                placeholder={t('metaDescriptionPlaceholder')}
                value={seo.metaDescription ?? ''}
                onChange={(e) => onChange({ seo: { ...seo, metaDescription: e.target.value } })}
              />
              {(seo.metaDescription ?? '').length > 0 && (
                <p className={`mt-1 text-[10px] ${(seo.metaDescription ?? '').length > 160 ? 'text-amber-600' : 'text-slate-400'}`}>
                  {t('metaDescChars', { count: (seo.metaDescription ?? '').length })}
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
