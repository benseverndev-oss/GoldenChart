// Render the static badge row that lives at the top of README.md.
// Eats our own dog food: uses the new Badge component to produce its own
// marketing badges. Re-run when you bump the version or want to refresh the
// look:
//
//   npm run build
//   node scripts/render-readme-badges.mjs
//
// Writes SVGs into assets/badges/*.svg.
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { createElement as h } from 'react';
import { Badge } from '../dist/index.js';
import { renderToSVGString } from '../dist/server.js';

const outDir = join(process.cwd(), 'assets', 'badges');
mkdirSync(outDir, { recursive: true });

// Use a system font (sans-serif) to keep the README badges tiny — embedding
// the bundled Caveat font would bloat each SVG to ~70 KB. GitHub renders SVGs
// as <img> resources, so the four-badge row would weigh ~280 KB. Sacrificing
// the script-y font on the badges is worth it for the README chrome.
const BRAND = {
  palette: ['#3a4f63', '#c47a3a'],
  font: 'sans-serif',
};

const badges = [
  { file: 'npm.svg', label: 'npm', value: 'v0.2.0', tone: 'info', icon: 'tag' },
  { file: 'license.svg', label: 'license', value: 'MIT', tone: 'neutral', icon: 'license' },
  { file: 'drawn-with.svg', label: 'drawn with', value: 'rough.js', tone: 'neutral' },
  { file: 'vibe.svg', label: 'default vibe', value: 'chaotic_notebook', tone: 'info', icon: 'star' },
];

for (const b of badges) {
  const svg = renderToSVGString(
    h(Badge, {
      label: b.label,
      value: b.value,
      tone: b.tone,
      icon: b.icon,
      brand: BRAND,
      seed: 7,
    }),
  );
  writeFileSync(join(outDir, b.file), svg);
  console.log(`  ${b.file}`);
}

console.log(`\nWrote ${badges.length} badges → ${outDir}`);
