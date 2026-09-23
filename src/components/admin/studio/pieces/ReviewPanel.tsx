'use client';

import { useTranslations } from 'next-intl';
import { createDraftPostAction, rewriteSectionAction, startRunAction } from '@/actions/studio-pieces';
import type { Sentence, StudioBlock } from '@/generator/pieces/piece-types';
import type { PanelProps } from './panel-props';
import CitationPopover from './CitationPopover';
import { usePermissions } from '@/components/admin/PermissionsContext';
import { useStudioAction } from './useStudioAction';

const ACTIONS = ['regenerate', 'expand', 'shorten', 'formal'] as const;

function citedSentences(block: StudioBlock): Sentence[] {
  switch (block.type) {
    case 'paragraph':
    case 'quote':
    case 'callout':
      return block.sentences;
    case 'list':
      return block.items;
    default:
      return [];
  }
}

/** Citation numbers in reading order across the article. 0 means no marker. */
function citeNumbersForSections(sections: Array<{ blocks: StudioBlock[] }>): number[][][] {
  let n = 0;
  return sections.map((section) =>
    section.blocks.map((block) =>
      citedSentences(block).map((sentence) => (sentence.cite.length > 0 ? (n += 1) : 0))
    )
  );
}

function Sentences({ sentences, numbers, connectiveLabel }: { sentences: Sentence[]; numbers: number[]; connectiveLabel: string }) {
  return (
    <>
      {sentences.map((s, i) => (
        <span key={i} title={s.connective ? connectiveLabel : undefined} className={s.connective ? 'text-slate-500' : undefined}>
          {s.text}
          {numbers[i] > 0 && <CitationPopover ids={s.cite} index={numbers[i]} />}
        </span>
      ))}
    </>
  );
}

function Block({ block, numbers, connectiveLabel }: { block: StudioBlock; numbers: number[]; connectiveLabel: string }) {
  switch (block.type) {
    case 'paragraph':
      return <p><Sentences sentences={block.sentences} numbers={numbers} connectiveLabel={connectiveLabel} /></p>;
    case 'quote':
      return <blockquote className="border-l-4 border-slate-200 pl-3"><Sentences sentences={block.sentences} numbers={numbers} connectiveLabel={connectiveLabel} /></blockquote>;
    case 'callout':
      return <div className="rounded-lg bg-slate-50 p-3">{block.title && <p className="font-medium">{block.title}</p>}<Sentences sentences={block.sentences} numbers={numbers} connectiveLabel={connectiveLabel} /></div>;
    case 'list':
      return <ul className="list-disc pl-5">{block.items.map((item, i) => <li key={i}><Sentences sentences={[item]} numbers={[numbers[i] ?? 0]} connectiveLabel={connectiveLabel} /></li>)}</ul>;
    case 'heading3':
      return <h4 className="font-semibold">{block.text}</h4>;
    case 'table':
      return (
        <table className="text-sm"><thead><tr>{block.headers.map((h) => <th key={h} className="pr-4 text-left">{h}</th>)}</tr></thead>
          <tbody>{block.rows.map((r, i) => <tr key={i}>{r.map((c, j) => <td key={j} className="pr-4">{c}</td>)}</tr>)}</tbody></table>
      );
  }
}

export default function ReviewPanel({ piece, busy, locked = false, refresh, notify }: PanelProps) {
  const t = useTranslations('admin.studio');
  const { can } = usePermissions();
  const { run, pending, message } = useStudioAction(refresh, notify);
  const disabled = busy || locked || pending;

  function rewrite(sectionId: string, instruction: string) {
    void run(() => rewriteSectionAction(piece.id, { sectionId, instruction }));
  }

  const numbers = citeNumbersForSections(piece.sections);

  return (
    <section className="space-y-6">
      <h3 className="text-lg font-semibold text-slate-900">{piece.title}</h3>
      {piece.sections.map((section, sectionIndex) => (
        <article key={section.outlineId} className="space-y-3 rounded-lg border border-slate-200 bg-white p-4 text-sm leading-7 text-slate-800">
          <h4 className="text-base font-semibold text-slate-900">{section.heading}</h4>
          {section.flags.length > 0 && (
            <div className="rounded-md bg-amber-50 px-3 py-2 text-xs text-amber-800">
              <p className="font-medium">{t('review.flags')}</p>
              <ul className="list-disc pl-4">{section.flags.map((f) => <li key={f}>{f}</li>)}</ul>
            </div>
          )}
          {section.blocks.map((block, i) => (
            <Block key={i} block={block} numbers={numbers[sectionIndex]?.[i] ?? []} connectiveLabel={t('review.connective')} />
          ))}
          <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-3 text-xs">
            {ACTIONS.map((a) => (
              <button key={a} type="button" disabled={disabled} onClick={() => rewrite(section.outlineId, t(`review.instructions.${a}`))} className="rounded-md border border-slate-200 px-2 py-1">
                {t(`review.actions.${a}`)}
              </button>
            ))}
            <button type="button" disabled={disabled} onClick={() => { const text = window.prompt(t('review.customPrompt')); if (text) rewrite(section.outlineId, text); }} className="rounded-md border border-slate-200 px-2 py-1">
              {t('review.actions.custom')}
            </button>
          </div>
        </article>
      ))}
      {message && <p className="text-sm text-red-600">{message}</p>}
      <div className="flex gap-2">
        <button type="button" disabled={disabled} onClick={() => void run(() => startRunAction(piece.id, 'translate'))} className="rounded-lg border border-slate-200 px-4 py-2 text-sm">{t('review.translate')}</button>
        {can('articles.edit') && (
          <button type="button" disabled={disabled} onClick={() => void run(() => createDraftPostAction(piece.id))} className="rounded-lg bg-primaryColor px-4 py-2 text-sm font-semibold text-white hover:bg-primaryHover disabled:opacity-40 disabled:cursor-not-allowed">{t('review.handoff')}</button>
        )}
      </div>
    </section>
  );
}
