'use client';

import dynamic from 'next/dynamic';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useLocale, useTranslations } from 'next-intl';
import {
  createEmptyBlock,
  createFallbackSlug,
  generateTOC,
  normalizeSlugInput,
} from '@/lib/article-utils';
import {
  resolveArticleExcerpt,
  resolveArticleTitle,
  resolveBlocksForLocale,
} from '@/lib/article-locale';
import {
  normalizeBlocksForEditor,
  stripHtmlForMetrics,
} from '@/lib/sanitize-article-html';
import {
  createArticleAction,
  getArticleByIdAction,
  updateArticleAction,
} from '@/actions/articles';
import type {
  Article,
  ArticleSEO,
  ArticleStatus,
  CaseStudyMeta,
  ContentBlock,
  ContentCategory,
  ParagraphBlock,
} from '@/types';
import { useAdminViewArticleLink } from '@/components/admin/AdminViewArticleContext';
import { articleDetailHref } from '@/lib/article-paths';
import PostMetaForm, { type PostMetaPatch } from './PostMetaForm';

const BlockEditor = dynamic(() => import('./BlockEditor'), { ssr: false });
const BlockRenderer = dynamic(
  () => import('@/components/article/BlockRenderer'),
  { ssr: false }
);

type Tab = 'edit' | 'preview';

const defaultAuthor = { id: 'author-1', name: 'Editor', designation: 'CosBE' };

const emptyCaseStudyMeta: CaseStudyMeta = {
  aiModels: [],
};

/** Autosave interval when the article has unsaved edits (idle saves are no-ops). */
const AUTOSAVE_INTERVAL_MS = 10_000;

function buildArticlePayload(
  title: string,
  titleEn: string,
  slug: string,
  excerpt: string,
  excerptEn: string,
  featuredImage: string,
  category: ContentCategory,
  tagsStr: string,
  status: ArticleStatus,
  authorName: string,
  authorDesignation: string,
  seo: ArticleSEO,
  blocks: ContentBlock[],
  untitledFallback: string,
  currentPublishedAt: string | null,
  caseStudy: CaseStudyMeta
): Omit<Article, 'id' | 'createdAt' | 'updatedAt'> {
  const tags = tagsStr
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const toc = generateTOC(blocks);
  // Preserve an existing publishedAt; only stamp "now" on first publish.
  const publishedAt =
    status === 'published'
      ? (currentPublishedAt ?? new Date().toISOString())
      : null;
  const safeSlug = createFallbackSlug(slug || title);
  return {
    slug: safeSlug,
    title: title || untitledFallback,
    titleEn: titleEn.trim() || undefined,
    excerpt: excerpt || undefined,
    excerptEn: excerptEn.trim() || undefined,
    featuredImage: featuredImage.trim(),
    status,
    category,
    tags,
    author: {
      id: defaultAuthor.id,
      name: authorName || defaultAuthor.name,
      designation: authorDesignation || defaultAuthor.designation,
    },
    blocks,
    toc,
    seo: Object.keys(seo).length ? seo : undefined,
    relatedArticleIds: [],
    publishedAt,
    viewCount: 0,
    caseStudy: category === 'case-study' ? caseStudy : undefined,
  };
}

function wordCount(blocks: ContentBlock[]): number {
  return blocks.reduce((acc, b) => {
    if (b.type === 'paragraph') {
      const text = stripHtmlForMetrics((b as ParagraphBlock).content);
      return acc + (text ? text.split(/\s+/).filter(Boolean).length : 0);
    }
    if ('content' in b && typeof b.content === 'string') {
      return acc + b.content.split(/\s+/).filter(Boolean).length;
    }
    if ('items' in b && Array.isArray(b.items)) {
      return acc + b.items.join(' ').split(/\s+/).filter(Boolean).length;
    }
    return acc;
  }, 0);
}

function SaveIndicator({ saving, label }: { saving: boolean; label: string }) {
  if (!saving) return null;
  return (
    <span className="flex items-center gap-1.5 text-xs text-slate-400">
      <svg className="animate-spin w-3.5 h-3.5" fill="none" viewBox="0 0 24 24">
        <circle
          className="opacity-25"
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="4"
        />
        <path
          className="opacity-75"
          fill="currentColor"
          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
        />
      </svg>
      {label}
    </span>
  );
}

