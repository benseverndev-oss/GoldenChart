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
  Badge,
  RoughPath,
  RoughRectangle,
  RoughCircle,
  RoughLine,
  RoughText,
  regularPolygonPath,
  starPath,
  arcStrokePath,
  wedgePath,
  ellipsePath,
  arrowHeadPath,
  connectorPath,
} from 'goldenchart';
import { FONT_TTF_BASE64 } from 'goldenchart/fonts';
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

// === SP3: arrow connector =====================================================
// Connecting two nodes. Before: a plain headless line (the agent had to draw the
// shaft and head separately, with no routing or label). After: a single `arrow`
// — elbow-routed shaft + filled head + midpoint label.
function arrows() {
  const W = 380;
  const H = 200;
  const vibe = { preset: 'ink', background: '#fffdf5' };
  const A = { x: 70, y: 64 };
  const B = { x: 310, y: 150 };
  const nodes = (extraKey) => [
    h(RoughCircle, { key: `${extraKey}-a`, cx: A.x, cy: A.y, diameter: 56 }),
    h(RoughText, { key: `${extraKey}-al`, x: A.x, y: A.y, children: 'A' }),
    h(RoughCircle, { key: `${extraKey}-b`, cx: B.x, cy: B.y, diameter: 56 }),
    h(RoughText, { key: `${extraKey}-bl`, x: B.x, y: B.y, children: 'B' }),
  ];
  const start = { x: 96, y: 78 };
  const end = { x: 286, y: 138 };

  const before = renderToSVGString(
    h(Surface, { width: W, height: H, vibe, bare: true },
      ...nodes('b'),
      h(RoughLine, { key: 'edge', x1: start.x, y1: start.y, x2: end.x, y2: end.y }), // headless, no label
    ),
  );

  const c = connectorPath(start, end, { routing: 'orthogonal' });
  const after = renderToSVGString(
    h(Surface, { width: W, height: H, vibe, bare: true },
      ...nodes('a'),
      h(RoughPath, { key: 'shaft', d: c.d, fill: null }),
      h(RoughPath, { key: 'head', d: arrowHeadPath(c.endHeadTail, end, 12, true), fill: '#1f2937' }),
      h(RoughText, { key: 'lbl', x: c.labelAt.x, y: c.labelAt.y - 10, children: 'depends on' }),
    ),
  );

  compare(
    'compare-sp3-arrow',
    W,
    H,
    before,
    after,
    'plain line — no head, no routing, no label',
    'one `arrow`: elbow shaft + filled head + label',
    'SP3: the `arrow` connector draws shaft + arrowhead(s) + label between two points (straight/curved/orthogonal, single or double-headed).',
  );
}

// === SP4: badge primitive ===================================================
// Before, the agent had no first-class "badge" — to show a `stars: 42.3k`
// shields-style pill it had to compose a RoughRectangle + two RoughText calls,
// guess the geometry, and skip the icon entirely. After: one `Badge` element
// renders the pill with icon, divider, tone colour, and intrinsic width.
function badge() {
  const W = 220;
  const H = 60;
  const vibe = { preset: 'ink', background: '#ffffff' };

  const before = renderToSVGString(
    h(
      Surface,
      { width: W, height: H, vibe, bare: true },
      // Hand-rolled pill: a rectangle + two text labels. No icon, no divider,
      // no tone colour, width guessed.
      h(RoughRectangle, { key: 'pill', x: 30, y: 18, width: 160, height: 26 }),
      h(RoughText, { key: 'label', x: 70, y: 31, children: 'stars' }),
      h(RoughText, { key: 'value', x: 150, y: 31, children: '42.3k' }),
    ),
  );

  const after = renderToSVGString(
    h(
      'svg',
      { xmlns: 'http://www.w3.org/2000/svg', width: W, height: H, viewBox: `0 0 ${W} ${H}` },
      h('rect', { width: '100%', height: '100%', fill: '#ffffff' }),
      h(
        'g',
        { transform: 'translate(30, 17)' },
        h(Badge, { label: 'stars', value: '42.3k', tone: 'info', icon: 'star', seed: 1 }),
      ),
    ),
  );

  compare(
    'compare-sp4-badge',
    W,
    H,
    before,
    after,
    'rectangle + two text labels (no icon, no tone, guessed geometry)',
    'one `Badge`: icon + label + divider + tone colour, intrinsic width',
    'SP4: the `Badge` primitive renders a shields-style label/value pill with icon, divider, and tone in a single element.',
  );
}

