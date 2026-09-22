import { describe, expect, it } from 'vitest';
import { toActiveRunDTO, toPieceDTO } from './piece-dto';
import type { PieceData } from '@/generator/pieces/pieces-repository';

const data = {
  id: 'p1', projectId: 'pr', templateId: null, stage: 'review', title: 'T', titleEn: null,
  excerpt: null, excerptEn: null, seo: null,
  brief: { goal: 'g', audience: '', keywords: [], tone: '', targetLength: 'auto' },
  selection: { sourceIds: [], chapters: {} }, outline: [], gaps: [], sections: [],
  category: 'notice', authorId: null, articleId: null, handedOffAt: null, createdById: null,
  createdAt: new Date('2026-09-24T00:00:00Z'), updatedAt: new Date('2026-09-24T00:01:00Z'),
} as PieceData;

describe('piece DTOs', () => {
  it('serializes dates and attaches extras', () => {
    const dto = toPieceDTO(data, { activeRun: null, lastRunError: 'boom', article: null });
    expect(dto.updatedAt).toBe('2026-09-24T00:01:00.000Z');
    expect(dto.handedOffAt).toBeNull();
    expect(dto.lastRunError).toBe('boom');
  });

  it('maps an active run with step statuses', () => {
    const run = {
      id: 'r', kind: 'write', status: 'running', error: null,
      steps: [{ key: 'section:a', status: 'succeeded' }, { key: 'section:b', status: 'running' }],
    };
    expect(toActiveRunDTO(run as never)).toEqual({
      id: 'r', kind: 'write', status: 'running', error: null,
      steps: [{ key: 'section:a', status: 'succeeded' }, { key: 'section:b', status: 'running' }],
    });
    expect(toActiveRunDTO(null)).toBeNull();
  });
});
