import { describe, expect, it } from 'vitest';
import { canOpen, stepOf } from './steps';

describe('steps', () => {
  it('folds machine stages into the step the editor is on', () => {
    expect(stepOf('sources')).toBe('setup');
    expect(stepOf('brief')).toBe('setup');
    expect(stepOf('writing')).toBe('draft');
    expect(stepOf('translating')).toBe('handoff');
    expect(stepOf('handed_off')).toBe('handoff');
  });

  it('opens earlier steps but not later ones', () => {
    expect(canOpen('setup', 'review')).toBe(true);
    expect(canOpen('draft', 'review')).toBe(true);
    expect(canOpen('handoff', 'outline')).toBe(false);
    expect(canOpen('draft', 'brief')).toBe(false);
  });

  it('lets a finished draft move on to the handoff', () => {
    expect(canOpen('handoff', 'review')).toBe(true);
    expect(canOpen('handoff', 'writing')).toBe(false);
  });
});
