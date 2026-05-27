# Interactivity — Phase 3: Navigation + Transitions

**Parent:** [interactivity-roadmap](./2026-05-27-interactivity-roadmap.md) · **Status:** Spec · **Date:** 2026-05-27 · **Depends on:** Phase 2

The full Recharts-tier features, done the hand-drawn way: semantic pan/zoom that
re-sketches crisp geometry, brush range-selection, animated data transitions, and
cross-chart linked selection. This phase genuinely needs controlled-domain chart
props — the point where Architecture A hands off to a small Approach-B surface.

## Goal

Zoom/pan and brush a chart with the sketch staying crisp; animate when `data`
changes instead of snapping; brush one chart to filter another.

## Scope

**In:** semantic pan/zoom, brush + `onBrush`, animated data transitions, linked/
crossfilter selection.

**Out:** none — this is the last feature phase. Polish/ecosystem is Phase 4.

## Key design calls

### Semantic zoom (re-scale, not transform)

A CSS/SVG `transform` would scale the stroke widths and smear the hand-drawn look.
Instead, **zoom narrows the scale domain and the chart re-sketches**. That needs
the chart to accept a controlled domain:

```ts
// added to the relevant chart prop types (xAxis/yAxis already exist as AxisFormat)
interface AxisFormat {
  // …existing…
  domain?: [number, number];   // controlled domain; overrides auto-extent
}
```

`InteractiveChart` (zoom enabled) tracks a `viewDomain`, passes it down as
`xAxis.domain`/`yAxis.domain`, and updates it on wheel/drag. Because per-mark
seeds are **index-based** (`vibe.seed + index`, `i*100+j+1`, `slice.index+1`),
re-sketching at a new domain keeps each mark's seed stable — **the wobble does
not jitter while zooming.** (Verified against `BarChart`/`LineChart`/`PieChart`.)

### Brush

A drag on the plot draws a sketched selection rect (`RoughRectangle` in the
overlay) and emits the selected category/value range:

```ts
onBrush?: (range: { x?: [number, number]; categories?: string[] } | null) => void;
```

### Animated data transitions

When `data`/`series` change, interpolate the **scaled pixel geometry** between
old and new (bars tween height, points tween position) and re-sketch per frame at
a stable seed. Reuse the existing draw-on infra:
- `SketchPaths` already supports an `animate` mode with `gc-draw-stroke`/
  `gc-draw-fill` classes and `pathLength` normalization.
- Add a transition controller in the interactive layer that drives interpolation
  with `requestAnimationFrame`, honoring `prefers-reduced-motion` (snap when set).

### Linked selection / crossfilter

Extend the Phase 2 selection context to an optional **shared** context across
multiple `<InteractiveChart>`s (a provider consumers wrap around a dashboard).
A brush/selection in one publishes a filter the others subscribe to.

## Public API (`goldenchart/interactive`)

```ts
export interface InteractiveChartProps {
  // …Phases 1–2…
  zoom?: boolean | { axis?: 'x' | 'y' | 'xy'; min?: number; max?: number };
  pan?: boolean;
  brush?: boolean | { axis?: 'x' | 'y' };
  onBrush?: (range: BrushRange | null) => void;
  transition?: boolean | { durationMs?: number };  // animate on data change
  linkGroup?: string;   // charts sharing a group brush/filter together
}

export function LinkedCharts(props: { group?: string; children: ReactNode }): JSX.Element;
```

## Implementation

1. **`AxisFormat.domain`** in `src/core/axisFormat.ts` + `resolveDomain` already
   centralizes domain resolution — honor an explicit `domain` there so all charts
   inherit controlled domains uniformly.
2. **Zoom/pan controller** (interactive entry): wheel + drag → `viewDomain`,
   clamped to `min/max`; pass down via `xAxis`/`yAxis`. Debounce re-renders with
   rAF.
3. **Brush** overlay: pointer drag → sketched rect → `onBrush`; map pixel range
   back to categories/values using the baked `data-gc-*` anchors (no scale access
   needed for category brushes; numeric brushes use the controlled domain).
4. **Transition controller**: diff old/new laid geometry by `MarkKey`, tween,
   re-sketch at stable seed; fall back to instant on reduced-motion.
5. **`LinkedCharts`** provider + shared selection/filter context.

## Accessibility

- Keyboard zoom (`+`/`-`) and pan (arrows) when focused; `Esc` resets view.
- Reduced-motion: transitions snap; no auto-animation.
- Brush operable via keyboard (move/resize handles) where feasible; always leave
  the `dataTable` as the non-visual fallback.

## SSR / invariants

- Static render is the default (full domain, no view state). Controlled `domain`
  is opt-in and also usable server-side for fixed-window static charts.
- Everything interactive stays in `goldenchart/interactive`; the only core change
  is the additive, optional `AxisFormat.domain` (inert unless set), so
  `check:bundle` for `.` is unaffected.

## Tests

- Zoom: narrowing `domain` re-lays geometry; assert seed stability (same mark
  seed across zoom steps → no jitter).
- Brush: drag emits the correct category/numeric range; clear emits `null`.
- Transition: with reduced-motion the change is instant; otherwise intermediate
  frames interpolate between old/new geometry.
- Linked: a brush in chart A filters chart B within the same `linkGroup`.

## Acceptance

- Wheel-zoom redraws crisp sketch geometry without jitter; brushing filters a
  linked chart; data changes animate (or snap under reduced-motion). Static output
  unchanged; both bundle guards green.

## Risks

- **Scales are inline per chart** — controlled domain must flow through
  `resolveDomain`, not a new bespoke path per chart, or behavior will diverge.
- **Transition cost** — re-sketching every frame is heavy; cap mark count for
  animated transitions and rAF-batch; consider tweening only outline paths.
- **Pan beyond data** — clamp the view domain; guard against empty/inverted
  domains (the existing `extentOf` NaN-guard is the precedent).
