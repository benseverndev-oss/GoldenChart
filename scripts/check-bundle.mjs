// scripts/check-bundle.mjs — fails if a published entry (and every chunk reachable
// from it) ships font bytes or blows its size budget. tsup splits output into
// chunks, so we scan the whole reachable graph, not just the entry file.
// Run after `npm run build`.
import { readFileSync, existsSync } from 'node:fs';
import { gzipSync } from 'node:zlib';
import path from 'node:path';

const DIST = 'dist';
const FONT_MARKER = 'data:font/ttf;base64';

// Each published browser-facing entry gets its own budget. The static core (`.`)
// must stay small and font-free; the opt-in interactive entry is guarded
// separately so interactive code can never silently bloat the core.
const ENTRIES = [
  { file: path.join(DIST, 'index.js'), budgetKb: 75, label: 'browser entry' },
  { file: path.join(DIST, 'interactive.js'), budgetKb: 40, label: 'interactive entry' },
];

// Build the transitive set of dist files reachable from an entry via relative
// imports/exports. Two patterns cover:
//   1. named imports:      import { foo } from './chunk-xxx.js'
//   2. side-effect imports: import './chunk-xxx.js'
const IMPORT_FROM_RE = /(?:import|export)[^'"]*from\s*['"](\.[^'"]+)['"]/g;
const IMPORT_SIDE_RE = /^import\s*['"](\.[^'"]+)['"]/gm;

function reachableFrom(entry) {
  const reachable = new Set();
  const queue = [entry];
  while (queue.length) {
    const file = queue.pop();
    if (reachable.has(file)) continue;
    reachable.add(file);
    const src = readFileSync(file, 'utf8');
    const candidates = [
      ...[...src.matchAll(IMPORT_FROM_RE)].map((m) => m[1]),
      ...[...src.matchAll(IMPORT_SIDE_RE)].map((m) => m[1]),
    ];
    for (const spec of candidates) {
      const resolved = path.join(path.dirname(file), spec);
      if (!reachable.has(resolved) && existsSync(resolved)) queue.push(resolved);
    }
  }
  return [...reachable].sort();
}

const errors = [];
for (const { file, budgetKb, label } of ENTRIES) {
  if (!existsSync(file)) {
    errors.push(`${file} not found — run \`npm run build\` first.`);
    continue;
  }
  const files = reachableFrom(file);
  let totalGzip = 0;
  for (const f of files) {
    const buf = readFileSync(f);
    totalGzip += gzipSync(buf).length;
    if (buf.includes(FONT_MARKER)) {
      errors.push(`${f} contains embedded font bytes — fonts leaked into the ${label}.`);
    }
  }
  const gzipKb = totalGzip / 1024;
  if (gzipKb > budgetKb) {
    errors.push(`${label} graph is ${gzipKb.toFixed(0)} KB gzipped, over the ${budgetKb} KB budget.`);
  } else {
    console.log(
      `Bundle guard OK: ${label} reachable from ${file} is ${gzipKb.toFixed(0)} KB gzipped (${files.length} files), no font bytes.`,
    );
  }
}

if (errors.length) {
  console.error('Bundle guard failed:\n  ' + errors.join('\n  '));
  process.exit(1);
}
