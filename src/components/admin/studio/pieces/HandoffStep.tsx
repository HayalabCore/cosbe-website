'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import {
  Check,
  CheckCircle2,
  Circle,
  FilePlus2,
  ExternalLink,
  Languages,
  Plus,
} from 'lucide-react';
import {
  addAuthorAction,
  createDraftPostAction,
  duplicatePieceAction,
  listPieceChoicesAction,
  startRunAction,
  updatePieceMetaAction,
  updatePieceSetupAction,
} from '@/actions/studio-pieces';
import { usePermissions } from '@/components/admin/PermissionsContext';
import { ARTICLE_CREATE_CATEGORIES } from '@/lib/api/article-create-metadata';
import { articleDetailHref } from '@/lib/article-paths';
import { sectionPlainText, type EnBlock } from '@/generator/pieces/piece-types';
import type { ContentCategory } from '@/types';
import ConfirmDialog from '../ConfirmDialog';
import KeywordInput from '../KeywordInput';
import {
  Badge,
  Button,
  Card,
  Field,
  Select,
  Skeleton,
  TextArea,
  TextInput,
} from '../ui';
import CommandBar, { BarPrimary } from './CommandBar';
import { errorText } from './errorText';
import { useStudioAction } from './useStudioAction';
import { useWorkspace } from './workspace-context';

type Author = { id: string; name: string; designation: string };

function enText(block: EnBlock): string {
  switch (block.type) {
    case 'paragraph':
    case 'quote':
    case 'heading3':
      return block.text;
    case 'callout':
      return [block.title, block.text].filter(Boolean).join('\n');
    case 'list':
      return block.items.map((i) => `• ${i}`).join('\n');
    case 'table':
      return [
        block.headers.join(' | '),
        ...block.rows.map((r) => r.join(' | ')),
      ].join('\n');
  }
}

function isCategory(value: string): value is ContentCategory {
  return (ARTICLE_CREATE_CATEGORIES as readonly string[]).includes(value);
}

function HandedOff() {
  const t = useTranslations('admin.studio');
  const router = useRouter();
  const { piece } = useWorkspace();
  const [duplicating, setDuplicating] = useState(false);
  const status = piece.article?.status ?? 'removed';
  // The editor may have moved the post to another category after handoff.
  const publicHref =
    piece.article?.status === 'published' && isCategory(piece.article.category)
      ? `/ja${articleDetailHref(piece.article.category, piece.article.slug)}`
      : null;
  return (
    <div className="mx-auto max-w-xl rounded-xl border border-slate-200 bg-white px-8 py-10 text-center">
      <CheckCircle2
        className="mx-auto h-10 w-10 text-emerald-500"
        aria-hidden
      />
      <h2 className="mt-4 text-lg font-bold text-slate-900">
        {t('handoff.title')}
      </h2>
      <p className="mt-1 text-sm text-slate-500">
        {t('handoff.status', { status: t(`pieces.tracked.${status}`) })}
      </p>
      <div className="mt-6 flex flex-wrap justify-center gap-2">
        {piece.article && (
          <Link
            href={`/admin/posts/${piece.article.id}`}
            className="inline-flex items-center gap-2 rounded-lg bg-primaryColor px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-primaryHover"
          >
            {t('handoff.open')}
          </Link>
        )}
        {publicHref && (
          <a
            href={publicHref}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
          >
            <ExternalLink className="h-4 w-4" aria-hidden />
            {t('handoff.view')}
          </a>
        )}
        <Button
          busy={duplicating}
          icon={<FilePlus2 className="h-4 w-4" aria-hidden />}
          onClick={async () => {
            setDuplicating(true);
            const r = await duplicatePieceAction(piece.id);
            if (r.ok) router.push(`/admin/studio/pieces/${r.data.pieceId}`);
            else setDuplicating(false);
          }}
        >
          {t('handoff.duplicate')}
        </Button>
      </div>
    </div>
  );
}

