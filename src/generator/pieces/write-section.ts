import { generateStructured, type AiCallOptions } from '@/ai/generate';
import * as repairPrompt from '@/ai/prompts/repair.v1';
import * as writePrompt from '@/ai/prompts/write.v1';
import { validateSection } from './grounding';
import {
  briefLines,
  modelSectionSchema,
  type Brief,
  type OutlineSection,
  type Section,
  type StudioBlock,
} from './piece-types';
import { aliasChunks, type Aliases, type LoadedChunk } from './scope';

type WriteInput = {
  brief: Brief;
  template: { instructions: string } | null;
  outline: OutlineSection[];
  section: OutlineSection;
  chunks: LoadedChunk[];
  previousTail: string;
  instruction?: string;
  current?: StudioBlock[];
};

function mapCites(
  blocks: StudioBlock[],
  map: (ref: string) => string
): StudioBlock[] {
  const sentence = <S extends { cite: string[] }>(s: S): S => ({
    ...s,
    cite: s.cite.map(map),
  });
  return blocks.map((b) => {
    switch (b.type) {
      case 'paragraph':
      case 'quote':
      case 'callout':
        return { ...b, sentences: b.sentences.map(sentence) };
      case 'list':
        return { ...b, items: b.items.map(sentence) };
      case 'table':
        return { ...b, cite: b.cite.map(map) };
      default:
        return b;
    }
  });
}

const stripBrackets = (ref: string) => ref.replace(/[[\]]/g, '').trim();

function toIds(blocks: StudioBlock[], aliases: Aliases): StudioBlock[] {
  // Unknown aliases pass through unchanged so the validator reports them.
  return mapCites(
    blocks,
    (ref) =>
      aliases.toId.get(stripBrackets(ref)) ?? `unknown:${stripBrackets(ref)}`
  );
}

/** Drops ids the model invented; the violation is already recorded as a flag. */
function dropUnknown(
  blocks: StudioBlock[],
  allowed: Set<string>
): StudioBlock[] {
  const keep = <S extends { cite: string[] }>(s: S): S => ({
    ...s,
    cite: s.cite.filter((id) => allowed.has(id)),
  });
  return blocks.map((b) => {
    switch (b.type) {
      case 'paragraph':
      case 'quote':
      case 'callout':
        return { ...b, sentences: b.sentences.map(keep) };
      case 'list':
        return { ...b, items: b.items.map(keep) };
      case 'table':
        return keep(b);
      default:
        return b;
    }
  });
}

/** Source text must not be able to close the material delimiter early. */
export const escapeMaterial = (text: string) =>
  text.replace(/<\/material>/gi, '<\\/material>');

function toAliases(blocks: StudioBlock[], aliases: Aliases): StudioBlock[] {
  return mapCites(blocks, (id) => aliases.toAlias.get(id) ?? id);
}

function prompt(input: WriteInput, aliases: Aliases): string {
  return [
    ...briefLines(input.brief),
    `All section headings: ${input.outline.map((o) => `「${o.heading}」`).join(' → ')}`,
    `Write the section 「${input.section.heading}」 — purpose: ${input.section.intent}. About ${input.section.estChars} characters.`,
    input.previousTail &&
      `The previous section ended with: 「${input.previousTail}」`,
    input.instruction &&
      `Editor's instruction for this rewrite: ${input.instruction}`,
    input.current &&
      `Current version of the section:\n${JSON.stringify({ blocks: toAliases(input.current, aliases) })}`,
    '<material>',
    input.chunks
      .map(
        (c) =>
          `[${aliases.toAlias.get(c.id)}] (${c.sourceTitle})\n${escapeMaterial(c.text)}`
      )
      .join('\n\n'),
    '</material>',
  ]
    .filter(Boolean)
    .join('\n');
}

/** Write → validate → one repair → flags. Never rewrites other sections. */
export async function writeSection(
  input: WriteInput,
  options: AiCallOptions = {}
): Promise<Section> {
  const aliases = aliasChunks(input.chunks.map((c) => c.id));
  const allowedIds = new Set(input.chunks.map((c) => c.id));
  const template = input.template?.instructions ?? '';
  const draft = await generateStructured(
    'write',
    {
      schema: modelSectionSchema,
      schemaName: 'article_section',
      instructions: writePrompt.instructions({
        template,
        kind: input.section.kind,
      }),
      prompt: prompt(input, aliases),
    },
    options
  );
  const opts = {
    allowedIds,
    kind: input.section.kind,
    knownTerms: [
      ...input.outline.map((o) => o.heading),
      input.section.intent,
      ...input.brief.keywords,
    ],
  };
  let blocks = toIds(draft.blocks, aliases);
  let violations = validateSection(blocks, opts);

  if (violations.length > 0) {
    const repaired = await generateStructured(
      'repair',
      {
        schema: modelSectionSchema,
        schemaName: 'article_section',
        instructions: repairPrompt.instructions(),
        prompt: [
          prompt(input, aliases),
          `Section to fix:\n${JSON.stringify({ blocks: toAliases(blocks, aliases) })}`,
          `Problems:\n${violations.map((v) => `- ${v}`).join('\n')}`,
        ].join('\n\n'),
      },
      options
    );
    const repairedBlocks = toIds(repaired.blocks, aliases);
    const repairedViolations = validateSection(repairedBlocks, opts);
    // Keep whichever version breaks the contract less.
    if (repairedViolations.length <= violations.length) {
      blocks = repairedBlocks;
      violations = repairedViolations;
    }
  }

  return {
    outlineId: input.section.id,
    heading: input.section.heading,
    blocks: dropUnknown(blocks, allowedIds),
    flags: violations,
    enStale: false,
    en: null,
  };
}
