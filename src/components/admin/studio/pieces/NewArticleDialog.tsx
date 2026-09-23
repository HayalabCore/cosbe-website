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
import { Button, Field, Select, TextArea, TextInput } from '../ui';

const NEW = '__new__';

/**
 * One step from "I want an article" to a workspace: pick (or name) the
 * project whose material it draws on, and say what the article is for.
 */
export default function NewArticleDialog({
  projectId: fixedProject,
  onClose,
}: {
  /** Opened from a project page: the project is already chosen. */
  projectId?: string;
  onClose: () => void;
}) {
  const t = useTranslations('admin.studio.newArticle');
  const router = useRouter();
  const [projects, setProjects] = useState<ProjectDTO[] | null>(null);
  const [projectId, setProjectId] = useState(fixedProject ?? '');
  const [projectName, setProjectName] = useState('');
  const [goal, setGoal] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (fixedProject) return;
    void listProjectsAction().then((r) => {
      const list = r.ok ? r.data : [];
      setProjects(list);
      setProjectId((current) => current || (list[0]?.id ?? NEW));
    });
  }, [fixedProject]);

  const creatingProject = projectId === NEW;
  const ready =
    goal.trim() && (creatingProject ? projectName.trim() : projectId);

  async function submit() {
    if (!ready || busy) return;
    setBusy(true);
    setError(null);
    try {
      let target = projectId;
      if (creatingProject) {
        const created = await createProjectAction({ name: projectName.trim() });
        if (!created.ok) throw new Error(created.error);
        target = created.data.projectId;
      }
      const piece = await createPieceAction({
        projectId: target,
        goal: goal.trim(),
      });
      if (!piece.ok) throw new Error(piece.error);
      router.push(`/admin/studio/pieces/${piece.data.pieceId}`);
    } catch {
      setError(t('failed'));
      setBusy(false);
    }
  }

  return (
    <AdminDialog title={t('title')} onClose={onClose}>
      <form
        className="space-y-5"
        onSubmit={(e) => {
          e.preventDefault();
          void submit();
        }}
      >
        <Field label={t('goal')} hint={t('goalHint')} required>
          {(props) => (
            <TextArea
              {...props}
              autoFocus
              rows={3}
              value={goal}
              placeholder={t('goalPlaceholder')}
              onChange={(e) => setGoal(e.target.value)}
            />
          )}
        </Field>
        {!fixedProject && (
          <Field label={t('project')} hint={t('projectHint')}>
            {(props) =>
              projects === null ? (
                <div className="h-9 animate-pulse rounded-lg bg-slate-100" />
              ) : (
                <Select
                  {...props}
                  value={projectId}
                  onChange={(e) => setProjectId(e.target.value)}
                >
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                  <option value={NEW}>{t('newProject')}</option>
                </Select>
              )
            }
          </Field>
        )}
        {creatingProject && (
          <Field label={t('projectName')} required>
            {(props) => (
              <TextInput
                {...props}
                value={projectName}
                placeholder={t('projectNamePlaceholder')}
                onChange={(e) => setProjectName(e.target.value)}
              />
            )}
          </Field>
        )}
        {error && (
          <p role="alert" className="text-sm text-red-600">
            {error}
          </p>
        )}
        <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
          <Button variant="ghost" onClick={onClose}>
            {t('cancel')}
          </Button>
          <Button type="submit" variant="primary" busy={busy} disabled={!ready}>
            {t('create')}
          </Button>
        </div>
      </form>
    </AdminDialog>
  );
}
