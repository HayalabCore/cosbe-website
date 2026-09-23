import { describe, expect, it } from 'vitest';
import {
  canHandOff,
  canStartOutline,
  canStartWriting,
  canTranslate,
  isComplete,
  isLocked,
  isTranslated,
  settledStage,
  stageAfterOutlineEdit,
} from './stages';
import type { OutlineSection, Section } from './piece-types';

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

const row = (
  id: string,
  over: Partial<OutlineSection> = {}
): OutlineSection => ({
  id,
  heading: id,
  intent: '',
  chunkIds: [],
  estChars: 100,
  kind: 'source',
  stale: false,
  ...over,
});

/** Two outline rows, both written, finish done. */
function complete(
  over: Partial<{
    outline: OutlineSection[];
    sections: Section[];
    excerpt: string | null;
    titleEn: string | null;
  }> = {}
) {
  return {
    outline: [row('o1'), row('o2')],
    sections: [section({ outlineId: 'o1' }), section({ outlineId: 'o2' })],
    excerpt: 'E',
    titleEn: null,
    ...over,
  };
}

describe('piece completeness', () => {
  it('is complete only when every outline row is written, fresh and finished', () => {
    expect(isComplete(complete())).toBe(true);
    expect(
      isComplete(complete({ sections: [section({ outlineId: 'o1' })] }))
    ).toBe(false);
    expect(
      isComplete(complete({ outline: [row('o1'), row('o2', { stale: true })] }))
    ).toBe(false);
    expect(isComplete(complete({ excerpt: null }))).toBe(false);
    expect(isComplete(complete({ outline: [], sections: [] }))).toBe(false);
  });

  it('is translated when every section has fresh EN and an EN title', () => {
    const en = { heading: 'H', blocks: [] };
    const done = [
      section({ outlineId: 'o1', en }),
      section({ outlineId: 'o2', en }),
    ];
    expect(isTranslated({ sections: done, titleEn: 'T' })).toBe(true);
    expect(isTranslated({ sections: done, titleEn: null })).toBe(false);
    expect(
      isTranslated({
        sections: [done[0], section({ outlineId: 'o2', en, enStale: true })],
        titleEn: 'T',
      })
    ).toBe(false);
  });

  it('settles a run-less writing piece to review only when complete', () => {
    expect(settledStage({ ...complete(), stage: 'writing' })).toBe('review');
    expect(
      settledStage({
        ...complete({ sections: [section({ outlineId: 'o1' })] }),
        stage: 'writing',
      })
    ).toBe('outline');
  });

  it('settles a run-less translating piece by what is translated', () => {
    const en = { heading: 'H', blocks: [] };
    expect(settledStage({ ...complete(), stage: 'translating' })).toBe(
      'review'
    );
    expect(
      settledStage({
        ...complete({
          sections: [
            section({ outlineId: 'o1', en }),
            section({ outlineId: 'o2', en }),
          ],
          titleEn: 'T',
        }),
        stage: 'translating',
      })
    ).toBe('ready');
    expect(
      settledStage({ ...complete({ excerpt: null }), stage: 'translating' })
    ).toBe('outline');
  });

  it('leaves settled stages alone', () => {
    expect(settledStage({ ...complete(), stage: 'review' })).toBe('review');
    expect(
      settledStage({ ...complete({ excerpt: null }), stage: 'outline' })
    ).toBe('outline');
  });
});

describe('stage rules', () => {
  it('outline needs sources and a goal', () => {
    expect(
      canStartOutline({ selection: { sourceIds: [], chapters: {} }, brief })
    ).toBe('NO_SOURCES');
    expect(
      canStartOutline({
        selection: { sourceIds: ['s'], chapters: {} },
        brief: { ...brief, goal: ' ' },
      })
    ).toBe('NO_GOAL');
    expect(
      canStartOutline({ selection: { sourceIds: ['s'], chapters: {} }, brief })
    ).toBeNull();
    expect(
      canStartOutline(
        { selection: { sourceIds: ['s'], chapters: {} }, brief },
        [{ id: 's', status: 'pending' }]
      )
    ).toBe('SOURCES_NOT_READY');
    expect(
      canStartOutline(
        { selection: { sourceIds: ['s'], chapters: {} }, brief },
        [{ id: 'other', status: 'ready' }]
      )
    ).toBe('NO_SOURCES');
  });

  it('outline ignores selected sources that are no longer linked', () => {
    const p = { selection: { sourceIds: ['gone', 'a'], chapters: {} }, brief };
    expect(canStartOutline(p, [{ id: 'a', status: 'ready' }])).toBeNull();
    expect(
      canStartOutline(p, [{ id: 'a', status: 'processing' }])
    ).not.toBeNull();
    expect(
      canStartOutline(
        { selection: { sourceIds: ['gone'], chapters: {} }, brief },
        [{ id: 'a', status: 'ready' }]
      )
    ).not.toBeNull();
  });

  it('writing needs at least one outline section', () => {
    expect(canStartWriting({ outline: [] })).toBe('NO_OUTLINE');
  });

  it('translate needs a complete article', () => {
    expect(canTranslate(complete({ excerpt: null }))).toBe('INCOMPLETE');
    expect(canTranslate(complete())).toBeNull();
  });

  it('handoff needs a complete article with a title, from review or ready only', () => {
    expect(canHandOff({ ...complete(), stage: 'review', title: '' })).toBe(
      'NO_TITLE'
    );
    expect(
      canHandOff({ ...complete(), stage: 'writing', title: 'T' })
    ).toBe('NOT_REVIEWED');
    expect(
      canHandOff({ ...complete(), stage: 'ready', title: 'T' })
    ).toBeNull();
    expect(
      canHandOff({
        ...complete({ sections: [section({ outlineId: 'o1' })] }),
        stage: 'review',
        title: 'T',
      })
    ).not.toBeNull();
  });

  it('locks after handoff and rewinds on outline edits', () => {
    expect(isLocked('handed_off')).toBe(true);
    expect(isLocked('review')).toBe(false);
    expect(stageAfterOutlineEdit('review')).toBe('outline');
    expect(stageAfterOutlineEdit('brief')).toBe('brief');
  });
});
