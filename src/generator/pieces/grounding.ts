import type { Sentence, StudioBlock } from './piece-types';

const DIGITS = /[0-9０-９]/;
/**
 * A capitalised Latin word (Google, Tanaka) or a long katakana run — likely a
 * name or product. Two-letter acronyms such as AI or DX are not names.
 */
const PROPER_NOUN = /\b[A-Z][a-z]+|\b[A-Z]{3,}\b|[ァ-ヺー]{5,}/;
/** Generic business acronyms that name no one; fine in a transition. */
const COMMON_ACRONYMS = ['SEO', 'KPI', 'ROI', 'CRM', 'API', 'FAQ', 'PDF', 'URL', 'SNS'];

type Opts = {
  allowedIds: Set<string>;
  kind: 'source' | 'boilerplate';
  /** Terms the article is about (headings, brief keywords); fine in connectives. */
  knownTerms?: string[];
};

function short(text: string): string {
  return text.length > 40 ? `${text.slice(0, 40)}…` : text;
}

function withoutKnownTerms(text: string, terms: string[]): string {
  return terms
    .filter((term) => term.trim())
    .sort((a, b) => b.length - a.length)
    .reduce((rest, term) => rest.split(term).join(' '), text);
}

function checkSentence(sentence: Sentence, opts: Opts, out: string[]) {
  const unknown = sentence.cite.filter((id) => !opts.allowedIds.has(id));
  if (unknown.length)
    out.push(`Unknown citation on "${short(sentence.text)}".`);
  if (sentence.connective) {
    const rest = withoutKnownTerms(sentence.text, [
      ...COMMON_ACRONYMS,
      ...(opts.knownTerms ?? []),
    ]);
    if (DIGITS.test(rest) || PROPER_NOUN.test(rest)) {
      out.push(
        `Connective sentence states a fact: "${short(sentence.text)}". Cite it or remove the fact.`
      );
    }
    return;
  }
  if (opts.kind === 'source' && sentence.cite.length === 0) {
    out.push(`No citation for "${short(sentence.text)}".`);
  }
}

/** The grounding contract, enforced in code. Returns human-readable violations. */
export function validateSection(blocks: StudioBlock[], opts: Opts): string[] {
  if (blocks.length === 0) return ['The section is empty.'];
  const out: string[] = [];
  let cited = false;
  const sentences = (list: Sentence[]) => {
    if (list.length === 0) out.push('A block has no text.');
    list.forEach((s) => checkSentence(s, opts, out));
    cited ||= list.some((s) => !s.connective && s.cite.length > 0);
  };
  for (const block of blocks) {
    switch (block.type) {
      case 'paragraph':
      case 'quote':
      case 'callout':
        sentences(block.sentences);
        break;
      case 'list':
        sentences(block.items);
        break;
      case 'table':
        if (block.cite.some((id) => !opts.allowedIds.has(id)))
          out.push('Unknown citation on a table.');
        if (opts.kind === 'source' && block.cite.length === 0)
          out.push('A table in a source section needs citations.');
        cited ||= block.cite.length > 0;
        break;
      case 'heading3':
        break;
    }
  }
  if (opts.kind === 'source' && !cited)
    out.push('The section cites no source passage.');
  return out;
}
