const MAX_TERMS = 10;

/**
 * Content words for the keyword half of retrieval. Japanese has no spaces, so
 * hiragana runs (particles, verb endings) act as separators and the kanji,
 * katakana and Latin runs between them become terms. Terms are matched
 * literally, so model-written text can never inject query syntax.
 */
const SEPARATORS =
  /[\s、。，．,.!?！？「」『』（）()[\]{}・:：;；"'`“”‘’〜~\-+*/\\|<>=&^%$#@]+|[ぁ-ゖ]+/u;

export function keywordTerms(query: string): string[] {
  const terms: string[] = [];
  for (const part of query.split(SEPARATORS)) {
    const term = part.trim();
    if (term.length < 2 || terms.includes(term)) continue;
    terms.push(term);
    if (terms.length === MAX_TERMS) break;
  }
  return terms;
}
