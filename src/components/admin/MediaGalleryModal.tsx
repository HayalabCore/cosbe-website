'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { createPortal } from 'react-dom';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { uploadToGallery } from '@/lib/storage';
import { recordMediaAction } from '@/actions/media';
import { imageSrcOrFallback } from '@/lib/article-utils';
import AdminImageLightbox from '@/components/admin/AdminImageLightbox';

export type MediaApiItem = {
  id: string;
  filename: string;
  url: string;
  size: number | null;
  mimeType: string | null;
  alt: string;
  createdAt: string;
};

type ListResponse = {
  items: MediaApiItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

type Props = {
  open: boolean;
  onClose: () => void;
  onSelect: (url: string) => void;
};

export default function MediaGalleryModal({ open, onClose, onSelect }: Props) {
  const t = useTranslations('admin.media');
  const supabase = useMemo(() => createBrowserSupabaseClient(), []);
  const [items, setItems] = useState<MediaApiItem[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [selectedUrl, setSelectedUrl] = useState<string | null>(null);
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
    if (!open) return;
    void fetchPage(page, debouncedSearch);
  }, [open, page, debouncedSearch, fetchPage]);

  useEffect(() => {
    if (open) return;
    setSearch('');
    setPage(1);
    setSelectedUrl(null);
    setLightboxItem(null);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    setSelectedUrl(null);
  }, [debouncedSearch, open]);

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
      setSelectedUrl(next.url);
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : t('uploadFailed'));
    } finally {
      setUploading(false);
    }
  }

  function handleConfirm() {
    if (!selectedUrl) return;
    onSelect(selectedUrl);
    onClose();
  }

  if (!open || typeof document === 'undefined') return null;

  const content = (
    <>
      <div
        className="fixed inset-0 z-[210] bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden
      />
      <div
        className="fixed inset-4 md:inset-8 lg:inset-12 z-[211] flex flex-col rounded-2xl border border-slate-200 bg-white shadow-2xl overflow-hidden"
        role="dialog"
        aria-modal="true"
        aria-labelledby="media-gallery-title"
      >
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 px-4 py-3 border-b border-slate-100 bg-slate-50/80">
          <h2
            id="media-gallery-title"
            className="text-base font-semibold text-slate-900"
          >
            {t('title')}
          </h2>
          <div className="flex-1 flex flex-col sm:flex-row gap-2 sm:justify-end">
            <input
              type="search"
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder={t('searchPlaceholder')}
              className="w-full sm:max-w-xs rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primaryColor focus:outline-none focus:ring-2 focus:ring-primaryColor/15"
            />
            <label
              className={`inline-flex items-center justify-center gap-2 rounded-lg border border-dashed px-3 py-2 text-sm font-medium cursor-pointer transition-colors ${
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
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50"
            >
              {t('cancel')}
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loading && items.length === 0 ? (
            <p className="text-sm text-slate-400 text-center py-12">
              {t('loading')}
            </p>
          ) : items.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-12">
              {t('empty')}
            </p>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
              {items.map((item) => {
                const src = imageSrcOrFallback(item.url, '');
                const selected = selectedUrl === item.url;
                return (
                  <div
                    key={item.id}
                    className={`group relative aspect-square rounded-xl overflow-hidden border-2 bg-slate-100 transition-all ${
                      selected
                        ? 'border-primaryColor ring-2 ring-primaryColor/25'
                        : 'border-transparent hover:border-slate-300'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => setSelectedUrl(item.url)}
                      className="absolute inset-0 z-0 p-1.5"
                      aria-pressed={selected}
                    >
                      {src ? (
                        <span className="relative block w-full h-full">
                          <Image
                            src={src}
                            alt={item.alt || item.filename}
                            fill
                            className="object-contain"
                            sizes="(max-width: 768px) 50vw, 120px"
                          />
                        </span>
                      ) : null}
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setLightboxItem(item);
                      }}
                      className="absolute top-1.5 right-1.5 z-10 rounded-md bg-white/95 px-2 py-1 text-[11px] font-semibold text-slate-700 shadow border border-slate-200/80 hover:bg-white"
                    >
                      {t('viewFull')}
                    </button>
                    <span className="pointer-events-none absolute bottom-0 left-0 right-0 bg-black/55 text-[10px] text-white px-1.5 py-1 truncate opacity-0 group-hover:opacity-100 transition-opacity z-[5]">
                      {item.filename}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-4 py-3 border-t border-slate-100 bg-white">
          <div className="flex items-center gap-2">
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
          <div className="flex flex-wrap items-center justify-end gap-2">
            {selectedUrl ? (
              <button
                type="button"
                onClick={() => {
                  const item = items.find((i) => i.url === selectedUrl);
                  if (item) setLightboxItem(item);
                }}
                className="rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                {t('viewFull')}
              </button>
            ) : null}
            <button
              type="button"
              disabled={!selectedUrl}
              onClick={handleConfirm}
              className="rounded-lg bg-primaryColor px-4 py-2 text-sm font-semibold text-white hover:bg-primaryHover disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {t('useImage')}
            </button>
          </div>
        </div>
      </div>
      <AdminImageLightbox
        open={lightboxItem !== null}
        onClose={() => setLightboxItem(null)}
        imageUrl={lightboxItem?.url ?? ''}
        alt={lightboxItem?.alt || lightboxItem?.filename || ''}
        title={lightboxItem?.filename}
      />
    </>
  );

  return createPortal(content, document.body);
}
