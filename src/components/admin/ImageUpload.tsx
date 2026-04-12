'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import MediaGalleryModal from '@/components/admin/MediaGalleryModal';

type Props = {
  label?: string;
  onUploaded: (url: string) => void;
};

export default function ImageUpload({ label, onUploaded }: Props) {
  const t = useTranslations('admin.imageUpload');
  const resolvedLabel = label ?? t('defaultLabel');
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-lg border border-dashed px-3 py-2 text-sm font-medium cursor-pointer transition-colors border-slate-300 text-slate-600 hover:border-primaryColor hover:text-primaryColor hover:bg-primaryColor/5"
      >
        <svg
          className="w-4 h-4"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.75}
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
        {resolvedLabel}
      </button>
      <MediaGalleryModal
        open={open}
        onClose={() => setOpen(false)}
        onSelect={(url) => {
          onUploaded(url);
          setOpen(false);
        }}
      />
    </>
  );
}
