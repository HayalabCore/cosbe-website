import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { NonRetryableRunError } from '../runs/run-types';
import { parseRunInput } from './piece-context';

describe('parseRunInput', () => {
  const schema = z.object({ sectionId: z.string() });

  it('returns parsed data on success', () => {
    expect(parseRunInput(schema, { sectionId: 'a' })).toEqual({
      sectionId: 'a',
    });
  });

  it('throws NonRetryableRunError on invalid input', () => {
    expect(() => parseRunInput(schema, { sectionId: 1 })).toThrow(
      NonRetryableRunError
    );
    expect(() => parseRunInput(schema, {})).toThrow(/Invalid run input/);
  });
});
