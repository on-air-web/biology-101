/**
 * Bundle budget for the shared tool route.
 *
 * The tool interfaces must ship as one chunk per tool, fetched on demand. If
 * the dynamic import map is ever moved back into a Server Component, webpack
 * folds every tool into this one route chunk and it grows linearly with the
 * catalogue — roughly 1.3 kB gzipped per tool, measured. That regression is
 * invisible in review and expensive by the time anyone notices, so it fails the
 * build instead.
 *
 * Raise the budget only with a reason.
 */
import { gzipSync } from 'node:zlib';
import { readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ROUTE = '/tools/[toolId]/page';
const BUDGET_GZIP_BYTES = 4096;

const manifestPath = join('.next', 'app-build-manifest.json');

let manifest;
try {
  manifest = JSON.parse(readFileSync(manifestPath, 'utf8'));
} catch {
  console.error(`Could not read ${manifestPath}. Run \`next build\` first.`);
  process.exit(1);
}

const entry = manifest.pages?.[ROUTE];
if (!entry) {
  console.error(`Route ${ROUTE} is missing from the build manifest.`);
  process.exit(1);
}

// Chunks shared with every other route are not this route's cost.
const shared = new Set(
  Object.entries(manifest.pages)
    .filter(([route]) => route !== ROUTE)
    .flatMap(([, chunks]) => chunks),
);

const own = entry.filter((chunk) => !shared.has(chunk) && chunk.endsWith('.js'));

let total = 0;
for (const chunk of own) {
  const path = join('.next', chunk);
  try {
    statSync(path);
    total += gzipSync(readFileSync(path)).length;
  } catch {
    // Chunk emitted elsewhere in the output tree; skip rather than guess.
  }
}

const summary = `${ROUTE}: ${total} bytes gzipped across ${own.length} route-specific chunk(s)`;

if (total > BUDGET_GZIP_BYTES) {
  console.error(`✗ ${summary} — over the ${BUDGET_GZIP_BYTES} byte budget.`);
  console.error('  Tool interfaces are probably no longer code-split per tool.');
  console.error('  The dynamic import map must live in a Client Component.');
  process.exit(1);
}

console.log(`✓ ${summary} (budget ${BUDGET_GZIP_BYTES}).`);
