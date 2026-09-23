'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import AdminDialog from '@/components/admin/access/AdminDialog';
import { createPieceAction } from '@/actions/studio-pieces';
import {
  createProjectAction,
  listProjectsAction,
  type ProjectDTO,
} from '@/actions/studio-projects';
import { ARTICLE_CREATE_CATEGORIES } from '@/lib/api/article-create-metadata';
import type { ContentCategory } from '@/types';
import { Button, Field, Select, TextInput } from '../ui';

const NEW = '__new__';

/**
 * The two things an article needs before it can start: the topic whose
 * material it may cite (picked or named here), and the kind of post it will
 * become, which also picks the template. Everything else happens in Setup.
 */
export default function NewArticleDialog({
  topicId: fixedTopic,
  onClose,
}: {
  /** Opened from a topic page: the topic is already chosen. */
  topicId?: string;
  onClose: () => void;
}) {
  const t = useTranslations('admin.studio');
  const router = useRouter();
  // Topics are stored as studio projects.
  const [topics, setTopics] = useState<ProjectDTO[] | null>(null);
  const [topicId, setTopicId] = useState(fixedTopic ?? '');
  const [topicName, setTopicName] = useState('');
  const [category, setCategory] = useState<ContentCategory>('useful-info');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (fixedTopic) return;
    void listProjectsAction().then((r) => {
      const list = r.ok ? r.data : [];
      setTopics(list);
      setTopicId((current) => current || (list[0]?.id ?? NEW));
    });
  }, [fixedTopic]);

  const creatingTopic = topicId === NEW;
  const ready = creatingTopic ? topicName.trim() : topicId;

  async function submit() {
    if (!ready || busy) return;
    setBusy(true);
    setError(null);
    try {
      let target = topicId;
      if (creatingTopic) {
        const created = await createProjectAction({ name: topicName.trim() });
        if (!created.ok) throw new Error(created.error);
        target = created.data.projectId;
      }
      const piece = await createPieceAction({ projectId: target, category });
      if (!piece.ok) throw new Error(piece.error);
      router.push(`/admin/studio/pieces/${piece.data.pieceId}`);
    } catch {
      setError(t('newArticle.failed'));
      setBusy(false);
    }
  }

  return (
    <AdminDialog title={t('newArticle.title')} onClose={onClose}>
      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        {!fixedTopic && (
          <Field label={t('newArticle.topic')}>
            {(props) =>
              topics === null ? (
                <div className="h-9 animate-pulse rounded-lg bg-slate-100" />
              ) : (
                <Select
                  {...props}
                  autoFocus
                  value={topicId}
                  onChange={(e) => setTopicId(e.target.value)}
                >
                  {topics.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                  <option value={NEW}>{t('newArticle.newTopic')}</option>
                </Select>
              )
            }
          </Field>
        )}
        {creatingTopic && (
          <Field label={t('newArticle.topicName')} required>
            {(props) => (
              <TextInput
                {...props}
                autoFocus
                value={topicName}
                placeholder={t('newArticle.topicNamePlaceholder')}
                onChange={(e) => setTopicName(e.target.value)}
              />
            )}
          </Field>
        )}
        <fieldset className="space-y-1.5">
          <legend className="text-sm font-medium text-slate-700">
            {t('newArticle.category')}
          </legend>
          <div className="grid grid-cols-2 gap-2">
            {ARTICLE_CREATE_CATEGORIES.map((c) => (
              <label
                key={c}
                className={`flex cursor-pointer items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm ring-1 transition-colors ${
                  category === c
                    ? 'bg-blue-50/60 font-semibold text-slate-900 ring-primaryColor'
                    : 'text-slate-600 ring-slate-200 hover:bg-slate-50'
                }`}
              >
                <input
                  type="radio"
                  name="category"
                  value={c}
                  checked={category === c}
                  onChange={() => setCategory(c)}
                  className="h-4 w-4 accent-primaryColor"
                />
                {t(`category.${c}`)}
              </label>
            ))}
          </div>
        </fieldset>
        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <Button variant="ghost" onClick={onClose}>
            {t('newArticle.cancel')}
          </Button>
          <Button type="submit" variant="primary" busy={busy} disabled={!ready}>
            {t('newArticle.create')}
          </Button>
        </div>
      </form>
    </AdminDialog>
  );
}
