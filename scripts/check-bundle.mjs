// scripts/check-bundle.mjs — fails if the browser entry (dist/index.js and every
// chunk reachable from it) ships font bytes or blows the size budget. tsup splits
// output into chunks, so we must scan the whole reachable graph, not just index.js.
// Run after `npm run build`.
import { readFileSync, existsSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import path from 'node:path';

const DIST = 'dist';
const ENTRY = path.join(DIST, 'index.js');
const BUDGET_KB = 75;
const FONT_MARKER = 'data:font/ttf;base64';

if (!existsSync(ENTRY)) {
  console.error(`${ENTRY} not found — run \`npm run build\` first.`);
  process.exit(1);
}

// Build the transitive set of dist files reachable from the browser entry via
// relative imports/exports. Two patterns cover:
//   1. named imports:      import { foo } from './chunk-xxx.js'
//   2. side-effect imports: import './chunk-xxx.js'
const IMPORT_FROM_RE = /(?:import|export)[^'"]*from\s*['"](\.[^'"]+)['"]/g;
const IMPORT_SIDE_RE = /^import\s*['"](\.[^'"]+)['"]/gm;
const reachable = new Set();
const queue = [ENTRY];
while (queue.length) {
  const file = queue.pop();
  if (reachable.has(file)) continue;
  reachable.add(file);
  const src = readFileSync(file, 'utf8');
  const candidates = [
    ...[...src.matchAll(IMPORT_FROM_RE)].map(m => m[1]),
    ...[...src.matchAll(IMPORT_SIDE_RE)].map(m => m[1]),
  ];
  for (const spec of candidates) {
    const resolved = path.join(path.dirname(file), spec);
    if (!reachable.has(resolved) && existsSync(resolved)) queue.push(resolved);
  }
}

const files = [...reachable].sort();
const errors = [];
let totalGzip = 0;
for (const f of files) {
  const buf = readFileSync(f);
  totalGzip += gzipSync(buf).length;
  if (buf.includes(FONT_MARKER)) {
    errors.push(`${f} contains embedded font bytes — fonts leaked into the browser entry.`);
  }
}
const gzipKb = totalGzip / 1024;
if (gzipKb > BUDGET_KB) {
  errors.push(`browser entry graph is ${gzipKb.toFixed(0)} KB gzipped, over the ${BUDGET_KB} KB budget.`);
}

if (errors.length) {
  console.error('Bundle guard failed:\n  ' + errors.join('\n  '));
  process.exit(1);
}
console.log(
  `Bundle guard OK: browser entry reachable from ${ENTRY} is ${gzipKb.toFixed(0)} KB gzipped (${files.length} files), no font bytes.`,
);
