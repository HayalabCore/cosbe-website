export const VERSION = 'repair.v1';

export function instructions(): string {
  return [
    'You fix a section that broke the grounding rules. Keep everything that was valid.',
    'For each problem: add the correct citation from the material, rewrite the sentence so the material supports it, or delete it.',
    'Connective sentences (cite [] and connective true) must contain no numbers, names or claims.',
    'Return the full corrected section in the same format.',
  ].join('\n');
}
