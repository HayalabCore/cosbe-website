'use client';

import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { listPieceChoicesAction, startRunAction, updatePieceSetupAction } from '@/actions/studio-pieces';
import { ARTICLE_CREATE_CATEGORIES } from '@/lib/api/article-create-metadata';
import type { PanelProps } from './panel-props';
import { useStudioAction } from './useStudioAction';

export default function BriefPanel({ piece, busy, locked = false, refresh, notify }: PanelProps) {
  const t = useTranslations('admin.studio');
  const [goal, setGoal] = useState(piece.brief.goal);
  const [audience, setAudience] = useState(piece.brief.audience);
  const [keywords, setKeywords] = useState(piece.brief.keywords.join(', '));
  const [tone, setTone] = useState(piece.brief.tone);
  const [length, setLength] = useState(piece.brief.targetLength === 'auto' ? '' : String(piece.brief.targetLength));
  const [templateId, setTemplateId] = useState(piece.templateId ?? '');
  const [category, setCategory] = useState(piece.category);
  const [authorId, setAuthorId] = useState(piece.authorId ?? '');
  const [choices, setChoices] = useState<{ templates: Array<{ id: string; name: string }>; authors: Array<{ id: string; name: string; designation: string }> }>({ templates: [], authors: [] });
  const { run, pending, message } = useStudioAction(refresh, notify);
  const disabled = busy || locked || pending;

  useEffect(() => {
    void listPieceChoicesAction(piece.id).then((r) => r.ok && setChoices(r.data));
  }, [piece.id]);

  const setup = () =>
    updatePieceSetupAction(piece.id, {
      brief: {
        goal, audience, tone,
        keywords: keywords.split(',').map((k) => k.trim()).filter(Boolean),
        targetLength: Number(length) > 0 ? Number(length) : 'auto',
      },
      templateId: templateId || null,
      category: category as (typeof ARTICLE_CREATE_CATEGORIES)[number],
      authorId: authorId || null,
    });

  const save = () => run(setup);
  const createOutline = () =>
    run(async () => {
      const saved = await setup();
      return saved.ok ? startRunAction(piece.id, 'outline') : saved;
    });

  const field = 'mt-1 w-full rounded-md border border-slate-200 px-3 py-2 text-sm';
  return (
    <section className="space-y-3">
      <h3 className="font-semibold text-slate-900">{t('brief.title')}</h3>
      <label className="block text-sm">{t('brief.goal')}<textarea value={goal} onChange={(e) => setGoal(e.target.value)} rows={3} className={field} /></label>
      <label className="block text-sm">{t('brief.audience')}<input value={audience} onChange={(e) => setAudience(e.target.value)} className={field} /></label>
      <label className="block text-sm">{t('brief.keywords')}<input value={keywords} onChange={(e) => setKeywords(e.target.value)} className={field} /></label>
      <label className="block text-sm">{t('brief.tone')}<input value={tone} onChange={(e) => setTone(e.target.value)} className={field} /></label>
      <label className="block text-sm">{t('brief.chars')}<input type="number" min={0} placeholder={t('brief.auto')} value={length} onChange={(e) => setLength(e.target.value)} className={field} /></label>
      <label className="block text-sm">{t('brief.template')}
        <select value={templateId} onChange={(e) => setTemplateId(e.target.value)} className={field}>
          <option value="">—</option>
          {choices.templates.map((x) => <option key={x.id} value={x.id}>{x.name}</option>)}
        </select>
      </label>
      <label className="block text-sm">{t('brief.category')}
        <select value={category} onChange={(e) => setCategory(e.target.value)} className={field}>
          {ARTICLE_CREATE_CATEGORIES.map((c) => <option key={c} value={c}>{t(`category.${c}`)}</option>)}
        </select>
      </label>
      <label className="block text-sm">{t('brief.author')}
        <select value={authorId} onChange={(e) => setAuthorId(e.target.value)} className={field}>
          <option value="">—</option>
          {choices.authors.map((a) => <option key={a.id} value={a.id}>{a.name}（{a.designation}）</option>)}
        </select>
      </label>
      {message && <p className="text-sm text-red-600">{message}</p>}
      <div className="flex gap-2">
        <button type="button" disabled={disabled} onClick={() => void save()} className="rounded-lg border border-slate-200 px-4 py-2 text-sm">{t('brief.save')}</button>
        <button type="button" disabled={disabled} onClick={() => void createOutline()} className="rounded-lg bg-primaryColor px-4 py-2 text-sm font-semibold text-white hover:bg-primaryHover disabled:opacity-40 disabled:cursor-not-allowed">{t('brief.createOutline')}</button>
      </div>
    </section>
  );
}
