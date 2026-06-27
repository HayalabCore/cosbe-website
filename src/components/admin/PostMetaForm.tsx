'use client';

import { useCallback, useMemo, useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import type {
  ArticleSEO,
  ArticleStatus,
  CaseStudyMeta,
  ContentCategory,
} from '@/types';
import {
  createFallbackSlug,
  imageSrcOrFallback,
  normalizeSlugInput,
} from '@/lib/article-utils';
import ImageUpload from './ImageUpload';
import CaseStudyMetaFields from './CaseStudyMetaFields';
import ArticleTranslatePanel from './ArticleTranslatePanel';

const CATEGORY_VALUES: ContentCategory[] = [
  'useful-info',
  'case-study',
  'video',
  'notice',
];

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
  publishedAt?: string | null;
  authorName?: string;
  authorDesignation?: string;
  seo?: ArticleSEO;
  caseStudy?: Partial<CaseStudyMeta>;
};

type Props = {
  title: string;
  slug: string;
  featuredImage: string;
  category: ContentCategory;
  tags: string;
  status: ArticleStatus;
  publishedAt: string | null;
  authorName: string;
  authorDesignation: string;
  seo: ArticleSEO;
  caseStudy: CaseStudyMeta;
  sourceUrl?: string | null;
  onChange: (patch: PostMetaPatch) => void;
  onTranslateArticle?: () => void;
  translatingArticle?: boolean;
  canTranslateArticle?: boolean;
  articleLocaleTab?: 'original' | 'english';
  onArticleLocaleTabChange?: (tab: 'original' | 'english') => void;
};

const INPUT_CLS =
  'w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primaryColor focus:bg-white focus:outline-none focus:ring-2 focus:ring-primaryColor/15 transition-all';
const LABEL_CLS =
  'block text-[11px] font-semibold uppercase tracking-wide text-slate-500 mb-1.5';

