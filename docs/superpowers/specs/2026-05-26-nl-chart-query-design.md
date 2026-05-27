# Natural-language chart front door — design

**Date:** 2026-05-26
**Status:** Approved (brainstorming → implementation)

## Problem

Today the smartest entry points (`visualize` / `AutoChart` / the MCP
`visualize_data` tool) still require **structured data** plus a fixed 7-value
`intent` enum. There's no way to say *"revenue by month as a line, in pencil"* and
have it resolve the chart, the field roles, and the vibe. The chart *selection* is
automated; the *interpretation of intent* is on the caller.

## Goal

A deterministic, dependency-free heuristic that turns an English query + a data
profile into **hints** that nudge the existing recommender — never a second chart
engine. Exposed through one shared core, wrapped three ways (library, MCP,
playground).

Non-goals: an LLM/NLP dependency, free-form data ingestion (data must already be
rows), conversational back-and-forth.

## Architecture

Two new **pure** units in `src/core/`, beside `profile`/`recommend`/`compile`:

### `src/core/queryParse.ts`

```ts
export interface ChartHints {
  intent?: Intent;                 // feeds recommendChart
  chartType?: ChartType;           // explicit override ("as a donut")
  roles?: Record<string, string>;  // encoding patch: { x:'month', y:'revenue', ... }
  vibe?: VibeConfig;               // from preset name or mood
  props?: Record<string, unknown>; // e.g. { innerRadius } for "donut"
  unresolved: string[];            // phrases it couldn't map (explainability)
  confidence: number;              // 0..1
}

export function parseChartQuery(query: string, profile: DataProfile): ChartHints;
```

Pure and DOM-free. Takes the `DataProfile` so it can match phrases against the
real field names and types. Never throws.

### `src/core/planChart.ts`

```ts
export interface ChartPlan {
  hints: ChartHints;
  recommendation: ChartRecommendation; // chosen, after overrides
  alternatives: ChartRecommendation[];
  compiled: CompiledChart;             // { component, props }
}
export function planChart(data: Row[], opts: { query?: string; intent?: Intent }): ChartPlan;
```

The thin shared orchestrator both wrappers call.

## Data flow

```
query + data
 → profileData(data)                                  (existing)
 → parseChartQuery(query, profile)                    (new) → hints
 → recommendChart(profile, hints.intent ?? opts.intent)  (existing) → recs
 → choose rec: if hints.chartType, prefer a rec of that type, else adapt the
   top rec's encoding to that chartType; otherwise recs[0]
 → patch rec.encoding with hints.roles
 → compileChart(data, rec)                            (existing) → { component, props }
 → merge hints.props + hints.vibe into props
 → ChartPlan
```

`visualize`/`AutoChart` call `planChart` then `createElement`; the MCP tool calls
`planChart` then renders to SVG. The parser only nudges the recommender, so the
two can't disagree.

## Parser internals (heuristic rules)

Normalize: lowercase, collapse whitespace, tokenize on word boundaries.

- **Intent** — synonym table → `Intent`:
  - trend ← trend, "over time", growth, decline, trajectory, history
  - compare ← compare, vs, versus, "by", ranking, top, largest
  - composition ← breakdown, share, proportion, percentage, %, makeup, "part of"
  - distribution ← distribution, spread, histogram, frequency
  - correlation ← correlation, relationship, against, scatter
  - flow ← flow, "from…to", pipeline, funnel
  - hierarchy ← hierarchy, tree, nested, org, parent
- **Chart type** — keyword table → `ChartType` (+ props):
  bar/column, line, area, scatter/bubble, pie, donut/doughnut→pie+`innerRadius`,
  heatmap/"heat map"/matrix, sankey, treemap, radar/spider.
- **Field roles** — phrase patterns, then fuzzy-match the captured token to a
  field name (normalize, exact → singular/plural → startsWith → substring; score,
  pick best; near-tie ⇒ ambiguous, push to `unresolved`, skip):
  - "by/per/across X" → `x` (prefer categorical/temporal)
  - "of/in/total Y" or bare quantitative mention → `y` / `value`
  - "split/grouped/colored by Z" → `series`
  - "X vs/against Y" (two quantitatives) → `x`, `y`
  - "from A to B" → `source`, `target`
  - Roles are keyed by the encoding keys `compileChart` reads
    (`x`,`y`,`value`,`label`,`series`,`source`,`target`).
- **Vibe** — fuzzy preset-name match (underscores↔spaces, Levenshtein ≤1) against
  the 27 presets; plus a small curated mood map: professional→clean_blueprint,
  playful→comic_book, dark→midnight, hand-drawn/sketchy→messy_sketch,
  retro→amber_crt, neon→neon, chalk→chalkboard.
- **Confidence** — 0.5 base; +0.2 intent, +0.2 ≥1 role, +0.1 chartType; cap 1.

## Error handling

The parser **never throws**. Behavior on edge cases:

- Empty/garbage query → empty hints (only `unresolved`/`confidence`); `planChart`
  falls back to today's recommender pick (no regression).
- Ambiguous field match → not guessed; recorded in `unresolved`.
- Conflicting hints (e.g. "trend" + "as a pie") → explicit `chartType` wins over
  `intent`; the displaced intent is noted in `unresolved`.
- Forcing a chartType the data can't support → adapt encoding where trivial
  (x→label, y→value); otherwise render proceeds and the non-finite guards already
  keep degenerate output safe (empty, not a crash/hang).

## Wrappers

- **Library:** extend `VisualizeOptions` and `AutoChartProps` with `query?: string`.
  `visualize(data, { query })` parses then plans. `query` + explicit props both
  honored (explicit props win).
- **MCP:** add optional `query` to the existing `visualize_data` tool and return an
  `interpretation` field (`{ intent, chartType, roles, vibe, unresolved, confidence }`)
  alongside the existing `svg` / `chosen` / `alternatives`. No new tool, no drift.
- **Playground:** a "Describe your chart…" text input that calls `visualize(data,
  { query })` and renders, showing the interpretation (chosen chart + any
  unresolved phrases) beneath.

## Testing (TDD)

- `queryParse.test.ts` — table-driven: query → expected hints, one capability per
  case, plus ambiguity, conflicts, typos, empty/garbage.
- `planChart.test.ts` — query + data → expected `component` / encoding / vibe;
  fallback-to-recommender when no query; chartType override.
- Wrapper tests: `visualize` threads `query`; MCP tool returns `interpretation`.
- No hang risk (parser/plan are pure; rendering reuses guarded primitives).

## Out of scope (YAGNI)

LLM adapter/interface, multi-turn refinement, locales other than English, fuzzy
matching beyond Levenshtein ≤1.
