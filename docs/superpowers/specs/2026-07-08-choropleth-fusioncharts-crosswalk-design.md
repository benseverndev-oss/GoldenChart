# US Choropleth renderer + FusionCharts → GoldenChart crosswalk

_Design spec · 2026-07-08_

## Problem / context

A golden-truth branch (`feat/graph-core`) prototyped LLM-driven charting by generating
**FusionCharts** JSON configs — a commercial/licensed library — including a `maps/usa`
choropleth that GoldenChart can't currently produce. Rather than adopt a paid dependency
and a second charting stack, we bring the two missing capabilities into **GoldenChart**
(the in-house, open, SVG chart engine) so the existing tool-use pattern keeps working with
zero FusionCharts runtime:

1. **A US-states choropleth renderer** — the one genuine capability gap (GoldenChart has no
   geo/map support today).
2. **A FusionCharts-config → GoldenChart crosswalk** — translate FusionCharts `dataSource`
   configs into GoldenChart renderer calls, so existing/foreign FC configs render on
   GoldenChart.

Repo: TS/React. Root package = the `goldenchart` library (`src/`); `mcp/` = the
`goldenchart-mcp` server that wraps it. Renderers are React components → SVG string via
`renderToSVGString`; chart tools register through the `makeRenderTool` factory
(`mcp/src/registry.ts`). Reference implementation for value→color region fill is
`HeatmapChart.tsx`. Color scales (`src/core/colorScales.ts`), `polygonPath`
(`src/core/polar.ts`), `RoughPath`, `Surface`, vibe, and export all reused unchanged.

## Goals

- `render_choropleth` MCP tool + `ChoroplethMap` component: US states shaded by a numeric
  value, with a color-ramp legend, matching GoldenChart's vibe/brand/export conventions.
- `build_chart_from_fusioncharts` MCP tool + `fusionToGoldenChart` pure core function: a
  **broad** FusionCharts parser that maps the wide set of FC chart-type aliases onto
  GoldenChart's full renderer catalog, normalizes FC's quirks, and returns a **structured
  `unsupported` result** for anything GoldenChart can't render (never silently wrong).
- Both ship with tests and pass both CI gates (library + mcp).

## Non-goals

- **v1 map scope is US states only.** No counties, no world/general geo, no lon/lat
  projection library (see "pre-projected paths" below). Counties/world are future work.
- Not a FusionCharts rendering engine — we translate to GoldenChart renderers, not
  reproduce FC's full visual feature set (3D, gauges, funnels-as-primitives, real-time,
  drill-down, etc. → `unsupported`).
- No golden-truth-side changes here — this spec is GoldenChart-only. Re-pointing the
  golden-truth agent / retiring the `graph-core` FusionCharts code is a follow-up that
  consumes these two new tools.

## Design

### 1. US-states choropleth renderer

**Geometry — pre-projected static paths (no d3-geo).** Add `src/core/usStates.ts`: a static
`Record<StateCode, string>` mapping each 2-letter USPS code to a **pre-projected**
Albers-USA SVG `d` path string in a fixed viewBox (public-domain Census/us-atlas geometry,
simplified). This avoids adding a projection dependency and any runtime lon/lat math — the
paths are already in SVG coordinate space. Rationale: US-only v1 needs ~50 fixed shapes, not
a general projection engine.

**Bundle guardrail.** The browser library entry is capped (75 KB gzip; `npm run
check:bundle`). Ship the geometry behind an **opt-in subpath** (mirroring the
`goldenchart/fonts` pattern) so it never lands in the main browser bundle; the MCP server
and `ChoroplethMap` import it directly (server-side render). Confirm the subpath is excluded
from the browser-entry bundle check.

**Component — `src/components/ChoroplethMap.tsx`** (mirrors `HeatmapChart.tsx`):
- Props: `{ data: Array<{region: string, value: number}>, scale?: ColorScaleName,
  diverging?: boolean, ...baseChartShape }` (width/height/vibe/brand/title/etc.).
- Compute value extent → `sequentialColor(scale, [min,max])` (or `vibeColorScale` when no
  scale given, matching Heatmap) → for each state code present in `usStates`, emit a
  `RoughPath` with `fill = color(valueForRegion)`; states absent from `data` render in a
  muted "no-data" fill.
- Region-id ↔ value join: normalize `region` to the canonical code (accept 2-letter code
  case-insensitively; a small name→code alias table for common full names is nice-to-have,
  not required for v1 — decide during implementation).
- A color-ramp **legend** (min→max swatches) reusing the existing legend/label primitives.
- Wrap in `<Surface bare>`; returns a bare `<svg>` so PNG/HTML/data-URI export work for free.

**MCP tool — `render_choropleth`** via `makeRenderTool` in `mcp/src/tools.ts`, with the
schema added to `mcp/src/schemas.ts` (`ChoroplethDatum = {region, value}` + spread
`baseChartShape`). Add a golden snapshot under `mcp/src/__snapshots__/`.

