// Render a spread of natural-language queries to PNGs to demo the NL front door.
// Scratch script (untracked output dir); run with: node scripts/nl-examples.mjs
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { visualize, planChart } from '../dist/index.js';
import { renderToSVGString } from '../dist/server.js';
import { FONT_TTF_BASE64 } from '../dist/fonts.js';

// resvg lives in mcp/node_modules; resolve it from there.
const require = createRequire(import.meta.url);
const { Resvg } = require(require.resolve('@resvg/resvg-js', { paths: [join(process.cwd(), 'mcp')] }));

// Write bundled fonts to a temp dir so resvg can resolve font-family references.
const fontDir = mkdtempSync(join(tmpdir(), 'gc-fonts-'));
for (const [family, b64] of Object.entries(FONT_TTF_BASE64)) {
  writeFileSync(join(fontDir, `${family.replace(/[^A-Za-z0-9]+/g, '_')}.ttf`), Buffer.from(b64, 'base64'));
}

// One row per month — clean for "by month".
const monthly = [
  { month: 'Jan', revenue: 12 },
  { month: 'Feb', revenue: 19 },
  { month: 'Mar', revenue: 7 },
  { month: 'Apr', revenue: 24 },
  { month: 'May', revenue: 16 },
];
// One row per region — clean for "by region".
const regions = [
  { region: 'NA', revenue: 42, units: 320 },
  { region: 'EU', revenue: 55, units: 280 },
  { region: 'APAC', revenue: 38, units: 210 },
  { region: 'LATAM', revenue: 24, units: 160 },
];
const timeseries = [
  { date: '2024-01-01', revenue: 12 },
  { date: '2024-02-01', revenue: 19 },
  { date: '2024-03-01', revenue: 9 },
  { date: '2024-04-01', revenue: 24 },
  { date: '2024-05-01', revenue: 18 },
];

const examples = [
  { file: '1-line-pencil', data: monthly, query: 'revenue by month as a line in pencil' },
  { file: '2-pie-neon', data: regions, query: 'compare revenue by region as a pie in neon' },
  { file: '3-bars-chalkboard', data: regions, query: 'units by region as bars in chalkboard' },
  { file: '4-donut-watercolor', data: regions, query: 'revenue by region as a donut in watercolor' },
  { file: '5-trend-synthwave', data: timeseries, query: 'revenue over time in synthwave' },
  { file: '6-autopick-botanical', data: regions, query: 'revenue by region in botanical' },
];

const outDir = join(process.cwd(), 'nl-examples');
mkdirSync(outDir, { recursive: true });

const W = 460;
const H = 300;
for (const { file, data, query } of examples) {
  const plan = planChart(data, { query });
  const svg = renderToSVGString(visualize(data, { query, width: W, height: H, bare: true }));
  const png = new Resvg(svg, { fitTo: { mode: 'zoom', value: 2 }, font: { fontDirs: [fontDir], loadSystemFonts: true } })
    .render()
    .asPng();
  writeFileSync(join(outDir, `${file}.png`), png);
  console.log(
    `${file.padEnd(22)} ${plan.compiled.component.padEnd(11)} roles=${JSON.stringify(plan.hints.roles ?? {})} vibe=${plan.hints.vibe ?? '—'} (${png.length}b)`,
  );
}
console.log('\nWrote PNGs to', outDir);
