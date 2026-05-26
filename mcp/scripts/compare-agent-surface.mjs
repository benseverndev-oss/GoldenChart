// Running before/after visual comparisons for GoldenChart work.
// Renders PNGs into ../comparisons. Run from the mcp workspace:
//
//   npm run build                # at repo root, so dist/ is fresh
//   cd mcp && npm run compare
//
// The "before" is carried forward: each scene's current render is the "after";
// the previous run's "after" (saved under comparisons/baselines/<name>.svg) is
// the "before". A brand-new scene seeds its "before" from `seed()` — what the
// old surface could do — on its first run only.
import React from 'react';
import { mkdirSync, writeFileSync, readFileSync, existsSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { Resvg } from '@resvg/resvg-js';
import {
  Surface,
  BarChart,
  RoughPath,
  RoughRectangle,
  RoughCircle,
  RoughLine,
  RoughText,
  FONT_TTF_BASE64,
  regularPolygonPath,
  starPath,
  arcStrokePath,
  wedgePath,
  ellipsePath,
  arrowHeadPath,
} from 'goldenchart';
import { renderToSVGString } from 'goldenchart/server';

const OUT = join(dirname(fileURLToPath(import.meta.url)), '..', '..', 'comparisons');
const BASELINES = join(OUT, 'baselines');
mkdirSync(BASELINES, { recursive: true });

const fontDir = mkdtempSync(join(tmpdir(), 'gc-fonts-'));
for (const [family, base64] of Object.entries(FONT_TTF_BASE64)) {
  writeFileSync(join(fontDir, `${family.replace(/[^A-Za-z0-9]+/g, '_')}.ttf`), Buffer.from(base64, 'base64'));
}
const UI = 'IBM Plex Sans';
const h = React.createElement;
const embed = (svg, x, y) => svg.replace(/^<svg /, `<svg x="${x}" y="${y}" `);
const deg = (d) => (d * Math.PI) / 180;

function rasterize(svg, file, scale = 2) {
  const png = new Resvg(svg, { font: { fontDirs: [fontDir], loadSystemFonts: true }, fitTo: { mode: 'zoom', value: scale } })
    .render()
    .asPng();
  writeFileSync(join(OUT, file), png);
  console.log(`  ${file}  (${(png.length / 1024).toFixed(0)} KB)`);
}
const doc = (w, ht, body, bg = '#ffffff') =>
  `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${ht}" viewBox="0 0 ${w} ${ht}"><rect width="100%" height="100%" fill="${bg}"/>${body}</svg>`;
const cap = (t, x, y, size = 14, fill = '#475569', weight = 500) =>
  `<text x="${x}" y="${y}" text-anchor="middle" font-family="${UI}" font-size="${size}" font-weight="${weight}" fill="${fill}">${t}</text>`;

function beforeAfter(beforeSvg, afterSvg, w, ht, beforeCap, afterCap, caption, file, scale = 2) {
  const pad = 18;
  const gap = 34;
  const labelH = 30;
  const subH = 22;
  const capH = caption ? 28 : 0;
  const totalW = pad * 2 + w * 2 + gap;
  const totalH = pad + labelH + ht + subH + capH + pad;
  let body =
    cap('BEFORE', pad + w / 2, pad + 20, 18, '#dc2626', 700) +
    cap('AFTER', pad + w + gap + w / 2, pad + 20, 18, '#16a34a', 700) +
    embed(beforeSvg, pad, pad + labelH) +
    embed(afterSvg, pad + w + gap, pad + labelH) +
    cap(beforeCap, pad + w / 2, pad + labelH + ht + 16, 13, '#dc2626', 600) +
    cap(afterCap, pad + w + gap + w / 2, pad + labelH + ht + 16, 13, '#16a34a', 600);
  if (caption) body += cap(caption, totalW / 2, pad + labelH + ht + subH + 16, 14, '#475569', 500);
  rasterize(doc(totalW, totalH, body), file, scale);
}

// Carry-forward comparison: the "before" is the saved baseline (the previous
// run's "after"); `seedBefore` is used only the first time a scene is captured.
// After rendering, the current "after" becomes the next run's baseline.
function compare(name, w, ht, seedBefore, after, beforeCap, afterCap, caption, scale = 2) {
  const basePath = join(BASELINES, `${name}.svg`);
  const seeded = !existsSync(basePath);
  const before = seeded ? seedBefore : readFileSync(basePath, 'utf8');
  beforeAfter(before, after, w, ht, beforeCap, afterCap, caption, `${name}.png`, scale);
  writeFileSync(basePath, after);
  console.log(`    baseline ${seeded ? 'seeded' : 'updated'}: baselines/${name}.svg`);
}

const BAR = [
  { label: 'Q1', value: 12 },
  { label: 'Q2', value: 19 },
  { label: 'Q3', value: 7 },
  { label: 'Q4', value: 24 },
];

// === SP1: vibe presets ======================================================
// Before, an agent asking for `synthwave` was rejected by the MCP schema and
// fell back to one of the three allowed presets. Now all 27 are reachable.
function presets() {
  const W = 360;
  const H = 250;
  const seed = renderToSVGString(h(BarChart, { width: W, height: H, vibe: 'messy_sketch', data: BAR, bare: true }));
  const after = renderToSVGString(h(BarChart, { width: W, height: H, vibe: 'synthwave', data: BAR, bare: true }));
  compare(
    'compare-sp1-presets',
    W,
    H,
    seed,
    after,
    'asked for "synthwave" -> rejected, fell back to messy_sketch (1 of 3)',
    'synthwave now renders (1 of 27)',
    'SP1: the MCP vibe schema exposed only 3 of the library’s 27 presets. Now every preset is reachable.',
  );
}

// === SP2: shape primitives ==================================================
// A small composed scene. Before: only rect/circle/line/text, so a decision
// node is a circle, a rating is text, a gauge is a ring, connectors have no
// heads. After: hexagon node, star rating, pie-wedge gauge, arrowheads.
function shapes() {
  const W = 380;
  const H = 250;
  const vibe = { preset: 'ink', background: '#fffdf5' };

  const before = renderToSVGString(
    h(
      Surface,
      { width: W, height: H, vibe, bare: true },
      h(RoughCircle, { key: 'node', cx: 80, cy: 80, diameter: 76 }),
      h(RoughText, { key: 'nodeL', x: 80, y: 80, children: 'check' }),
      h(RoughLine, { key: 'edge', x1: 118, y1: 80, x2: 250, y2: 80 }), // no arrowhead
      h(RoughText, { key: 'rateL', x: 300, y: 50, children: 'rating' }),
      h(RoughText, { key: 'rate', x: 300, y: 78, children: '3 / 5' }), // rating as text
      h(RoughCircle, { key: 'gauge', cx: 300, cy: 170, diameter: 80 }), // gauge as plain ring
      h(RoughRectangle, { key: 'box', x: 30, y: 175, width: 150, height: 50 }),
      h(RoughText, { key: 'boxL', x: 105, y: 200, children: 'summary' }),
    ),
  );

  const after = renderToSVGString(
    h(
      Surface,
      { width: W, height: H, vibe, bare: true },
      // hexagon decision node
      h(RoughPath, { key: 'node', d: regularPolygonPath(80, 80, 42, 6, deg(-90)), fill: '#fde68a' }),
      h(RoughText, { key: 'nodeL', x: 80, y: 80, children: 'check' }),
      // connector with an arrowhead
      h(RoughLine, { key: 'edge', x1: 124, y1: 80, x2: 250, y2: 80 }),
      h(RoughPath, { key: 'head', d: arrowHeadPath({ x: 234, y: 80 }, { x: 252, y: 80 }, 11, true), fill: null }),
      // star rating
      h(RoughText, { key: 'rateL', x: 300, y: 40, children: 'rating' }),
      h(RoughPath, { key: 'star', d: starPath(300, 75, 22, 10, 5, deg(-90)), fill: '#fbbf24' }),
      // pie-wedge gauge (3/5 of a ring)
      h(RoughPath, { key: 'gaugeBg', d: arcStrokePath(300, 175, 34, deg(-90), deg(270)), fill: null }),
      h(RoughPath, { key: 'gauge', d: wedgePath(300, 175, 34, deg(-90), deg(-90 + 216), 18), fill: '#34d399' }),
      // ellipse summary container
      h(RoughPath, { key: 'box', d: ellipsePath(105, 200, 80, 28), fill: '#bae6fd' }),
      h(RoughText, { key: 'boxL', x: 105, y: 200, children: 'summary' }),
    ),
  );

  compare(
    'compare-sp2-shapes',
    W,
    H,
    before,
    after,
    'rect / circle / line / text only',
    'hexagon, arrowhead, star, pie-wedge gauge, ellipse',
    'SP2: new shape primitives (regular-polygon, star, arc, wedge, ellipse, arrowhead) let the agent draw what it could only approximate before.',
  );
}

console.log('Generating comparisons ->', OUT);
presets();
shapes();
console.log('done.');