function AddAuthor({ onAdded }: { onAdded: (author: Author) => void }) {
  const t = useTranslations('admin.studio.handoffStep');
  const ts = useTranslations('admin.studio');
  const [name, setName] = useState('');
  const [designation, setDesignation] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  async function add() {
    setBusy(true);
    setError(null);
    try {
      const r = await addAuthorAction({ name, designation });
      if (r.ok) onAdded(r.data);
      else setError(errorText(ts, r));
    } catch {
      setError(errorText(ts, { error: 'FAILED' }));
    }
    setBusy(false);
  }
  return (
    <div className="space-y-2 rounded-lg bg-slate-50 p-3">
      <TextInput
        aria-label={t('authorName')}
        placeholder={t('authorName')}
        value={name}
        onChange={(e) => setName(e.target.value)}
      />
      <TextInput
        aria-label={t('authorRole')}
        placeholder={t('authorRole')}
        value={designation}
        onChange={(e) => setDesignation(e.target.value)}
      />
      {error && (
        <p role="alert" className="text-xs text-red-600">
          {error}
        </p>
      )}
      <Button
        size="sm"
        variant="primary"
        busy={busy}
        disabled={!name.trim() || !designation.trim()}
        onClick={() => void add()}
      >
        {t('addAuthor')}
      </Button>
    </div>
  );
}

function ChecklistItem({
  done,
  optional,
  children,
}: {
  done: boolean;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <li className="flex items-center gap-2.5 text-sm">
      {done ? (
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-emerald-500 text-white">
          <Check className="h-3 w-3" aria-hidden />
        </span>
      ) : (
        <Circle
          className={`h-5 w-5 ${optional ? 'text-slate-300' : 'text-amber-400'}`}
          aria-hidden
        />
      )}
      <span className={done ? 'text-slate-700' : 'text-slate-500'}>
        {children}
      </span>
    </li>
  );
}

