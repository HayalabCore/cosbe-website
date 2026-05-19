/**
 * Push local JSON translation values into the database WITH history.
 *
 * Unlike `sync-translations` (where DB wins on conflicts), this command
 * forces JSON values into the DB — and writes history entries so every
 * overwritten value is revertable from the CMS admin.
 *
 * Rules:
 *   → NEW    Key in JSON but not in DB → inserted (no history needed).
 *   → UPDATE Key in both, values differ → old DB value saved to history, then updated.
 *   ✓ SKIP   Key in both, values match → nothing to do.
 *   –        Keys only in DB are left alone (use sync-translations for orphan handling).
 *
 * Usage:
 *   yarn db:push-translations              # apply changes
 *   yarn db:push-translations --dry-run    # preview only, no writes
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadEnvConfig } from '@next/env';
import { prisma } from '../src/lib/prisma';
import {
  flattenMessages,
  namespaceFromKeyPath,
} from '../src/lib/translations/flatten';

const DRY_RUN = process.argv.includes('--dry-run');
const LOCALES = ['ja', 'en'] as const;
type Locale = (typeof LOCALES)[number];

const BATCH = 500;
const CHANGED_BY = 'json-push';

function readJson(locale: Locale): Record<string, unknown> {
  const p = join(process.cwd(), 'messages', `${locale}.json`);
  return JSON.parse(readFileSync(p, 'utf8')) as Record<string, unknown>;
}

function preview(s: string, max = 60): string {
  const trimmed = s.replace(/\s+/g, ' ').trim();
  return trimmed.length > max ? trimmed.slice(0, max) + '…' : trimmed;
}

type PushStats = { inserted: number; updated: number; unchanged: number };

async function pushLocale(locale: Locale): Promise<PushStats> {
  const stats: PushStats = { inserted: 0, updated: 0, unchanged: 0 };

  const jsonFlat = flattenMessages(readJson(locale));

  const dbRows = await prisma.translation.findMany({
    where: { locale },
    select: { keyPath: true, value: true },
  });
  const dbMap = new Map(dbRows.map((r) => [r.keyPath, r.value]));

  const toInsert = jsonFlat.filter((r) => !dbMap.has(r.keyPath));
  const toUpdate = jsonFlat.filter((r) => {
    const dbVal = dbMap.get(r.keyPath);
    return dbVal !== undefined && dbVal !== r.value;
  });
  const unchanged = jsonFlat.filter((r) => dbMap.get(r.keyPath) === r.value);

  stats.unchanged = unchanged.length;

  // ── Insert new keys ────────────────────────────────────────────────────────
  if (toInsert.length > 0) {
    console.log(
      `\n  + INSERT  ${toInsert.length} new key${toInsert.length !== 1 ? 's' : ''}:`
    );
    toInsert.forEach((r) =>
      console.log(`      + ${r.keyPath}  "${preview(r.value)}"`)
    );
    if (!DRY_RUN) {
      for (let i = 0; i < toInsert.length; i += BATCH) {
        await prisma.translation.createMany({
          data: toInsert.slice(i, i + BATCH).map((r) => ({
            keyPath: r.keyPath,
            locale,
            value: r.value,
            namespace: namespaceFromKeyPath(r.keyPath),
            updatedBy: CHANGED_BY,
          })),
          skipDuplicates: true,
        });
      }
    }
    stats.inserted = toInsert.length;
  }

  // ── Update existing keys (with history) ────────────────────────────────────
  if (toUpdate.length > 0) {
    console.log(
      `\n  ~ UPDATE  ${toUpdate.length} key${toUpdate.length !== 1 ? 's' : ''} (old values → history):`
    );
    toUpdate.forEach((r) => {
      const oldVal = dbMap.get(r.keyPath)!;
      console.log(`      ~ ${r.keyPath}`);
      console.log(`          DB was:   "${preview(oldVal)}"`);
      console.log(`          JSON now: "${preview(r.value)}"`);
    });

    if (!DRY_RUN) {
      for (let i = 0; i < toUpdate.length; i += BATCH) {
        const batch = toUpdate.slice(i, i + BATCH);
        await prisma.$transaction(
          batch.flatMap((r) => {
            const oldVal = dbMap.get(r.keyPath)!;
            return [
              prisma.translationHistory.create({
                data: {
                  keyPath: r.keyPath,
                  locale,
                  previousValue: oldVal,
                  changedBy: CHANGED_BY,
                },
              }),
              prisma.translation.update({
                where: { keyPath_locale: { keyPath: r.keyPath, locale } },
                data: {
                  value: r.value,
                  namespace: namespaceFromKeyPath(r.keyPath),
                  updatedBy: CHANGED_BY,
                },
              }),
            ];
          })
        );
      }
    }
    stats.updated = toUpdate.length;
  }

  return stats;
}

async function main() {
  loadEnvConfig(process.cwd());

  if (DRY_RUN) {
    console.log('── DRY RUN: no DB rows will be written ──\n');
  }

  const totals: PushStats = { inserted: 0, updated: 0, unchanged: 0 };

  for (const locale of LOCALES) {
    console.log(`\n════ ${locale.toUpperCase()} ════`);
    const stats = await pushLocale(locale);
    totals.inserted += stats.inserted;
    totals.updated += stats.updated;
    totals.unchanged += stats.unchanged;

    if (stats.inserted === 0 && stats.updated === 0) {
      console.log(`  ✓  All ${stats.unchanged} keys match — nothing to push.`);
    }
  }

  console.log('\n────────────────────────────────');
  console.log(`  + inserted  : ${totals.inserted}`);
  console.log(
    `  ~ updated   : ${totals.updated}  (old values saved to history)`
  );
  console.log(`  ✓ unchanged : ${totals.unchanged}`);

  if (DRY_RUN) {
    console.log('\n── Dry run complete. Run without --dry-run to apply. ──');
  } else if (totals.updated > 0) {
    console.log(
      '\nAll overwritten values are in translation_history — revertable from the CMS.'
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
