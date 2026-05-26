// Renders the README hero, the vibe gallery, and the rendering-quality
// before/after examples to PNG (plus the animated draw-on SVGs). Run from the
// mcp workspace, which already has @resvg/resvg-js and a `goldenchart` link:
//
//   npm run build            # at repo root, so dist/ is fresh
//   cd mcp && npm run assets  # writes into ../assets
//
// "Before" panels are faithful: the rendering-quality changes are purely
// additive, so we reconstruct the old output by stripping the new bits.
import React from 'react';
import { mkdirSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';
import {
  BarChart,
  LineChart,
  PieChart,
  Flowchart,
  TreemapChart,
  Surface,
  RoughPath,
  RoughText,
  regularPolygonPath,
  starPath,
  wedgePath,
  ellipsePath,
  arrowHeadPath,
  connectorPath,
} from 'goldenchart';
import { FONT_TTF_BASE64 } from 'goldenchart/fonts';
import { renderToSVGString } from 'goldenchart/server';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'assets');
mkdirSync(OUT, { recursive: true });

// resvg can't read @font-face data URIs, so materialise the bundled fonts.
const fontDir = mkdtempSync(join(tmpdir(), 'gc-fonts-'));
for (const [family, base64] of Object.entries(FONT_TTF_BASE64)) {
  writeFileSync(join(fontDir, `${family.replace(/[^A-Za-z0-9]+/g, '_')}.ttf`), Buffer.from(base64, 'base64'));
}
const UI = 'IBM Plex Sans';
const HAND = 'Caveat';

const h = (c, p) => React.createElement(c, p);
const embed = (svg, x, y) => svg.replace(/^<svg /, `<svg x="${x}" y="${y}" `);

function rasterize(svg, file, scale = 2) {
  const png = new Resvg(svg, {
    font: { fontDirs: [fontDir], loadSystemFonts: true },
    fitTo: { mode: 'zoom', value: scale },
  })
    .render()
    .asPng();
  writeFileSync(join(OUT, file), png);
  console.log(`  ${file}  (${(png.length / 1024).toFixed(0)} KB)`);
}

function doc(w, h, body, bg = '#faf9f7') {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">` +
    `<rect width="100%" height="100%" fill="${bg}"/>${body}</svg>`
  );
}
const card = (x, y, w, h) =>
  `<rect x="${x}" y="${y}" width="${w}" height="${h}" rx="14" fill="#ffffff" stroke="#e7e5e4" stroke-width="1.5"/>`;
const cap = (text, x, y, size = 14, fill = '#78716c', weight = 500) =>
  `<text x="${x}" y="${y}" text-anchor="middle" font-family="${UI}" font-size="${size}" font-weight="${weight}" fill="${fill}">${text}</text>`;

// --- "before" reconstruction -------------------------------------------------
const stripHalo = (svg) =>
  svg.replace(/<text\b[^>]*>/g, (t) =>
    t
      .replace(/\sstroke="[^"]*"/, '')
      .replace(/\sstroke-width="[^"]*"/, '')
      .replace(/\sstroke-linejoin="[^"]*"/, '')
      .replace(/\spaint-order="[^"]*"/, '')
      .replace(/\stext-rendering="[^"]*"/, ''),
  );
const stripClip = (svg) =>
  svg.replace(/<clipPath\b[^>]*>.*?<\/clipPath>/gs, '').replace(/\sclip-path="url\(#[^"]*\)"/g, '');
const oldAnim = (svg, ms) =>
  svg
    .replace(
      /<style>[^<]*gc-draw-on[^<]*<\/style>/,
      `<style>@keyframes gc-draw-on{to{stroke-dashoffset:0}}@media (prefers-reduced-motion: no-preference){.gc-draw-on path{stroke-dasharray:1;stroke-dashoffset:1;animation:gc-draw-on ${ms}ms ease forwards}}</style>`,
    )
    .replace(/<path\b([^>]*)>/g, (m, a) => (/\bpathLength=/.test(a) ? m : `<path pathLength="1"${a}>`));

// shared sample data
const BAR = [
  { label: 'Mon', value: 12 },
  { label: 'Tue', value: 19 },
  { label: 'Wed', value: 7 },
  { label: 'Thu', value: 24 },
  { label: 'Fri', value: 15 },
];
const SERIES = [
  { id: 'visits', points: [0, 3, 2, 5, 4, 7, 6, 9].map((y, x) => ({ x, y })) },
  { id: 'signups', points: [1, 2, 4, 3, 6, 5, 8, 7].map((y, x) => ({ x, y })) },
];
const FLOW_NODES = [
  { id: 'a', label: 'Start', shape: 'ellipse' },
  { id: 'b', label: 'Clean', parent: 'a' },
  { id: 'c', label: 'Decide?', parent: 'a', shape: 'diamond' },
  { id: 'd', label: 'Chart it', parent: 'b' },
  { id: 'e', label: 'Ship', parent: 'c', shape: 'ellipse' },
];
const FLOW_EDGES = [
  { from: 'a', to: 'b' },
  { from: 'a', to: 'c', label: 'maybe' },
  { from: 'b', to: 'd' },
  { from: 'c', to: 'e', label: 'yes' },
];

