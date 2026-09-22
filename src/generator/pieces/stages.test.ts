import { describe, expect, it } from 'vitest';
import {
  canHandOff,
  canStartOutline,
  canStartWriting,
  canTranslate,
  isLocked,
  stageAfterOutlineEdit,
} from './stages';
import type { Section } from './piece-types';

const brief = {
  goal: '導入手順を説明',
  audience: '',
  keywords: [],
  tone: '',
  targetLength: 'auto' as const,
};
const section = (over: Partial<Section> = {}): Section => ({
  outlineId: 'o1',
  heading: 'H',
  blocks: [{ type: 'heading3', text: 'x' }],
  flags: [],
  enStale: false,
  en: null,
  ...over,
});

describe('stage rules', () => {
  it('outline needs sources and a goal', () => {
    expect(
      canStartOutline({ selection: { sourceIds: [], chapters: {} }, brief })
    ).toMatch(/source/i);
    expect(
      canStartOutline({
        selection: { sourceIds: ['s'], chapters: {} },
        brief: { ...brief, goal: ' ' },
      })
    ).toMatch(/goal/i);
    expect(
      canStartOutline({ selection: { sourceIds: ['s'], chapters: {} }, brief })
    ).toBeNull();
    expect(
      canStartOutline(
        { selection: { sourceIds: ['s'], chapters: {} }, brief },
        [{ id: 's', status: 'pending' }]
      )
    ).toMatch(/processing/i);
    expect(
      canStartOutline(
        { selection: { sourceIds: ['s'], chapters: {} }, brief },
        [{ id: 'other', status: 'ready' }]
      )
    ).toMatch(/project/i);
  });

  it('writing needs at least one outline section', () => {
    expect(canStartWriting({ outline: [] })).not.toBeNull();
  });

  it('translate needs written sections', () => {
    expect(canTranslate({ sections: [] })).not.toBeNull();
    expect(canTranslate({ sections: [section()] })).toBeNull();
  });

  it('handoff needs a title and sections, from review or ready only', () => {
    expect(
      canHandOff({ stage: 'review', sections: [section()], title: '' })
    ).toMatch(/title/i);
    expect(
      canHandOff({ stage: 'writing', sections: [section()], title: 'T' })
    ).not.toBeNull();
    expect(
      canHandOff({ stage: 'ready', sections: [section()], title: 'T' })
    ).toBeNull();
  });

  it('locks after handoff and rewinds on outline edits', () => {
    expect(isLocked('handed_off')).toBe(true);
    expect(isLocked('review')).toBe(false);
    expect(stageAfterOutlineEdit('review')).toBe('outline');
    expect(stageAfterOutlineEdit('brief')).toBe('brief');
  });
});
