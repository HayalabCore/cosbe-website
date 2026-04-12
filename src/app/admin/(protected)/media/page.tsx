'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { uploadToGallery } from '@/lib/storage';
import { deleteMediaAction, recordMediaAction } from '@/actions/media';
import { imageSrcOrFallback } from '@/lib/article-utils';
import type { MediaApiItem } from '@/components/admin/MediaGalleryModal';
import AdminImageLightbox from '@/components/admin/AdminImageLightbox';

type ListResponse = {
  items: MediaApiItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export default function AdminMediaPage() {
  const t = useTranslations('admin.media');
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [items, setItems] = useState<MediaApiItem[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [lightboxItem, setLightboxItem] = useState<MediaApiItem | null>(null);

  useEffect(() => {
    const id = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(id);
  }, [search]);

  const fetchPage = useCallback(
    async (p: number, q: string) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          page: String(p),
          pageSize: '24',
        });
        if (q.trim()) params.set('search', q.trim());
        const res = await fetch(`/api/admin/media?${params}`, {
          credentials: 'include',
        });
        if (!res.ok) throw new Error('Failed to load media');
        const data = (await res.json()) as ListResponse;
        setItems(data.items);
        setTotalPages(data.totalPages);
      } catch (e) {
        console.error(e);
        alert(e instanceof Error ? e.message : t('loadFailed'));
      } finally {
        setLoading(false);
      }
    },
    [t]
  );

  useEffect(() => {
    void fetchPage(page, debouncedSearch);
  }, [page, debouncedSearch, fetchPage]);

  async function handleUpload(file: File) {
    setUploading(true);
    try {
      const uploaded = await uploadToGallery(supabase, file);
      const row = await recordMediaAction({
        filename: uploaded.filename,
        url: uploaded.url,
        size: uploaded.size,
        mimeType: uploaded.mimeType,
      });
      const next: MediaApiItem = {
        id: row.id,
        filename: row.filename,
        url: row.url,
        size: row.size,
        mimeType: row.mimeType,
        alt: row.alt,
        createdAt: row.createdAt.toISOString(),
      };
      setItems((prev) => [next, ...prev.filter((i) => i.id !== next.id)]);
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : t('uploadFailed'));
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(item: MediaApiItem) {
    if (!confirm(t('deleteConfirm', { name: item.filename }))) return;
    try {
      await deleteMediaAction(item.id);
      setItems((prev) => prev.filter((i) => i.id !== item.id));
      setLightboxItem((cur) => (cur?.id === item.id ? null : cur));
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : t('deleteFailed'));
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-8">
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-slate-900">
            {t('pageTitle')}
          </h1>
          <p className="text-sm text-slate-500 mt-1">{t('pageSubtitle')}</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <input
            type="search"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder={t('searchPlaceholder')}
            className="w-full sm:w-64 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primaryColor focus:outline-none focus:ring-2 focus:ring-primaryColor/15"
          />
          <label
            className={`inline-flex items-center justify-center gap-2 rounded-lg border border-dashed px-3 py-2 text-sm font-medium cursor-pointer transition-colors whitespace-nowrap ${
              uploading
                ? 'border-slate-200 text-slate-400 cursor-not-allowed'
                : 'border-slate-300 text-slate-600 hover:border-primaryColor hover:text-primaryColor hover:bg-primaryColor/5'
            }`}
          >
            <input
              type="file"
              accept="image/*"
              className="hidden"
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) void handleUpload(file);
                e.target.value = '';
              }}
            />
            {uploading ? t('uploading') : t('uploadNew')}
          </label>
        </div>
      </div>

      {loading && items.length === 0 ? (
        <p className="text-sm text-slate-400 text-center py-16">
          {t('loading')}
        </p>
      ) : items.length === 0 ? (
        <p className="text-sm text-slate-500 text-center py-16">{t('empty')}</p>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {items.map((item) => {
            const src = imageSrcOrFallback(item.url, '');
            return (
              <div
                key={item.id}
                className="group relative rounded-xl overflow-hidden border border-slate-200 bg-slate-50 aspect-square"
              >
                <button
                  type="button"
                  onClick={() => setLightboxItem(item)}
                  className="absolute inset-0 z-0 p-1.5 cursor-zoom-in"
                  aria-label={t('viewFull')}
                >
                  {src ? (
                    <span className="relative block w-full h-full">
                      <Image
                        src={src}
                        alt={item.alt || item.filename}
                        fill
                        className="object-contain"
                        sizes="(max-width: 768px) 50vw, 200px"
                      />
                    </span>
                  ) : null}
                </button>
                <div className="absolute inset-x-0 bottom-0 bg-black/60 px-2 py-1.5 flex items-center justify-between gap-1 z-10 pointer-events-none">
                  <span className="text-[10px] text-white truncate flex-1">
                    {item.filename}
                  </span>
                </div>
                <div className="absolute top-1.5 right-1.5 z-20 flex gap-1">
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      setLightboxItem(item);
                    }}
                    className="rounded-md bg-white/95 px-2 py-1 text-[11px] font-semibold text-slate-700 shadow border border-slate-200/80 hover:bg-white"
                  >
                    {t('viewFull')}
                  </button>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleDelete(item);
                    }}
                    className="p-1 rounded-md bg-white/95 text-red-600 shadow border border-slate-200/80 hover:bg-red-50"
                    title={t('delete')}
                  >
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
                        d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                      />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {items.length > 0 && (
        <div className="flex items-center justify-center gap-2 mt-8">
          <button
            type="button"
            disabled={page <= 1 || loading}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 disabled:opacity-40"
          >
            {t('prev')}
          </button>
          <span className="text-xs text-slate-500">
            {t('pageOf', { page, totalPages })}
          </span>
          <button
            type="button"
            disabled={page >= totalPages || loading}
            onClick={() => setPage((p) => p + 1)}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 disabled:opacity-40"
          >
            {t('next')}
          </button>
        </div>
      )}

      <AdminImageLightbox
        open={lightboxItem !== null}
        onClose={() => setLightboxItem(null)}
        imageUrl={lightboxItem?.url ?? ''}
        alt={lightboxItem?.alt || lightboxItem?.filename || ''}
        title={lightboxItem?.filename}
      />
    </div>
  );
}
