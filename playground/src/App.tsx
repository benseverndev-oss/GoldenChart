import { useState } from 'react';
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
  SankeyChart,
  TreemapChart,
  HeatmapChart,
  RadarChart,
  AutoChart,
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
  VibeConfig,
  VibePreset,
} from 'goldenchart';

const PRESETS = Object.keys(VIBE_PRESETS) as VibePreset[];

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

const SPARK_POINTS = [3, 7, 4, 9, 6, 11, 8, 14].map((v, i) => ({ x: i * 50, y: 120 - v * 7 }));

export function App() {
  const [preset, setPreset] = useState<VibePreset>('messy_sketch');
  const [roughness, setRoughness] = useState(VIBE_PRESETS[preset].roughness);

  const vibe: VibeConfig = { preset, roughness };

  return (
    <div className="min-h-screen bg-amber-50 p-8 text-gray-900">
      <header className="mx-auto mb-8 max-w-5xl">
        <h1 className="text-3xl font-bold tracking-tight">GoldenChart Playground</h1>
        <p className="mt-1 text-gray-600">
          D3 computes the geometry, Rough.js draws it, the Vibe engine sets the mood.
        </p>
      </header>

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

      <main className="mx-auto grid max-w-5xl gap-8 md:grid-cols-2">
        <Panel title="BarChart">
          <BarChart width={460} height={300} vibe={vibe} data={BAR_DATA} title="Weekly visits" />
        </Panel>

        <Panel title="LineChart (multi-series)">
          <LineChart width={460} height={300} vibe={vibe} series={SERIES} curve="catmullRom" showPoints />
        </Panel>

        <Panel title="AreaChart">
          <AreaChart width={460} height={300} vibe={vibe} series={[SERIES[0]]} curve="basis" />
        </Panel>

        <Panel title="ScatterPlot (bubble)">
          <ScatterPlot width={460} height={300} vibe={vibe} data={SCATTER} />
        </Panel>

        <Panel title="PieChart / Donut">
          <div className="flex gap-2">
            <PieChart width={220} height={220} vibe={vibe} data={BAR_DATA} />
            <PieChart width={220} height={220} vibe={vibe} data={BAR_DATA} innerRadius={45} />
          </div>
        </Panel>

        <Panel title="Flowchart (shapes, labels, LR)">
          <Flowchart
            width={460}
            height={300}
            vibe={vibe}
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
            nodes={DAG_NODES}
            edges={DAG_EDGES}
            direction="TB"
            routing="orthogonal"
          />
        </Panel>

        <Panel title="MindMap (radial tree)">
          <MindMap width={460} height={360} vibe={vibe} nodes={MIND_NODES} />
        </Panel>

        <Panel title="OrgChart (hierarchy of boxes)">
          <OrgChart width={460} height={300} vibe={vibe} nodes={ORG_NODES} />
        </Panel>

        <Panel title="ArchitectureDiagram (zones + routed links)">
          <ArchitectureDiagram width={460} height={360} vibe={vibe} nodes={ARCH_NODES} edges={ARCH_EDGES} />
        </Panel>

        <Panel title="SequenceDiagram (actors + messages)">
          <SequenceDiagram width={460} height={360} vibe={vibe} actors={SEQ_ACTORS} messages={SEQ_MESSAGES} />
        </Panel>

        <Panel title="Sankey (weighted flow)">
          <SankeyChart width={460} height={300} vibe={vibe} nodes={SANKEY_NODES} links={SANKEY_LINKS} showValues />
        </Panel>

        <Panel title="Treemap">
          <TreemapChart width={460} height={300} vibe={vibe} data={TREEMAP_DATA} />
        </Panel>

        <Panel title="Heatmap (viridis)">
          <HeatmapChart width={460} height={280} vibe={vibe} data={HEATMAP_DATA} showValues />
        </Panel>

        <Panel title="Radar (multi-series)">
          <RadarChart width={360} height={320} vibe={vibe} axes={RADAR_AXES} series={RADAR_SERIES} />
        </Panel>

        <Panel title="Grouped bars (multi-series)">
          <BarChart width={460} height={280} vibe={vibe} data={MULTI_BARS} mode="grouped" />
        </Panel>

        <Panel title="Stacked bars (multi-series)">
          <BarChart width={460} height={280} vibe={vibe} data={MULTI_BARS} mode="stacked" />
        </Panel>

        <Panel title="Stacked area">
          <AreaChart width={460} height={260} vibe={vibe} series={SERIES} stacked />
        </Panel>

        <Panel title="Line chart with annotations">
          <LineChart width={460} height={260} vibe={vibe} series={[SERIES[0]]} annotations={ANNOTATIONS} />
        </Panel>

        <Panel title="AutoChart (visualize — picks the chart from the data)">
          <AutoChart width={460} height={280} vibe={vibe} data={AUTO_RECORDS} />
        </Panel>

        <Panel title="Composed primitives (RoughPath + RoughCircle)">
          <Surface width={460} height={160} vibe={vibe} title="Sparkline">
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
                <BarChart width={150} height={110} vibe={p} data={BAR_DATA} showAxes={false} showGrid={false} />
                <div className="mt-1 text-xs text-gray-500">{p}</div>
              </div>
            ))}
          </div>
        </Panel>
      </main>
    </div>
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
