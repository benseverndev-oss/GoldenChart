// Render the full component gallery to PNGs for a systematic visual review.
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
for (const [f, b] of Object.entries(FONT_TTF_BASE64)) writeFileSync(join(fontDir, `${f.replace(/[^A-Za-z0-9]+/g, '_')}.ttf`), Buffer.from(b, 'base64'));

const out = join(process.cwd(), 'gallery');
mkdirSync(out, { recursive: true });
const vibe = process.argv[2] || 'pencil';

const BAR = [{ label: 'Mon', value: 12 }, { label: 'Tue', value: 19 }, { label: 'Wed', value: 7 }, { label: 'Thu', value: 24 }, { label: 'Fri', value: 15 }];
const MULTI = [{ label: 'Q1', values: { sales: 12, returns: 4, support: 6 } }, { label: 'Q2', values: { sales: 19, returns: 6, support: 5 } }, { label: 'Q3', values: { sales: 9, returns: 3, support: 8 } }];
const SERIES = [{ id: 'visits', points: [0, 3, 2, 5, 4, 7, 6, 9].map((y, x) => ({ x, y })) }, { id: 'signups', points: [1, 2, 4, 3, 6, 5, 8, 7].map((y, x) => ({ x, y })) }];
const SCATTER = Array.from({ length: 18 }, (_, i) => ({ x: (i * 37) % 100, y: (i * 53) % 100, r: ((i * 17) % 9) + 1 }));
const SANKEY_NODES = [{ id: 'visits', label: 'Visits' }, { id: 'signup', label: 'Sign-up' }, { id: 'bounce', label: 'Bounce' }, { id: 'paid', label: 'Paid' }, { id: 'churn', label: 'Churn' }];
const SANKEY_LINKS = [{ source: 'visits', target: 'signup', value: 6 }, { source: 'visits', target: 'bounce', value: 4 }, { source: 'signup', target: 'paid', value: 4 }, { source: 'signup', target: 'churn', value: 2 }];
const TREEMAP = [{ id: 'root' }, { id: 'eng', parent: 'root', value: 8, label: 'Eng' }, { id: 'design', parent: 'root', value: 4, label: 'Design' }, { id: 'sales', parent: 'root', value: 6, label: 'Sales' }, { id: 'ops', parent: 'root', value: 3, label: 'Ops' }];
const HEAT = Array.from({ length: 5 }, (_, x) => Array.from({ length: 4 }, (_, y) => ({ x: `c${x}`, y: `r${y}`, value: (x * 7 + y * 13) % 20 }))).flat();
const RADAR_AXES = ['Speed', 'Power', 'Range', 'Cost', 'Style'];
const RADAR = [{ id: 'A', values: [4, 7, 5, 3, 6] }, { id: 'B', values: [6, 3, 7, 5, 4] }];
const AUTO = [{ region: 'NA', revenue: 12 }, { region: 'EU', revenue: 19 }, { region: 'APAC', revenue: 7 }, { region: 'LATAM', revenue: 14 }];

const items = [
  ['bar-single', h(gc.BarChart, { width: 460, height: 300, vibe, data: BAR, title: 'Weekly visits', bare: true })],
  ['bar-grouped', h(gc.BarChart, { width: 460, height: 300, vibe, data: MULTI, mode: 'grouped', bare: true })],
  ['bar-stacked', h(gc.BarChart, { width: 460, height: 300, vibe, data: MULTI, mode: 'stacked', bare: true })],
  ['line', h(gc.LineChart, { width: 460, height: 300, vibe, series: SERIES, curve: 'catmullRom', showPoints: true, bare: true })],
  ['area', h(gc.AreaChart, { width: 460, height: 300, vibe, series: [SERIES[0]], curve: 'basis', bare: true })],
  ['scatter', h(gc.ScatterPlot, { width: 460, height: 300, vibe, data: SCATTER, bare: true })],
  ['pie', h(gc.PieChart, { width: 300, height: 300, vibe, data: BAR, bare: true })],
  ['donut', h(gc.PieChart, { width: 300, height: 300, vibe, data: BAR, innerRadius: 60, bare: true })],
  ['sankey', h(gc.SankeyChart, { width: 460, height: 300, vibe, nodes: SANKEY_NODES, links: SANKEY_LINKS, showValues: true, bare: true })],
  ['treemap', h(gc.TreemapChart, { width: 460, height: 300, vibe, data: TREEMAP, bare: true })],
  ['heatmap', h(gc.HeatmapChart, { width: 460, height: 300, vibe, data: HEAT, showValues: true, bare: true })],
  ['radar', h(gc.RadarChart, { width: 360, height: 340, vibe, axes: RADAR_AXES, series: RADAR, bare: true })],
  ['autochart', gc.visualize(AUTO, { width: 460, height: 280, vibe, bare: true })],
];

for (const [name, el] of items) {
  try {
    const svg = renderToSVGString(el);
    const png = new Resvg(svg, { fitTo: { mode: 'zoom', value: 2 }, font: { fontDirs: [fontDir], loadSystemFonts: true } }).render().asPng();
    writeFileSync(join(out, `${vibe}-${name}.png`), png);
    console.log('ok', name);
  } catch (e) {
    console.log('FAIL', name, e.message.split('\n')[0]);
  }
}
