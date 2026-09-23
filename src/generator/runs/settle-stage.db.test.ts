import { randomUUID } from 'node:crypto';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { prisma } from '@/lib/prisma';
import {
  createPiece,
  getPiece,
  readPiece,
  updatePiece,
} from '../pieces/pieces-repository';
import type { OutlineSection, Section } from '../pieces/piece-types';
import { cancelPieceRuns, createRun, markRunFailed } from './runs-repository';

const adminId = randomUUID();
let projectId: string;

const row = (id: string): OutlineSection => ({
  id,
  heading: id,
  intent: '',
  chunkIds: [],
  estChars: 100,
  kind: 'source',
  stale: false,
});
const section = (outlineId: string, en: Section['en'] = null): Section => ({
  outlineId,
  heading: outlineId,
  flags: [],
  enStale: false,
  en,
  blocks: [{ type: 'heading3', text: 'x' }],
});

async function pieceWithRun(
  stage: 'writing' | 'translating',
  patch: Parameters<typeof updatePiece>[1]
) {
  const piece = await createPiece({
    projectId,
    createdById: adminId,
    templateId: null,
    category: 'useful-info',
  });
  await updatePiece(piece.id, {
    outline: [row('o1'), row('o2')],
    ...patch,
    stage,
  });
  const run = await createRun(prisma, {
    kind: stage === 'writing' ? 'write' : 'translate',
    createdById: adminId,
    pieceId: piece.id,
  });
  await prisma.studioRun.update({
    where: { id: run.id },
    data: { status: 'running' },
  });
  return { pieceId: piece.id, runId: run.id };
}

const stageOf = async (id: string) => readPiece((await getPiece(id))!).stage;

beforeAll(async () => {
  await prisma.adminUser.create({
    data: { id: adminId, email: `settle-${adminId}@test.local` },
  });
  projectId = (
    await prisma.studioProject.create({
      data: { name: 'p', createdById: adminId },
    })
  ).id;
});

afterAll(async () => {
  await prisma.studioRun.deleteMany({ where: { createdById: adminId } });
  await prisma.studioProject.deleteMany({ where: { createdById: adminId } });
  await prisma.adminUser.delete({ where: { id: adminId } });
});

describe('stage settlement after a run ends early', () => {
  it('a failed half-written write returns to outline and keeps its sections', async () => {
    const { pieceId, runId } = await pieceWithRun('writing', {
      sections: [section('o1')],
    });
    await markRunFailed(runId, 'boom');
    const piece = readPiece((await getPiece(pieceId))!);
    expect(piece.stage).toBe('outline');
    expect(piece.sections).toHaveLength(1);
  });

  it('a cancelled half-written write returns to outline, not review', async () => {
    const { pieceId } = await pieceWithRun('writing', {
      sections: [section('o1')],
    });
    await cancelPieceRuns(pieceId);
    expect(await stageOf(pieceId)).toBe('outline');
  });

  it('a failed write whose sections are all done and finished lands in review', async () => {
    const { pieceId, runId } = await pieceWithRun('writing', {
      sections: [section('o1'), section('o2')],
      excerpt: 'E',
    });
    await markRunFailed(runId, 'boom');
    expect(await stageOf(pieceId)).toBe('review');
  });

  it('a failed half-translated piece returns to review', async () => {
    const en = { heading: 'H', blocks: [] };
    const { pieceId, runId } = await pieceWithRun('translating', {
      sections: [section('o1', en), section('o2')],
      excerpt: 'E',
    });
    await markRunFailed(runId, 'boom');
    expect(await stageOf(pieceId)).toBe('review');
  });
});
