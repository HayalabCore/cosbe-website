'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import { duplicatePieceAction } from '@/actions/studio-pieces';
import { articleDetailHref } from '@/lib/article-paths';
import { ARTICLE_CREATE_CATEGORIES } from '@/lib/api/article-create-metadata';
import type { ContentCategory } from '@/types';
import type { PanelProps } from './panel-props';

function isCategory(value: string): value is ContentCategory {
  return (ARTICLE_CREATE_CATEGORIES as readonly string[]).includes(value);
}

export default function HandoffPanel({ piece }: PanelProps) {
  const t = useTranslations('admin.studio');
  const router = useRouter();
  const status = piece.article?.status ?? 'removed';
  // The editor may have moved the post to another category after handoff.
  const publicHref = piece.article && piece.article.status === 'published' && isCategory(piece.article.category)
    ? `/ja${articleDetailHref(piece.article.category, piece.article.slug)}`
    : null;
  return (
    <section className="space-y-3">
      <h3 className="font-semibold text-slate-900">{t('handoff.title')}</h3>
      <p className="text-sm text-slate-700">{t('handoff.status', { status: t(`pieces.tracked.${status}`) })}</p>
      <div className="flex gap-3 text-sm">
        {piece.article && <Link href={`/admin/posts/${piece.article.id}`} className="underline">{t('handoff.open')}</Link>}
        {publicHref && <a href={publicHref} className="underline">{t('handoff.view')}</a>}
        <button type="button" onClick={async () => { const r = await duplicatePieceAction(piece.id); if (r.ok) router.push(`/admin/studio/pieces/${r.data.pieceId}`); }} className="underline">
          {t('handoff.duplicate')}
        </button>
      </div>
    </section>
  );
}
