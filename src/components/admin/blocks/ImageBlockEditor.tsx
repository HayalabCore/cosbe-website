'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useTranslations } from 'next-intl';
import type { SupabaseClient } from '@supabase/supabase-js';
import { translateBlockEnAction } from '@/actions/block-translation';
import type { ImageBlock } from '@/types';
import { imageSrcOrFallback } from '@/lib/article-utils';
import ImageUpload from '../ImageUpload';
import BlockLocaleTabs from '@/components/admin/BlockLocaleTabs';

const INPUT_CLS =
  'w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-primaryColor focus:bg-white focus:outline-none focus:ring-2 focus:ring-primaryColor/15 transition-all';

export default function ImageBlockEditor({
  block,
  onChange,
  supabase,
  draftId,
}: {
  block: ImageBlock;
  onChange: (b: ImageBlock) => void;
  supabase: SupabaseClient;
  draftId: string;
}) {
  const t = useTranslations('admin.image');
  const [tab, setTab] = useState<'original' | 'english'>('original');
  const [generating, setGenerating] = useState(false);
  const preview = imageSrcOrFallback(block.url, '');

  async function handleGenerate() {
    setGenerating(true);
    try {
      const result = await translateBlockEnAction({
        type: 'image',
        alt: block.alt,
        caption: block.caption,
      });
      if (result.type === 'image') {
        onChange({
          ...block,
          altEn: result.altEn,
          captionEn: result.captionEn,
        });
        setTab('english');
      }
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : 'Translation failed');
    } finally {
      setGenerating(false);
    }
  }

  const canGenerate = Boolean(block.alt.trim());

  return (
    <div className="space-y-2.5">
      {preview && (
        <div className="relative aspect-video w-full rounded-lg overflow-hidden bg-slate-100 border border-slate-200">
          <Image
            src={preview}
            alt={block.alt || t('previewAlt')}
            fill
            className="object-cover"
            sizes="600px"
          />
          <button
            type="button"
            onClick={() => onChange({ ...block, url: '' })}
            title={t('removeImage')}
            className="absolute top-2 right-2 p-1.5 rounded-lg bg-black/50 text-white hover:bg-red-600 transition-colors"
          >
            <svg
              className="w-3.5 h-3.5"
              fill="none"
              stroke="currentColor"
              strokeWidth={2.5}
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>
      )}
      {!preview && (
        <div className="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-slate-200 bg-slate-50 py-8 gap-3">
          <svg
            className="w-8 h-8 text-slate-300"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
          <ImageUpload
            supabase={supabase}
            articleId={draftId}
            label={t('upload')}
            onUploaded={(url) => onChange({ ...block, url })}
          />
        </div>
      )}
      <input
        className={INPUT_CLS}
        placeholder={t('pasteUrl')}
        value={block.url}
        onChange={(e) => onChange({ ...block, url: e.target.value })}
      />

      <BlockLocaleTabs
        tab={tab}
        onTabChange={setTab}
        onGenerateEnglish={handleGenerate}
        generating={generating}
        generateDisabled={!canGenerate}
      />
      {tab === 'original' ? (
        <>
          <input
            className={INPUT_CLS}
            placeholder={t('altPlaceholder')}
            value={block.alt}
            onChange={(e) => onChange({ ...block, alt: e.target.value })}
          />
          <input
            className={INPUT_CLS}
            placeholder={t('captionPlaceholder')}
            value={block.caption ?? ''}
            onChange={(e) => onChange({ ...block, caption: e.target.value })}
          />
        </>
      ) : (
        <>
          <input
            className={INPUT_CLS}
            placeholder={t('altPlaceholder')}
            value={block.altEn ?? ''}
            onChange={(e) => onChange({ ...block, altEn: e.target.value })}
          />
          <input
            className={INPUT_CLS}
            placeholder={t('captionPlaceholder')}
            value={block.captionEn ?? ''}
            onChange={(e) => onChange({ ...block, captionEn: e.target.value })}
          />
        </>
      )}
    </div>
  );
}
