import {
  BarChart,
  LineChart,
  AreaChart,
  ScatterPlot,
  PieChart,
  SankeyChart,
  TreemapChart,
  HeatmapChart,
  RadarChart,
  VIBE_PRESETS,
} from 'goldenchart';
import type { ReactElement } from 'react';
import type {
  VibePreset,
  VibeConfig,
  BrandConfig,
  ChartDatum,
  Series,
  MultiSeriesDatum,
} from 'goldenchart';

const PRESETS = Object.keys(VIBE_PRESETS) as VibePreset[];

const BAR: ChartDatum[] = [
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
const MULTI: MultiSeriesDatum[] = [
  { label: 'Q1', values: { sales: 12, returns: 4, support: 6 } },
  { label: 'Q2', values: { sales: 19, returns: 6, support: 5 } },
  { label: 'Q3', values: { sales: 9, returns: 3, support: 8 } },
];
const SCATTER = Array.from({ length: 18 }, (_, i) => ({
  x: (i * 37) % 100,
  y: (i * 53) % 100,
  r: ((i * 17) % 9) + 1,
}));
const SANKEY_NODES = [
  { id: 'visits', label: 'Visits' },
  { id: 'signup', label: 'Sign-up' },
  { id: 'paid', label: 'Paid' },
  { id: 'churn', label: 'Churn' },
];
const SANKEY_LINKS = [
  { source: 'visits', target: 'signup', value: 6 },
  { source: 'signup', target: 'paid', value: 4 },
  { source: 'signup', target: 'churn', value: 2 },
];
const TREEMAP = [
  { id: 'root' },
  { id: 'eng', parent: 'root', value: 8, label: 'Eng' },
  { id: 'design', parent: 'root', value: 4, label: 'Design' },
  { id: 'sales', parent: 'root', value: 6, label: 'Sales' },
];
const HEAT = Array.from({ length: 5 }, (_, x) =>
  Array.from({ length: 4 }, (_, y) => ({ x: `c${x}`, y: `r${y}`, value: (x * 7 + y * 13) % 20 })),
).flat();
const RADAR_AXES = ['Speed', 'Power', 'Range', 'Cost', 'Style'];
const RADAR_SERIES = [
  { id: 'A', values: [4, 7, 5, 3, 6] },
  { id: 'B', values: [6, 3, 7, 5, 4] },
];

// One representative vibe per chart for the "every chart type" wall.
const EVERY_CHART: { title: string; node: ReactElement }[] = [
  { title: 'Bar', node: <BarChart width={300} height={200} vibe="pencil" data={BAR} bare /> },
  {
    title: 'Grouped bar',
    node: <BarChart width={300} height={200} vibe="ink" data={MULTI} mode="grouped" bare />,
  },
  {
    title: 'Stacked bar',
    node: <BarChart width={300} height={200} vibe="kraft" data={MULTI} mode="stacked" bare />,
  },
  {
    title: 'Line',
    node: (
      <LineChart
        width={300}
        height={200}
        vibe="neon"
        series={SERIES}
        curve="catmullRom"
        showPoints
        bare
      />
    ),
  },
  {
    title: 'Area',
    node: (
      <AreaChart
        width={300}
        height={200}
        vibe="watercolor"
        series={[SERIES[0]]}
        curve="basis"
        bare
      />
    ),
  },
  {
    title: 'Scatter',
    node: <ScatterPlot width={300} height={200} vibe="blueprint_dark" data={SCATTER} bare />,
  },
  { title: 'Pie', node: <PieChart width={200} height={200} vibe="comic_book" data={BAR} bare /> },
  {
    title: 'Donut',
    node: <PieChart width={200} height={200} vibe="synthwave" data={BAR} innerRadius={45} bare />,
  },
  {
    title: 'Sankey',
    node: (
      <SankeyChart
        width={300}
        height={200}
        vibe="midnight"
        nodes={SANKEY_NODES}
        links={SANKEY_LINKS}
        showValues
        bare
      />
    ),
  },
  {
    title: 'Treemap',
    node: <TreemapChart width={300} height={200} vibe="botanical" data={TREEMAP} bare />,
  },
  {
    title: 'Heatmap',
    node: <HeatmapChart width={300} height={200} vibe="newsprint" data={HEAT} showValues bare />,
  },
  {
    title: 'Radar',
    node: (
      <RadarChart
        width={240}
        height={220}
        vibe="chalkboard"
        axes={RADAR_AXES}
        series={RADAR_SERIES}
        bare
      />
    ),
  },
];

// Texture tiers shown on a matte vibe so the grain reads clearly.
const TEXTURES: { label: string; vibe: VibeConfig }[] = [
  { label: "texture: 'none'", vibe: { preset: 'kraft', texture: 'none' } },
  { label: "texture: 'paper-subtle'", vibe: { preset: 'kraft', texture: 'paper-subtle' } },
  { label: "texture: 'paper' (default)", vibe: { preset: 'kraft', texture: 'paper' } },
];

// Brand kits layered over a hand-drawn vibe.
const KITS: { name: string; brand: BrandConfig }[] = [
  {
    name: 'Acme',
    brand: {
      primary: '#0b3d91',
      ink: '#1d2433',
      page: '#f7f9fc',
      palette: ['#0b3d91', '#2a9d8f', '#e9c46a', '#e76f51', '#8d99ae'],
    },
  },
  {
    name: 'Mango',
    brand: {
      primary: '#ff6b35',
      ink: '#3a2317',
      page: '#fff8ef',
      palette: ['#ff6b35', '#f7b801', '#7a9e7e', '#ef476f', '#118ab2'],
    },
  },
  {
    name: 'Forest',
    brand: {
      primary: '#2d6a4f',
      ink: '#1b2d22',
      page: '#f3f7f2',
      palette: ['#2d6a4f', '#95d5b2', '#d9a566', '#6a4c93', '#b5838d'],
    },
  },
];

export function Gallery() {
  return (
    <div className="mx-auto max-w-5xl">
      <p className="mb-8 text-gray-600">
        A static tour of the library — the same chart across every vibe, every chart type, the
        paper-grain texture tiers, and brand theming. For the interactive controls, switch back to
        the Playground.
      </p>

      <GallerySection
        title="One chart, every vibe"
        subtitle={`The same bar chart rendered in all ${PRESETS.length} built-in presets.`}
      >
        <div className="flex flex-wrap gap-3">
          {PRESETS.map((p) => (
            <figure key={p} className="text-center">
              <BarChart
                width={150}
                height={110}
                vibe={p}
                data={BAR}
                showAxes={false}
                showGrid={false}
                bare
              />
              <figcaption className="mt-1 text-xs text-gray-500">{p}</figcaption>
            </figure>
          ))}
        </div>
      </GallerySection>

      <GallerySection title="Every chart type" subtitle="Each chart in a vibe that suits it.">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {EVERY_CHART.map(({ title, node }) => (
            <figure key={title} className="rounded border border-gray-200 bg-white p-3">
              {node}
              <figcaption className="mt-2 text-xs font-medium text-gray-500">{title}</figcaption>
            </figure>
          ))}
        </div>
      </GallerySection>

      <GallerySection
        title="Background texture"
        subtitle="The paper-grain speckle, from off to default, on the matte kraft vibe."
      >
        <div className="grid gap-4 sm:grid-cols-3">
          {TEXTURES.map(({ label, vibe }) => (
            <figure key={label} className="rounded border border-gray-200 bg-white p-3">
              <BarChart width={300} height={190} vibe={vibe} data={BAR} bare />
              <figcaption className="mt-2 text-xs font-medium text-gray-500">
                <code>{label}</code>
              </figcaption>
            </figure>
          ))}
        </div>
      </GallerySection>

      <GallerySection
        title="Brand theming"
        subtitle="One pencil-vibe chart recoloured by three brand kits — the sketch feel stays."
      >
        <div className="grid gap-4 sm:grid-cols-3">
          {KITS.map(({ name, brand }) => (
            <figure key={name} className="rounded border border-gray-200 bg-white p-3">
              <BarChart width={300} height={190} vibe="pencil" brand={brand} data={BAR} bare />
              <figcaption className="mt-2 text-xs font-medium text-gray-500">{name}</figcaption>
            </figure>
          ))}
        </div>
      </GallerySection>
    </div>
  );
}

function GallerySection({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-10">
      <h2 className="text-xl font-bold tracking-tight">{title}</h2>
      {subtitle ? (
        <p className="mb-4 mt-1 text-sm text-gray-600">{subtitle}</p>
      ) : (
        <div className="mb-4" />
      )}
      {children}
    </section>
  );
}
