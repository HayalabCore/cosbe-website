export const VERSION = 'finish.v1';

export function instructions(): string {
  return [
    'From the finished Japanese article, write:',
    '- title: an accurate Japanese title (max 60 characters) that promises only what the article delivers;',
    '- excerpt: a 1–2 sentence Japanese summary (max 120 characters);',
    '- seo.title (max 60), seo.description (max 140) in Japanese, seo.keywords: 3–8 Japanese keywords.',
    'Use only what the article says.',
  ].join('\n');
}
