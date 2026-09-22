import type { Sentence, StudioBlock } from './piece-types';

const DIGITS = /[0-9０-９]/;
/** Latin capitalised word or a long katakana run — likely a name or product. */
const PROPER_NOUN = /\b[A-Z][A-Za-z]+|[ァ-ヺー]{5,}/;

function short(text: string): string {
  return text.length > 40 ? `${text.slice(0, 40)}…` : text;
}

function checkSentence(
  sentence: Sentence,
  opts: { allowedIds: Set<string>; kind: 'source' | 'boilerplate' },
  out: string[]
) {
  const unknown = sentence.cite.filter((id) => !opts.allowedIds.has(id));
  if (unknown.length) out.push(`Unknown citation on "${short(sentence.text)}".`);
  if (sentence.connective) {
    if (DIGITS.test(sentence.text) || PROPER_NOUN.test(sentence.text)) {
      out.push(`Connective sentence states a fact: "${short(sentence.text)}". Cite it or remove the fact.`);
    }
    return;
  }
  if (opts.kind === 'source' && sentence.cite.length === 0) {
    out.push(`No citation for "${short(sentence.text)}".`);
  }
}

/** The grounding contract, enforced in code. Returns human-readable violations. */
export function validateSection(
  blocks: StudioBlock[],
  opts: { allowedIds: Set<string>; kind: 'source' | 'boilerplate' }
): string[] {
  if (blocks.length === 0) return ['The section is empty.'];
  const out: string[] = [];
  for (const block of blocks) {
    switch (block.type) {
      case 'paragraph':
      case 'quote':
      case 'callout':
        block.sentences.forEach((s) => checkSentence(s, opts, out));
        break;
      case 'list':
        block.items.forEach((s) => checkSentence(s, opts, out));
        break;
      case 'table':
        if (block.cite.some((id) => !opts.allowedIds.has(id))) out.push('Unknown citation on a table.');
        if (opts.kind === 'source' && block.cite.length === 0) out.push('A table in a source section needs citations.');
        break;
      case 'heading3':
        break;
    }
  }
  return out;
}
