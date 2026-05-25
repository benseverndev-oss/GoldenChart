import { useState } from 'react';
import {
  BarChart,
  LineChart,
  AreaChart,
  ScatterPlot,
  PieChart,
  Flowchart,
  Surface,
  RoughPath,
  RoughCircle,
  linePath,
  VIBE_PRESETS,
} from 'goldenchart';
import type { ChartDatum, FlowNode, Series, ScatterDatum, VibeConfig, VibePreset } from 'goldenchart';

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
