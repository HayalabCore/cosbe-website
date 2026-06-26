import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fetchLegacyHtml } from '../src/lib/legacy-import/fetch';
import { fixturePathForUrl } from '../src/lib/legacy-import/fixtures';

const FIXTURE_ROOT = path.join(
  process.cwd(),
  'src/lib/legacy-import/__fixtures__'
);

async function main() {
  const url = process.argv[2];
  if (!url) {
    console.error('Usage: yarn capture-fixture <url>');
    process.exit(1);
  }

  const target = fixturePathForUrl(url);
  if (!target) {
    console.log(`Skipped (not an importable article URL): ${url}`);
    return;
  }

  const html = await fetchLegacyHtml(url);
  const dest = path.join(FIXTURE_ROOT, target.relPath);
  await mkdir(path.dirname(dest), { recursive: true });
  await writeFile(dest, html, 'utf8');
  console.log(`Saved ${target.relPath} (${html.length} bytes)`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
