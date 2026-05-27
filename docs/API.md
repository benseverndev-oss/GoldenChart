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

| Prop | Type | Notes |
| --- | --- | --- |
| `width` | `number` | Required. |
| `height` | `number` | Required. |
| `margin` | `Partial<{ top; right; bottom; left }>` | Per-chart defaults otherwise. |
| `vibe` | `VibeConfig` | Preset name or `{ preset, ...overrides }`. |
| `title` | `string` | Accessible label → `<title>` / aria-label. |
| `description` | `string` | Longer description → `<desc>`. |
| `ariaLabel` | `string` | Explicit aria-label; falls back to `title`. |
| `dataTable` | `boolean` | Emit a visually-hidden data table (data charts only). |
| `className` / `style` | `string` / `CSSProperties` | Applied to the wrapper. |
| `bare` | `boolean` | Render only the `<svg>` (no wrapper div) — for headless/SVG-string use. |

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
  with `intent?: Intent`.
- `AutoChart` — component form: `{ data, intent?, ...BaseChartProps }`.
- `Intent` = `'trend' | 'compare' | 'composition' | 'distribution' | 'correlation' | 'flow' | 'hierarchy'`.

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

## Accessibility

Charts and diagrams render a `role="img"` surface labelled by `title` /
`ariaLabel` with an optional `<desc>` from `description`. Data charts additionally
support `dataTable` to emit a visually-hidden table mirroring the data for screen
readers (diagrams have no tabular equivalent, so `dataTable` is a no-op there). The
`drawOn` animation is disabled under `prefers-reduced-motion`.
