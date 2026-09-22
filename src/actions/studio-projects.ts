'use server';

import { z } from 'zod';
import { requirePermission } from '@/lib/authz';
import type { StudioResult } from '@/lib/studio/action-types';
import {
  archiveProject,
  createProject,
  getProject,
  linkSource,
  listProjects,
  listProjectSources,
  unlinkSource,
  updateProject,
} from '@/generator/sources/projects-repository';
import type {
  SourceKind,
  SourceStatus,
} from '@/generator/sources/source-types';

const id = z.uuid();
const fields = z.object({
  name: z.string().trim().min(1).max(120),
  description: z.string().trim().max(1000).default(''),
});

export type ProjectDTO = {
  id: string;
  name: string;
  description: string;
  sourceCount: number;
  updatedAt: string;
};
export type ProjectSourceDTO = {
  id: string;
  kind: SourceKind;
  status: SourceStatus;
  error: string | null;
  title: string;
  language: string | null;
  charCount: number;
};

export async function listProjectsAction(): Promise<
  StudioResult<ProjectDTO[]>
> {
  await requirePermission('studio.use');
  const rows = await listProjects();
  return {
    ok: true,
    data: rows.map((p) => ({
      id: p.id,
      name: p.name,
      description: p.description,
      sourceCount: p._count.sources,
      updatedAt: p.updatedAt.toISOString(),
    })),
  };
}

export async function createProjectAction(input: {
  name: string;
  description?: string;
}): Promise<StudioResult<{ projectId: string }>> {
  const ctx = await requirePermission('studio.use');
  const parsed = fields.safeParse(input);
  if (!parsed.success) return { ok: false, error: 'INVALID_INPUT' };
  const project = await createProject({
    ...parsed.data,
    createdById: ctx.admin.id,
  });
  return { ok: true, data: { projectId: project.id } };
}

export async function updateProjectAction(
  projectId: string,
  input: { name?: string; description?: string }
): Promise<StudioResult<undefined>> {
  await requirePermission('studio.use');
  const parsed = fields.partial().safeParse(input);
  if (!id.safeParse(projectId).success || !parsed.success)
    return { ok: false, error: 'INVALID_INPUT' };
  await updateProject(projectId, parsed.data);
  return { ok: true, data: undefined };
}

export async function archiveProjectAction(
  projectId: string
): Promise<StudioResult<undefined>> {
  await requirePermission('studio.use');
  if (!id.safeParse(projectId).success)
    return { ok: false, error: 'INVALID_INPUT' };
  await archiveProject(projectId);
  return { ok: true, data: undefined };
}

export async function getProjectAction(projectId: string): Promise<
  StudioResult<{
    project: { id: string; name: string; description: string };
    sources: ProjectSourceDTO[];
  }>
> {
  await requirePermission('studio.use');
  if (!id.safeParse(projectId).success)
    return { ok: false, error: 'INVALID_INPUT' };
  const project = await getProject(projectId);
  if (!project || project.archivedAt) return { ok: false, error: 'NOT_FOUND' };
  const sources = await listProjectSources(projectId);
  return {
    ok: true,
    data: {
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
      },
      sources: sources.map((s) => ({
        id: s.id,
        kind: s.kind as SourceKind,
        status: s.status as SourceStatus,
        error: s.error,
        title: s.title,
        language: s.language,
        charCount: s.charCount,
      })),
    },
  };
}

export async function linkSourceAction(
  projectId: string,
  sourceId: string
): Promise<StudioResult<undefined>> {
  const ctx = await requirePermission('studio.use');
  if (!id.safeParse(projectId).success || !id.safeParse(sourceId).success)
    return { ok: false, error: 'INVALID_INPUT' };
  await linkSource(projectId, sourceId, ctx.admin.id);
  return { ok: true, data: undefined };
}

export async function unlinkSourceAction(
  projectId: string,
  sourceId: string
): Promise<StudioResult<undefined>> {
  await requirePermission('studio.use');
  if (!id.safeParse(projectId).success || !id.safeParse(sourceId).success)
    return { ok: false, error: 'INVALID_INPUT' };
  await unlinkSource(projectId, sourceId);
  return { ok: true, data: undefined };
}
