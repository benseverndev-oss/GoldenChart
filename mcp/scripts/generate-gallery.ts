/**
 * Render a gallery of every GoldenChart chart and diagram to standalone SVG and
 * PNG, for the README and docs. Headless: `renderToSVGString` produces the SVG,
 * resvg rasterizes a 2x PNG. Run with `npm run gallery` from the mcp workspace.
 */
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createElement } from 'react';
import type { ReactElement } from 'react';
import {
  AreaChart,
  ArchitectureDiagram,
  BarChart,
  ERDiagram,
  Flowchart,
  HeatmapChart,
  LineChart,
  MindMap,
  OrgChart,
  PieChart,
  RadarChart,
  SankeyChart,
  ScatterPlot,
  SequenceDiagram,
  Timeline,
  TreemapChart,
  parseMermaid,
  renderDiagram,
} from 'goldenchart';
import type { VibeConfig } from 'goldenchart';
import { renderToSVGString } from 'goldenchart/server';
import { Resvg } from '@resvg/resvg-js';

const here = dirname(fileURLToPath(import.meta.url));
const OUT = resolve(here, '../../assets/gallery');
mkdirSync(OUT, { recursive: true });

const SKETCH = 'messy_sketch';
const BLUEPRINT = 'clean_blueprint';

interface Entry {
  name: string;
  el: ReactElement;
}

const el = (component: Parameters<typeof createElement>[0], props: Record<string, unknown>) =>
  createElement(component as never, { bare: true, ...props });

const bar = (vibe: VibeConfig, title?: string) =>
  el(BarChart, {
    width: 440,
    height: 300,
    vibe,
    title,
    data: [
      { label: 'Mon', value: 12 },
      { label: 'Tue', value: 19 },
      { label: 'Wed', value: 7 },
      { label: 'Thu', value: 24 },
      { label: 'Fri', value: 15 },
    ],
  });

const series = [
  { id: 'visits', points: [0, 3, 2, 5, 4, 7, 6, 9].map((y, x) => ({ x, y })) },
  { id: 'signups', points: [1, 2, 4, 3, 6, 5, 8, 7].map((y, x) => ({ x, y })) },
];