// === HERO ====================================================================
function hero() {
  const cw = 360;
  const ch = 250;
  const capH = 30;
  const gap = 22;
  const pad = 30;
  const titleH = 96;
  const cols = 2;
  const rows = 2;
  const totalW = pad * 2 + cols * cw + (cols - 1) * gap;
  const totalH = titleH + pad + rows * (ch + capH) + (rows - 1) * gap + pad;

  const panels = [
    { el: h(BarChart, { width: cw, height: ch, vibe: 'marker', data: BAR, bare: true }), label: 'marker' },
    {
      el: h(LineChart, { width: cw, height: ch, vibe: 'blueprint_dark', series: SERIES, curve: 'catmullRom', showPoints: true, bare: true }),
      label: 'blueprint_dark',
    },
    { el: h(PieChart, { width: cw, height: ch, vibe: 'crayon', data: BAR, innerRadius: 48, bare: true }), label: 'crayon' },
    {
      el: h(Flowchart, { width: cw, height: ch, vibe: 'comic_book', nodes: FLOW_NODES, edges: FLOW_EDGES, direction: 'TB', bare: true }),
      label: 'comic_book',
    },
  ];

  let body =
    `<text x="${totalW / 2}" y="58" text-anchor="middle" font-family="${HAND}" font-size="54" fill="#1c1917">GoldenChart</text>` +
    cap('Hand-drawn charts &amp; diagrams with a configurable Vibe engine', totalW / 2, 84, 16, '#57534e', 500);

  panels.forEach((p, i) => {
    const r = Math.floor(i / cols);
    const c = i % cols;
    const x = pad + c * (cw + gap);
    const y = titleH + pad + r * (ch + capH + gap);
    body += card(x, y, cw, ch + capH);
    body += embed(renderToSVGString(p.el), x, y);
    body += cap(p.label, x + cw / 2, y + ch + 21, 14, '#a8a29e', 600);
  });

  rasterize(doc(totalW, totalH, body), 'hero.png', 2);
}

// === VIBE GALLERY ============================================================
function vibeGallery() {
  const cw = 250;
  const ch = 170;
  const capH = 26;
  const gap = 16;
  const pad = 20;
  const cols = 3;
  const vibes = ['pencil', 'ink', 'chalkboard', 'neon', 'watercolor', 'synthwave'];
  const rows = Math.ceil(vibes.length / cols);
  const totalW = pad * 2 + cols * cw + (cols - 1) * gap;
  const totalH = pad * 2 + rows * (ch + capH) + (rows - 1) * gap;

  let body = '';
  vibes.forEach((v, i) => {
    const r = Math.floor(i / cols);
    const c = i % cols;
    const x = pad + c * (cw + gap);
    const y = pad + r * (ch + capH + gap);
    body += card(x, y, cw, ch + capH);
    body += embed(renderToSVGString(h(BarChart, { width: cw, height: ch, vibe: v, data: BAR, bare: true })), x, y);
    body += cap(v, x + cw / 2, y + ch + 18, 13, '#a8a29e', 600);
  });
  rasterize(doc(totalW, totalH, body), 'vibes.png', 2);
}

// === BEFORE / AFTER ==========================================================
function beforeAfter(beforeSvg, afterSvg, w, ht, caption, file, scale = 2) {
  const pad = 18;
  const gap = 34;
  const labelH = 30;
  const capH = caption ? 28 : 0;
  const totalW = pad * 2 + w * 2 + gap;
  const totalH = pad + labelH + ht + capH + pad;
  let body =
    cap('BEFORE', pad + w / 2, pad + 20, 18, '#dc2626', 700) +
    cap('AFTER', pad + w + gap + w / 2, pad + 20, 18, '#16a34a', 700) +
    embed(beforeSvg, pad, pad + labelH) +
    embed(afterSvg, pad + w + gap, pad + labelH);
  if (caption) body += cap(caption, totalW / 2, pad + labelH + ht + 18, 14, '#475569', 500);
  rasterize(doc(totalW, totalH, body, '#ffffff'), file, scale);
}

