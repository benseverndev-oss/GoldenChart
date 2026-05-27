# Interactivity — Phase 2: Selection + Interactive Legend

**Parent:** [interactivity-roadmap](./2026-05-27-interactivity-roadmap.md) · **Status:** Spec · **Date:** 2026-05-27 · **Depends on:** Phase 1

Charts respond to clicks, the legend becomes a control, and a crosshair tracks
the nearest point. This is the first tier that accepts a real chart re-render
(series visibility changes the data shown) — the Approach-B fallback the roadmap
anticipated.

## Goal

Click/tap a mark → `onSelect` fires and the mark stays emphasized; click a legend
item → toggle that series; line/scatter charts show a crosshair snapped to the
nearest datum.

## Scope

**In:** selection (controlled + uncontrolled) with `onSelect`; interactive
`<Legend>` series toggling + hover-to-highlight; crosshair/focus line; nearest-
point snapping.

**Out:** pan/zoom, brush, animated transitions, cross-chart linking (Phase 3).

## Public API

Extend `InteractiveChartProps` (`goldenchart/interactive`):

```ts
export interface InteractiveChartProps {
  // …Phase 1…
  selectable?: boolean;
  selected?: MarkKey | MarkKey[] | null;          // controlled
  defaultSelected?: MarkKey | MarkKey[] | null;   // uncontrolled
  onSelect?: (mark: MarkMeta, all: MarkMeta[]) => void;
  multiSelect?: boolean;
  crosshair?: boolean;            // line/area/scatter only; default false
  legendToggle?: boolean;         // default true when the chart has a legend
}

export type MarkKey = string;     // `${series ?? ''}:${index}`
```

Legend visibility is surfaced so the wrapped chart can react:

```ts
// the interactive layer provides hidden-series state via context;
// charts read it (when wrapped) to filter what they draw.
export interface SeriesVisibility { hidden: ReadonlySet<string>; toggle(series: string): void; }
```

## Implementation

1. **Selection** — `InteractiveChart` adds `click`/`keydown(Enter|Space)` to the
   existing delegation; maintains selected `MarkKey`s (controlled/uncontrolled
   per React conventions); reflects them as `data-gc-selected` on the root for a
   CSS emphasis rule (render-free, like hover). `onSelect(mark, all)` fires.
2. **Interactive legend** — current `Legend` (`src/components/Legend.tsx`) is
   pure presentation. Add:
   - An interactive variant in the interactive entry (or an opt-in `onToggle`
     prop on `Legend`) that makes each item a focusable button-like `<g>` with
     `onClick`/`onKeyDown`.
   - A `SeriesVisibility` context provided by `InteractiveChart`. Charts, when
     they detect the context, **filter hidden series before layout** — this is a
     genuine re-render and re-runs the scales (correct: hiding a series should
     rescale). Charts already compute series ids (`seriesKeysOf`) and colors via
     `colorAt`, so the filter is localized.
3. **Crosshair + snapping** — for line/area/scatter, read the baked
   `data-gc-cx/cy` from the tagged hit layer (Phase 0) and pick the nearest by
   pixel distance to the pointer — **no `scale.invert` needed**. Draw a sketched
   focus line via `RoughLine` in the overlay; reuse the Phase 1 tooltip for the
   readout.

## Re-render boundary

- Hover/selection emphasis: still render-free (CSS via `data-gc-*`).
- Legend toggle: intentional re-render. Keep it scoped — only the wrapped chart
  re-runs its layout `useMemo`; the interactive shell does not re-mount.

## Accessibility

- Selected marks: `aria-pressed`/`aria-selected` on focusable mark elements.
- Legend items: real toggle semantics (`role="button"`, `aria-pressed`),
  keyboard operable, focus-visible ring.
- Hidden series announced via the legend control state; `dataTable` stays full.

## SSR / invariants

- Static charts render unchanged (all series visible, no selection). The legend
  renders its current sketched form server-side; interactivity attaches on hydrate.
- New behavior is gated in `goldenchart/interactive` plus a **backward-compatible,
  optional** `onToggle` hook on the core `Legend` (no behavior unless provided),
  so the static core stays inert and `check:bundle` is unaffected.

## Tests

- Selection: click selects, second click (or `multiSelect`) behavior; controlled
  vs uncontrolled; `onSelect` payload.
- Legend toggle: hiding a series removes its marks and rescales (assert a bar's
  geometry changes after toggle); keyboard toggle works.
- Snapping: nearest-point selection matches the geometrically closest pixel.

## Acceptance

- Clicking a legend item hides/shows a series with a redraw and rescale; `onSelect`
  fires with the datum + full selection; crosshair tracks the nearest point on
  line charts. Static output unchanged; both bundle guards green.

## Risks

- **Scales live inside chart `useMemo`** — visibility filtering must happen
  *before* the layout memo so scales recompute. Thread `hidden` into the memo deps.
- **Controlled/uncontrolled drift** — follow the standard React pattern; one
  source of truth.
- **Legend coupling** — prefer the context approach over prop-drilling visibility
  through every chart signature.