export default function PostEditor({ articleId }: { articleId?: string }) {
  const t = useTranslations('admin.editor');
  const locale = useLocale();
  const { setViewArticleHref } = useAdminViewArticleLink();
  const router = useRouter();
  const isDirtyRef = useRef(false);
  const autoSavingRef = useRef(false);
  const savingRef = useRef(false);
  const titleRef = useRef<HTMLTextAreaElement>(null);

  const [tab, setTab] = useState<Tab>('edit');
  const [saving, setSaving] = useState(false);
  const [autoSavingUi, setAutoSavingUi] = useState(false);
  const [loaded, setLoaded] = useState(!articleId);
  const [saveNotice, setSaveNotice] = useState<'manual' | 'auto' | null>(null);
  savingRef.current = saving;

  const [title, setTitle] = useState('');
  const [titleEn, setTitleEn] = useState('');
  const [slug, setSlug] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [excerptEn, setExcerptEn] = useState('');
  const [featuredImage, setFeaturedImage] = useState('');
  const [category, setCategory] = useState<ContentCategory>('useful-info');
  const [tags, setTags] = useState('');
  const [status, setStatus] = useState<ArticleStatus>('draft');
  const [publishedAt, setPublishedAt] = useState<string | null>(null);
  const [authorName, setAuthorName] = useState(defaultAuthor.name);
  const [authorDesignation, setAuthorDesignation] = useState(
    defaultAuthor.designation
  );
  const [seo, setSeo] = useState<ArticleSEO>({});
  const [caseStudy, setCaseStudy] = useState<CaseStudyMeta>(emptyCaseStudyMeta);
  const [blocks, setBlocks] = useState<ContentBlock[]>([
    createEmptyBlock('heading'),
    createEmptyBlock('paragraph'),
  ]);
  const [persistedId, setPersistedId] = useState<string | undefined>(articleId);
  const [previewLocale, setPreviewLocale] = useState<'ja' | 'en'>('ja');

  const load = useCallback(async () => {
    if (!articleId) return;
    isDirtyRef.current = false;
    const row = await getArticleByIdAction(articleId);
    if (!row) {
      router.replace('/admin/dashboard');
      return;
    }
    setTitle(row.title);
    setTitleEn(row.titleEn ?? '');
    setSlug(row.slug);
    setExcerpt(row.excerpt ?? '');
    setExcerptEn(row.excerptEn ?? '');
    setFeaturedImage(row.featuredImage ?? '');
    setCategory(row.category);
    setTags(row.tags.join(', '));
    setStatus(row.status);
    setPublishedAt(row.publishedAt);
    setAuthorName(row.author.name);
    setAuthorDesignation(row.author.designation);
    setSeo(row.seo ?? {});
    setCaseStudy(row.caseStudy ?? emptyCaseStudyMeta);
    setBlocks(
      row.blocks.length
        ? normalizeBlocksForEditor(row.blocks)
        : [createEmptyBlock('heading'), createEmptyBlock('paragraph')]
    );
    setPersistedId(row.id);
    setLoaded(true);
  }, [articleId, router]);

  useEffect(() => {
    void load();
  }, [load]);

  // Sidebar "View site": deep-link to this article on the public site when published.
  useEffect(() => {
    if (status !== 'published') {
      setViewArticleHref(null);
      return;
    }
    const safeSlug = createFallbackSlug(slug || title);
    if (!safeSlug) {
      setViewArticleHref(null);
      return;
    }
    const path = articleDetailHref(category, safeSlug);
    setViewArticleHref(`/${locale}${path}`);
    return () => setViewArticleHref(null);
  }, [status, slug, title, category, locale, setViewArticleHref]);

  // Auto-resize title textarea
  useEffect(() => {
    const el = titleRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
    }
  }, [title]);

  function applyMeta(patch: PostMetaPatch) {
    isDirtyRef.current = true;
    if (patch.title !== undefined) setTitle(patch.title);
    if (patch.titleEn !== undefined) setTitleEn(patch.titleEn);
    if (patch.slug !== undefined) setSlug(normalizeSlugInput(patch.slug));
    if (patch.excerpt !== undefined) setExcerpt(patch.excerpt);
    if (patch.excerptEn !== undefined) setExcerptEn(patch.excerptEn);
    if (patch.featuredImage !== undefined)
      setFeaturedImage(patch.featuredImage);
    if (patch.category !== undefined) setCategory(patch.category);
    if (patch.tags !== undefined) setTags(patch.tags);
    if (patch.status !== undefined) setStatus(patch.status);
    if (patch.authorName !== undefined) setAuthorName(patch.authorName);
    if (patch.authorDesignation !== undefined)
      setAuthorDesignation(patch.authorDesignation);
    if (patch.seo !== undefined) setSeo(patch.seo);
    if ('publishedAt' in patch) setPublishedAt(patch.publishedAt ?? null);
    if (patch.caseStudy !== undefined) {
      setCaseStudy((prev) => ({ ...prev, ...patch.caseStudy }));
    }
  }

  const runAutoSave = useCallback(async () => {
    const id = persistedId;
    if (
      !id ||
      !isDirtyRef.current ||
      savingRef.current ||
      autoSavingRef.current
    ) {
      return;
    }
    autoSavingRef.current = true;
    setSaveNotice(null);
    setAutoSavingUi(true);
    try {
      const payload = buildArticlePayload(
        title,
        titleEn,
        slug,
        excerpt,
        excerptEn,
        featuredImage,
        category,
        tags,
        status,
        authorName,
        authorDesignation,
        seo,
        blocks,
        t('untitled'),
        publishedAt,
        caseStudy
      );
      await updateArticleAction(id, payload);
      isDirtyRef.current = false;
      setSaveNotice('auto');
      setTimeout(() => setSaveNotice(null), 2000);
    } catch (e) {
      console.error('Autosave failed', e);
    } finally {
      autoSavingRef.current = false;
      setAutoSavingUi(false);
    }
  }, [
    persistedId,
    title,
    titleEn,
    slug,
    excerpt,
    excerptEn,
    featuredImage,
    category,
    tags,
    status,
    publishedAt,
    authorName,
    authorDesignation,
    seo,
    blocks,
    caseStudy,
    t,
  ]);

  useEffect(() => {
    if (!loaded || !persistedId) return;
    const timer = window.setInterval(
      () => void runAutoSave(),
      AUTOSAVE_INTERVAL_MS
    );
    return () => window.clearInterval(timer);
  }, [loaded, persistedId, runAutoSave]);

  async function save(publish: boolean) {
    setSaving(true);
    setSaveNotice(null);
    try {
      const st: ArticleStatus = publish
        ? 'published'
        : status === 'published'
          ? 'draft'
          : status;
      const payload = buildArticlePayload(
        title,
        titleEn,
        slug,
        excerpt,
        excerptEn,
        featuredImage,
        category,
        tags,
        st,
        authorName,
        authorDesignation,
        seo,
        blocks,
        t('untitled'),
        publishedAt,
        caseStudy
      );
      if (persistedId) {
        await updateArticleAction(persistedId, payload);
      } else {
        const id = await createArticleAction(payload);
        setPersistedId(id);
        router.replace(`/admin/posts/${id}`);
      }
      if (publish) {
        setStatus('published');
        // Sync the stamped timestamp back into state so subsequent saves preserve it.
        setPublishedAt(payload.publishedAt);
      } else if (st !== 'published') {
        setPublishedAt(null);
      }
      isDirtyRef.current = false;
      setSaveNotice('manual');
      setTimeout(() => setSaveNotice(null), 2000);
      router.refresh();
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : t('saveFailed'));
    } finally {
      setSaving(false);
    }
  }

  if (!loaded) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <div className="flex items-center gap-2.5 text-slate-400">
          <svg className="animate-spin w-5 h-5" fill="none" viewBox="0 0 24 24">
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
            />
          </svg>
          <span className="text-sm">{t('loadingPost')}</span>
        </div>
      </div>
    );
  }

  const words = wordCount(blocks);
  const readingMins = Math.max(1, Math.ceil(words / 200));
  const isPublished = status === 'published';

  const previewLocaleStr = previewLocale;
  const previewTitle =
    resolveArticleTitle({ title, titleEn }, previewLocaleStr) || t('untitled');
  const previewExcerptResolved = resolveArticleExcerpt(
    { excerpt, excerptEn },
    previewLocaleStr
  );
  const previewBlocks = resolveBlocksForLocale(blocks, previewLocaleStr);

  return (
    <div className="flex flex-col min-h-screen min-w-0 w-full overflow-x-clip">
      {/* Sticky top bar — title truncates; actions stay pinned on the right */}
      <div className="sticky top-0 z-30 w-full min-w-0 bg-white border-b border-slate-200 shadow-sm">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 h-14 w-full min-w-0">
          <div className="flex items-center gap-3 min-w-0 overflow-hidden">
            <Link
              href="/admin/dashboard"
              className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-900 transition-colors flex-shrink-0"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                strokeWidth={2}
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15 19l-7-7 7-7"
                />
              </svg>
              <span className="hidden sm:inline">{t('allPosts')}</span>
            </Link>

            <div className="w-px h-5 bg-slate-200 flex-shrink-0" />

            <p className="min-w-0 truncate text-sm font-medium text-slate-700 hidden sm:block">
              {title || (articleId ? t('editPost') : t('newPost'))}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-shrink-0">
            <span
              className={`hidden xl:inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium flex-shrink-0 ${
                isPublished
                  ? 'bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200'
                  : 'bg-amber-50 text-amber-700 ring-1 ring-amber-200'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${isPublished ? 'bg-emerald-500' : 'bg-amber-400'}`}
              />
              {isPublished
                ? t('statusPublished')
                : status === 'archived'
                  ? t('statusArchived')
                  : t('statusDraft')}
            </span>

            <div className="flex rounded-lg border border-slate-200 p-0.5 flex-shrink-0">
              <button
                type="button"
                onClick={() => setTab('edit')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                  tab === 'edit'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {t('tabEdit')}
              </button>
              <button
                type="button"
                onClick={() => setTab('preview')}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold transition-colors ${
                  tab === 'preview'
                    ? 'bg-slate-900 text-white shadow-sm'
                    : 'text-slate-500 hover:text-slate-700'
                }`}
              >
                {t('tabPreview')}
              </button>
            </div>

            {tab === 'preview' && (
              <div className="hidden lg:flex rounded-lg border border-slate-200 p-0.5 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setPreviewLocale('ja')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                    previewLocale === 'ja'
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {t('previewOriginal')}
                </button>
                <button
                  type="button"
                  onClick={() => setPreviewLocale('en')}
                  className={`px-2.5 py-1 rounded-md text-[11px] font-semibold transition-colors ${
                    previewLocale === 'en'
                      ? 'bg-slate-900 text-white shadow-sm'
                      : 'text-slate-500 hover:text-slate-700'
                  }`}
                >
                  {t('previewEnglish')}
                </button>
              </div>
            )}

            <SaveIndicator
              saving={saving || autoSavingUi}
              label={t('saving')}
            />

            {saveNotice && !saving && !autoSavingUi && (
              <span className="hidden xl:flex items-center gap-1.5 text-xs text-emerald-600 flex-shrink-0">
                <svg
                  className="w-3.5 h-3.5"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
                {saveNotice === 'auto' ? t('autoSaved') : t('saved')}
              </span>
            )}

            <button
              type="button"
              disabled={saving || autoSavingUi}
              onClick={() => void save(false)}
              className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors shadow-sm flex-shrink-0"
            >
              {t('saveDraft')}
            </button>

            <button
              type="button"
              disabled={saving || autoSavingUi}
              onClick={() => void save(true)}
              className="rounded-lg bg-primaryColor px-3 py-1.5 text-xs font-semibold text-white hover:bg-primaryHover disabled:opacity-50 transition-colors shadow-sm flex-shrink-0"
            >
              {isPublished ? t('update') : t('publish')}
            </button>
          </div>
        </div>
      </div>

      {/* Body */}
      {tab === 'preview' ? (
        <div className="w-full min-w-0 px-4 md:px-6 py-6">
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-6 md:p-8 min-w-0 overflow-x-clip">
            <h1 className="text-3xl font-bold text-slate-900 mb-6 break-words">
              {previewTitle}
            </h1>
            {previewExcerptResolved ? (
              <p className="text-base text-slate-500 mb-8 leading-relaxed border-l-4 border-primaryColor pl-4">
                {previewExcerptResolved}
              </p>
            ) : null}
            {previewBlocks.map((b) => (
              <BlockRenderer key={b.id} block={b} />
            ))}
          </div>
        </div>
      ) : (
        <div className="flex flex-1 items-start min-w-0">
          {/* Content area — uses full width between nav and settings sidebar */}
          <div className="flex-1 min-w-0 w-full px-4 md:px-8 lg:px-10 py-8">
            {/* Title */}
            <textarea
              ref={titleRef}
              value={title}
              onChange={(e) => {
                isDirtyRef.current = true;
                setTitle(e.target.value);
              }}
              placeholder={t('postTitlePlaceholder')}
              rows={1}
              className="w-full resize-none text-3xl md:text-4xl font-bold text-slate-900 placeholder:text-slate-300 bg-transparent border-none outline-none leading-tight mb-4 overflow-hidden"
            />

            {/* Excerpt */}
            <textarea
              value={excerpt}
              onChange={(e) => {
                isDirtyRef.current = true;
                setExcerpt(e.target.value);
              }}
              placeholder={t('excerptPlaceholder')}
              rows={2}
              className="w-full resize-none text-base text-slate-500 placeholder:text-slate-300 bg-transparent border-none outline-none leading-relaxed mb-6"
            />

            {/* Word count */}
            <div className="flex items-center gap-3 mb-6 pb-6 border-b border-slate-100">
              <span className="text-[11px] font-medium text-slate-400">
                {t('words', { count: words })}
              </span>
              <span className="text-slate-200">·</span>
              <span className="text-[11px] font-medium text-slate-400">
                {t('minRead', { count: readingMins })}
              </span>
              <span className="text-slate-200">·</span>
              <span className="text-[11px] font-medium text-slate-400">
                {t('blocksLabel', { count: blocks.length })}
              </span>
            </div>

            <BlockEditor
              blocks={blocks}
              onChange={(next) => {
                isDirtyRef.current = true;
                setBlocks(next);
              }}
              onParagraphBlur={() => void runAutoSave()}
            />
          </div>

          {/* Settings sidebar */}
          <aside className="hidden xl:block w-72 flex-shrink-0 border-l border-slate-200 bg-white sticky top-14 h-[calc(100vh-56px)] overflow-y-auto">
            <div className="py-2">
              <p className="px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                {t('postSettings')}
              </p>
              <PostMetaForm
                title={title}
                titleEn={titleEn}
                slug={slug}
                excerpt={excerpt}
                excerptEn={excerptEn}
                featuredImage={featuredImage}
                category={category}
                tags={tags}
                status={status}
                publishedAt={publishedAt}
                authorName={authorName}
                authorDesignation={authorDesignation}
                seo={seo}
                caseStudy={caseStudy}
                onChange={applyMeta}
              />
            </div>
          </aside>

          {/* Mobile: settings below blocks */}
          <div className="xl:hidden w-full px-4 pb-8 mt-4 border-t border-slate-100 pt-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400 mb-4">
              {t('postSettings')}
            </p>
            <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
              <PostMetaForm
                title={title}
                titleEn={titleEn}
                slug={slug}
                excerpt={excerpt}
                excerptEn={excerptEn}
                featuredImage={featuredImage}
                category={category}
                tags={tags}
                status={status}
                publishedAt={publishedAt}
                authorName={authorName}
                authorDesignation={authorDesignation}
                seo={seo}
                caseStudy={caseStudy}
                onChange={applyMeta}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
