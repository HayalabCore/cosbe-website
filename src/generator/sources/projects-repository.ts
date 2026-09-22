import { prisma } from '@/lib/prisma';

export function createProject(input: {
  name: string;
  description?: string;
  createdById: string;
}) {
  return prisma.studioProject.create({
    data: {
      name: input.name,
      description: input.description ?? '',
      createdById: input.createdById,
    },
  });
}

export function listProjects() {
  return prisma.studioProject.findMany({
    where: { archivedAt: null },
    orderBy: { updatedAt: 'desc' },
    include: { _count: { select: { sources: true } } },
  });
}

export function getProject(id: string) {
  return prisma.studioProject.findUnique({ where: { id } });
}

export function updateProject(
  id: string,
  data: { name?: string; description?: string }
) {
  return prisma.studioProject.update({ where: { id }, data });
}

export async function archiveProject(id: string): Promise<void> {
  await prisma.studioProject.update({
    where: { id },
    data: { archivedAt: new Date() },
  });
}

export async function linkSource(
  projectId: string,
  sourceId: string,
  addedBy: string
): Promise<void> {
  await prisma.studioProjectSource.upsert({
    where: { projectId_sourceId: { projectId, sourceId } },
    create: { projectId, sourceId, addedBy },
    update: {},
  });
  await prisma.studioProject.update({
    where: { id: projectId },
    data: { updatedAt: new Date() },
  });
}

export async function unlinkSource(
  projectId: string,
  sourceId: string
): Promise<void> {
  await prisma.studioProjectSource.deleteMany({
    where: { projectId, sourceId },
  });
}

export async function listProjectSources(projectId: string) {
  const links = await prisma.studioProjectSource.findMany({
    where: { projectId },
    orderBy: { addedAt: 'asc' },
    include: {
      source: {
        select: {
          id: true,
          kind: true,
          status: true,
          error: true,
          title: true,
          language: true,
          charCount: true,
          meta: true,
        },
      },
    },
  });
  return links.map((link) => link.source);
}
