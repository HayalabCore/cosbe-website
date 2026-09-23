'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useTranslations } from 'next-intl';
import { ChevronDown, FileText, Library, Plus } from 'lucide-react';
import {
  listPieceChoicesAction,
  startRunAction,
  updatePieceSetupAction,
} from '@/actions/studio-pieces';
import AdminDialog from '@/components/admin/access/AdminDialog';
import { ARTICLE_CREATE_CATEGORIES } from '@/lib/api/article-create-metadata';
import type { ContentCategory } from '@/types';
import AddSourceDialog from '../AddSourceDialog';
import SourceLibrary from '../SourceLibrary';
import ConfirmDialog from '../ConfirmDialog';
import KeywordInput from '../KeywordInput';
import SourceStatusBadge from '../SourceStatusBadge';
import {
  Button,
  Card,
  Field,
  Select,
  Skeleton,
  TextArea,
  InfoFor,
  TextInput,
} from '../ui';
import CommandBar, { BarButton, BarPrimary } from './CommandBar';
import { useStudioAction } from './useStudioAction';
import { useWorkspace } from './workspace-context';

type Source = {
  id: string;
  title: string;
  status: string;
  kind: string;
  chapters: Array<{ title: string }>;
};
type Choices = {
  sources: Source[];
  templates: Array<{ id: string; name: string; defaultCategory: string }>;
};

const LENGTHS = ['auto', 2000, 4000, 6000] as const;
const POLL_MS = 3000;

function sameList(a: string[], b: string[]) {
  return a.length === b.length && [...a].sort().join() === [...b].sort().join();
}

