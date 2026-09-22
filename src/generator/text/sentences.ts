export type Sentence = { text: string; start: number; end: number };

/**
 * JA sentences end at 。！？ (full or half width); EN at . ! ? followed by
 * whitespace; blank lines always break. Offsets index into `text`.
 */
const BREAK = /[。！？!?](?:[」』）)]*)|\.(?=\s)|[!?](?=\s)|\n\s*\n/g;

export function splitSentences(text: string): Sentence[] {
  const out: Sentence[] = [];
  let start = 0;
  for (const match of text.matchAll(BREAK)) {
    const end = match.index + match[0].length;
    push(text, start, end, out);
    start = end;
  }
  push(text, start, text.length, out);
  return out;
}

function push(text: string, from: number, to: number, out: Sentence[]) {
  let start = from;
  let end = to;
  while (start < end && /\s/.test(text[start])) start++;
  while (end > start && /\s/.test(text[end - 1])) end--;
  if (end > start) out.push({ text: text.slice(start, end), start, end });
}
