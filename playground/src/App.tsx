import { useState, useEffect } from 'react';
import {
  BarChart,
  LineChart,
  AreaChart,
  ScatterPlot,
  PieChart,
  Flowchart,
  MindMap,
  OrgChart,
  ArchitectureDiagram,
  SequenceDiagram,
  ERDiagram,
  Timeline,
  renderDiagram,
  parseMermaid,
  profileData,
  recommendChart,
  compileChart,
  critiqueChart,
  SankeyChart,
  TreemapChart,
  HeatmapChart,
  RadarChart,
  AutoChart,
  planChart,
  Surface,
  RoughPath,
  RoughCircle,
  linePath,
  VIBE_PRESETS,
} from 'goldenchart';
import type {
  ChartDatum,
  FlowNode,
  MultiSeriesDatum,
  Series,
  ScatterDatum,
  SequenceActorInput,
  SequenceMessageInput,
  EREntityInput,
  ERRelationshipInput,
  TimelineEventInput,
  VibeConfig,
  VibePreset,
  BrandConfig,
} from 'goldenchart';

import { InteractivityShowcase } from './InteractivityShowcase';
import { Gallery } from './Gallery';

type View = 'playground' | 'gallery';
const viewFromHash = (): View =>
  typeof window !== 'undefined' && window.location.hash === '#gallery' ? 'gallery' : 'playground';

const PRESETS = Object.keys(VIBE_PRESETS) as VibePreset[];

type LogoPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

