'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { translateArticleMetaEnAction } from '@/actions/block-translation';
import BlockLocaleTabs, { type LocaleEditTab } from './BlockLocaleTabs';

const META_TEXTAREA_CLS =
  'w-full resize-none overflow-y-hidden [field-sizing:content]';

type Props = {
  title: string;
  titleEn: string;
  excerpt: string;
  excerptEn: string;
  onTitleChange: (value: string) => void;
  onTitleEnChange: (value: string) => void;
  onExcerptChange: (value: string) => void;
  onExcerptEnChange: (value: string) => void;
  localeViewKey?: number;
  localeViewTab?: 'original' | 'english';
  bulkTranslating?: boolean;
};

export default function ArticleMetaLocaleFields({
  title,
  titleEn,
  excerpt,
  excerptEn,
  onTitleChange,
  onTitleEnChange,
  onExcerptChange,
  onExcerptEnChange,
  localeViewKey,
  localeViewTab = 'original',
  bulkTranslating = false,
}: Props) {
  const t = useTranslations('admin.editor');
  const tMeta = useTranslations('admin.meta');
  const [tab, setTab] = useState<LocaleEditTab>('original');
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (localeViewKey && localeViewKey > 0) {
      setTab(localeViewTab);
    }
  }, [localeViewKey, localeViewTab]);

  const isOriginal = tab === 'original';

  async function handleGenerate() {
    if (!title.trim() || generating) return;
    setGenerating(true);
    try {
      const result = await translateArticleMetaEnAction({
        title,
        excerpt: excerpt || undefined,
      });
      onTitleEnChange(result.titleEn);
      onExcerptEnChange(result.excerptEn ?? '');
      setTab('english');
    } catch (e) {
      console.error(e);
      alert(e instanceof Error ? e.message : 'Translation failed');
    } finally {
      setGenerating(false);
    }
  }

  return (
    <div className="mb-6">
      <BlockLocaleTabs
        tab={tab}
        onTabChange={setTab}
        onGenerateEnglish={handleGenerate}
        generating={generating || (bulkTranslating && Boolean(title.trim()))}
        generateDisabled={!title.trim()}
        className="mb-4"
      />

      <textarea
        value={isOriginal ? title : titleEn}
        onChange={(e) => {
          if (isOriginal) onTitleChange(e.target.value);
          else onTitleEnChange(e.target.value);
        }}
        placeholder={
          isOriginal ? t('postTitlePlaceholder') : tMeta('titleEnPlaceholder')
        }
        aria-label={isOriginal ? t('postTitlePlaceholder') : tMeta('titleEn')}
        rows={1}
        className={`${META_TEXTAREA_CLS} text-3xl md:text-4xl font-bold text-slate-900 placeholder:text-slate-300 bg-transparent border-none outline-none leading-tight mb-4`}
      />

      <textarea
        value={isOriginal ? excerpt : excerptEn}
        onChange={(e) => {
          if (isOriginal) onExcerptChange(e.target.value);
          else onExcerptEnChange(e.target.value);
        }}
        placeholder={
          isOriginal ? t('excerptPlaceholder') : tMeta('excerptEnPlaceholder')
        }
        aria-label={isOriginal ? t('excerptPlaceholder') : tMeta('excerptEn')}
        rows={1}
        className={`${META_TEXTAREA_CLS} text-base text-slate-500 placeholder:text-slate-300 bg-transparent border-none outline-none leading-relaxed`}
      />
    </div>
  );
}