function qualityHalo() {
  const W = 460;
  const H = 320;
  const data = [
    { id: 'root' },
    { id: 'Engineering', parent: 'root', value: 42, label: 'Engineering' },
    { id: 'Marketing', parent: 'root', value: 28, label: 'Marketing' },
    { id: 'Operations', parent: 'root', value: 22, label: 'Operations' },
    { id: 'Research', parent: 'root', value: 18, label: 'Research' },
    { id: 'Support', parent: 'root', value: 14, label: 'Support' },
  ];
  const after = renderToSVGString(
    h(TreemapChart, { width: W, height: H, vibe: { preset: 'blueprint_dark', fillStyle: 'cross-hatch', hachureGap: 5 }, data, bare: true }),
  );
  beforeAfter(
    stripHalo(after),
    after,
    W,
    H,
    'Text halo: labels over a cross-hatch fill stay legible — the halo knocks the hatching out from behind each glyph.',
    'quality-text-halo.png',
  );
}

function qualityClip() {
  const W = 360;
  const H = 260;
  const data = [
    { label: 'Q1', value: 18 },
    { label: 'Q2', value: 24 },
  ];
  const vibe = {
    preset: 'ink',
    fill: '#f472b6',
    fillStyle: 'hachure',
    roughness: 3.2,
    bowing: 2,
    hachureGap: 9,
    fillWeight: 4,
    strokeWidth: 2,
    background: '#fffdf5',
  };
  const after = renderToSVGString(h(BarChart, { width: W, height: H, vibe, data, bare: true }));
  beforeAfter(
    stripClip(after),
    after,
    W,
    H,
    'Clipped fills: hachure no longer bleeds past the bar edges, while the sketch outline stays loose.',
    'quality-clipped-fills.png',
    3,
  );
}

function drawOn() {
  const W = 440;
  const H = 300;
  const ms = 1500;
  const after = renderToSVGString(
    h(Flowchart, {
      width: W,
      height: H,
      vibe: { preset: 'crayon', animate: { drawOn: true, durationMs: ms } },
      nodes: FLOW_NODES,
      edges: FLOW_EDGES,
      direction: 'TB',
      bare: true,
    }),
  );
  writeFileSync(join(OUT, 'quality-draw-on-after.svg'), after);
  writeFileSync(join(OUT, 'quality-draw-on-before.svg'), oldAnim(after, ms));
  console.log('  quality-draw-on-{before,after}.svg');
}

// === COMPOSE-YOUR-OWN (shape primitives + arrow) =============================
function compose() {
  const W = 480;
  const H = 300;
  const rad = (d) => (d * Math.PI) / 180;
  const vibe = { preset: 'crayon', background: '#fffdf6' };
  // `h` above is 2-arg (no children); this scene needs children, so use createElement directly.
  const e = React.createElement;
  const arrow = connectorPath({ x: 138, y: 96 }, { x: 300, y: 96 }, { routing: 'straight' });

  const scene = renderToSVGString(
    e(
      Surface,
      { width: W, height: H, vibe, bare: true },
      // hexagon "input" node -> arrow -> ellipse "output"
      e(RoughPath, { key: 'hex', d: regularPolygonPath(86, 96, 46, 6, 0), fill: '#fca5a5' }),
      e(RoughText, { key: 'hexL', x: 86, y: 96, children: 'input' }),
      e(RoughPath, { key: 'arrow', d: arrow.d, fill: null }),
      e(RoughPath, { key: 'arrowHead', d: arrowHeadPath(arrow.endHeadTail, { x: 300, y: 96 }, 13, true), fill: '#1f2937' }),
      e(RoughText, { key: 'arrowL', x: arrow.labelAt.x, y: arrow.labelAt.y - 12, children: 'process' }),
      e(RoughPath, { key: 'ell', d: ellipsePath(366, 96, 62, 38), fill: '#a5f3fc' }),
      e(RoughText, { key: 'ellL', x: 366, y: 96, children: 'output' }),
      // a star highlight, a pie-wedge gauge, and a triangle
      e(RoughPath, { key: 'star', d: starPath(410, 222, 30, 14, 5, 0), fill: '#fcd34d' }),
      e(RoughPath, { key: 'wedge', d: wedgePath(96, 222, 50, rad(-90), rad(-90 + 252), 26), fill: '#86efac' }),
      e(RoughText, { key: 'wedgeL', x: 96, y: 226, children: '70%' }),
      e(RoughPath, { key: 'tri', d: regularPolygonPath(248, 224, 44, 3, 0), fill: '#c4b5fd' }),
      e(RoughText, { key: 'triL', x: 248, y: 234, children: 'build' }),
    ),
  );

  const capH = 30;
  const pad = 20;
  const totalW = W + pad * 2;
  const totalH = H + capH + pad * 2;
  const body =
    card(pad, pad, W, H) +
    embed(scene, pad, pad) +
    cap('Composed from primitives: regular-polygon, arrow, ellipse, star, wedge', totalW / 2, pad + H + 20, 14, '#78716c', 600);
  rasterize(doc(totalW, totalH, body), 'compose.png', 2);
}

console.log('Generating assets ->', OUT);
hero();
vibeGallery();
qualityHalo();
qualityClip();
drawOn();
compose();
console.log('done.');