// === SP5: github badge row ==================================================
// Before, an agent showing repo stats had to fire N raw fetches and pipe the
// results into N independent rectangles. After: one `render-github-badge-row`
// call resolves a deduplicated set of metrics and lays them out as a single
// hand-drawn SVG row. The compare script uses a stubbed `GithubClient` (canned
// `RepoSummary` / `ReleaseSummary`) so no network is touched.
function githubRow() {
  const stubRepo = {
    stars: 124300, forks: 26800, openIssues: 1342,
    license: 'MIT', language: 'JavaScript',
    pushedAt: '2026-05-20T00:00:00Z', defaultBranch: 'canary',
  };
  const stubRelease = { tag: 'v15.0.3', name: '15.0.3', publishedAt: '2026-05-15T00:00:00Z' };

  // formatCount + per-metric resolution mirrored from badgeTools.ts so this
  // script doesn't need to import compiled TS. Duplication is intentional —
  // CLAUDE.md prefers self-contained compare scenes over a private-helper
  // dependency edge from scripts/ -> src/.
  const formatCount = (n) => {
    if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
    if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}k`;
    return String(n);
  };
  const metricsResolved = [
    { label: 'stars', value: formatCount(stubRepo.stars), tone: 'info', icon: 'star' },
    { label: 'forks', value: formatCount(stubRepo.forks), tone: 'info', icon: 'fork' },
    { label: 'issues', value: formatCount(stubRepo.openIssues),
      tone: stubRepo.openIssues > 0 ? 'warn' : 'success', icon: 'issue' },
    { label: 'release', value: stubRelease.tag, tone: 'info', icon: 'tag' },
    { label: 'license', value: stubRepo.license, tone: 'neutral', icon: 'license' },
  ];

  // Compose a row by stacking Badge SVGs left-to-right (same approach as the
  // real row tool's handler).
  const parseWidth = (svg) => {
    const m = /<svg[^>]*\swidth="(\d+(?:\.\d+)?)"/.exec(svg);
    return m ? Math.round(Number(m[1])) : 0;
  };
  const parts = metricsResolved.map((r) => renderToSVGString(
    h(Badge, { label: r.label, value: r.value, tone: r.tone, icon: r.icon, seed: 2 }),
  ));
  const widths = parts.map(parseWidth);
  const gap = 8;
  const rowW = widths.reduce((a, b) => a + b, 0) + Math.max(0, widths.length - 1) * gap;
  const rowH = 26;
  let xOff = 0;
  const inners = parts.map((svg, i) => {
    let inner = svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
    if (i > 0) inner = inner.replace(/<style\b[^>]*>[\s\S]*?<\/style>/g, '');
    const t = `<g transform="translate(${xOff}, 0)">${inner}</g>`;
    xOff += widths[i] + gap;
    return t;
  }).join('');
  const rowSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${rowW}" height="${rowH}" viewBox="0 0 ${rowW} ${rowH}">${inners}</svg>`;

  const W = Math.max(rowW + 40, 560);
  const H = 60;

  // "Before": only a single stars badge — the agent could call render-badge
  // once but had no way to lay out a coordinated row.
  const beforeSingle = renderToSVGString(
    h(Badge, { label: 'stars', value: '124.3k', tone: 'info', icon: 'star', seed: 2 }),
  );
  const before = renderToSVGString(
    h(
      'svg',
      { xmlns: 'http://www.w3.org/2000/svg', width: W, height: H, viewBox: `0 0 ${W} ${H}` },
      h('rect', { width: '100%', height: '100%', fill: '#ffffff' }),
    ),
  ).replace(/<\/svg>$/, `<g transform="translate(20, 17)">${beforeSingle.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '')}</g></svg>`);

  const after = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}"><rect width="100%" height="100%" fill="#ffffff"/><g transform="translate(${Math.round((W - rowW) / 2)}, 17)">${rowSvg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '')}</g></svg>`;

  compare(
    'compare-sp5-github-row',
    W,
    H,
    before,
    after,
    'one badge at a time — agent had to layout coordinate by hand',
    '5 metrics, 1 deduped GitHub fetch round-trip, 1 SVG row',
    'SP5: `render-github-badge-row` resolves N metrics (stubbed here, no live HTTP) and lays them out as a single row.',
  );
}

console.log('Generating comparisons ->', OUT);
presets();
shapes();
arrows();
badge();
githubRow();
console.log('done.');
