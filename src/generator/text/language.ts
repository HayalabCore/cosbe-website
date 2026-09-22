const JA = /[぀-ヿ㐀-䶿一-鿿ｦ-ﾟ]/g;
const LATIN = /[A-Za-z]/g;

/** Share of Japanese vs Latin letters decides the source language. */
export function detectLanguage(text: string): 'ja' | 'en' | 'mixed' {
  const ja = text.match(JA)?.length ?? 0;
  const latin = text.match(LATIN)?.length ?? 0;
  const total = ja + latin;
  if (total === 0) return 'mixed';
  const share = ja / total;
  if (share >= 0.6) return 'ja';
  if (share <= 0.1) return 'en';
  return 'mixed';
}
