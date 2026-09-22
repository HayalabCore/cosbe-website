'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import {
  createProjectAction,
  listProjectsAction,
  type ProjectDTO,
} from '@/actions/studio-projects';

export default function ProjectList() {
  const t = useTranslations('admin.studio.projects');
  const [projects, setProjects] = useState<ProjectDTO[]>([]);
  const [name, setName] = useState('');

  const [version, setVersion] = useState(0);

  useEffect(() => {
    let cancelled = false;
    void listProjectsAction().then((result) => {
      if (!cancelled && result.ok) setProjects(result.data);
    });
    return () => {
      cancelled = true;
    };
  }, [version]);

  return (
    <section className="space-y-4">
      <form
        className="flex gap-2"
        onSubmit={async (e) => {
          e.preventDefault();
          const r = await createProjectAction({ name });
          if (r.ok) {
            setName('');
            setVersion((v) => v + 1);
          }
        }}
      >
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-label={t('name')}
          placeholder={t('new')}
          className="w-full max-w-sm rounded-md border border-slate-200 px-3 py-2 text-sm"
        />
        <button
          type="submit"
          className="rounded-lg bg-primaryColor px-4 py-2 text-sm font-semibold text-white hover:bg-primaryHover disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {t('create')}
        </button>
      </form>
      {projects.length === 0 ? (
        <p className="text-sm text-slate-500">{t('empty')}</p>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-lg border border-slate-200 bg-white">
          {projects.map((p) => (
            <li key={p.id}>
              <Link
                href={`/admin/studio/projects/${p.id}`}
                className="flex items-center justify-between px-4 py-3 hover:bg-slate-50"
              >
                <span className="font-medium text-slate-900">{p.name}</span>
                <span className="text-sm text-slate-500">
                  {t('sources', { count: p.sourceCount })}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