export default function HandoffStep() {
  const t = useTranslations('admin.studio');
  const { can } = usePermissions();
  const { piece, busy, locked, refresh, notify } = useWorkspace();
  const { run, pending } = useStudioAction(refresh, notify);
  const [authors, setAuthors] = useState<Author[] | null>(null);
  const [category, setCategory] = useState(piece.category);
  const [authorId, setAuthorId] = useState(piece.authorId ?? '');
  const [excerpt, setExcerpt] = useState(piece.excerpt ?? '');
  const [seoTitle, setSeoTitle] = useState(piece.seo?.title ?? '');
  const [seoDescription, setSeoDescription] = useState(
    piece.seo?.description ?? ''
  );
  const [seoKeywords, setSeoKeywords] = useState(piece.seo?.keywords ?? []);
  const [addingAuthor, setAddingAuthor] = useState(false);
  const [confirming, setConfirming] = useState(false);

  useEffect(() => {
    void listPieceChoicesAction(piece.id).then((r) =>
      setAuthors(r.ok ? r.data.authors : [])
    );
  }, [piece.id]);

  if (piece.stage === 'handed_off') return <HandedOff />;

  // Archived pieces are read-only until restored.
  const disabled = busy || pending || locked;
  const canPost = can('articles.edit');
  const translating = piece.activeRun?.kind === 'translate';
  const translated =
    Boolean(piece.titleEn) && piece.sections.every((s) => s.en && !s.enStale);
  const staleCount = piece.sections.filter((s) => !s.en || s.enStale).length;
  const hasTranslation = piece.sections.some((s) => s.en);

  const seo = {
    title: seoTitle.trim(),
    description: seoDescription.trim(),
    keywords: seoKeywords,
  };
  const setupDirty =
    category !== piece.category || authorId !== (piece.authorId ?? '');
  const metaDirty =
    excerpt.trim() !== (piece.excerpt ?? '') ||
    seo.title !== (piece.seo?.title ?? '') ||
    seo.description !== (piece.seo?.description ?? '') ||
    JSON.stringify(seo.keywords) !== JSON.stringify(piece.seo?.keywords ?? []);
  const dirty = setupDirty || metaDirty;

  async function saveDetails() {
    if (setupDirty) {
      const r = await updatePieceSetupAction(piece.id, {
        category: category as ContentCategory,
        authorId: authorId || null,
      });
      if (!r.ok) return r;
    }
    if (metaDirty) {
      const r = await updatePieceMetaAction(piece.id, {
        excerpt: excerpt.trim(),
        ...(seo.title || seo.description || seo.keywords.length > 0
          ? { seo }
          : {}),
      });
      if (!r.ok) return r;
    }
    return { ok: true as const, data: undefined };
  }

  const blocked = !canPost
    ? t('handoffStep.needPermission')
    : !authorId
      ? t('handoffStep.needAuthor')
      : null;

  return (
    <>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <Card
          title={t('handoffStep.englishTitle')}
          info={t('info.english')}
          description={t('handoffStep.englishDescription')}
          actions={
            hasTranslation && (
              <Button
                size="sm"
                disabled={disabled}
                busy={translating}
                icon={<Languages className="h-3.5 w-3.5" aria-hidden />}
                onClick={() =>
                  void run(() => startRunAction(piece.id, 'translate'))
                }
              >
                {translated
                  ? t('handoffStep.translateAgain')
                  : t('handoffStep.updateTranslation', { count: staleCount })}
              </Button>
            )
          }
          className="self-start"
        >
          {translating && !hasTranslation ? (
            <div className="space-y-3" role="status">
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-5/6" />
            </div>
          ) : !hasTranslation ? (
            <div className="py-8 text-center">
              <Languages
                className="mx-auto h-6 w-6 text-slate-300"
                aria-hidden
              />
              <p className="mt-2 text-sm font-medium text-slate-700">
                {t('handoffStep.noEnglish')}
              </p>
              <p className="mx-auto mt-1 max-w-sm text-xs leading-relaxed text-slate-500">
                {t('handoffStep.noEnglishHint')}
              </p>
              <Button
                className="mt-4"
                variant="secondary"
                disabled={disabled}
                icon={<Languages className="h-4 w-4" aria-hidden />}
                onClick={() =>
                  void run(() => startRunAction(piece.id, 'translate'))
                }
              >
                {t('review.translate')}
              </Button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="grid gap-4 border-b border-slate-100 pb-4 md:grid-cols-2">
                <p className="text-base font-bold text-slate-900">
                  {piece.title}
                </p>
                <p className="text-base font-bold text-slate-900">
                  {piece.titleEn}
                </p>
              </div>
              {piece.sections.map((s) => (
                <div key={s.outlineId} className="grid gap-4 md:grid-cols-2">
                  <div className="whitespace-pre-line text-sm leading-7 text-slate-700">
                    <span className="block font-semibold text-slate-900">
                      {s.heading}
                    </span>
                    {'\n'}
                    {sectionPlainText({ ...s, heading: '' }).trim()}
                  </div>
                  <div className="whitespace-pre-line text-sm leading-7 text-slate-700">
                    {s.en && !s.enStale ? (
                      <>
                        <span className="block font-semibold text-slate-900">
                          {s.en.heading}
                        </span>
                        {'\n'}
                        {s.en.blocks.map(enText).join('\n\n')}
                      </>
                    ) : (
                      <Badge tone="amber">{t('translate.stale')}</Badge>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>

        <div className="space-y-6">
          <Card title={t('handoffStep.detailsTitle')}>
            <div className="space-y-4">
              <Field label={t('brief.category')} info={t('info.category')}>
                {(p) => (
                  <Select
                    {...p}
                    value={category}
                    disabled={disabled}
                    onChange={(e) => setCategory(e.target.value)}
                  >
                    {ARTICLE_CREATE_CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {t(`category.${c}`)}
                      </option>
                    ))}
                  </Select>
                )}
              </Field>
              <Field
                label={t('brief.author')}
                info={t('info.author')}
                required
                hint={
                  authors?.length === 0 ? t('handoffStep.noAuthors') : undefined
                }
              >
                {(p) =>
                  authors === null ? (
                    <Skeleton className="h-9 w-full rounded-lg" />
                  ) : (
                    <div className="space-y-2">
                      <div className="flex gap-2">
                        <Select
                          {...p}
                          value={authorId}
                          disabled={disabled}
                          onChange={(e) => setAuthorId(e.target.value)}
                        >
                          <option value="">
                            {t('handoffStep.chooseAuthor')}
                          </option>
                          {authors.map((a) => (
                            <option key={a.id} value={a.id}>
                              {a.name}（{a.designation}）
                            </option>
                          ))}
                        </Select>
                        {canPost && (
                          <Button
                            variant="secondary"
                            aria-expanded={addingAuthor}
                            aria-label={t('handoffStep.addAuthor')}
                            title={t('handoffStep.addAuthor')}
                            icon={<Plus className="h-4 w-4" aria-hidden />}
                            onClick={() => setAddingAuthor((a) => !a)}
                            className="px-2.5"
                          />
                        )}
                      </div>
                      {addingAuthor && (
                        <AddAuthor
                          onAdded={(author) => {
                            setAuthors((list) =>
                              [
                                ...(list ?? []).filter(
                                  (a) => a.id !== author.id
                                ),
                                author,
                              ].sort((x, y) => x.name.localeCompare(y.name))
                            );
                            setAuthorId(author.id);
                            setAddingAuthor(false);
                          }}
                        />
                      )}
                    </div>
                  )
                }
              </Field>
              <Field label={t('handoffStep.excerpt')} info={t('info.excerpt')}>
                {(p) => (
                  <TextArea
                    {...p}
                    rows={3}
                    value={excerpt}
                    disabled={disabled}
                    onChange={(e) => setExcerpt(e.target.value)}
                  />
                )}
              </Field>
              <details
                className="group rounded-lg border border-slate-200 px-3 py-2"
                open={!piece.seo}
              >
                <summary className="cursor-pointer text-sm font-medium text-slate-700">
                  {t('handoffStep.seo')}
                </summary>
                <div className="mt-3 space-y-4 pb-1">
                  <Field
                    label={t('handoffStep.seoTitle')}
                    info={t('info.seoTitle')}
                    hint={t('handoffStep.chars', { count: seoTitle.length })}
                  >
                    {(p) => (
                      <TextInput
                        {...p}
                        value={seoTitle}
                        disabled={disabled}
                        onChange={(e) => setSeoTitle(e.target.value)}
                      />
                    )}
                  </Field>
                  <Field
                    label={t('handoffStep.seoDescription')}
                    info={t('info.seoDescription')}
                    hint={t('handoffStep.chars', {
                      count: seoDescription.length,
                    })}
                  >
                    {(p) => (
                      <TextArea
                        {...p}
                        rows={3}
                        value={seoDescription}
                        disabled={disabled}
                        onChange={(e) => setSeoDescription(e.target.value)}
                      />
                    )}
                  </Field>
                  <Field
                    label={t('handoffStep.seoKeywords')}
                    info={t('info.seoKeywords')}
                  >
                    {(p) => (
                      <KeywordInput
                        {...p}
                        value={seoKeywords}
                        onChange={setSeoKeywords}
                        disabled={disabled}
                        removeLabel={(k) =>
                          t('setup.removeKeyword', { keyword: k })
                        }
                      />
                    )}
                  </Field>
                </div>
              </details>
              {dirty && (
                <div className="flex items-center justify-between gap-2 border-t border-slate-100 pt-4">
                  <span className="text-xs text-slate-500">
                    {t('bar.unsaved')}
                  </span>
                  <Button
                    size="sm"
                    variant="primary"
                    busy={pending}
                    onClick={() => void run(saveDetails)}
                  >
                    {t('bar.save')}
                  </Button>
                </div>
              )}
            </div>
          </Card>

          <Card title={t('handoffStep.checklist')}>
            <ul className="space-y-2.5">
              <ChecklistItem done>
                {t('handoffStep.checkWritten')}
              </ChecklistItem>
              <ChecklistItem done={Boolean(authorId)}>
                {t('handoffStep.checkAuthor')}
              </ChecklistItem>
              <ChecklistItem done={translated} optional>
                {t('handoffStep.checkEnglish')}
              </ChecklistItem>
            </ul>
          </Card>
        </div>
      </div>

      {!locked && (
        <CommandBar hint={blocked ?? t('handoffStep.hint')}>
          <BarPrimary
            busy={pending}
            disabled={disabled || Boolean(blocked)}
            onClick={() => setConfirming(true)}
          >
            {t('review.handoff')}
          </BarPrimary>
        </CommandBar>
      )}

      {confirming && (
        <ConfirmDialog
          title={t('handoffStep.confirmTitle')}
          confirmLabel={t('review.handoff')}
          busy={pending}
          onClose={() => setConfirming(false)}
          onConfirm={() =>
            void run(async () => {
              const saved = await saveDetails();
              return saved.ok ? createDraftPostAction(piece.id) : saved;
            }).then(() => setConfirming(false))
          }
        >
          <p>{t('handoffStep.confirmBody')}</p>
          {!hasTranslation && <p>{t('handoffStep.confirmNoEnglish')}</p>}
          {hasTranslation && !translated && (
            <p>{t('handoffStep.confirmStaleEnglish', { count: staleCount })}</p>
          )}
        </ConfirmDialog>
      )}
    </>
  );
}