/** Build a tiny wordmark logo as an inline SVG data-URI (renders in <image href>). */
function wordmark(text: string, bg: string, fg: string): string {
  const svg =
    `<svg xmlns="http://www.w3.org/2000/svg" width="160" height="56" viewBox="0 0 160 56">` +
    `<rect x="2" y="2" width="156" height="52" rx="12" fill="${bg}"/>` +
    `<text x="80" y="36" text-anchor="middle" font-family="IBM Plex Sans, sans-serif" ` +
    `font-size="26" font-weight="700" fill="${fg}">${text}</text></svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

/** Named brand kits the playground can apply in one click. */
const BRAND_KITS: Record<
  string,
  { primary: string; ink: string; page: string; palette: string; font: string; logo: string }
> = {
  Acme: {
    primary: '#0b3d91',
    ink: '#1d2433',
    page: '#f7f9fc',
    palette: '#0b3d91, #2a9d8f, #e9c46a, #e76f51, #8d99ae',
    font: '"IBM Plex Sans", system-ui, sans-serif',
    logo: 'ACME',
  },
  Mango: {
    primary: '#ff6b35',
    ink: '#3a2317',
    page: '#fff8ef',
    palette: '#ff6b35, #f7b801, #7a9e7e, #ef476f, #118ab2',
    font: '"IBM Plex Sans", system-ui, sans-serif',
    logo: 'MANGO',
  },
  Forest: {
    primary: '#2d6a4f',
    ink: '#1b2d22',
    page: '#f3f7f2',
    palette: '#2d6a4f, #95d5b2, #d9a566, #6a4c93, #b5838d',
    font: '"EB Garamond", Georgia, serif',
    logo: 'FOREST',
  },
};

const FONT_OPTIONS = [
  { label: 'IBM Plex Sans', value: '"IBM Plex Sans", system-ui, sans-serif' },
  { label: 'EB Garamond (serif)', value: '"EB Garamond", Georgia, serif' },
  { label: 'Caveat (handwritten)', value: '"Caveat", "Segoe Print", cursive' },
  { label: 'Inherit from vibe', value: '' },
];

const BAR_DATA: ChartDatum[] = [
  { label: 'Mon', value: 12 },
  { label: 'Tue', value: 19 },
  { label: 'Wed', value: 7 },
  { label: 'Thu', value: 24 },
  { label: 'Fri', value: 15 },
];

const SERIES: Series[] = [
  { id: 'visits', points: [0, 3, 2, 5, 4, 7, 6, 9].map((y, x) => ({ x, y })) },
  { id: 'signups', points: [1, 2, 4, 3, 6, 5, 8, 7].map((y, x) => ({ x, y })) },
];

const SCATTER: ScatterDatum[] = Array.from({ length: 18 }, (_, i) => ({
  x: (i * 37) % 100,
  y: (i * 53) % 100,
  r: ((i * 17) % 9) + 1,
}));

const MULTI_BARS: MultiSeriesDatum[] = [
  { label: 'Q1', values: { sales: 12, returns: 4, support: 6 } },
  { label: 'Q2', values: { sales: 19, returns: 6, support: 5 } },
  { label: 'Q3', values: { sales: 9, returns: 3, support: 8 } },
];

const SANKEY_NODES = [
  { id: 'visits', label: 'Visits' },
  { id: 'signup', label: 'Sign-up' },
  { id: 'bounce', label: 'Bounce' },
  { id: 'paid', label: 'Paid' },
  { id: 'churn', label: 'Churn' },
];
const SANKEY_LINKS = [
  { source: 'visits', target: 'signup', value: 6 },
  { source: 'visits', target: 'bounce', value: 4 },
  { source: 'signup', target: 'paid', value: 4 },
  { source: 'signup', target: 'churn', value: 2 },
];

const TREEMAP_DATA = [
  { id: 'root' },
  { id: 'eng', parent: 'root', value: 8, label: 'Eng' },
  { id: 'design', parent: 'root', value: 4, label: 'Design' },
  { id: 'sales', parent: 'root', value: 6, label: 'Sales' },
  { id: 'ops', parent: 'root', value: 3, label: 'Ops' },
];

const HEATMAP_DATA = Array.from({ length: 5 }, (_, x) =>
  Array.from({ length: 4 }, (_, y) => ({ x: `c${x}`, y: `r${y}`, value: (x * 7 + y * 13) % 20 })),
).flat();

const RADAR_AXES = ['Speed', 'Power', 'Range', 'Cost', 'Style'];
const RADAR_SERIES = [
  { id: 'A', values: [4, 7, 5, 3, 6] },
  { id: 'B', values: [6, 3, 7, 5, 4] },
];

const ANNOTATIONS = [
  { kind: 'y-line' as const, value: 6, label: 'target' },
  { kind: 'point-callout' as const, x: 7, y: 9, text: 'peak' },
];

// Raw records handed to AutoChart — it profiles, recommends and renders.
const AUTO_RECORDS = [
  { region: 'NA', revenue: 12 },
  { region: 'EU', revenue: 19 },
  { region: 'APAC', revenue: 7 },
  { region: 'LATAM', revenue: 14 },
];

const FLOW_NODES: FlowNode[] = [
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

// A non-tree graph: two entry points fan into a shared "Merge" node, which the
// layered DAG layout handles (d3's tree layout can't — it needs a single root).
const DAG_NODES: FlowNode[] = [
  { id: 'api', label: 'API', shape: 'ellipse' },
  { id: 'cache', label: 'Cache', shape: 'ellipse' },
  { id: 'merge', label: 'Merge' },
  { id: 'render', label: 'Render?', shape: 'diamond' },
  { id: 'out', label: 'Output', shape: 'ellipse' },
];

const DAG_EDGES = [
  { from: 'api', to: 'merge' },
  { from: 'cache', to: 'merge' },
  { from: 'merge', to: 'render' },
  { from: 'render', to: 'out', label: 'ok' },
];

const MIND_NODES: FlowNode[] = [
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

const ORG_NODES: FlowNode[] = [
  { id: 'ceo', label: 'CEO' },
  { id: 'cto', label: 'CTO', parent: 'ceo' },
  { id: 'cfo', label: 'CFO', parent: 'ceo' },
  { id: 'eng', label: 'Eng Lead', parent: 'cto' },
  { id: 'data', label: 'Data Lead', parent: 'cto' },
  { id: 'fin', label: 'Finance', parent: 'cfo' },
];

const ARCH_NODES: FlowNode[] = [
  { id: 'web', label: 'Web App', group: 'Frontend' },
  { id: 'mobile', label: 'Mobile', group: 'Frontend' },
  { id: 'gateway', label: 'API Gateway', group: 'Backend' },
  { id: 'auth', label: 'Auth', group: 'Backend' },
  { id: 'worker', label: 'Worker', group: 'Backend' },
  { id: 'db', label: 'Postgres', group: 'Data' },
  { id: 'cache', label: 'Redis', group: 'Data' },
];

const ARCH_EDGES = [
  { from: 'web', to: 'gateway' },
  { from: 'mobile', to: 'gateway' },
  { from: 'gateway', to: 'auth' },
  { from: 'gateway', to: 'worker' },
  { from: 'auth', to: 'cache' },
  { from: 'worker', to: 'db' },
];

const SEQ_ACTORS: SequenceActorInput[] = [
  { id: 'user', label: 'User' },
  { id: 'web', label: 'Web App' },
  { id: 'api', label: 'API' },
  { id: 'db', label: 'Database' },
];

const SEQ_MESSAGES: SequenceMessageInput[] = [
  { from: 'user', to: 'web', label: 'submit form' },
  { from: 'web', to: 'api', label: 'POST /order' },
  { from: 'api', to: 'api', label: 'validate' },
  { from: 'api', to: 'db', label: 'INSERT' },
  { from: 'db', to: 'api', label: 'ok', kind: 'reply' },
  { from: 'api', to: 'web', label: '201 Created', kind: 'reply' },
  { from: 'web', to: 'user', label: 'confirmation', kind: 'reply' },
];

const ER_ENTITIES: EREntityInput[] = [
  {
    id: 'user',
    label: 'User',
    fields: [
      { name: 'id', type: 'uuid', key: 'PK' },
      { name: 'email', type: 'text' },
      { name: 'name', type: 'text' },
    ],
  },
  {
    id: 'order',
    label: 'Order',
    fields: [
      { name: 'id', type: 'uuid', key: 'PK' },
      { name: 'user_id', type: 'uuid', key: 'FK' },
      { name: 'total', type: 'numeric' },
    ],
  },
  {
    id: 'item',
    label: 'LineItem',
    fields: [
      { name: 'id', type: 'uuid', key: 'PK' },
      { name: 'order_id', type: 'uuid', key: 'FK' },
      { name: 'qty', type: 'int' },
    ],
  },
];

const ER_RELS: ERRelationshipInput[] = [
  { from: 'user', to: 'order', fromCardinality: '1', toCardinality: 'N' },
  { from: 'order', to: 'item', fromCardinality: '1', toCardinality: 'N' },
];

const TIMELINE_EVENTS: TimelineEventInput[] = [
  { date: '2021', label: 'Founded', detail: 'Two people, one idea' },
  { date: '2022', label: 'Seed round' },
  { date: '2023', label: 'Public launch', detail: 'First 10k users' },
  { date: '2024', label: 'Series A' },
  { date: '2025', label: 'Profitable' },
];

const MERMAID_SRC = `flowchart LR
  A([Start]) --> B[Build]
  B --> C{Ship?}
  C -->|yes| D((Done))
  C -->|no| B`;

// A deliberately flawed chart: many long-labelled, clustered categories — the
// critique engine flags the crowding and label collisions.
const CRITIQUE_DATA = Array.from({ length: 16 }, (_, i) => ({
  category: `Department ${i + 1}`,
  value: 80 + (i % 4),
}));
const CRITIQUE_PROFILE = profileData(CRITIQUE_DATA);
const CRITIQUE_REC = recommendChart(CRITIQUE_PROFILE)[0];
const CRITIQUES = critiqueChart(compileChart(CRITIQUE_DATA, CRITIQUE_REC), CRITIQUE_PROFILE, {
  width: 460,
});

const SPARK_POINTS = [3, 7, 4, 9, 6, 11, 8, 14].map((v, i) => ({ x: i * 50, y: 120 - v * 7 }));

// Row records for the natural-language demo — named fields the parser resolves.
const NL_DATA = [
  { month: 'Jan', revenue: 12, region: 'NA' },
  { month: 'Feb', revenue: 19, region: 'EU' },
  { month: 'Mar', revenue: 7, region: 'NA' },
  { month: 'Apr', revenue: 24, region: 'EU' },
];

export function App() {
  const [view, setView] = useState<View>(viewFromHash);
  const [preset, setPreset] = useState<VibePreset>('messy_sketch');
  const [roughness, setRoughness] = useState(VIBE_PRESETS[preset].roughness);
  const [query, setQuery] = useState('revenue by month as a line in pencil');

  // Keep the view in sync with the URL hash so #gallery is linkable/back-able.
  useEffect(() => {
    const sync = () => setView(viewFromHash());
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);
  const go = (next: View) => {
    window.location.hash = next === 'gallery' ? 'gallery' : '';
    setView(next);
  };

  // Branding controls — layered on top of the vibe.
  const [brandOn, setBrandOn] = useState(true);
  const [primary, setPrimary] = useState(BRAND_KITS.Acme.primary);
  const [ink, setInk] = useState(BRAND_KITS.Acme.ink);
  const [page, setPage] = useState(BRAND_KITS.Acme.page);
  const [paletteText, setPaletteText] = useState(BRAND_KITS.Acme.palette);
  const [brandFont, setBrandFont] = useState(BRAND_KITS.Acme.font);
  const [showLogo, setShowLogo] = useState(true);
  const [logoText, setLogoText] = useState(BRAND_KITS.Acme.logo);
  const [logoPos, setLogoPos] = useState<LogoPosition>('top-right');

  const applyKit = (name: keyof typeof BRAND_KITS) => {
    const k = BRAND_KITS[name];
    setPrimary(k.primary);
    setInk(k.ink);
    setPage(k.page);
    setPaletteText(k.palette);
    setBrandFont(k.font);
    setLogoText(k.logo);
    setBrandOn(true);
  };

  const vibe: VibeConfig = { preset, roughness };

  const palette = paletteText
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const brand: BrandConfig | undefined = brandOn
    ? {
        primary,
        ink,
        page,
        palette: palette.length ? palette : undefined,
        font: brandFont || undefined,
        logo: showLogo
          ? { src: wordmark(logoText, primary, '#ffffff'), position: logoPos, width: 72 }
          : undefined,
      }
    : undefined;

  // Re-derive the interpretation for display (AutoChart re-parses internally).
  const plan = planChart(NL_DATA, { query });

  return (
    <div className="min-h-screen bg-amber-50 p-8 text-gray-900">
      <header className="mx-auto mb-8 max-w-5xl">
        <h1 className="text-3xl font-bold tracking-tight">
          GoldenChart {view === 'gallery' ? 'Gallery' : 'Playground'}
        </h1>
        <p className="mt-1 text-gray-600">
          D3 computes the geometry, Rough.js draws it, the Vibe engine sets the mood, and a Brand
          layers on your identity.
        </p>
        <nav className="mt-3 flex gap-2">
          <ViewTab
            label="Playground"
            active={view === 'playground'}
            onClick={() => go('playground')}
          />
          <ViewTab label="Gallery" active={view === 'gallery'} onClick={() => go('gallery')} />
        </nav>
      </header>

      {view === 'gallery' ? (
        <Gallery />
      ) : (
        <>
          <section className="mx-auto mb-8 flex max-w-5xl flex-wrap items-center gap-6 rounded-lg border border-gray-300 bg-white p-4 shadow-sm">
            <label className="flex items-center gap-2">
              <span className="font-medium">Preset</span>
              <select
                className="rounded border border-gray-300 px-2 py-1"
                value={preset}
                onChange={(e) => {
                  const next = e.target.value as VibePreset;
                  setPreset(next);
                  setRoughness(VIBE_PRESETS[next].roughness);
                }}
              >
                {PRESETS.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </label>

            <label className="flex items-center gap-2">
              <span className="font-medium">Roughness</span>
              <input
                type="range"
                min={0}
                max={4}
                step={0.1}
                value={roughness}
                onChange={(e) => setRoughness(Number(e.target.value))}
              />
              <span className="w-10 tabular-nums text-gray-600">{roughness.toFixed(1)}</span>
            </label>
          </section>

          <section className="mx-auto mb-8 max-w-5xl rounded-lg border border-gray-300 bg-white p-4 shadow-sm">
            <div className="mb-3 flex flex-wrap items-center gap-4">
              <label className="flex items-center gap-2 font-medium">
                <input
                  type="checkbox"
                  checked={brandOn}
                  onChange={(e) => setBrandOn(e.target.checked)}
                />
                Apply brand
              </label>
              <span className="text-sm text-gray-500">Quick kits:</span>
              {(Object.keys(BRAND_KITS) as (keyof typeof BRAND_KITS)[]).map((name) => (
                <button
                  key={name}
                  type="button"
                  onClick={() => applyKit(name)}
                  className="rounded border border-gray-300 px-2 py-1 text-sm hover:bg-gray-50"
                >
                  {name}
                </button>
              ))}
              <span className="text-xs text-gray-500">
                The brand recolours any vibe; the vibe keeps its hand-drawn texture.
              </span>
            </div>

            <div
              className={`flex flex-wrap items-center gap-5 ${brandOn ? '' : 'pointer-events-none opacity-40'}`}
            >
              <label className="flex items-center gap-2 text-sm">
                <span className="font-medium">Primary</span>
                <input type="color" value={primary} onChange={(e) => setPrimary(e.target.value)} />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <span className="font-medium">Ink</span>
                <input type="color" value={ink} onChange={(e) => setInk(e.target.value)} />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <span className="font-medium">Page</span>
                <input type="color" value={page} onChange={(e) => setPage(e.target.value)} />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <span className="font-medium">Font</span>
                <select
                  className="rounded border border-gray-300 px-2 py-1"
                  value={brandFont}
                  onChange={(e) => setBrandFont(e.target.value)}
                >
                  {FONT_OPTIONS.map((f) => (
                    <option key={f.label} value={f.value}>
                      {f.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="flex items-center gap-2 text-sm">
                <span className="font-medium">Palette</span>
                <input
                  type="text"
                  className="w-72 rounded border border-gray-300 px-2 py-1"
                  value={paletteText}
                  onChange={(e) => setPaletteText(e.target.value)}
                  placeholder="#0b3d91, #2a9d8f, …"
                />
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  checked={showLogo}
                  onChange={(e) => setShowLogo(e.target.checked)}
                />
                <span className="font-medium">Logo</span>
              </label>
              <input
                type="text"
                className="w-28 rounded border border-gray-300 px-2 py-1 text-sm"
                value={logoText}
                onChange={(e) => setLogoText(e.target.value)}
                disabled={!showLogo}
              />
              <select
                className="rounded border border-gray-300 px-2 py-1 text-sm"
                value={logoPos}
                onChange={(e) => setLogoPos(e.target.value as LogoPosition)}
                disabled={!showLogo}
              >
                <option value="top-left">top-left</option>
                <option value="top-right">top-right</option>
                <option value="bottom-left">bottom-left</option>
                <option value="bottom-right">bottom-right</option>
              </select>
            </div>
          </section>

          <section className="mx-auto mb-8 max-w-5xl rounded-lg border border-gray-300 bg-white p-4 shadow-sm">
            <label className="block">
              <span className="font-medium">Describe your chart</span>
              <input
                type="text"
                className="mt-1 w-full rounded border border-gray-300 px-3 py-2"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder='e.g. "revenue by region as a pie in neon"'
              />
            </label>
            <p className="mt-2 text-xs text-gray-600">
              Fields: <code>month</code>, <code>revenue</code>, <code>region</code>. Try{' '}
              <code>revenue by region as a pie</code> or{' '}
              <code>compare revenue across region in chalkboard</code>.
            </p>
            <div className="mt-4 grid gap-4 md:grid-cols-2">
              <AutoChart width={460} height={280} query={query} data={NL_DATA} brand={brand} />
              <div className="text-sm text-gray-700">
                <p className="font-medium">Interpretation</p>
                <ul className="mt-1 space-y-1">
                  <li>
                    chart: <code>{plan.recommendation.chartType}</code>
                  </li>
                  <li>
                    intent: <code>{plan.hints.intent ?? '—'}</code>
                  </li>
                  <li>
                    roles: <code>{plan.hints.roles ? JSON.stringify(plan.hints.roles) : '—'}</code>
                  </li>
                  <li>
                    vibe: <code>{String(plan.hints.vibe ?? '—')}</code>
                  </li>
                  <li>
                    confidence: <code>{plan.hints.confidence.toFixed(2)}</code>
                  </li>
                  {plan.hints.unresolved.length > 0 && (
                    <li>
                      unresolved: <code>{plan.hints.unresolved.join(', ')}</code>
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </section>

          <InteractivityShowcase vibe={vibe} brand={brand} />

          <main className="mx-auto grid max-w-5xl gap-8 md:grid-cols-2">
            <Panel title="BarChart">
              <BarChart
                width={460}
                height={300}
                vibe={vibe}
                brand={brand}
                data={BAR_DATA}
                title="Weekly visits"
              />
            </Panel>

            <Panel title="LineChart (multi-series)">
              <LineChart
                width={460}
                height={300}
                vibe={vibe}
                brand={brand}
                series={SERIES}
                curve="catmullRom"
                showPoints
              />
            </Panel>

            <Panel title="AreaChart">
              <AreaChart
                width={460}
                height={300}
                vibe={vibe}
                brand={brand}
                series={[SERIES[0]]}
                curve="basis"
              />
            </Panel>

            <Panel title="ScatterPlot (bubble)">
              <ScatterPlot width={460} height={300} vibe={vibe} brand={brand} data={SCATTER} />
            </Panel>

            <Panel title="PieChart / Donut">
              <div className="flex gap-2">
                <PieChart width={220} height={220} vibe={vibe} brand={brand} data={BAR_DATA} />
                <PieChart
                  width={220}
                  height={220}
                  vibe={vibe}
                  brand={brand}
                  data={BAR_DATA}
                  innerRadius={45}
                />
              </div>
            </Panel>

            <Panel title="Flowchart (shapes, labels, LR)">
              <Flowchart
                width={460}
                height={300}
                vibe={vibe}
                brand={brand}
                nodes={FLOW_NODES}
                edges={FLOW_EDGES}
                direction="LR"
              />
            </Panel>

            <Panel title="Flowchart (orthogonal elbow routing, TB)">
              <Flowchart
                width={460}
                height={300}
                vibe={vibe}
                brand={brand}
                nodes={FLOW_NODES}
                edges={FLOW_EDGES}
                direction="TB"
                routing="orthogonal"
              />
            </Panel>

            <Panel title="Flowchart (DAG merge — two roots into one node)">
              <Flowchart
                width={460}
                height={320}
                vibe={vibe}
                brand={brand}
                nodes={DAG_NODES}
                edges={DAG_EDGES}
                direction="TB"
                routing="orthogonal"
              />
            </Panel>

            <Panel title="MindMap (radial tree)">
              <MindMap width={460} height={360} vibe={vibe} brand={brand} nodes={MIND_NODES} />
            </Panel>

            <Panel title="OrgChart (hierarchy of boxes)">
              <OrgChart width={460} height={300} vibe={vibe} brand={brand} nodes={ORG_NODES} />
            </Panel>

            <Panel title="ArchitectureDiagram (zones + routed links)">
              <ArchitectureDiagram
                width={460}
                height={360}
                vibe={vibe}
                brand={brand}
                nodes={ARCH_NODES}
                edges={ARCH_EDGES}
              />
            </Panel>

            <Panel title="SequenceDiagram (actors + messages)">
              <SequenceDiagram
                width={460}
                height={360}
                vibe={vibe}
                brand={brand}
                actors={SEQ_ACTORS}
                messages={SEQ_MESSAGES}
              />
            </Panel>

            <Panel title="ERDiagram (entities + cardinality)">
              <ERDiagram
                width={460}
                height={340}
                vibe={vibe}
                brand={brand}
                entities={ER_ENTITIES}
                relationships={ER_RELS}
              />
            </Panel>

            <Panel title="Timeline (events along an axis)">
              <Timeline
                width={460}
                height={240}
                vibe={vibe}
                brand={brand}
                events={TIMELINE_EVENTS}
              />
            </Panel>

            <Panel title="Chart critique (suggest_improvements)">
              <AutoChart width={460} height={200} vibe={vibe} brand={brand} data={CRITIQUE_DATA} />
              <ul className="mt-3 space-y-1 text-xs text-gray-700">
                {CRITIQUES.map((c) => (
                  <li key={c.rule}>
                    <span
                      className={`mr-1 rounded px-1 font-semibold uppercase ${
                        c.severity === 'warn'
                          ? 'bg-red-100 text-red-700'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                    >
                      {c.severity}
                    </span>
                    {c.message}
                  </li>
                ))}
              </ul>
            </Panel>

            <Panel title="Mermaid → diagram (renderDiagram + parseMermaid)">
              {renderDiagram(parseMermaid(MERMAID_SRC), { width: 460, height: 300, vibe, brand })}
            </Panel>

            <Panel title="Sankey (weighted flow)">
              <SankeyChart
                width={460}
                height={300}
                vibe={vibe}
                brand={brand}
                nodes={SANKEY_NODES}
                links={SANKEY_LINKS}
                showValues
              />
            </Panel>

            <Panel title="Treemap">
              <TreemapChart
                width={460}
                height={300}
                vibe={vibe}
                brand={brand}
                data={TREEMAP_DATA}
              />
            </Panel>

            <Panel title="Heatmap (viridis)">
              <HeatmapChart
                width={460}
                height={280}
                vibe={vibe}
                brand={brand}
                data={HEATMAP_DATA}
                showValues
              />
            </Panel>

            <Panel title="Radar (multi-series)">
              <RadarChart
                width={360}
                height={320}
                vibe={vibe}
                brand={brand}
                axes={RADAR_AXES}
                series={RADAR_SERIES}
              />
            </Panel>

            <Panel title="Grouped bars (multi-series)">
              <BarChart
                width={460}
                height={280}
                vibe={vibe}
                brand={brand}
                data={MULTI_BARS}
                mode="grouped"
              />
            </Panel>

            <Panel title="Stacked bars (multi-series)">
              <BarChart
                width={460}
                height={280}
                vibe={vibe}
                brand={brand}
                data={MULTI_BARS}
                mode="stacked"
              />
            </Panel>

            <Panel title="Stacked area">
              <AreaChart
                width={460}
                height={260}
                vibe={vibe}
                brand={brand}
                series={SERIES}
                stacked
              />
            </Panel>

            <Panel title="Line chart with annotations">
              <LineChart
                width={460}
                height={260}
                vibe={vibe}
                brand={brand}
                series={[SERIES[0]]}
                annotations={ANNOTATIONS}
              />
            </Panel>

            <Panel title="AutoChart (visualize — picks the chart from the data)">
              <AutoChart width={460} height={280} vibe={vibe} brand={brand} data={AUTO_RECORDS} />
            </Panel>

            <Panel title="Composed primitives (RoughPath + RoughCircle)">
              <Surface width={460} height={160} vibe={vibe} brand={brand} title="Sparkline">
                <RoughPath d={linePath(SPARK_POINTS, 'catmullRom')} fill={null} />
                {SPARK_POINTS.map((p, i) => (
                  <RoughCircle key={i} cx={p.x} cy={p.y} diameter={10} seed={i + 1} />
                ))}
              </Surface>
            </Panel>

            <Panel title="All three presets, side by side">
              <div className="flex flex-wrap gap-2">
                {PRESETS.map((p) => (
                  <div key={p} className="text-center">
                    <BarChart
                      width={150}
                      height={110}
                      vibe={p}
                      data={BAR_DATA}
                      showAxes={false}
                      showGrid={false}
                    />
                    <div className="mt-1 text-xs text-gray-500">{p}</div>
                  </div>
                ))}
              </div>
            </Panel>
          </main>
        </>
      )}
    </div>
  );
}

function ViewTab({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-1 text-sm font-medium transition ${
        active
          ? 'bg-gray-900 text-white'
          : 'border border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
      }`}
    >
      {label}
    </button>
  );
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-lg border border-gray-300 bg-white p-4 shadow-sm">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-gray-500">{title}</h2>
      {children}
    </div>
  );
}