function SectionHeader({
  label,
  icon,
  open,
  onToggle,
  summary,
}: {
  label: string;
  icon: React.ReactNode;
  open: boolean;
  onToggle: () => void;
  summary?: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="w-full flex items-center justify-between gap-2 py-3 px-4 text-left hover:bg-slate-50 transition-colors"
    >
      <span className="flex min-w-0 items-center gap-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
        <span className="text-slate-400 flex-shrink-0">{icon}</span>
        <span className="truncate">{label}</span>
      </span>
      <span className="flex flex-shrink-0 items-center gap-1.5 min-w-0">
        {!open && summary ? (
          <span className="flex max-w-[96px] min-w-0 items-center truncate text-[11px] font-normal normal-case tracking-normal text-slate-400">
            {summary}
          </span>
        ) : null}
        <svg
          className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-150 ${open ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          strokeWidth={2.5}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </span>
    </button>
  );
}

/** ISO → `datetime-local` input value (local timezone). */
function isoToDatetimeLocal(iso: string): string {
  const d = new Date(iso);
  const tzOffset = d.getTimezoneOffset() * 60000;
  return new Date(d.getTime() - tzOffset).toISOString().slice(0, 16);
}

/** `datetime-local` input value → ISO string (UTC). */
function datetimeLocalToIso(value: string): string {
  return new Date(value).toISOString();
}

export default function PostMetaForm({
  title,
  slug,
  featuredImage,
  category,
  tags,
  status,
  publishedAt,
  authorName,
  authorDesignation,
  seo,
  caseStudy,
  sourceUrl,
  onChange,
  onTranslateArticle,
  translatingArticle = false,
  canTranslateArticle = false,
  articleLocaleTab = 'original',
  onArticleLocaleTabChange,
}: Props) {
  const t = useTranslations('admin.meta');
  const tCs = useTranslations('admin.caseStudyMeta');
  const tEditor = useTranslations('admin.editor');
  const tLocale = useTranslations('admin.blockLocale');

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
    caseStudy: true,
    author: true,
    seo: true,
  });

  function toggle(key: string) {
    setOpenSections((s) => ({ ...s, [key]: !s[key] }));
  }

  const previewSrc = imageSrcOrFallback(featuredImage, '');

  const previewPath = useMemo(() => {
    const resolved = createFallbackSlug(slug || title);
    return `/${resolved}`;
  }, [slug, title]);

  const slugSummary = slug.trim() || createFallbackSlug(title).slice(0, 20);

  return (
    <div>
      {sourceUrl && (
        <a
          href={sourceUrl}
          target="_blank"
          rel="noopener noreferrer"
          title={sourceUrl}
          className="flex items-center gap-1.5 border-b border-slate-100 bg-slate-50/60 px-4 py-2.5 text-[11px] text-slate-500 hover:text-primaryColor transition-colors"
        >
          <svg
            className="w-3.5 h-3.5 flex-shrink-0"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
            />
          </svg>
          <span className="truncate">
            {tEditor('importedFrom')}:{' '}
            <span className="font-mono">{sourceUrl}</span>
          </span>
        </a>
      )}

      {/* Sticky essentials — always visible while scrolling sidebar */}
      <div className="sticky top-0 z-10 border-b border-slate-100 bg-white/95 px-4 py-3 backdrop-blur-sm space-y-2.5">
        <div>
          <p className={LABEL_CLS}>{t('status')}</p>
          <div className="grid grid-cols-3 gap-0.5 rounded-lg border border-slate-200 bg-slate-50 p-0.5">
            {STATUSES.map((s) => (
              <button
                key={s.value}
                type="button"
                onClick={() => onChange({ status: s.value })}
                className={`flex items-center justify-center gap-1 rounded-md px-1 py-1.5 text-[10px] font-semibold transition-colors ${
                  status === s.value
                    ? 'bg-white text-primaryColor shadow-sm ring-1 ring-primaryColor/20'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                <span
                  className={`h-1.5 w-1.5 rounded-full flex-shrink-0 ${s.dot}`}
                />
                <span className="truncate">{statusLabel(s.value)}</span>
              </button>
            ))}
          </div>
        </div>

        {onArticleLocaleTabChange ? (
          <div>
            <p className={LABEL_CLS}>{tEditor('articleContentLocale')}</p>
            <div className="grid grid-cols-2 gap-0.5 rounded-lg border border-slate-200 bg-slate-50 p-0.5">
              {(
                [
                  ['original', tLocale('original')] as const,
                  ['english', tLocale('english')] as const,
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => onArticleLocaleTabChange(value)}
                  className={`rounded-md px-2 py-1.5 text-xs font-semibold transition-colors ${
                    articleLocaleTab === value
                      ? 'bg-white text-primaryColor shadow-sm ring-1 ring-primaryColor/20'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        ) : null}

        {onTranslateArticle ? (
          <ArticleTranslatePanel
            disabled={!canTranslateArticle}
            translating={translatingArticle}
            onTranslate={onTranslateArticle}
          />
        ) : null}
      </div>

      <div className="divide-y divide-slate-100">
        {/* URL & publish date */}
        <div>
          <SectionHeader
            label={t('publishing')}
            open={openSections.publish}
            onToggle={() => toggle('publish')}
            summary={slugSummary}
            icon={
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                />
              </svg>
            }
          />
          {openSections.publish && (
            <div className="px-4 pb-4 space-y-3">
              {status === 'published' && (
                <div>
                  <label className={LABEL_CLS}>{t('publishedDate')}</label>
                  <input
                    type="datetime-local"
                    className={INPUT_CLS}
                    value={publishedAt ? isoToDatetimeLocal(publishedAt) : ''}
                    onChange={(e) =>
                      onChange({
                        publishedAt: e.target.value
                          ? datetimeLocalToIso(e.target.value)
                          : null,
                      })
                    }
                  />
                </div>
              )}

              <div>
                <label className={LABEL_CLS}>{t('urlSlug')}</label>
                <input
                  className={`${INPUT_CLS} font-mono text-xs`}
                  placeholder={t('slugPlaceholder')}
                  value={slug}
                  onChange={(e) =>
                    onChange({ slug: normalizeSlugInput(e.target.value) })
                  }
                />
                <p className="mt-1 truncate font-mono text-[11px] text-slate-400">
                  {previewPath}
                </p>
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
            summary={
              previewSrc ? (
                <span className="relative inline-block h-4 w-4 overflow-hidden rounded border border-slate-200 bg-slate-100 flex-shrink-0">
                  <Image
                    src={previewSrc}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="16px"
                  />
                </span>
              ) : undefined
            }
            icon={
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                />
              </svg>
            }
          />
          {openSections.media && (
            <div className="px-4 pb-4 space-y-2.5">
              {previewSrc ? (
                <div className="relative w-full h-32 rounded-lg overflow-hidden bg-slate-100 group">
                  <Image
                    src={previewSrc}
                    alt=""
                    fill
                    className="object-cover"
                    sizes="280px"
                  />
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                    <button
                      type="button"
                      onClick={() => onChange({ featuredImage: '' })}
                      className="opacity-0 group-hover:opacity-100 transition-opacity rounded-md bg-white/90 px-2.5 py-1.5 text-xs font-semibold text-red-600 shadow"
                    >
                      {t('remove')}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center rounded-lg border border-dashed border-slate-200 py-5 gap-2 bg-slate-50">
                  <ImageUpload
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
            summary={categoryLabel(category)}
            icon={
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                />
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
              </div>
            </div>
          )}
        </div>

        {/* Client info (case studies only) */}
        {category === 'case-study' && (
          <div>
            <SectionHeader
              label={tCs('sectionTitle')}
              open={openSections.caseStudy}
              onToggle={() => toggle('caseStudy')}
              icon={
                <svg
                  className="w-3.5 h-3.5"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21 13.255A23.931 23.931 0 0112 15c-3.183 0-6.22-.62-9-1.745M16 6V4a2 2 0 00-2-2h-4a2 2 0 00-2 2v2m4 6h.01M5 20h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                  />
                </svg>
              }
            />
            {openSections.caseStudy && (
              <div className="px-4 pb-4">
                <CaseStudyMetaFields
                  value={caseStudy}
                  onChange={(patch) =>
                    onChange({ caseStudy: { ...caseStudy, ...patch } })
                  }
                />
              </div>
            )}
          </div>
        )}

        {/* Author */}
        <div>
          <SectionHeader
            label={t('author')}
            open={openSections.author}
            onToggle={() => toggle('author')}
            summary={authorName.trim() || undefined}
            icon={
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                />
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
                  onChange={(e) =>
                    onChange({ authorDesignation: e.target.value })
                  }
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
            summary={
              seo.metaTitle?.trim()
                ? seo.metaTitle.slice(0, 24)
                : seo.metaDescription?.trim()
                  ? `${seo.metaDescription.length} chars`
                  : undefined
            }
            icon={
              <svg
                className="w-3.5 h-3.5"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
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
                  onChange={(e) =>
                    onChange({ seo: { ...seo, metaTitle: e.target.value } })
                  }
                />
                {(seo.metaTitle ?? '').length > 0 && (
                  <p
                    className={`mt-1 text-[10px] ${(seo.metaTitle ?? '').length > 60 ? 'text-amber-600' : 'text-slate-400'}`}
                  >
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
                  onChange={(e) =>
                    onChange({
                      seo: { ...seo, metaDescription: e.target.value },
                    })
                  }
                />
                {(seo.metaDescription ?? '').length > 0 && (
                  <p
                    className={`mt-1 text-[10px] ${(seo.metaDescription ?? '').length > 160 ? 'text-amber-600' : 'text-slate-400'}`}
                  >
                    {t('metaDescChars', {
                      count: (seo.metaDescription ?? '').length,
                    })}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