const entries: Entry[] = [
  // ---- charts (signature hand-drawn vibe) ----
  { name: 'bar-chart', el: bar(SKETCH, 'Weekly visits') },
  { name: 'line-chart', el: el(LineChart, { width: 440, height: 300, vibe: SKETCH, series, curve: 'catmullRom', showPoints: true }) },
  { name: 'area-chart', el: el(AreaChart, { width: 440, height: 300, vibe: SKETCH, series: [series[0]], curve: 'basis' }) },
  {
    name: 'scatter-plot',
    el: el(ScatterPlot, {
      width: 440,
      height: 300,
      vibe: SKETCH,
      data: Array.from({ length: 18 }, (_, i) => ({ x: (i * 37) % 100, y: (i * 53) % 100, r: ((i * 17) % 9) + 1 })),
    }),
  },
  {
    name: 'pie-chart',
    el: el(PieChart, {
      width: 320,
      height: 320,
      vibe: SKETCH,
      data: [
        { label: 'Mon', value: 12 },
        { label: 'Tue', value: 19 },
        { label: 'Wed', value: 7 },
        { label: 'Thu', value: 24 },
      ],
    }),
  },
  {
    name: 'sankey',
    el: el(SankeyChart, {
      width: 480,
      height: 300,
      vibe: SKETCH,
      showValues: true,
      nodes: [
        { id: 'visits', label: 'Visits' },
        { id: 'signup', label: 'Sign-up' },
        { id: 'bounce', label: 'Bounce' },
        { id: 'paid', label: 'Paid' },
        { id: 'churn', label: 'Churn' },
      ],
      links: [
        { source: 'visits', target: 'signup', value: 6 },
        { source: 'visits', target: 'bounce', value: 4 },
        { source: 'signup', target: 'paid', value: 4 },
        { source: 'signup', target: 'churn', value: 2 },
      ],
    }),
  },
  {
    name: 'treemap',
    el: el(TreemapChart, {
      width: 440,
      height: 300,
      vibe: SKETCH,
      data: [
        { id: 'root' },
        { id: 'eng', parent: 'root', value: 8, label: 'Eng' },
        { id: 'design', parent: 'root', value: 4, label: 'Design' },
        { id: 'sales', parent: 'root', value: 6, label: 'Sales' },
        { id: 'ops', parent: 'root', value: 3, label: 'Ops' },
      ],
    }),
  },
  {
    name: 'heatmap',
    el: el(HeatmapChart, {
      width: 440,
      height: 280,
      vibe: SKETCH,
      showValues: true,
      data: Array.from({ length: 5 }, (_, x) =>
        Array.from({ length: 4 }, (_, y) => ({ x: `c${x}`, y: `r${y}`, value: (x * 7 + y * 13) % 20 })),
      ).flat(),
    }),
  },
  {
    name: 'radar',
    el: el(RadarChart, {
      width: 360,
      height: 320,
      vibe: SKETCH,
      axes: ['Speed', 'Power', 'Range', 'Cost', 'Style'],
      series: [
        { id: 'A', values: [4, 7, 5, 3, 6] },
        { id: 'B', values: [6, 3, 7, 5, 4] },
      ],
    }),
  },

  // ---- diagrams (cleaner blueprint vibe) ----
  {
    name: 'flowchart',
    el: el(Flowchart, {
      width: 480,
      height: 300,
      vibe: BLUEPRINT,
      direction: 'LR',
      nodes: [
        { id: 'a', label: 'Start', shape: 'ellipse' },
        { id: 'b', label: 'Clean', parent: 'a' },
        { id: 'c', label: 'Decision?', parent: 'a', shape: 'diamond' },
        { id: 'd', label: 'Chart it', parent: 'b' },
        { id: 'e', label: 'Ship', parent: 'c', shape: 'ellipse' },
      ],
      edges: [
        { from: 'a', to: 'b' },
        { from: 'a', to: 'c', label: 'maybe' },
        { from: 'b', to: 'd' },
        { from: 'c', to: 'e', label: 'yes' },
      ],
    }),
  },
  {
    name: 'sequence',
    el: el(SequenceDiagram, {
      width: 460,
      height: 340,
      vibe: BLUEPRINT,
      actors: [
        { id: 'user', label: 'User' },
        { id: 'web', label: 'Web App' },
        { id: 'api', label: 'API' },
        { id: 'db', label: 'Database' },
      ],
      messages: [
        { from: 'user', to: 'web', label: 'submit form' },
        { from: 'web', to: 'api', label: 'POST /order' },
        { from: 'api', to: 'api', label: 'validate' },
        { from: 'api', to: 'db', label: 'INSERT' },
        { from: 'db', to: 'api', label: 'ok', kind: 'reply' },
        { from: 'api', to: 'user', label: '201', kind: 'reply' },
      ],
    }),
  },
  {
    name: 'mindmap',
    el: el(MindMap, {
      width: 620,
      height: 560,
      vibe: BLUEPRINT,
      nodes: [
        { id: 'root', label: 'Launch' },
        { id: 'mkt', label: 'Marketing', parent: 'root' },
        { id: 'eng', label: 'Engineering', parent: 'root' },
        { id: 'ops', label: 'Ops', parent: 'root' },
        { id: 'mkt1', label: 'Campaign', parent: 'mkt' },
        { id: 'eng1', label: 'API', parent: 'eng' },
        { id: 'eng2', label: 'Web app', parent: 'eng' },
        { id: 'ops1', label: 'Support', parent: 'ops' },
      ],
    }),
  },
  {
    name: 'architecture',
    el: el(ArchitectureDiagram, {
      width: 620,
      height: 420,
      vibe: BLUEPRINT,
      nodes: [
        { id: 'web', label: 'Web App', group: 'Frontend' },
        { id: 'mobile', label: 'Mobile', group: 'Frontend' },
        { id: 'gateway', label: 'API Gateway', group: 'Backend' },
        { id: 'auth', label: 'Auth', group: 'Backend' },
        { id: 'worker', label: 'Worker', group: 'Backend' },
        { id: 'db', label: 'Postgres', group: 'Data' },
        { id: 'cache', label: 'Redis', group: 'Data' },
      ],
      edges: [
        { from: 'web', to: 'gateway' },
        { from: 'mobile', to: 'gateway' },
        { from: 'gateway', to: 'auth' },
        { from: 'gateway', to: 'worker' },
        { from: 'auth', to: 'cache' },
        { from: 'worker', to: 'db' },
      ],
    }),
  },
  {
    name: 'er-diagram',
    el: el(ERDiagram, {
      width: 820,
      height: 240,
      vibe: BLUEPRINT,
      entities: [
        { id: 'user', label: 'User', fields: [{ name: 'id', type: 'uuid', key: 'PK' }, { name: 'email', type: 'text' }] },
        {
          id: 'order',
          label: 'Order',
          fields: [{ name: 'id', type: 'uuid', key: 'PK' }, { name: 'user_id', type: 'uuid', key: 'FK' }, { name: 'total', type: 'numeric' }],
        },
        { id: 'item', label: 'LineItem', fields: [{ name: 'id', type: 'uuid', key: 'PK' }, { name: 'order_id', type: 'uuid', key: 'FK' }] },
      ],
      relationships: [
        { from: 'user', to: 'order', fromCardinality: '1', toCardinality: 'N' },
        { from: 'order', to: 'item', fromCardinality: '1', toCardinality: 'N' },
      ],
    }),
  },
  {
    name: 'timeline',
    el: el(Timeline, {
      width: 580,
      height: 300,
      margin: { top: 24, right: 60, bottom: 24, left: 60 },
      vibe: BLUEPRINT,
      events: [
        { date: '2021', label: 'Founded', detail: 'Two people, one idea' },
        { date: '2022', label: 'Seed round' },
        { date: '2023', label: 'Public launch', detail: 'First 10k users' },
        { date: '2024', label: 'Series A' },
        { date: '2025', label: 'Profitable' },
      ],
    }),
  },
  {
    name: 'org-chart',
    el: el(OrgChart, {
      width: 640,
      height: 300,
      vibe: BLUEPRINT,
      nodes: [
        { id: 'ceo', label: 'CEO' },
        { id: 'cto', label: 'CTO', parent: 'ceo' },
        { id: 'cfo', label: 'CFO', parent: 'ceo' },
        { id: 'eng', label: 'Eng Lead', parent: 'cto' },
        { id: 'data', label: 'Data Lead', parent: 'cto' },
        { id: 'fin', label: 'Finance', parent: 'cfo' },
      ],
    }),
  },

  // ---- diagram DSL: hand-drawn Mermaid ----
  {
    name: 'mermaid',
    el: renderDiagram(
      parseMermaid('flowchart LR\n  A([Start]) --> B[Build]\n  B --> C{Tests pass?}\n  C -->|yes| D((Ship))\n  C -->|no| E[Fix it]'),
      { width: 560, height: 320, vibe: BLUEPRINT, bare: true },
    ),
  },

  // ---- the same chart across all three vibe presets ----
  { name: 'vibe-messy_sketch', el: bar('messy_sketch', 'messy_sketch') },
  { name: 'vibe-clean_blueprint', el: bar('clean_blueprint', 'clean_blueprint') },
  { name: 'vibe-chaotic_notebook', el: bar('chaotic_notebook', 'chaotic_notebook') },
];

let svgBytes = 0;
let pngBytes = 0;
for (const { name, el: element } of entries) {
  const svg = renderToSVGString(element);
  writeFileSync(resolve(OUT, `${name}.svg`), svg, 'utf8');
  const png = new Resvg(svg, {
    background: 'white',
    fitTo: { mode: 'zoom', value: 2 },
    font: { loadSystemFonts: true },
  })
    .render()
    .asPng();
  writeFileSync(resolve(OUT, `${name}.png`), png);
  svgBytes += svg.length;
  pngBytes += png.length;
  console.log(`✓ ${name.padEnd(22)} ${svg.length.toString().padStart(6)}b svg  ${png.length.toString().padStart(7)}b png`);
}

console.log(`\n${entries.length} assets → ${OUT}`);
console.log(`total: ${(svgBytes / 1024).toFixed(1)} KiB svg, ${(pngBytes / 1024).toFixed(1)} KiB png`);
