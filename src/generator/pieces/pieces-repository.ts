import { Prisma, type StudioPiece } from '@prisma/client';
import { prisma } from '@/lib/prisma';
import {
  briefSchema,
  outlineSectionSchema,
  sectionSchema,
  selectionSchema,
  seoSchema,
  type Brief,
  type OutlineSection,
  type PieceSeo,
  type PieceStage,
  type Section,
  type Selection,
} from './piece-types';

const json = (value: unknown) => value as Prisma.InputJsonValue;

export type PieceData = {
  id: string;
  projectId: string;
  templateId: string | null;
  stage: PieceStage;
  title: string;
  titleEn: string | null;
  excerpt: string | null;
  excerptEn: string | null;
  seo: PieceSeo | null;
  brief: Brief;
  selection: Selection;
  outline: OutlineSection[];
  gaps: string[];
  sections: Section[];
  category: string;
  authorId: string | null;
  articleId: string | null;
  handedOffAt: Date | null;
  createdById: string | null;
  createdAt: Date;
  updatedAt: Date;
};

function parseArray<T>(schema: { safeParse(v: unknown): { success: boolean; data?: T } }, value: unknown): T[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    const parsed = schema.safeParse(item);
    return parsed.success ? [parsed.data as T] : [];
  });
}

/** Parses JSON columns defensively: bad rows become empty values, never throw. */
export function readPiece(row: StudioPiece): PieceData {
  return {
    ...row,
    stage: row.stage as PieceStage,
    seo: seoSchema.safeParse(row.seo).data ?? null,
    brief: briefSchema.parse(briefSchema.safeParse(row.brief).success ? row.brief : {}),
    selection: selectionSchema.parse(selectionSchema.safeParse(row.selection).success ? row.selection : {}),
    outline: parseArray<OutlineSection>(outlineSectionSchema, row.outline),
    gaps: Array.isArray(row.gaps) ? (row.gaps as unknown[]).filter((g): g is string => typeof g === 'string') : [],
    sections: parseArray<Section>(sectionSchema, row.sections),
  };
}

export function createPiece(input: {
  projectId: string;
  createdById: string;
  templateId: string | null;
  category: string;
}) {
  return prisma.studioPiece.create({ data: input });
}

export function getPiece(id: string) {
  return prisma.studioPiece.findUnique({ where: { id } });
}

export function listPieces(filter: { projectId?: string } = {}) {
  return prisma.studioPiece.findMany({
    where: { projectId: filter.projectId },
    orderBy: { updatedAt: 'desc' },
    take: 200,
    include: {
      project: { select: { name: true } },
      article: { select: { status: true, slug: true, category: true } },
    },
  });
}

export type PiecePatch = Partial<{
  stage: PieceStage;
  title: string;
  titleEn: string | null;
  excerpt: string | null;
  excerptEn: string | null;
  seo: PieceSeo | null;
  brief: Brief;
  selection: Selection;
  outline: OutlineSection[];
  gaps: string[];
  sections: Section[];
  category: string;
  templateId: string | null;
  authorId: string | null;
  articleId: string | null;
  handedOffAt: Date | null;
}>;

export async function updatePiece(id: string, patch: PiecePatch): Promise<void> {
  const { seo, brief, selection, outline, gaps, sections, ...rest } = patch;
  await prisma.studioPiece.update({
    where: { id },
    data: {
      ...rest,
      ...(seo !== undefined ? { seo: seo === null ? Prisma.DbNull : json(seo) } : {}),
      ...(brief ? { brief: json(brief) } : {}),
      ...(selection ? { selection: json(selection) } : {}),
      ...(outline ? { outline: json(outline) } : {}),
      ...(gaps ? { gaps: json(gaps) } : {}),
      ...(sections ? { sections: json(sections) } : {}),
    },
  });
}

export async function setStage(id: string, stage: PieceStage): Promise<void> {
  await prisma.studioPiece.update({ where: { id }, data: { stage } });
}

/** Replaces the section with the same outlineId and keeps outline order. */
export async function saveSection(pieceId: string, section: Section): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const row = await tx.studioPiece.findUniqueOrThrow({ where: { id: pieceId } });
    const piece = readPiece(row);
    const others = piece.sections.filter((s) => s.outlineId !== section.outlineId);
    const order = new Map(piece.outline.map((o, i) => [o.id, i]));
    const sections = [...others, section].sort(
      (a, b) => (order.get(a.outlineId) ?? 1e9) - (order.get(b.outlineId) ?? 1e9)
    );
    await tx.studioPiece.update({ where: { id: pieceId }, data: { sections: json(sections) } });
  });
}

export async function takeSnapshot(pieceId: string, reason: string, runId?: string) {
  const piece = readPiece(await prisma.studioPiece.findUniqueOrThrow({ where: { id: pieceId } }));
  return prisma.studioPieceSnapshot.create({
    data: {
      pieceId, reason, runId: runId ?? null, stage: piece.stage, title: piece.title,
      outline: json(piece.outline), gaps: json(piece.gaps), sections: json(piece.sections),
    },
  });
}

export function listSnapshots(pieceId: string) {
  return prisma.studioPieceSnapshot.findMany({
    where: { pieceId },
    orderBy: { createdAt: 'desc' },
    take: 50,
    select: { id: true, reason: true, stage: true, createdAt: true },
  });
}

export async function restoreSnapshot(snapshotId: string): Promise<string> {
  const snap = await prisma.studioPieceSnapshot.findUniqueOrThrow({ where: { id: snapshotId } });
  await prisma.studioPiece.update({
    where: { id: snap.pieceId },
    data: {
      stage: snap.stage, title: snap.title, outline: json(snap.outline),
      gaps: json(snap.gaps), sections: json(snap.sections),
    },
  });
  return snap.pieceId;
}

export function listTemplates() {
  return prisma.studioTemplate.findMany({ orderBy: [{ isDefault: 'desc' }, { name: 'asc' }] });
}

export function getTemplate(id: string) {
  return prisma.studioTemplate.findUnique({ where: { id } });
}

export function getDefaultTemplate() {
  return prisma.studioTemplate.findFirst({ where: { isDefault: true } });
}

export type TemplateInput = { name: string; description: string; instructions: string; defaultCategory: string };

export function createTemplate(input: TemplateInput & { createdById: string }) {
  return prisma.studioTemplate.create({ data: input });
}

export function updateTemplate(id: string, input: Partial<TemplateInput>) {
  return prisma.studioTemplate.update({ where: { id }, data: input });
}

export async function deleteTemplate(id: string): Promise<void> {
  await prisma.studioTemplate.delete({ where: { id } });
}
