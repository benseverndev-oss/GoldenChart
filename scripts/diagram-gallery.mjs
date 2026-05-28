// Render the diagram family (flowchart, mindmap, org chart, sequence, ER,
// timeline, mermaid bridge) to PNGs for a systematic visual review — the
// diagram counterpart to scripts/gallery.mjs. Output goes to gallery/ (gitignored);
// see scripts/README.md for prerequisites (build dist/ first).
import { mkdtempSync, mkdirSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { createRequire } from 'node:module';
import { createElement as h } from 'react';
import { Flowchart, MindMap, OrgChart, SequenceDiagram, ERDiagram, Timeline, renderDiagram, parseMermaid } from '../dist/index.js';
import { renderToSVGString } from '../dist/server.js';
import { FONT_TTF_BASE64 } from '../dist/fonts.js';

const reqd = createRequire(import.meta.url);
const { Resvg } = reqd(reqd.resolve('@resvg/resvg-js', { paths: [join(process.cwd(), 'mcp')] }));
const fontDir = mkdtempSync(join(tmpdir(), 'gc-fonts-'));
for (const [fam, b64] of Object.entries(FONT_TTF_BASE64))
  writeFileSync(join(fontDir, `${fam.replace(/[^A-Za-z0-9]+/g, '_')}.ttf`), Buffer.from(b64, 'base64'));

const FLOW_NODES = [
  { id: 'a', label: 'Start', shape: 'ellipse' },
  { id: 'b', label: 'Clean', parent: 'a' },
  { id: 'c', label: 'Decision?', parent: 'a', shape: 'diamond' },
  { id: 'd', label: 'Chart it', parent: 'b' },
  { id: 'e', label: 'Ship', parent: 'c', shape: 'ellipse' },
];
const FLOW_EDGES = [
  { from: 'a', to: 'b' },
  { from: 'a', to: 'c', label: 'maybe' },
  { from: 'b', to: 'd' },
  { from: 'c', to: 'e', label: 'yes' },
];
const MIND_NODES = [
  { id: 'root', label: 'Launch' },
  { id: 'mkt', label: 'Marketing', parent: 'root' },
  { id: 'eng', label: 'Engineering', parent: 'root' },
  { id: 'ops', label: 'Ops', parent: 'root' },
  { id: 'mkt1', label: 'Campaign', parent: 'mkt' },
  { id: 'mkt2', label: 'Launch event', parent: 'mkt' },
  { id: 'eng1', label: 'API', parent: 'eng' },
  { id: 'eng2', label: 'Web app', parent: 'eng' },
  { id: 'ops1', label: 'Support', parent: 'ops' },
];
const ORG_NODES = [
  { id: 'ceo', label: 'CEO' },
  { id: 'cto', label: 'CTO', parent: 'ceo' },
  { id: 'cfo', label: 'CFO', parent: 'ceo' },
  { id: 'eng', label: 'Eng Lead', parent: 'cto' },
  { id: 'data', label: 'Data Lead', parent: 'cto' },
  { id: 'fin', label: 'Finance', parent: 'cfo' },
];
const SEQ_ACTORS = [
  { id: 'user', label: 'User' }, { id: 'web', label: 'Web App' }, { id: 'api', label: 'API' }, { id: 'db', label: 'Database' },
];
const SEQ_MESSAGES = [
  { from: 'user', to: 'web', label: 'submit form' },
  { from: 'web', to: 'api', label: 'POST /order' },
  { from: 'api', to: 'api', label: 'validate' },
  { from: 'api', to: 'db', label: 'INSERT' },
  { from: 'db', to: 'api', label: 'ok', kind: 'reply' },
  { from: 'api', to: 'web', label: '201 Created', kind: 'reply' },
  { from: 'web', to: 'user', label: 'confirmation', kind: 'reply' },
];
const ER_ENTITIES = [
  { id: 'user', label: 'User', fields: [{ name: 'id', type: 'uuid', key: 'PK' }, { name: 'email', type: 'text' }, { name: 'name', type: 'text' }] },
  { id: 'order', label: 'Order', fields: [{ name: 'id', type: 'uuid', key: 'PK' }, { name: 'user_id', type: 'uuid', key: 'FK' }, { name: 'total', type: 'numeric' }] },
  { id: 'item', label: 'LineItem', fields: [{ name: 'id', type: 'uuid', key: 'PK' }, { name: 'order_id', type: 'uuid', key: 'FK' }, { name: 'qty', type: 'int' }] },
];
const ER_RELS = [
  { from: 'user', to: 'order', fromCardinality: '1', toCardinality: 'N' },
  { from: 'order', to: 'item', fromCardinality: '1', toCardinality: 'N' },
];
const TIMELINE_EVENTS = [
  { date: '2021', label: 'Founded', detail: 'Two people, one idea' },
  { date: '2022', label: 'Seed round' },
  { date: '2023', label: 'Public launch', detail: 'First 10k users' },
  { date: '2024', label: 'Series A' },
  { date: '2025', label: 'Profitable' },
];
const MERMAID = ['graph LR', 'A[Start]-->B{Build}', 'B-->|yes|C(Ship?)', 'C-->D(Done)'].join('\n');

const vibe = process.argv[2] || 'pencil';
const out = join(process.cwd(), 'gallery');
mkdirSync(out, { recursive: true });

const renders = [
  ['flowchart', h(Flowchart, { width: 640, height: 360, vibe, direction: 'LR', nodes: FLOW_NODES, edges: FLOW_EDGES, bare: true })],
  ['mindmap', h(MindMap, { width: 640, height: 420, vibe, nodes: MIND_NODES, bare: true })],
  ['orgchart', h(OrgChart, { width: 640, height: 360, vibe, nodes: ORG_NODES, bare: true })],
  ['sequence', h(SequenceDiagram, { width: 640, height: 380, vibe, actors: SEQ_ACTORS, messages: SEQ_MESSAGES, bare: true })],
  ['erdiagram', h(ERDiagram, { width: 640, height: 360, vibe, entities: ER_ENTITIES, relationships: ER_RELS, bare: true })],
  ['timeline', h(Timeline, { width: 640, height: 300, vibe, events: TIMELINE_EVENTS, bare: true })],
  ['mermaid', renderDiagram(parseMermaid(MERMAID), { width: 640, height: 320, vibe, bare: true })],
];

for (const [name, el] of renders) {
  try {
    const svg = renderToSVGString(el);
    const png = new Resvg(svg, { fitTo: { mode: 'zoom', value: 2 }, font: { fontDirs: [fontDir], loadSystemFonts: true } }).render().asPng();
    writeFileSync(join(out, `${vibe}-dg-${name}.png`), png);
    console.log('ok', name);
  } catch (e) {
    console.log('FAIL', name, e.message.split('\n')[0]);
  }
}
