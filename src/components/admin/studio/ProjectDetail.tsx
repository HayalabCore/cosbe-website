'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  ChevronLeft,
  FilePenLine,
  Library,
  Pencil,
  Plus,
  X,
} from 'lucide-react';
import AdminDialog from '@/components/admin/access/AdminDialog';
import { listPiecesAction } from '@/actions/studio-pieces';
import {
  getProjectAction,
  unlinkSourceAction,
  updateProjectAction,
  type ProjectSourceDTO,
} from '@/actions/studio-projects';
import type { PieceListItemDTO } from '@/lib/studio/piece-dto';
import AddSourceDialog from './AddSourceDialog';
import SourceLibrary from './SourceLibrary';
import SourceStatusBadge from './SourceStatusBadge';
import NewArticleDialog from './pieces/NewArticleDialog';
import { stepOf } from './pieces/steps';
import { Button, Card, Skeleton, TextInput } from './ui';

export default function ProjectDetail({ projectId }: { projectId: string }) {
  const t = useTranslations('admin.studio');
  const [project, setProject] = useState<{
    name: string;
    description: string;
  } | null>(null);
  const [sources, setSources] = useState<ProjectSourceDTO[]>([]);
  const [pieces, setPieces] = useState<PieceListItemDTO[]>([]);
  const [dialog, setDialog] = useState<'add' | 'library' | 'article' | null>(
    null
  );
  const [renaming, setRenaming] = useState<string | null>(null);
  const [missing, setMissing] = useState(false);
  const [version, setVersion] = useState(0);
  const reload = () => setVersion((v) => v + 1);

  useEffect(() => {
    let cancelled = false;
    void getProjectAction(projectId).then((result) => {
      if (cancelled) return;
      if (!result.ok) return setMissing(true);
      setProject(result.data.project);
      setSources(result.data.sources);
    });
    void listPiecesAction({ projectId }).then(
      (r) => !cancelled && r.ok && setPieces(r.data)
    );
    return () => {
      cancelled = true;
    };
  }, [projectId, version]);

  // Material still being processed is watched until it is ready.
  const processing = sources.some(
    (s) =>
      s.kind !== 'pdf' && (s.status === 'pending' || s.status === 'processing')
  );
  useEffect(() => {
    if (!processing) return;
    const timer = window.setTimeout(reload, 3000);
    return () => window.clearTimeout(timer);
  }, [processing, sources]);

  if (missing)
    return (
      <p className="text-sm text-slate-500">
        {t('workspace.errors.NOT_FOUND')}
      </p>
    );

  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Link
          href="/admin/studio/projects"
          className="inline-flex items-center gap-0.5 text-sm text-slate-500 hover:text-slate-900"
        >
          <ChevronLeft className="h-4 w-4" aria-hidden />
          {t('projects.back')}
        </Link>
        <div className="flex flex-wrap items-start justify-between gap-4">
          {!project ? (
            <Skeleton className="h-7 w-64" />
          ) : renaming !== null ? (
            <form
              className="flex items-center gap-2"
              onSubmit={async (e) => {
                e.preventDefault();
                if (renaming.trim())
                  await updateProjectAction(projectId, {
                    name: renaming.trim(),
                  });
                setRenaming(null);
                reload();
              }}
            >
              <TextInput
                autoFocus
                aria-label={t('projects.name')}
                value={renaming}
                onChange={(e) => setRenaming(e.target.value)}
                className="w-72"
              />
              <Button type="submit" variant="primary" size="sm">
                {t('bar.save')}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setRenaming(null)}
              >
                {t('confirm.cancel')}
              </Button>
            </form>
          ) : (
            <div>
              <h2 className="group flex items-center gap-2 text-xl font-bold text-slate-900">
                {project.name}
                <button
                  type="button"
                  aria-label={t('projects.rename')}
                  onClick={() => setRenaming(project.name)}
                  className="rounded-md p-1 text-slate-300 hover:bg-slate-100 hover:text-slate-600"
                >
                  <Pencil className="h-4 w-4" aria-hidden />
                </button>
              </h2>
              {project.description && (
                <p className="mt-1 text-sm text-slate-500">
                  {project.description}
                </p>
              )}
            </div>
          )}
          <Button
            variant="primary"
            icon={<Plus className="h-4 w-4" aria-hidden />}
            onClick={() => setDialog('article')}
          >
            {t('pieces.new')}
          </Button>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <Card
          title={t('projects.material')}
          description={t('projects.materialDescription')}
          actions={
            <>
              <Button
                size="sm"
                variant="ghost"
                icon={<Library className="h-3.5 w-3.5" aria-hidden />}
                onClick={() => setDialog('library')}
              >
                {t('projects.linkExisting')}
              </Button>
              <Button
                size="sm"
                icon={<Plus className="h-3.5 w-3.5" aria-hidden />}
                onClick={() => setDialog('add')}
              >
                {t('setup.addMaterial')}
              </Button>
            </>
          }
          className="self-start"
        >
          {!project ? (
            <Skeleton className="h-5 w-full" />
          ) : sources.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-500">
              {t('projects.noSources')}
            </p>
          ) : (
            <ul className="-mx-2 divide-y divide-slate-100">
              {sources.map((s) => (
                <li
                  key={s.id}
                  className="group flex items-center gap-3 px-2 py-2.5 text-sm"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-slate-900">
                      {s.title}
                    </span>
                    <span className="text-xs text-slate-500">
                      {t(`kind.${s.kind}`)}
                    </span>
                  </span>
                  <SourceStatusBadge status={s.status} error={s.error} />
                  <button
                    type="button"
                    aria-label={t('projects.unlinkNamed', { title: s.title })}
                    title={t('projects.unlink')}
                    onClick={() =>
                      void unlinkSourceAction(projectId, s.id).then(reload)
                    }
                    className="rounded-md p-1 text-slate-300 hover:bg-slate-100 hover:text-slate-600"
                  >
                    <X className="h-4 w-4" aria-hidden />
                  </button>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card title={t('projects.articles')} className="self-start">
          {pieces.length === 0 ? (
            <div className="py-6 text-center">
              <FilePenLine
                className="mx-auto h-6 w-6 text-slate-300"
                aria-hidden
              />
              <p className="mt-2 text-sm text-slate-500">
                {t('projects.noArticles')}
              </p>
            </div>
          ) : (
            <ul className="-mx-2 divide-y divide-slate-100">
              {pieces.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/admin/studio/pieces/${p.id}`}
                    className="flex items-center justify-between gap-3 rounded-lg px-2 py-2.5 text-sm hover:bg-slate-50"
                  >
                    <span className="truncate font-medium text-slate-900">
                      {p.title || t('pieces.untitled')}
                    </span>
                    <span className="shrink-0 text-xs text-slate-500">
                      {p.stage === 'handed_off'
                        ? t(`pieces.tracked.${p.articleStatus ?? 'removed'}`)
                        : t(`steps.${stepOf(p.stage)}`)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      {dialog === 'add' && (
        <AddSourceDialog
          projectId={projectId}
          onClose={() => setDialog(null)}
          onAdded={() => {
            setDialog(null);
            reload();
          }}
        />
      )}
      {dialog === 'library' && (
        <AdminDialog
          title={t('projects.linkExisting')}
          onClose={() => setDialog(null)}
        >
          <SourceLibrary
            projectId={projectId}
            linkedIds={sources.map((s) => s.id)}
            onChanged={reload}
          />
        </AdminDialog>
      )}
      {dialog === 'article' && (
        <NewArticleDialog
          projectId={projectId}
          onClose={() => setDialog(null)}
        />
      )}
    </div>
  );
}