### 2. Broad FusionCharts crosswalk

**Pure core — `src/core/fusioncharts.ts`:** `fusionToGoldenChart(input) => { component,
props } | { unsupported: { type, reason } }`, mirroring `src/core/compile.ts:compileChart`.
Accepts a FusionCharts payload (either the full `{type, dataSource}` or a bare
`dataSource`). Responsibilities:

- **Type-alias mapping** (the "broad" surface) onto GoldenChart renderers:
  | FusionCharts `type` | GoldenChart target |
  |---|---|
  | `line, spline, msline, msspline, zoomline` | `LineChart` |
  | `column2d, bar2d, mscolumn2d, msbar2d, stackedcolumn2d, stackedbar2d` | `BarChart` (orientation from column-vs-bar; `mode: 'grouped'\|'stacked'`) |
  | `area2d, msarea2d, stackedarea2d` | `AreaChart` |
  | `pie2d, pie3d, doughnut2d, doughnut3d` | `PieChart` (doughnut → `innerRadius`) |
  | `scatter, bubble` | `ScatterChart` (bubble → `r` from z) |
  | `radar` | `RadarChart` |
  | `heatmap` | `HeatmapChart` |
  | `treemap` | `TreemapChart` |
  | (`sankey` if a `SankeyChart` renderer exists — else `unsupported`) | `SankeyChart` |
  | `maps/usa` (and `maps/*` US aliases) | `ChoroplethMap` (from part 1) |
  | anything else | `{ unsupported: { type, reason } }` |
- **Normalization:** coerce FC **string numbers** (`"42"` → `42`) and NaN-guard; normalize
  colors (FC hex without `#`, and `palettecolors` CSV) → GoldenChart color/brand; split
  `dataSource.chart` **config** (caption→title, width/height, theme/palette→vibe/brand,
  numberPrefix/Suffix) from **data**.
- **Data-shape adapters:** `dataSource.data:[{label,value}]` → `{label,value}[]`;
  `dataset:[{seriesname,data:[{value}]}]` + `categories:[{category:[{label}]}]` → GoldenChart
  `series:[{id,points:[{x,y}]}]` (join category index → x); scatter `dataset:[{data:[{x,y}]}]`
  → `{x,y,r?}[]`; map `colorrange`+`data:[{id,value}]` → choropleth `{region,value}[]` (+
  map `colorrange.color[]` onto a `scale`/domain).
- Each unsupported/unknown field is dropped safely (best-effort), and an unrenderable
  **type** yields the structured `unsupported` result (not an exception).

**MCP tool — `build_chart_from_fusioncharts`** in a new `mcp/src/fusionTools.ts` (added to
the `tools` array in `mcp/src/tools.ts`): parse input → `fusionToGoldenChart` → if
`unsupported`, return a structured error payload the caller can act on; else
`renderToSVGString(createElement(component, props))` and return the standard
`{content:[{type:'text',text:svg}], structuredContent:{svg, meta}}` shape.

## Testing

- **Choropleth:** `ChoroplethMap.test.tsx` (extent→color, no-data fill, legend, region join)
  + `render_choropleth` MCP golden snapshot.
- **Crosswalk:** `fusioncharts.test.ts` — one case per alias family (line/spline/ms*,
  column/bar/stacked, area, pie/doughnut, scatter/bubble, radar, heatmap, treemap,
  maps/usa), plus string-number coercion, `#`-less color normalization, categories→x join,
  and the `unsupported` path (e.g. `gauge`, `funnel`). `build_chart_from_fusioncharts` MCP
  snapshot for a representative config + an `unsupported` assertion.
- Lint/format (ESLint flat + Prettier), typecheck, `npm run build`, and `npm run
  check:bundle` (confirm the state geometry subpath doesn't bloat the browser entry). Both
  the `library` and `mcp` CI gates.

## Build order / dependency

Build **the choropleth first** — the crosswalk's `maps/usa` branch targets `ChoroplethMap`,
so the renderer must exist before the crosswalk's map path (and its test) can pass. The
crosswalk's non-map families don't depend on part 1 and could land in parallel, but the
single-PR order is: geometry + renderer + tool → crosswalk core + tool.

## Resolved decisions

- Map: **US states only**, **pre-projected static Albers-USA paths** (no d3-geo / no runtime
  projection), geometry behind an opt-in subpath to respect the bundle guard.
- Crosswalk: **broad** = robust FC parser + wide type-alias mapping onto GoldenChart's full
  catalog + **structured `unsupported`** for the rest (never silently wrong).
- Choropleth reuses `HeatmapChart`'s value→color pattern, `sequentialColor`/`vibeColorScale`,
  `RoughPath`/`polygonPath`, `Surface`, vibe, export — new code is purely the geometry +
  region join + legend.
- GoldenChart-only; golden-truth re-pointing / FusionCharts removal is follow-up.
