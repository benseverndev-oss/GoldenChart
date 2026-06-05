# GoldenChart API reference

This is a hand-maintained overview of the public surface. The authoritative,
always-current types ship as `.d.ts` with the package — your editor's
IntelliSense reflects the exact props. Import everything from `goldenchart`
(headless rendering from `goldenchart/server`, font bytes from `goldenchart/fonts`).

- [Conventions](#conventions)
- [BaseChartProps](#basechartprops)
- [Charts](#charts)
- [Diagrams](#diagrams)
- [Auto-charting](#auto-charting)
- [Vibe engine](#vibe-engine)
- [Branding](#branding)
- [Surface & primitives](#surface--primitives)
- [Headless rendering](#headless-rendering)
- [Calculation layer](#calculation-layer)
- [Accessibility](#accessibility)

## Conventions

- All sizes are in pixels. `width` and `height` are required on every chart and diagram.
- `vibe` is a `VibeConfig`: a preset name (`'pencil'`), or `{ preset, ...overrides }`.
  An unknown preset name falls back to the default vibe and logs a warning.
- Non-finite data (`NaN` / `±Infinity`) is tolerated: such values are dropped from
  axis domains and their shapes are skipped, so one bad datum can't break a render.

## BaseChartProps

Shared by every chart and diagram component:

| Prop                  | Type                                    | Notes                                                                           |
| --------------------- | --------------------------------------- | ------------------------------------------------------------------------------- |
| `width`               | `number`                                | Required.                                                                       |
| `height`              | `number`                                | Required.                                                                       |
| `margin`              | `Partial<{ top; right; bottom; left }>` | Per-chart defaults otherwise.                                                   |
| `vibe`                | `VibeConfig`                            | Preset name or `{ preset, ...overrides }`.                                      |
| `brand`               | `BrandConfig`                           | Palette / colours / font / logo layered on the vibe. See [Branding](#branding). |
| `title`               | `string`                                | Accessible label → `<title>` / aria-label.                                      |
| `description`         | `string`                                | Longer description → `<desc>`.                                                  |
| `ariaLabel`           | `string`                                | Explicit aria-label; falls back to `title`.                                     |
| `dataTable`           | `boolean`                               | Emit a visually-hidden data table (data charts only).                           |
| `className` / `style` | `string` / `CSSProperties`              | Applied to the wrapper.                                                         |
| `bare`                | `boolean`                               | Render only the `<svg>` (no wrapper div) — for headless/SVG-string use.         |

## Charts

### `BarChart`

- `data: ChartDatum[] | MultiSeriesDatum[]` — `{ label, value, color? }`, or `{ label, values }` for multi-series.
- `mode?: 'single' | 'grouped' | 'stacked'` (default `single`)
- `seriesKeys?: string[]`, `showAxes?`, `showGrid?`, `showLegend?`, `annotations?: Annotation[]`
- `xAxis? / yAxis?: AxisFormat`

### `LineChart`

- `series: Series[]` — `{ id, points: { x, y }[], color? }`
- `curve?: CurveName`, `showPoints?`, `showAxes?`, `showGrid?`
- `emphasis?: EmphasisSpec[]` — trend lines, auto-callouts, series highlighting
- `annotations?`, `xAxis? / yAxis?: AxisFormat`

### `AreaChart`

- `series: Series[]`, `curve?: CurveName`
- `baseline?: number`, `showLine?`, `stacked?` (index-aligned series)
- `showAxes?`, `showGrid?`, `annotations?`, `xAxis? / yAxis?`

### `ScatterPlot`

- `data: ScatterDatum[]` — `{ x, y, r?, ... }`
- `radius?: number`, `maxRadius?: number` (for bubble sizing when `r` is present)
- `emphasis?: EmphasisSpec[]`, `showAxes?`, `showGrid?`, `annotations?`, `xAxis? / yAxis?`

### `PieChart`

- `data: ChartDatum[]`
- `innerRadius?: number` (0 = pie, > 0 = donut), `padAngle?: number`, `showLabels?`

### `SankeyChart`

- `nodes: SankeyNodeInput[]`, `links: SankeyLinkInput[]`
- `direction?: SankeyOrientation`, `nodeWidth?`, `nodePadding?`, `showValues?`

### `TreemapChart`

- `data: TreemapDatum[]`
- `padding?: number`, `tile?: TreemapTile`, `showLabels?`

### `HeatmapChart`

- `data: HeatmapDatum[]`
- `xLabels? / yLabels?: (string | number)[]`
- `colorScale?: ColorScaleName | ((value: number) => string)`, `showValues?`, `showAxes?`

### `RadarChart`

- `axes: string[]`, `series: RadarSeries[]`
- `maxValue?: number`, `levels?: number`, `showDots?`, `showLabels?`

## Diagrams

All take `BaseChartProps`. The node-link family shares `FlowNode` (`{ id, label,
parent?, shape?: 'rect' | 'ellipse' | 'diamond', group?, vibe? }`) and `FlowEdge`
(`{ from, to, label?, routing? }`).

### `Flowchart`

- `nodes: FlowNode[]`, `edges?: FlowEdge[]`
- `direction?: 'TB' | 'BT' | 'LR' | 'RL'` (default `TB`)
- `routing?: 'curved' | 'orthogonal'` (default `curved`), `showArrowheads?` (default `true`)
- `layoutOptions?: LayoutOptions` — `density`, `nodeSpacing`, `rankSpacing`, `engine: 'auto' | 'tree' | 'dag'`

### `MindMap`, `OrgChart`, `ArchitectureDiagram`

Thin wrappers over `Diagram` with a preset layout. Take `nodes` / `edges` (and
`direction` for `OrgChart` / `ArchitectureDiagram`).

### `Diagram` (low-level)

- `nodes: FlowNode[]`, `edges?: FlowEdge[]`
- `layout: LayoutEngine` — e.g. `flowLayout(direction, opts)`, `radialLayout()`
- `routing?`, `showArrowheads?`

### `SequenceDiagram`

- `actors: SequenceActorInput[]`, `messages: SequenceMessageInput[]`, `actorHeight?: number`

### `ERDiagram`

- `entities: EREntityInput[]`, `relationships?: ERRelationshipInput[]`, `direction?: FlowDirection`

### `Timeline`

- `events: TimelineEventInput[]`, `orientation?: TimelineOrientation`

### Mermaid bridge

- `parseMermaid(source: string): DiagramSpec` — flowchart, sequence, and mindmap syntaxes;
  throws `MermaidParseError` on unsupported input.
- `renderDiagram(spec: DiagramSpec, opts): ReactElement` — dispatches a spec to its component.

## Auto-charting

- `visualize(data: Record<string, unknown>[], opts): ReactElement` — profiles the
  data, picks a chart, compiles props, and renders. `opts` extends `BaseChartProps`
  with `intent?: Intent` and `query?: string`.
- `AutoChart` — component form: `{ data, intent?, query?, ...BaseChartProps }`.
- `Intent` = `'trend' | 'compare' | 'composition' | 'distribution' | 'correlation' | 'flow' | 'hierarchy'`.

### Natural-language queries

Pass a plain-English `query` to `visualize` / `AutoChart` and it picks the chart
type, maps fields to roles, and selects a vibe from the sentence. The parser only
_nudges_ the same recommender used for `intent`, so the two can't disagree — and
any explicit prop you also pass (`width`, `vibe`, …) still wins over what the
query inferred.

```tsx
import { visualize } from 'goldenchart';

visualize(data, { query: 'revenue by month as a line in pencil', width: 460, height: 300 });
// → LineChart, x=month, y=revenue, vibe=pencil
visualize(data, { query: 'revenue by region as a donut in watercolor', width: 360, height: 360 });
// → PieChart with innerRadius (donut), vibe=watercolor
```

What the query understands (all optional, order-free, fuzzy-matched):

- **Chart type** — `bar`/`column`, `line`, `area`, `pie`, `donut`/`doughnut`,
  `scatter`/`bubble`, `heatmap`/`matrix`, `sankey`, `treemap`, `radar`/`spider`.
- **Intent** — words like `over time`/`trend`, `compare`/`ranking`, `breakdown`/
  `share`, `distribution`, `correlation`/`vs`, `flow`/`funnel`, `hierarchy`/`tree`.
- **Field roles** — `by`/`per`/`across X` (x or, after `split`/`grouped`/`stacked`,
  a series), `X vs Y` / `X against Y`, `between A and B`, `from A to B`
  (source/target). Bare field names fill remaining roles by type. Field matching
  is case-insensitive with singular/prefix/substring fallbacks.
- **Vibe** — any preset name (fuzzy, underscores ↔ spaces) or a mood word
  (`professional`, `playful`, `dark`, `retro`, `sketchy`, …).

For programmatic use, the layer underneath is exported and pure:

- `planChart(data, { query?, intent? }): ChartPlan` — the orchestrator
  `visualize` calls. Returns `{ hints, recommendation, alternatives, compiled }`,
  so you can inspect or tweak the plan before rendering.
- `parseChartQuery(query, profile): ChartHints` — just the parse step. Returns
  `{ intent?, chartType?, roles?, vibe?, props?, unresolved, confidence }`;
  `unresolved` lists words it couldn't map (for explainability). Never throws.

## Vibe engine

- `VIBE_PRESETS` — record of all built-in presets; `DEFAULT_VIBE` — the fallback name.
- `resolveVibe(config?): ResolvedVibe` — collapse a `VibeConfig` into a full vibe.
- `vibeToRoughOptions(vibe, seedOverride?)` — translate a resolved vibe to Rough.js options.
- `VibeProvider` / `useVibeContext` / `useResolvedVibe` — React context for the active vibe.

Presets: `messy_sketch`, `clean_blueprint`, `chaotic_notebook`, `pencil`, `marker`,
`ink`, `crayon`, `davinci_journal`, `blueprint_dark`, `chalkboard`, `neon`,
`comic_book`, `terminal`, `watercolor`, `newsprint`, `whiteboard`, `typewriter`,
`midnight`, `art_deco`, `manga`, `highlighter`, `kraft`, `synthwave`, `botanical`,
`risograph`, `sticky_note`, `amber_crt`. Add `animate: { drawOn: true }` for a
hand-drawn reveal (honors `prefers-reduced-motion`).

**Background texture.** `texture` paints a faint, deterministic paper-grain
speckle behind the data so matte vibes don't read as a flat fill:

- `'paper'` / `'paper-medium'` — the standard grain.
- `'paper-subtle'` — sparser and fainter.
- `'none'` — disabled.

`watercolor`, `newsprint`, `kraft`, `botanical`, `risograph`, `sticky_note`, and
`typewriter` enable `'paper'` by default; override per call to tune or turn it off
(`vibe={{ preset: 'kraft', texture: 'paper-subtle' }}` or `texture: 'none'`). The
speckle is seeded from the vibe seed, so output is byte-stable across renders, and
it's `aria-hidden`.

## Branding

A `brand` (`BrandConfig`) layers identity on top of a `vibe`. The vibe controls
_how_ a chart is drawn (texture, roughness, the hand-drawn feel); the brand
controls _identity_ (colours, font, logo). Every field is optional — omit one to
inherit the vibe's value. Precedence is **preset < brand < explicit `vibe`
overrides**: a brand recolours any vibe, and an explicit per-call `vibe` override
still wins over the brand.

| Field     | Type        | Maps to vibe | Notes                                                                  |
| --------- | ----------- | ------------ | ---------------------------------------------------------------------- |
| `palette` | `string[]`  | —            | Categorical hues for multi-series / pie. Replaces the default palette. |
| `primary` | `string`    | `fill`       | Single-series bars, accents.                                           |
| `ink`     | `string`    | `stroke`     | Line / stroke colour.                                                  |
| `page`    | `string`    | `background` | Page / canvas colour.                                                  |
| `font`    | `string`    | `fontFamily` | Font family for all chart text.                                        |
| `logo`    | `BrandLogo` | —            | Optional corner wordmark / logo.                                       |

`BrandLogo` = `{ src, position?, width?, height?, opacity?, margin? }`. `src` is a
URL or data-URI (the library never bundles image bytes). `position` is one of
`'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'` (default
`'bottom-right'`); `width` defaults to `64`, `height` to `width`, `opacity` to `1`
(clamped 0–1), `margin` (inset from the surface edge) to `12`. The image keeps its
aspect ratio inside the box.

`resolveBrand(brand?): ResolvedBrand` collapses a brand into the pieces the
renderer consumes — `{ palette, logo?, vibeOverrides }` — the boundary between
loose config and the strict internal shape, mirroring `resolveVibe`.

```tsx
<BarChart
  vibe="pencil" // brand recolours, vibe keeps the sketch feel
  brand={{
    palette: ['#ff6b35', '#f7b801', '#7a9e7e', '#ef476f', '#118ab2'],
    primary: '#ff6b35',
    ink: '#3a2317',
    page: '#fff8ef',
    font: '"IBM Plex Sans", system-ui, sans-serif',
    logo: { src: logoDataUri, position: 'bottom-right', width: 88 },
  }}
  data={data}
/>
```

## Surface & primitives

- `Surface` — the outer SVG + Tailwind wrapper + `VibeProvider`. Owns accessibility
  (`role="img"`, `<title>`/`<desc>`, aria-label) and the `bare` mode.
- Primitives draw a single shape under the current vibe; non-finite geometry is skipped:
  - `RoughPath` (`d`), `RoughLine` (`x1,y1,x2,y2`), `RoughRectangle` (`x,y,width,height`),
    `RoughCircle` (`cx,cy,diameter`), `RoughText` (`x,y,children`).
- `getRoughGenerator()` / `drawableToPaths(drawable)` — the shared DOM-free Rough.js layer.

## Headless rendering

From `goldenchart/server`:

- `renderToSVGString(element): string` — render any chart/diagram (pass `bare`) to a
  self-contained SVG string, auto-embedding the vibe's `@font-face`.

From `goldenchart/fonts` (opt-in, ships font bytes):

- `fontFaceFor(preset)` — `@font-face` CSS for browser self-containment.
- `FONT_TTF_BASE64` — raw font data for rasterizers that load fonts explicitly.

## Calculation layer

Everything under `goldenchart`'s core export is pure and DOM-free: `linearScale`,
`bandScale`, `extentOf`, `ticksForScale`, `linePath`, `regularPolygonPath`,
`starPath`, `arcStrokePath`, `wedgePath`, `ellipsePath`, `connectorPath`,
hierarchy/DAG/sankey/treemap layouts, color scales, and text metrics. Hand any path
string to `<RoughPath>` to sketch arbitrary geometry.

## Interactivity (`goldenchart/interactive`)

Opt-in, progressive enhancement layered over the static charts — the core
`goldenchart` entry ships none of it. Wrap a chart in `<InteractiveChart>`:
`tooltip`, `highlight`, `onHover`, `selectable` / `selected` / `onSelect`,
`legendToggle`, `crosshair`, `zoom`, `pan`, `brush` / `onBrush`, `transition`,
`linkGroup`. Also exports `LinkedCharts`, `readMark`, and `interactiveEmbed(svg)`
(self-contained interactive HTML; also the MCP `export_interactive_html` tool).
Full guide: [`INTERACTIVITY.md`](./INTERACTIVITY.md).

## Accessibility

Charts and diagrams render a `role="img"` surface labelled by `title` /
`ariaLabel` with an optional `<desc>` from `description`. Data charts additionally
support `dataTable` to emit a visually-hidden table mirroring the data for screen
readers (diagrams have no tabular equivalent, so `dataTable` is a no-op there). The
`drawOn` animation is disabled under `prefers-reduced-motion`. Interactive marks
(via `goldenchart/interactive`) are keyboard-focusable with `aria-label`s.

**Fallback descriptions.** When you omit `description`, every chart and diagram
auto-emits a short data-derived `<desc>` so the surface is never unlabelled — an
explicit `description` always wins. The fallback summarises the shape of the data:

| Component                                                 | Example fallback `<desc>`                                          |
| --------------------------------------------------------- | ------------------------------------------------------------------ |
| `BarChart`                                                | `Bar chart with 4 categories, values from 7 to 24.`                |
| `LineChart` / `AreaChart`                                 | `Line chart with 2 series and 24 points, y values from -3 to 90.`  |
| `PieChart`                                                | `Pie chart with 3 slices totaling 60.`                             |
| `ScatterPlot`                                             | `Scatter plot with 120 points.`                                    |
| `Flowchart`, `OrgChart`, `MindMap`, `ArchitectureDiagram` | `Diagram with 6 nodes and 5 edges.`                                |
| `ERDiagram`                                               | `Entity-relationship diagram with 3 entities and 2 relationships.` |
| `SankeyChart`                                             | `Sankey diagram with 8 nodes and 11 links.`                        |

`Badge` is a compact inline label, not a `role="img"` figure, so it carries no
`<title>`/`<desc>`. Keyboard navigation _between_ data points is out of scope here
(tracked separately).
