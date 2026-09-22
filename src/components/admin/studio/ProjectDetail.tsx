'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  getProjectAction,
  unlinkSourceAction,
  type ProjectSourceDTO,
} from '@/actions/studio-projects';
import SourceLibrary from './SourceLibrary';
import SourceStatusBadge from './SourceStatusBadge';

export default function ProjectDetail({ projectId }: { projectId: string }) {
  const t = useTranslations('admin.studio');
  const [name, setName] = useState('');
  const [sources, setSources] = useState<ProjectSourceDTO[]>([]);

  const [version, setVersion] = useState(0);
  const reload = () => setVersion((v) => v + 1);

  useEffect(() => {
    let cancelled = false;
    void getProjectAction(projectId).then((result) => {
      if (cancelled || !result.ok) return;
      setName(result.data.project.name);
      setSources(result.data.sources);
    });
    return () => {
      cancelled = true;
    };
  }, [projectId, version]);

  return (
    <div className="space-y-6">
      <Link href="/admin/studio/projects" className="text-sm text-slate-500">
        ← {t('projects.back')}
      </Link>
      <h2 className="text-xl font-semibold text-slate-900">{name}</h2>
      {sources.length === 0 ? (
        <p className="text-sm text-slate-500">{t('projects.noSources')}</p>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
          {sources.map((s) => (
            <li
              key={s.id}
              className="flex items-center justify-between px-4 py-3 text-sm"
            >
              <span className="font-medium text-slate-900">{s.title}</span>
              <span className="flex items-center gap-3">
                <SourceStatusBadge status={s.status} error={s.error} />
                <button
                  type="button"
                  onClick={() =>
                    void unlinkSourceAction(projectId, s.id).then(reload)
                  }
                  className="text-slate-600 underline"
                >
                  {t('projects.unlink')}
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}
      <h3 className="text-sm font-semibold text-slate-700">
        {t('projects.linkExisting')}
      </h3>
      <SourceLibrary
        projectId={projectId}
        linkedIds={sources.map((s) => s.id)}
        onChanged={reload}
      />
    </div>
  );
}
