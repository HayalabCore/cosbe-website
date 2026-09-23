'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useLocale, useTranslations } from 'next-intl';
import { FolderOpen, Plus } from 'lucide-react';
import AdminDialog from '@/components/admin/access/AdminDialog';
import { AdminTableSkeleton } from '@/components/admin/AdminSkeletons';
import {
  createProjectAction,
  listProjectsAction,
  type ProjectDTO,
} from '@/actions/studio-projects';
import {
  Button,
  EmptyState,
  Field,
  TextArea,
  TextInput,
  relativeTime,
} from './ui';

function NewTopicDialog({ onClose }: { onClose: () => void }) {
  const t = useTranslations('admin.studio.topics');
  const router = useRouter();
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  return (
    <AdminDialog title={t('new')} onClose={onClose}>
      <form
        className="space-y-4"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError(false);
          try {
            const r = await createProjectAction({
              name: name.trim(),
              description: description.trim(),
            });
            if (r.ok)
              return router.push(`/admin/studio/topics/${r.data.projectId}`);
          } catch {}
          setError(true);
          setBusy(false);
        }}
      >
        <Field label={t('name')} required>
          {(p) => (
            <TextInput
              {...p}
              autoFocus
              value={name}
              placeholder={t('namePlaceholder')}
              onChange={(e) => setName(e.target.value)}
            />
          )}
        </Field>
        <Field label={t('description')} hint={t('descriptionHint')}>
          {(p) => (
            <TextArea
              {...p}
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          )}
        </Field>
        {error && (
          <p role="alert" className="text-sm text-red-600">
            {t('failed')}
          </p>
        )}
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <Button variant="ghost" onClick={onClose}>
            {t('cancel')}
          </Button>
          <Button
            type="submit"
            variant="primary"
            busy={busy}
            disabled={!name.trim()}
          >
            {t('create')}
          </Button>
        </div>
      </form>
    </AdminDialog>
  );
}

export default function TopicList() {
  const t = useTranslations('admin.studio.topics');
  const locale = useLocale();
  const [topics, setTopics] = useState<ProjectDTO[] | null>(null);
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    void listProjectsAction().then((r) => setTopics(r.ok ? r.data : []));
  }, []);

  const newButton = (
    <Button
      variant="primary"
      icon={<Plus className="h-4 w-4" aria-hidden />}
      onClick={() => setCreating(true)}
    >
      {t('new')}
    </Button>
  );

  return (
    <section className="space-y-4">
      {topics === null ? (
        <AdminTableSkeleton rows={3} columns={3} aria-label={t('title')} />
      ) : topics.length === 0 ? (
        <EmptyState
          icon={<FolderOpen className="h-5 w-5" aria-hidden />}
          title={t('emptyTitle')}
          action={newButton}
        >
          {t('empty')}
        </EmptyState>
      ) : (
        <>
          <div className="flex items-center justify-between gap-4">
            <span />
            {newButton}
          </div>
          <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {topics.map((p) => (
              <li key={p.id}>
                <Link
                  href={`/admin/studio/topics/${p.id}`}
                  className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-4 transition-colors hover:border-primaryColor/50 hover:bg-slate-50/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primaryColor/40"
                >
                  <span className="font-semibold text-slate-900">{p.name}</span>
                  <span className="mt-1 line-clamp-2 flex-1 text-sm text-slate-500">
                    {p.description || t('noDescription')}
                  </span>
                  <span className="mt-3 flex items-center justify-between text-xs text-slate-500">
                    <span>{t('sources', { count: p.sourceCount })}</span>
                    <span>{relativeTime(p.updatedAt, locale)}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
      {creating && <NewTopicDialog onClose={() => setCreating(false)} />}
    </section>
  );
}
