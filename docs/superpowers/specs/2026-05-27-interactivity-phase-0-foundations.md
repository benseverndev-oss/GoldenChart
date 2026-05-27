# Interactivity — Phase 0: Foundations

**Parent:** [interactivity-roadmap](./2026-05-27-interactivity-roadmap.md) · **Status:** Spec · **Date:** 2026-05-27

Unlocks interactivity without shipping any behavior. Bakes an inert `data-gc-*`
contract into the static SVG, opens the gated `goldenchart/interactive` export,
and defines the shared interaction types. After this phase the static output is
unchanged except for added inert attributes, and `check:bundle` still guards the
core.

## Goal

Make every chart mark addressable from a client layer, with zero behavior change
and zero bundle impact on the static core.

## Scope

**In:** `data-gc-*` attribute contract; a DOM-free `markAttrs()` serializer and a
client-side `readMark()` parser; pointer-event passthrough on primitives; the
`goldenchart/interactive` entry skeleton; `tsup` + `check:bundle` wiring;
interaction types. Tagging applied to the core five charts (Bar, Line, Area,
Scatter, Pie).

**Out:** any tooltip, hover, selection, or zoom behavior (Phases 1–3); tagging of
Heatmap/Treemap/Sankey/Radar/diagrams (fast-follow once the vocabulary proves
out on the core five).

## The `data-gc-*` contract

Emitted on the mark's wrapper `<g>` (the element `SketchPaths` already renders).
Inert — pure attributes, no behavior.

| Attribute | On | Meaning |
| --- | --- | --- |
| `data-gc` | root `<svg>` | Schema version (`"1"`). Lets the client refuse mismatched output. |
| `data-gc-mark` | mark `<g>` | `bar` \| `point` \| `slice` \| `cell` \| `arc` \| `node` \| `edge`. |
| `data-gc-series` | mark `<g>` | Series id/key (omitted for single-series). |
| `data-gc-index` | mark `<g>` | Datum index within its series. |
| `data-gc-label` | mark `<g>` | Category/label string. |
| `data-gc-value` | mark `<g>` | Numeric value; JSON for multi-value marks. |
| `data-gc-cx`, `data-gc-cy` | mark `<g>` | Pixel anchor (bar top-center, point center, slice centroid). Lets later phases snap/position without scale access. |

## Public API

```ts
// src/types/interaction.ts  (re-exported from src/types + goldenchart/interactive)
export type MarkKind = 'bar' | 'point' | 'slice' | 'cell' | 'arc' | 'node' | 'edge';

export interface MarkMeta {
  kind: MarkKind;
  series?: string;
  index: number;
  label?: string;
  value: number | Record<string, number>;
  cx: number;
  cy: number;
}
```

```ts
// src/core/interaction.ts  (DOM-free; safe for the static core)
/** Serialize MarkMeta to a flat data-* attribute bag for a primitive's <g>. */
export function markAttrs(meta: MarkMeta): Record<string, string>;
```

```ts
// src/interactive/readMark.ts  (client-only; goldenchart/interactive)
/** Parse a data-gc-* tagged element back into MarkMeta. Returns null if untagged. */
export function readMark(el: Element): MarkMeta | null;
```

## Implementation

1. **`src/types/primitives.ts`** — add to `RoughPrimitiveProps`:
   - `dataAttrs?: Record<string, string>` (generic, inert passthrough — keeps
     primitives ignorant of interaction *semantics*).
   - `onPointerEnter/Move/Leave/Down/Up?: (e: PointerEvent) => void` (passthrough;
     delegation is the primary path, these are a convenience/fallback).
2. **`src/primitives/SketchPaths.tsx`** — spread `{...dataAttrs}` and the pointer
   handlers onto the existing root `<g>`. This is the single change that makes
   tagging library-wide.
3. **`src/core/interaction.ts`** — add `markAttrs()`. DOM-free, unit-testable.
4. **Charts** (`BarChart`, `LineChart`, `AreaChart`, `ScatterPlot`, `PieChart`):
   pass `dataAttrs={markAttrs(meta)}` on each mark.
   - Bar/Scatter/Pie: one element per datum already — tag directly. `LaidBar`
     already carries `id`; add index/label/value/anchor.
   - Line/Area: the series is one merged `RoughPath`. Tag the series `<g>` with
     `series`, and add a **transparent hit layer** — one zero-stroke
     `<circle r=…>` per `line.pixels[j]` carrying the datum's `data-gc-*`. (The
     component already computes `pixels`; no scale work.)
5. **`src/interactive.ts`** — new barrel for the gated entry. Phase 0 exports the
   interaction types + `readMark`. (Components arrive in later phases.)
6. **`src/interactive/readMark.ts`** — the inverse of `markAttrs`.
7. **`tsup.config.ts`** — add `'src/interactive.ts'` to `entry`.
8. **`package.json`** — add an `./interactive` export mirroring `./fonts`
   (types + import + require).
9. **`scripts/check-bundle.mjs`** — parametrize over a list of entries with
   per-entry budgets: keep `dist/index.js` at 75 KB + no-fonts (unchanged
   guarantee), add `dist/interactive.js` with its own budget and no-fonts. The
   static-core guard is **not** weakened.

## SSR / invariants

- Server, `bare`, and MCP output gain only inert attributes — no hydration
  markup. Existing golden snapshots change exactly once, by the added attrs.
- `src/index.ts` must not import anything from `src/interactive*`; that keeps
  interactive code unreachable from `dist/index.js` (and the bundle guard proves
  it).

## Tests

- Unit: `markAttrs()` round-trips through `readMark()` for each `MarkKind`,
  including multi-value (`data-gc-value` JSON).
- Snapshot: refresh the MCP/SVG golden snapshots; diff is attribute-only. Mask
  nothing new (values are deterministic).
- Bundle: `check:bundle` passes for both entries; assert no interactive symbol is
  reachable from `dist/index.js`.

## Acceptance

- `npm run build && npm run check:bundle` green; `.` entry size unchanged within
  noise, no font bytes; `./interactive` within its budget.
- Each core-five chart's marks carry the full `data-gc-*` set; line/area expose a
  transparent hit layer.
- `goldenchart/interactive` imports cleanly and re-exports types + `readMark`.

## Risks

- **Snapshot churn** — one big attribute-only diff. Land it isolated and review
  for accidental value/coordinate drift.
- **Hit-layer overhead on line/area** — adds N transparent circles per series.
  Acceptable; revisit with a single Voronoi overlay if mark counts get large.
- **Vocabulary fit** — validate `data-gc-mark` covers cells/nodes/edges before
  extending past the core five.
