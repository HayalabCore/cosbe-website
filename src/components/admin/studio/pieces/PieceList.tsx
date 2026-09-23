'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useTranslations } from 'next-intl';
import { createPieceAction, listPiecesAction } from '@/actions/studio-pieces';
import { listProjectsAction, type ProjectDTO } from '@/actions/studio-projects';
import type { PieceListItemDTO } from '@/lib/studio/piece-dto';

export default function PieceList() {
  const t = useTranslations('admin.studio');
  const router = useRouter();
  const [pieces, setPieces] = useState<PieceListItemDTO[]>([]);
  const [projects, setProjects] = useState<ProjectDTO[]>([]);
  const [projectId, setProjectId] = useState('');
  const [creating, setCreating] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    void listPiecesAction().then((r) => r.ok && setPieces(r.data));
    void listProjectsAction().then((r) => r.ok && setProjects(r.data));
  }, []);

  async function create() {
    if (!projectId || creating) return;
    setCreating(true);
    setFailed(false);
    try {
      const result = await createPieceAction({ projectId });
      if (result.ok) {
        router.push(`/admin/studio/pieces/${result.data.pieceId}`);
        return; // stay disabled while navigating
      }
      setFailed(true);
    } catch {
      setFailed(true);
    }
    setCreating(false);
  }

  return (
    <section className="space-y-4">
      <div className="flex gap-2">
        <select value={projectId} onChange={(e) => setProjectId(e.target.value)} aria-label={t('pieces.chooseProject')} className="rounded-md border border-slate-200 px-3 py-2 text-sm">
          <option value="">{t('pieces.chooseProject')}</option>
          {projects.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <button type="button" disabled={!projectId || creating} onClick={() => void create()} className="rounded-lg bg-primaryColor px-4 py-2 text-sm font-semibold text-white hover:bg-primaryHover disabled:opacity-40 disabled:cursor-not-allowed">
          {t('pieces.new')}
        </button>
      </div>
      {failed && <p className="text-sm text-red-600">{t('workspace.errors.FAILED')}</p>}
      {pieces.length === 0 ? (
        <p className="text-sm text-slate-500">{t('pieces.empty')}</p>
      ) : (
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase text-slate-500">
            <tr><th className="py-2">{t('pieces.columns.title')}</th><th>{t('pieces.columns.project')}</th><th>{t('pieces.columns.stage')}</th><th>{t('pieces.columns.updated')}</th></tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {pieces.map((p) => (
              <tr key={p.id}>
                <td className="py-2"><Link href={`/admin/studio/pieces/${p.id}`} className="font-medium text-slate-900 hover:underline">{p.title || t('pieces.untitled')}</Link></td>
                <td className="text-slate-600">{p.projectName}</td>
                <td className="text-slate-600">
                  {t(`stages.${p.stage}`)}
                  {p.stage === 'handed_off' && ` · ${t(`pieces.tracked.${p.articleStatus ?? 'removed'}`)}`}
                </td>
                <td className="text-slate-500">{new Date(p.updatedAt).toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </section>
  );
}
