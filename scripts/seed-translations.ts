/**
 * Seed `translations` from messages/ja.json + messages/en.json.
 *
 * Default: insert missing (key_path, locale) rows only — never overwrites edited values.
 * With --force: wipe translations + translation_history, then insert from JSON (disaster recovery).
 *
 * Usage (from repo root, DATABASE_URL set):
 *   yarn db:seed-translations
 *   yarn db:seed-translations --force
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadEnvConfig } from '@next/env';
import { prisma } from '../src/lib/prisma';
import {
  flattenMessages,
  namespaceFromKeyPath,
} from '../src/lib/translations/flatten';

const BATCH = 500;

async function main() {
  loadEnvConfig(process.cwd());
  const force = process.argv.includes('--force');

  const jaPath = join(process.cwd(), 'messages', 'ja.json');
  const enPath = join(process.cwd(), 'messages', 'en.json');
  const ja = JSON.parse(readFileSync(jaPath, 'utf8')) as unknown;
  const en = JSON.parse(readFileSync(enPath, 'utf8')) as unknown;

  const jaRows = flattenMessages(ja).map((r) => ({
    keyPath: r.keyPath,
    locale: 'ja' as const,
    value: r.value,
    namespace: namespaceFromKeyPath(r.keyPath),
  }));
  const enRows = flattenMessages(en).map((r) => ({
    keyPath: r.keyPath,
    locale: 'en' as const,
    value: r.value,
    namespace: namespaceFromKeyPath(r.keyPath),
  }));
  const all = [...jaRows, ...enRows];

  if (force) {
    await prisma.translationHistory.deleteMany();
    await prisma.translation.deleteMany();
    console.log('Cleared translation_history and translations (--force).');
  }

  let inserted = 0;
  for (let i = 0; i < all.length; i += BATCH) {
    const batch = all.slice(i, i + BATCH);
    const res = await prisma.translation.createMany({
      data: batch,
      skipDuplicates: !force,
    });
    inserted += res.count;
  }

  if (force) {
    console.log(`Inserted ${inserted} translation rows from JSON.`);
  } else {
    const skipped = all.length - inserted;
    console.log(
      `Inserted ${inserted} new row(s); ${skipped} already present (skipped).`
    );
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
