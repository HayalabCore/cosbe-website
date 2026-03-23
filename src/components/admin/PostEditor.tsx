'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useTranslations } from 'next-intl';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import {
  createEmptyBlock,
  createFallbackSlug,
  generateTOC,
  normalizeSlugInput,
} from '@/lib/article-utils';
import { stripHtmlForMetrics } from '@/lib/sanitize-article-html';
import {
  createArticleAction,
  getArticleByIdAction,
  updateArticleAction,
} from '@/actions/articles';
import type {
  Article,
  ArticleSEO,
  ArticleStatus,
  ContentBlock,
  ContentCategory,
  ParagraphBlock,
} from '@/types';
import PostMetaForm, { type PostMetaPatch } from './PostMetaForm';
import BlockEditor from './BlockEditor';
import BlockRenderer from '@/components/article/BlockRenderer';

type Tab = 'edit' | 'preview';

const defaultAuthor = { id: 'author-1', name: 'Editor', designation: 'CosBE' };

function buildArticlePayload(
  title: string,
  slug: string,
  excerpt: string,
  featuredImage: string,
  category: ContentCategory,
  tagsStr: string,
  status: ArticleStatus,
  authorName: string,
  authorDesignation: string,
  seo: ArticleSEO,
  blocks: ContentBlock[],
  untitledFallback: string
): Omit<Article, 'id' | 'createdAt' | 'updatedAt'> {
  const tags = tagsStr
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const toc = generateTOC(blocks);
  const publishedAt = status === 'published' ? new Date().toISOString() : null;
  const safeSlug = createFallbackSlug(slug || title);
  return {
    slug: safeSlug,
    title: title || untitledFallback,
    excerpt: excerpt || undefined,
    featuredImage: featuredImage || undefined,
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
  const router = useRouter();
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [draftId] = useState(() => articleId ?? `draft-${crypto.randomUUID()}`);
  const [tab, setTab] = useState<Tab>('edit');
  const [saving, setSaving] = useState(false);
  const [loaded, setLoaded] = useState(!articleId);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const titleRef = useRef<HTMLTextAreaElement>(null);

  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [excerpt, setExcerpt] = useState('');
  const [featuredImage, setFeaturedImage] = useState('');
  const [category, setCategory] = useState<ContentCategory>('useful-info');
  const [tags, setTags] = useState('');
  const [status, setStatus] = useState<ArticleStatus>('draft');
  const [authorName, setAuthorName] = useState(defaultAuthor.name);
  const [authorDesignation, setAuthorDesignation] = useState(
    defaultAuthor.designation
  );
  const [seo, setSeo] = useState<ArticleSEO>({});
  const [blocks, setBlocks] = useState<ContentBlock[]>([
    createEmptyBlock('paragraph'),
  ]);
  const [persistedId, setPersistedId] = useState<string | undefined>(articleId);

  const load = useCallback(async () => {
    if (!articleId) return;
    const row = await getArticleByIdAction(articleId);
    if (!row) {
      router.replace('/admin/dashboard');
      return;
    }
    setTitle(row.title);
    setSlug(row.slug);
    setExcerpt(row.excerpt ?? '');
    setFeaturedImage(row.featuredImage ?? '');
    setCategory(row.category);
    setTags(row.tags.join(', '));
    setStatus(row.status);
    setAuthorName(row.author.name);
    setAuthorDesignation(row.author.designation);
    setSeo(row.seo ?? {});
    setBlocks(row.blocks.length ? row.blocks : [createEmptyBlock('paragraph')]);
    setPersistedId(row.id);
    setLoaded(true);
  }, [articleId, router]);

  useEffect(() => {
    void load();
  }, [load]);

  // Auto-resize title textarea
  useEffect(() => {
    const el = titleRef.current;
    if (el) {
      el.style.height = 'auto';
      el.style.height = `${el.scrollHeight}px`;
    }
  }, [title]);

  function applyMeta(patch: PostMetaPatch) {
    if (patch.title !== undefined) setTitle(patch.title);
    if (patch.slug !== undefined) setSlug(normalizeSlugInput(patch.slug));
    if (patch.excerpt !== undefined) setExcerpt(patch.excerpt);
    if (patch.featuredImage !== undefined)
      setFeaturedImage(patch.featuredImage);
    if (patch.category !== undefined) setCategory(patch.category);
    if (patch.tags !== undefined) setTags(patch.tags);
    if (patch.status !== undefined) setStatus(patch.status);
    if (patch.authorName !== undefined) setAuthorName(patch.authorName);
    if (patch.authorDesignation !== undefined)
      setAuthorDesignation(patch.authorDesignation);
    if (patch.seo !== undefined) setSeo(patch.seo);
  }

  async function save(publish: boolean) {
    setSaving(true);
    setSaveSuccess(false);
    try {
      const st: ArticleStatus = publish
        ? 'published'
        : status === 'published'
          ? 'draft'
          : status;
      const payload = buildArticlePayload(
        title,
        slug,
        excerpt,
        featuredImage,
        category,
        tags,
        st,
        authorName,
        authorDesignation,
        seo,
        blocks,
        t('untitled')
      );
      if (persistedId) {
        await updateArticleAction(persistedId, payload);
      } else {
        const id = await createArticleAction(payload);
        setPersistedId(id);
        router.replace(`/admin/posts/${id}`);
      }
      if (publish) setStatus('published');
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2000);
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

  return (
    <div className="flex flex-col min-h-screen">
      {/* Sticky top bar */}
      <div className="sticky top-0 z-20 flex items-center gap-3 px-4 h-14 bg-white border-b border-slate-200 shadow-sm lg:top-0">
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

        {/* Title preview (truncated) */}
        <p className="flex-1 min-w-0 text-sm font-medium text-slate-700 truncate hidden sm:block">
          {title || (articleId ? t('editPost') : t('newPost'))}
        </p>

        {/* Status badge */}
        <span
          className={`hidden md:inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium flex-shrink-0 ${
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

        {/* Edit / Preview toggle */}
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

        <SaveIndicator saving={saving} label={t('saving')} />

        {saveSuccess && !saving && (
          <span className="hidden sm:flex items-center gap-1.5 text-xs text-emerald-600">
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
            {t('saved')}
          </span>
        )}

        <button
          type="button"
          disabled={saving}
          onClick={() => void save(false)}
          className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50 transition-colors shadow-sm flex-shrink-0"
        >
          {t('saveDraft')}
        </button>

        <button
          type="button"
          disabled={saving}
          onClick={() => void save(true)}
          className="rounded-lg bg-primaryColor px-3 py-1.5 text-xs font-semibold text-white hover:bg-primaryHover disabled:opacity-50 transition-colors shadow-sm flex-shrink-0"
        >
          {isPublished ? t('update') : t('publish')}
        </button>
      </div>

      {/* Body */}
      {tab === 'preview' ? (
        <div className="w-full min-w-0 px-4 md:px-8 lg:px-10 py-10">
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm p-6 md:p-10 lg:p-12">
            <h1 className="text-3xl font-bold text-slate-900 mb-6">
              {title || t('untitled')}
            </h1>
            {excerpt && (
              <p className="text-base text-slate-500 mb-8 leading-relaxed border-l-4 border-primaryColor pl-4">
                {excerpt}
              </p>
            )}
            {blocks.map((b) => (
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
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('postTitlePlaceholder')}
              rows={1}
              className="w-full resize-none text-3xl md:text-4xl font-bold text-slate-900 placeholder:text-slate-300 bg-transparent border-none outline-none leading-tight mb-4 overflow-hidden"
            />

            {/* Excerpt */}
            <textarea
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
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
              onChange={setBlocks}
              supabase={supabase}
              draftId={persistedId ?? draftId}
            />
          </div>

          {/* Settings sidebar */}
          <aside className="hidden xl:block w-72 flex-shrink-0 border-l border-slate-200 bg-white sticky top-14 h-[calc(100vh-56px)] overflow-y-auto">
            <div className="py-2">
              <p className="px-4 py-2 text-[10px] font-semibold uppercase tracking-widest text-slate-400">
                {t('postSettings')}
              </p>
              <PostMetaForm
                supabase={supabase}
                draftId={persistedId ?? draftId}
                title={title}
                slug={slug}
                featuredImage={featuredImage}
                category={category}
                tags={tags}
                status={status}
                authorName={authorName}
                authorDesignation={authorDesignation}
                seo={seo}
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
                supabase={supabase}
                draftId={persistedId ?? draftId}
                title={title}
                slug={slug}
                featuredImage={featuredImage}
                category={category}
                tags={tags}
                status={status}
                authorName={authorName}
                authorDesignation={authorDesignation}
                seo={seo}
                onChange={applyMeta}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
