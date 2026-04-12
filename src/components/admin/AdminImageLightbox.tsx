'use client';

import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useTranslations } from 'next-intl';
import { imageSrcOrFallback } from '@/lib/article-utils';

type Props = {
  open: boolean;
  onClose: () => void;
  imageUrl: string;
  alt: string;
  title?: string;
};

export default function AdminImageLightbox({
  open,
  onClose,
  imageUrl,
  alt,
  title,
}: Props) {
  const t = useTranslations('admin.media');
  const src = imageSrcOrFallback(imageUrl, '');

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, onClose]);

  if (!open || !src || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[230] flex flex-col bg-black/90"
      role="dialog"
      aria-modal="true"
      aria-label={t('lightboxAria')}
    >
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-white/10 shrink-0">
        <p className="text-sm text-white/90 truncate min-w-0" title={title}>
          {title ?? alt}
        </p>
        <button
          type="button"
          onClick={onClose}
          className="shrink-0 rounded-lg bg-white/10 px-3 py-1.5 text-sm font-medium text-white hover:bg-white/20"
        >
          {t('closeLightbox')}
        </button>
      </div>
      <button
        type="button"
        className="flex-1 min-h-0 flex items-center justify-center p-4 cursor-default"
        onClick={onClose}
        aria-label={t('closeLightbox')}
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          className="max-w-full max-h-[calc(100vh-5rem)] w-auto h-auto object-contain pointer-events-none"
        />
      </button>
    </div>,
    document.body
  );
}
