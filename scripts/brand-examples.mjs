// Render a few charts under two different brand kits, to show branding in action.
// Mirrors scripts/gallery.mjs (renders from dist/ via resvg with bundled fonts).
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { createElement as h } from 'react';
import * as gc from '../dist/index.js';
import { renderToSVGString } from '../dist/server.js';
import { FONT_TTF_BASE64 } from '../dist/fonts.js';

const reqd = createRequire(import.meta.url);
const { Resvg } = reqd(reqd.resolve('@resvg/resvg-js', { paths: [join(process.cwd(), 'mcp')] }));

const fontDir = mkdtempSync(join(tmpdir(), 'gc-fonts-'));
for (const [f, b] of Object.entries(FONT_TTF_BASE64))
  writeFileSync(join(fontDir, `${f.replace(/[^A-Za-z0-9]+/g, '_')}.ttf`), Buffer.from(b, 'base64'));

const out = join(process.cwd(), 'gallery', 'branded');
mkdirSync(out, { recursive: true });

const toPng = (svg, zoom = 2) =>
  new Resvg(svg, { fitTo: { mode: 'zoom', value: zoom }, font: { fontDirs: [fontDir], loadSystemFonts: true } })
    .render()
    .asPng();

// Build a small wordmark logo and rasterize it to a PNG data-URI so the chart's
// <image> logo renders reliably in resvg (raster data-URIs are best supported).
function wordmarkDataUri(text, bg, fg) {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="56" viewBox="0 0 160 56">` +
    `<rect x="2" y="2" width="156" height="52" rx="12" fill="${bg}"/>` +
    `<text x="80" y="36" text-anchor="middle" font-family="IBM Plex Sans, sans-serif" ` +
    `font-size="26" font-weight="700" fill="${fg}">${text}</text></svg>`;
  return `data:image/png;base64,${Buffer.from(toPng(svg, 1)).toString('base64')}`;
}

// Two brand kits.
const ACME = {
  palette: ['#0b3d91', '#2a9d8f', '#e9c46a', '#e76f51', '#8d99ae'],
  primary: '#0b3d91',
  ink: '#1d2433',
  page: '#f7f9fc',
  font: '"IBM Plex Sans", system-ui, sans-serif',
  logo: { src: wordmarkDataUri('ACME', '#0b3d91', '#ffffff'), position: 'top-right', width: 80 },
};
const MANGO = {
  palette: ['#ff6b35', '#f7b801', '#7a9e7e', '#ef476f', '#118ab2'],
  primary: '#ff6b35',
  ink: '#3a2317',
  page: '#fff8ef',
  font: '"IBM Plex Sans", system-ui, sans-serif',
  logo: { src: wordmarkDataUri('MANGO', '#ff6b35', '#3a2317'), position: 'bottom-right', width: 88 },
};

const BAR = [
  { label: 'Mon', value: 12 },
  { label: 'Tue', value: 19 },
  { label: 'Wed', value: 7 },
  { label: 'Thu', value: 24 },
  { label: 'Fri', value: 15 },
];
const MULTI = [
  { label: 'Q1', values: { sales: 12, returns: 4, support: 6 } },
  { label: 'Q2', values: { sales: 19, returns: 6, support: 5 } },
  { label: 'Q3', values: { sales: 9, returns: 3, support: 8 } },
];
const SERIES = [
  { id: 'visits', points: [0, 3, 2, 5, 4, 7, 6, 9].map((y, x) => ({ x, y })) },
  { id: 'signups', points: [1, 2, 4, 3, 6, 5, 8, 7].map((y, x) => ({ x, y })) },
];

const items = [
  // Acme on a crisp vibe.
  ['acme-bar', h(gc.BarChart, { width: 480, height: 320, vibe: 'clean_blueprint', brand: ACME, data: BAR, title: 'Weekly visits', bare: true })],
  ['acme-bar-grouped', h(gc.BarChart, { width: 480, height: 320, vibe: 'clean_blueprint', brand: ACME, data: MULTI, mode: 'grouped', title: 'Quarterly mix', bare: true })],
  ['acme-line', h(gc.LineChart, { width: 480, height: 320, vibe: 'clean_blueprint', brand: ACME, series: SERIES, curve: 'catmullRom', showPoints: true, title: 'Funnel', bare: true })],
  ['acme-pie', h(gc.PieChart, { width: 340, height: 340, vibe: 'clean_blueprint', brand: ACME, data: BAR, title: 'Share', bare: true })],
  // Mango on a hand-drawn vibe — brand recolours, vibe keeps the sketch feel.
  ['mango-bar', h(gc.BarChart, { width: 480, height: 320, vibe: 'pencil', brand: MANGO, data: BAR, title: 'Weekly visits', bare: true })],
  ['mango-bar-stacked', h(gc.BarChart, { width: 480, height: 320, vibe: 'pencil', brand: MANGO, data: MULTI, mode: 'stacked', title: 'Quarterly mix', bare: true })],
  ['mango-line', h(gc.LineChart, { width: 480, height: 320, vibe: 'pencil', brand: MANGO, series: SERIES, curve: 'catmullRom', showPoints: true, title: 'Funnel', bare: true })],
  ['mango-pie', h(gc.PieChart, { width: 340, height: 340, vibe: 'pencil', brand: MANGO, data: BAR, title: 'Share', bare: true })],
];

for (const [name, el] of items) {
  try {
    writeFileSync(join(out, `${name}.png`), toPng(renderToSVGString(el)));
    console.log('ok', name);
  } catch (e) {
    console.log('FAIL', name, e.message.split('\n')[0]);
  }
}
