/**
 * Bidirectional translation sync between messages/*.json and the database.
 *
 * Rules:
 *   → DB   Key exists in JSON but not in DB → insert with JSON value as default.
 *   ← DB   Key exists in both but DB value differs from JSON → update JSON (DB wins).
 *   ✓      Key exists in both with equal values → nothing to do.
 *   ⚠      Key exists in DB but not in JSON → marked isOrphaned=true (filter in Studio to delete).
 *   ↺      Key exists in JSON and was previously orphaned → isOrphaned reset to false.
 *
 * Usage:
 *   yarn db:sync-translations              # apply changes
 *   yarn db:sync-translations --dry-run   # preview only, no writes
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { loadEnvConfig } from '@next/env';
import { prisma } from '../src/lib/prisma';
import {
  flattenMessages,
  namespaceFromKeyPath,
  unflattenMessages,
} from '../src/lib/translations/flatten';

const DRY_RUN = process.argv.includes('--dry-run');
const LOCALES = ['ja', 'en'] as const;
type Locale = (typeof LOCALES)[number];

const BATCH = 500;

function jsonPath(locale: Locale) {
  return join(process.cwd(), 'messages', `${locale}.json`);
}

function readJson(locale: Locale): Record<string, unknown> {
  return JSON.parse(readFileSync(jsonPath(locale), 'utf8')) as Record<
    string,
    unknown
  >;
}

function preview(s: string, max = 60): string {
  const trimmed = s.replace(/\s+/g, ' ').trim();
  return trimmed.length > max ? trimmed.slice(0, max) + '…' : trimmed;
}

type SyncStats = {
  pushed: number;
  pulled: number;
  inSync: number;
  orphaned: number;
  unorphaned: number;
};

async function syncLocale(locale: Locale): Promise<SyncStats> {
  const stats: SyncStats = {
    pushed: 0,
    pulled: 0,
    inSync: 0,
    orphaned: 0,
    unorphaned: 0,
  };

  const currentJson = readJson(locale);
  const jsonFlat = flattenMessages(currentJson);
  const jsonMap = new Map(jsonFlat.map((r) => [r.keyPath, r.value]));

  const dbRows = await prisma.translation.findMany({
    where: { locale },
    select: { keyPath: true, value: true, isOrphaned: true },
  });
  const dbMap = new Map(dbRows.map((r) => [r.keyPath, r]));

  // ── → DB: keys in JSON missing from DB (new code keys) ───────────────────
  const toPush = jsonFlat.filter((r) => !dbMap.has(r.keyPath));
  if (toPush.length > 0) {
    console.log(
      `\n  → DB  (${toPush.length} new key${toPush.length !== 1 ? 's' : ''} from JSON):`
    );
    toPush.forEach((r) =>
      console.log(`        + ${r.keyPath}  "${preview(r.value)}"`)
    );
    if (!DRY_RUN) {
      for (let i = 0; i < toPush.length; i += BATCH) {
        await prisma.translation.createMany({
          data: toPush.slice(i, i + BATCH).map((r) => ({
            keyPath: r.keyPath,
            locale,
            value: r.value,
            namespace: namespaceFromKeyPath(r.keyPath),
          })),
          skipDuplicates: true,
        });
      }
    }
    stats.pushed = toPush.length;
  }

  // ── ← DB: keys in both where DB value differs (marketing edits) ──────────
  const toPull = jsonFlat.filter((r) => {
    const dbRow = dbMap.get(r.keyPath);
    return dbRow !== undefined && dbRow.value !== r.value;
  });
  if (toPull.length > 0) {
    console.log(
      `\n  ← DB  (${toPull.length} value${toPull.length !== 1 ? 's' : ''} updated by editors):`
    );
    toPull.forEach((r) => {
      const dbRow = dbMap.get(r.keyPath)!;
      console.log(`        ~ ${r.keyPath}`);
      console.log(`            was: "${preview(r.value)}"`);
      console.log(`            now: "${preview(dbRow.value)}"`);
    });
    if (!DRY_RUN) {
      // apply DB values onto the JSON flat array, then write
      const merged = jsonFlat.map((r) => {
        const dbRow = dbMap.get(r.keyPath);
        return {
          keyPath: r.keyPath,
          value: dbRow !== undefined ? dbRow.value : r.value,
        };
      });
      const updated = unflattenMessages(merged) as Record<string, unknown>;
      writeFileSync(
        jsonPath(locale),
        JSON.stringify(updated, null, 2) + '\n',
        'utf8'
      );
    }
    stats.pulled = toPull.length;
  }

  // ── ↺ un-orphan: keys that were orphaned but are back in JSON ─────────────
  const toUnorphan = jsonFlat.filter(
    (r) => dbMap.get(r.keyPath)?.isOrphaned === true
  );
  if (toUnorphan.length > 0) {
    console.log(
      `\n  ↺  ${toUnorphan.length} key${toUnorphan.length !== 1 ? 's' : ''} restored (isOrphaned → false):`
    );
    toUnorphan.forEach((r) => console.log(`        ↺ ${r.keyPath}`));
    if (!DRY_RUN) {
      for (let i = 0; i < toUnorphan.length; i += BATCH) {
        await Promise.all(
          toUnorphan.slice(i, i + BATCH).map((r) =>
            prisma.translation.updateMany({
              where: { keyPath: r.keyPath, locale },
              data: { isOrphaned: false },
            })
          )
        );
      }
    }
    stats.unorphaned = toUnorphan.length;
  }

  // ── ⚠ orphaned: keys in DB but not in JSON → mark isOrphaned=true ────────
  const nowOrphaned = dbRows.filter(
    (r) => !jsonMap.has(r.keyPath) && !r.isOrphaned
  );
  const alreadyOrphaned = dbRows.filter(
    (r) => !jsonMap.has(r.keyPath) && r.isOrphaned
  );
  const allOrphaned = dbRows.filter((r) => !jsonMap.has(r.keyPath));

  if (nowOrphaned.length > 0) {
    console.log(
      `\n  ⚠  ${nowOrphaned.length} key${nowOrphaned.length !== 1 ? 's' : ''} newly orphaned (isOrphaned → true) — filter in Studio to delete:`
    );
    nowOrphaned
      .slice(0, 10)
      .forEach((r) => console.log(`        ! ${r.keyPath}`));
    if (nowOrphaned.length > 10) {
      console.log(`        … and ${nowOrphaned.length - 10} more`);
    }
    if (!DRY_RUN) {
      for (let i = 0; i < nowOrphaned.length; i += BATCH) {
        await Promise.all(
          nowOrphaned.slice(i, i + BATCH).map((r) =>
            prisma.translation.updateMany({
              where: { keyPath: r.keyPath, locale },
              data: { isOrphaned: true },
            })
          )
        );
      }
    }
  }

  if (alreadyOrphaned.length > 0) {
    console.log(
      `\n  ⚠  ${alreadyOrphaned.length} key${alreadyOrphaned.length !== 1 ? 's' : ''} still orphaned (already flagged) — delete via Studio.`
    );
  }

  stats.orphaned = allOrphaned.length;

  // ── ✓ already in sync ─────────────────────────────────────────────────────
  stats.inSync = jsonFlat.filter((r) => {
    const dbRow = dbMap.get(r.keyPath);
    return dbRow !== undefined && dbRow.value === r.value;
  }).length;

  return stats;
}

async function main() {
  loadEnvConfig(process.cwd());

  if (DRY_RUN) {
    console.log('── DRY RUN: no files or DB rows will be written ──\n');
  }

  const totals: SyncStats = {
    pushed: 0,
    pulled: 0,
    inSync: 0,
    orphaned: 0,
    unorphaned: 0,
  };

  for (const locale of LOCALES) {
    console.log(`\n════ ${locale.toUpperCase()} ════`);
    const stats = await syncLocale(locale);
    totals.pushed += stats.pushed;
    totals.pulled += stats.pulled;
    totals.inSync += stats.inSync;
    totals.orphaned += stats.orphaned;
    totals.unorphaned += stats.unorphaned;

    if (
      stats.pushed === 0 &&
      stats.pulled === 0 &&
      stats.orphaned === 0 &&
      stats.unorphaned === 0
    ) {
      console.log(`  ✓  All ${stats.inSync} keys in sync — nothing to do.`);
    }
  }

  console.log('\n────────────────────────────────');
  console.log(`  → DB   pushed    : ${totals.pushed}`);
  console.log(`  ← DB   pulled    : ${totals.pulled}`);
  console.log(`  ✓      in sync   : ${totals.inSync}`);
  if (totals.unorphaned > 0) {
    console.log(`  ↺      restored  : ${totals.unorphaned}`);
  }
  if (totals.orphaned > 0) {
    console.log(
      `  ⚠      orphaned  : ${totals.orphaned}  ← filter isOrphaned=true in Studio to delete`
    );
  }

  if (DRY_RUN) {
    console.log('\n── Dry run complete. Run without --dry-run to apply. ──');
  } else if (totals.pushed > 0 || totals.pulled > 0) {
    if (totals.pulled > 0) {
      console.log(
        '\nJSON files updated. Commit messages/*.json to snapshot DB values.'
      );
    }
    if (totals.pushed > 0) {
      console.log(
        'New keys inserted into DB and available in /admin/translations.'
      );
    }
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
