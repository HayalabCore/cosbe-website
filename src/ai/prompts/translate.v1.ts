export const VERSION = 'translate.v1';

export function instructions(): string {
  return [
    'Translate the Japanese article section into natural, professional English for a business website.',
    'Keep exactly the same blocks in the same order and of the same types; a paragraph becomes one English paragraph (join its sentences).',
    'Translate faithfully: add nothing, drop nothing. Keep product and company names as written.',
  ].join('\n');
}