export default function SetupStep() {
  const t = useTranslations('admin.studio');
  const { piece, busy, locked, refresh, notify, go } = useWorkspace();
  const { run, pending } = useStudioAction(refresh, notify);
  const readOnly = busy || locked || pending;

  const [goal, setGoal] = useState(piece.brief.goal);
  const [audience, setAudience] = useState(piece.brief.audience);
  const [tone, setTone] = useState(piece.brief.tone);
  const [keywords, setKeywords] = useState(piece.brief.keywords);
  const [length, setLength] = useState<number | 'auto'>(
    piece.brief.targetLength
  );
  const [templateId, setTemplateId] = useState(piece.templateId ?? '');
  const [category, setCategory] = useState(piece.category as ContentCategory);
  const [selected, setSelected] = useState<string[]>(piece.selection.sourceIds);
  const [chapters, setChapters] = useState<Record<string, number[]>>(
    piece.selection.chapters
  );
  const [choices, setChoices] = useState<Choices | null>(null);
  const [adding, setAdding] = useState<'new' | 'library' | null>(null);
  const [confirming, setConfirming] = useState(false);
  const [openChapters, setOpenChapters] = useState<string | null>(null);
  const goalRef = useRef<HTMLTextAreaElement>(null);

  // A new article starts here: put the cursor in the goal without scrolling
  // the steps and title out of view.
  useEffect(() => {
    if (!piece.brief.goal && !locked)
      goalRef.current?.focus({ preventScroll: true });
  }, [piece.brief.goal, locked]);

  const load = useCallback(
    () =>
      listPieceChoicesAction(piece.id).then((r) => {
        if (!r.ok) return;
        setChoices((before) => {
          // Material added from here is meant for this article: tick it.
          if (before) {
            const known = new Set(before.sources.map((s) => s.id));
            const added = r.data.sources
              .filter((s) => !known.has(s.id))
              .map((s) => s.id);
            if (added.length) setSelected((sel) => [...sel, ...added]);
          }
          return r.data;
        });
        // Sources unlinked since they were selected cannot be shown or unticked.
        const listed = new Set(r.data.sources.map((s) => s.id));
        setSelected((sel) => sel.filter((id) => listed.has(id)));
      }),
    [piece.id]
  );

  useEffect(() => {
    void load();
  }, [load]);

  // Keep watching material that is still being processed.
  const processing = choices?.sources.some(
    (s) =>
      s.kind !== 'pdf' && (s.status === 'pending' || s.status === 'processing')
  );
  useEffect(() => {
    if (!processing) return;
    const timer = window.setTimeout(() => void load(), POLL_MS);
    return () => window.clearTimeout(timer);
  }, [processing, choices, load]);

  const brief = {
    goal: goal.trim(),
    audience: audience.trim(),
    tone: tone.trim(),
    keywords,
    targetLength: length,
  };
  const selection = {
    sourceIds: selected,
    chapters: Object.fromEntries(
      Object.entries(chapters).filter(([id]) => selected.includes(id))
    ),
  };
  const selectionChanged =
    !sameList(selected, piece.selection.sourceIds) ||
    JSON.stringify(selection.chapters) !==
      JSON.stringify(piece.selection.chapters);
  const dirty =
    selectionChanged ||
    brief.goal !== piece.brief.goal ||
    brief.audience !== piece.brief.audience ||
    brief.tone !== piece.brief.tone ||
    !sameList(keywords, piece.brief.keywords) ||
    length !== piece.brief.targetLength ||
    templateId !== (piece.templateId ?? '') ||
    category !== piece.category;

  const readyIds = new Set(
    (choices?.sources ?? [])
      .filter((s) => s.status === 'ready')
      .map((s) => s.id)
  );
  const hasReady = selected.some((id) => readyIds.has(id));
  const blocked = !brief.goal
    ? t('setup.needGoal')
    : !hasReady
      ? t('setup.needSource')
      : null;
  const hasOutline = piece.outline.length > 0;
  const hasDraft = piece.sections.length > 0;

  const save = () =>
    updatePieceSetupAction(piece.id, {
      brief,
      selection,
      templateId: templateId || null,
      category,
    });

  // The category is the kind of post; its template follows unless the
  // editor already chose one made for that category.
  function changeCategory(next: ContentCategory) {
    setCategory(next);
    const current = choices?.templates.find((x) => x.id === templateId);
    if (current?.defaultCategory === next) return;
    const match = choices?.templates.find((x) => x.defaultCategory === next);
    if (match) setTemplateId(match.id);
  }

  function createOutline() {
    setConfirming(false);
    void run(async () => {
      const saved = await save();
      return saved.ok ? startRunAction(piece.id, 'outline') : saved;
    });
  }

  function toggle(id: string) {
    setSelected((s) =>
      s.includes(id) ? s.filter((x) => x !== id) : [...s, id]
    );
    setChapters((c) => {
      const next = { ...c };
      delete next[id];
      return next;
    });
  }

  function toggleChapter(source: Source, index: number) {
    const all = source.chapters.map((_, i) => i);
    const current = chapters[source.id] ?? all;
    const next = current.includes(index)
      ? current.filter((i) => i !== index)
      : [...current, index].sort((a, b) => a - b);
    if (next.length === 0) return toggle(source.id);
    setChapters((c) => ({ ...c, [source.id]: next }));
  }

  const custom = length !== 'auto' && !LENGTHS.includes(length as never);

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <Card title={t('setup.briefTitle')}>
          <div className="space-y-5">
            <Field label={t('brief.goal')} info={t('info.goal')} required>
              {(p) => (
                <TextArea
                  {...p}
                  rows={3}
                  ref={goalRef}
                  value={goal}
                  disabled={readOnly}
                  placeholder={t('newArticle.goalPlaceholder')}
                  onChange={(e) => setGoal(e.target.value)}
                />
              )}
            </Field>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label={t('brief.audience')} info={t('info.audience')}>
                {(p) => (
                  <TextInput
                    {...p}
                    value={audience}
                    disabled={readOnly}
                    placeholder={t('setup.audiencePlaceholder')}
                    onChange={(e) => setAudience(e.target.value)}
                  />
                )}
              </Field>
              <Field label={t('brief.tone')} info={t('info.tone')}>
                {(p) => (
                  <TextInput
                    {...p}
                    value={tone}
                    disabled={readOnly}
                    placeholder={t('setup.tonePlaceholder')}
                    onChange={(e) => setTone(e.target.value)}
                  />
                )}
              </Field>
            </div>
            <Field label={t('setup.keywords')} info={t('info.keywords')}>
              {(p) => (
                <KeywordInput
                  {...p}
                  value={keywords}
                  onChange={setKeywords}
                  disabled={readOnly}
                  removeLabel={(k) => t('setup.removeKeyword', { keyword: k })}
                />
              )}
            </Field>
            <fieldset className="space-y-1.5">
              <legend className="float-left text-sm font-medium text-slate-700">
                {t('setup.length')}
              </legend>
              <span className="ml-1 inline-flex align-middle">
                <InfoFor label={t('setup.length')} info={t('info.length')} />
              </span>
              <div className="clear-both flex flex-wrap items-center gap-1.5">
                {LENGTHS.map((l) => (
                  <button
                    key={l}
                    type="button"
                    disabled={readOnly}
                    aria-pressed={length === l}
                    onClick={() => setLength(l)}
                    className={`rounded-full px-3 py-1.5 text-xs font-semibold transition-colors disabled:cursor-not-allowed ${length === l ? 'bg-primaryColor text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'}`}
                  >
                    {l === 'auto'
                      ? t('setup.lengthAuto')
                      : t('setup.lengthChars', { count: l })}
                  </button>
                ))}
                <label className="ml-1 flex items-center gap-2 text-xs text-slate-500">
                  {t('setup.lengthCustom')}
                  <input
                    type="number"
                    min={200}
                    step={100}
                    disabled={readOnly}
                    value={custom ? length : ''}
                    onChange={(e) =>
                      setLength(
                        Number(e.target.value) > 0
                          ? Number(e.target.value)
                          : 'auto'
                      )
                    }
                    className="w-24 rounded-lg border border-slate-200 px-2 py-1 text-sm shadow-sm focus:border-primaryColor focus:outline-none focus:ring-2 focus:ring-primaryColor/15"
                  />
                </label>
              </div>
            </fieldset>
            <div className="grid gap-5 sm:grid-cols-2">
              <Field label={t('brief.category')} info={t('info.category')}>
                {(p) => (
                  <Select
                    {...p}
                    value={category}
                    disabled={readOnly}
                    onChange={(e) =>
                      changeCategory(e.target.value as ContentCategory)
                    }
                  >
                    {ARTICLE_CREATE_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {t(`category.${c}`)}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <Field label={t('brief.template')} info={t('info.template')}>
                {(p) => (
                  <Select
                    {...p}
                    value={templateId}
                    disabled={readOnly || !choices}
                    onChange={(e) => setTemplateId(e.target.value)}
                  >
                    <option value="">{t('setup.noTemplate')}</option>
                    {choices?.templates.map((x) => (
                      <option key={x.id} value={x.id}>
                        {x.name}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
            </div>
          </div>
        </Card>

        <Card
          title={t('setup.materialTitle')}
          info={t('info.material')}
          className="self-start"
        >
          {!choices ? (
            <div className="space-y-3">
              <Skeleton className="h-5 w-full" />
              <Skeleton className="h-5 w-4/5" />
            </div>
          ) : choices.sources.length === 0 ? (
            <div className="py-6 text-center">
              <FileText
                className="mx-auto h-6 w-6 text-slate-300"
                aria-hidden
              />
              <p className="mt-2 text-sm font-medium text-slate-700">
                {t('setup.noMaterial')}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {t('setup.noMaterialHint')}
              </p>
            </div>
          ) : (
            <ul className="-mx-2 space-y-0.5">
              {choices.sources.map((s) => {
                const usable = s.status === 'ready';
                const on = selected.includes(s.id);
                const picked = chapters[s.id]?.length ?? s.chapters.length;
                return (
                  <li
                    key={s.id}
                    className="rounded-lg px-2 py-2 hover:bg-slate-50"
                  >
                    <div className="flex items-start gap-3">
                      <input
                        id={`src-${s.id}`}
                        type="checkbox"
                        className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-primaryColor"
                        disabled={!usable || readOnly}
                        checked={on}
                        onChange={() => toggle(s.id)}
                      />
                      <label
                        htmlFor={`src-${s.id}`}
                        className="min-w-0 flex-1 text-sm"
                      >
                        <span
                          className={`block truncate font-medium ${usable ? 'text-slate-900' : 'text-slate-500'}`}
                        >
                          {s.title}
                        </span>
                        <span className="mt-0.5 flex items-center gap-2 text-xs text-slate-500">
                          {t(`kind.${s.kind}`)}
                          {!usable && (
                            <SourceStatusBadge
                              status={s.status as never}
                              error={null}
                            />
                          )}
                          {s.kind === 'pdf' && s.status === 'stored' && (
                            <span>{t('setup.pdfNotUsed')}</span>
                          )}
                        </span>
                      </label>
                      {on && s.chapters.length > 1 && (
                        <button
                          type="button"
                          aria-expanded={openChapters === s.id}
                          onClick={() =>
                            setOpenChapters((o) => (o === s.id ? null : s.id))
                          }
                          className="flex shrink-0 items-center gap-1 rounded-md px-1.5 py-0.5 text-xs text-slate-500 hover:bg-slate-100"
                        >
                          {t('setup.chapters', {
                            picked,
                            total: s.chapters.length,
                          })}
                          <ChevronDown
                            className={`h-3.5 w-3.5 transition-transform ${openChapters === s.id ? 'rotate-180' : ''}`}
                            aria-hidden
                          />
                        </button>
                      )}
                    </div>
                    {on && openChapters === s.id && (
                      <ul className="ml-7 mt-2 space-y-1 border-l border-slate-200 pl-3">
                        {s.chapters.map((c, i) => (
                          <li key={i}>
                            <label className="flex items-center gap-2 text-xs text-slate-600">
                              <input
                                type="checkbox"
                                className="h-3.5 w-3.5 rounded border-slate-300 accent-primaryColor"
                                disabled={readOnly}
                                checked={(
                                  chapters[s.id] ?? s.chapters.map((_, j) => j)
                                ).includes(i)}
                                onChange={() => toggleChapter(s, i)}
                              />
                              {c.title}
                            </label>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
          {!locked && (
            <div className="-mx-5 -mb-4 mt-4 flex gap-2 border-t border-slate-100 px-5 py-3">
              <Button
                size="sm"
                className="flex-1"
                icon={<Library className="h-3.5 w-3.5" aria-hidden />}
                disabled={readOnly}
                onClick={() => setAdding('library')}
              >
                {t('topics.linkExisting')}
              </Button>
              <Button
                size="sm"
                className="flex-1"
                icon={<Plus className="h-3.5 w-3.5" aria-hidden />}
                disabled={readOnly}
                onClick={() => setAdding('new')}
              >
                {t('setup.addMaterial')}
              </Button>
            </div>
          )}
        </Card>
      </div>

      {!locked && (
        <CommandBar
          hint={
            blocked ??
            (dirty
              ? t('bar.unsaved')
              : hasOutline
                ? t('setup.outlineExists')
                : t('setup.selectedCount', {
                    selected: selected.length,
                    total: choices?.sources.length ?? selected.length,
                  }))
          }
        >
          {dirty && (
            <BarButton disabled={readOnly} onClick={() => void run(save)}>
              {t('bar.save')}
            </BarButton>
          )}
          {hasOutline && !dirty ? (
            <>
              <BarButton
                disabled={readOnly || Boolean(blocked)}
                onClick={() => setConfirming(true)}
              >
                {t('setup.recreateOutline')}
              </BarButton>
              <BarPrimary onClick={() => go('outline')}>
                {t('setup.toOutline')}
              </BarPrimary>
            </>
          ) : (
            <BarPrimary
              busy={pending}
              disabled={readOnly || Boolean(blocked)}
              onClick={() =>
                hasOutline ? setConfirming(true) : createOutline()
              }
            >
              {t('brief.createOutline')}
            </BarPrimary>
          )}
        </CommandBar>
      )}

      {adding === 'new' && (
        <AddSourceDialog
          projectId={piece.projectId}
          onClose={() => setAdding(null)}
          onAdded={() => {
            setAdding(null);
            void load();
          }}
        />
      )}
      {adding === 'library' && (
        <AdminDialog
          title={t('topics.linkExisting')}
          onClose={() => setAdding(null)}
        >
          <SourceLibrary
            projectId={piece.projectId}
            linkedIds={choices?.sources.map((s) => s.id) ?? []}
            onChanged={() => void load()}
          />
        </AdminDialog>
      )}
      {confirming && (
        <ConfirmDialog
          title={t('setup.confirmTitle')}
          confirmLabel={t('setup.recreateOutline')}
          onClose={() => setConfirming(false)}
          onConfirm={createOutline}
        >
          <p>
            {hasDraft ? t('setup.confirmDraft') : t('setup.confirmOutline')}
          </p>
          <p>{t('setup.confirmHistory')}</p>
        </ConfirmDialog>
      )}
    </>
  );
}
