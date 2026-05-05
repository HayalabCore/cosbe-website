/**
 * Pull current translation values from the DB and write them back to
 * messages/ja.json and messages/en.json.
 *
 * Use this after marketing has edited copy in production and you want to
 * snapshot their changes into the codebase.
 *
 * Usage:
 *   yarn db:pull-translations              # write files
 *   yarn db:pull-translations --dry-run   # preview diff only, no file writes
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadEnvConfig } from '@next/env';
import { prisma } from '../src/lib/prisma';
import {
  flattenMessages,
  unflattenMessages,
} from '../src/lib/translations/flatten';

const DRY_RUN = process.argv.includes('--dry-run');
const LOCALES = ['ja', 'en'] as const;

type Locale = (typeof LOCALES)[number];

function jsonPath(locale: Locale): string {
  return join(process.cwd(), 'messages', `${locale}.json`);
}

function readJson(locale: Locale): Record<string, unknown> {
  return JSON.parse(readFileSync(jsonPath(locale), 'utf8')) as Record<
    string,
    unknown
  >;
}

function formatJson(obj: Record<string, unknown>): string {
  return JSON.stringify(obj, null, 2) + '\n';
}

async function main() {
  loadEnvConfig(process.cwd());

  if (DRY_RUN) {
    console.log('-- DRY RUN: no files will be written --\n');
  }

  for (const locale of LOCALES) {
    console.log(`\n=== ${locale.toUpperCase()} ===`);

    const rows = await prisma.translation.findMany({
      where: { locale },
      select: { keyPath: true, value: true },
      orderBy: { keyPath: 'asc' },
    });

    const currentJson = readJson(locale);
    const currentFlat = flattenMessages(currentJson);
    const currentKeys = new Set(currentFlat.map((r) => r.keyPath));
    const dbKeys = new Set(rows.map((r) => r.keyPath));

    // Keys in DB but not in JSON — orphaned, skip them
    const orphaned = [...dbKeys].filter((k) => !currentKeys.has(k));
    if (orphaned.length > 0) {
      console.warn(
        `  ⚠  ${orphaned.length} key(s) exist in DB but not in messages/${locale}.json (orphaned — skipped):`
      );
      orphaned.slice(0, 10).forEach((k) => console.warn(`     - ${k}`));
      if (orphaned.length > 10) {
        console.warn(`     … and ${orphaned.length - 10} more`);
      }
    }

    // Keys in JSON but not in DB — not yet seeded
    const unseeded = [...currentKeys].filter((k) => !dbKeys.has(k));
    if (unseeded.length > 0) {
      console.warn(
        `  ⚠  ${unseeded.length} key(s) exist in messages/${locale}.json but not in DB (run yarn db:seed-translations):`
      );
      unseeded.slice(0, 10).forEach((k) => console.warn(`     - ${k}`));
      if (unseeded.length > 10) {
        console.warn(`     … and ${unseeded.length - 10} more`);
      }
    }

    // Only write keys that exist in both JSON and DB (DB value wins)
    const mergedFlat = currentFlat.map((row) => {
      const dbRow = rows.find((r) => r.keyPath === row.keyPath);
      return { keyPath: row.keyPath, value: dbRow ? dbRow.value : row.value };
    });

    const changed = mergedFlat.filter((row) => {
      const original = currentFlat.find((r) => r.keyPath === row.keyPath);
      return original && original.value !== row.value;
    });

    if (changed.length === 0) {
      console.log('  ✓ No changes — messages file is already in sync with DB.');
      continue;
    }

    console.log(
      `  ${changed.length} value(s) differ from messages/${locale}.json:`
    );
    changed.slice(0, 10).forEach((row) => {
      const original = currentFlat.find((r) => r.keyPath === row.keyPath)!;
      const preview = (s: string) => (s.length > 60 ? s.slice(0, 60) + '…' : s);
      console.log(`  • ${row.keyPath}`);
      console.log(`      was: ${preview(original.value)}`);
      console.log(`      now: ${preview(row.value)}`);
    });
    if (changed.length > 10) {
      console.log(`  … and ${changed.length - 10} more`);
    }

    if (!DRY_RUN) {
      const updated = unflattenMessages(mergedFlat) as Record<string, unknown>;
      writeFileSync(jsonPath(locale), formatJson(updated), 'utf8');
      console.log(`  ✓ Written messages/${locale}.json`);
    }
  }

  if (DRY_RUN) {
    console.log('\n-- Dry run complete. Run without --dry-run to apply. --');
  } else {
    console.log(
      '\nDone. Commit messages/*.json to snapshot current DB values.'
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
