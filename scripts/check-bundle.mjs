// scripts/check-bundle.mjs — fails if the browser entry ships font bytes or
// blows the size budget. Run after `npm run build`.
import { readFileSync } from 'node:fs';
import { gzipSync } from 'node:zlib';

const FILE = 'dist/index.js';
const BUDGET_KB = 150; // generous ceiling; actual should be far smaller

const code = readFileSync(FILE, 'utf8');
const errors = [];

if (code.includes('data:font/ttf;base64')) {
  errors.push(`${FILE} contains embedded font bytes — fonts leaked into the main entry.`);
}

const gzipKb = gzipSync(readFileSync(FILE)).length / 1024;
if (gzipKb > BUDGET_KB) {
  errors.push(`${FILE} is ${gzipKb.toFixed(0)} KB gzipped, over the ${BUDGET_KB} KB budget.`);
}

if (errors.length) {
  console.error('Bundle guard failed:\n  ' + errors.join('\n  '));
  process.exit(1);
}
console.log(`Bundle guard OK: ${FILE} is ${gzipKb.toFixed(0)} KB gzipped, no font bytes.`);
