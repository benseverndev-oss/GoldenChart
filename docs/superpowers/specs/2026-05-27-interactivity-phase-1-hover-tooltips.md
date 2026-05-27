# Interactivity — Phase 1: Hover + Tooltips

**Parent:** [interactivity-roadmap](./2026-05-27-interactivity-roadmap.md) · **Status:** Spec · **Date:** 2026-05-27 · **Depends on:** Phase 0

The headline interactive win and the table-stakes tier that closes the gap vs
roughViz/chart.xkcd. Adds a delegating client boundary, a hand-drawn vibe-aware
tooltip, and render-free hover highlighting — all without touching the static
render path.

## Goal

Hovering (or focusing) a mark reveals a sketched tooltip with its label/value
and emphasizes it; everything degrades to the existing static chart with no JS.

## Scope

**In:** `<InteractiveChart>` boundary; vibe-aware `<Tooltip>`; CSS hover-highlight;
keyboard + touch + reduced-motion support.

**Out:** click/selection callbacks and legend toggling (Phase 2); zoom/brush/
transitions (Phase 3).

## Architecture (A)

`<InteractiveChart>` wraps a chart, attaches **one** delegated `pointermove` /
`pointerleave` (and `focusin`/`focusout`) listener on the rendered root `<svg>`,
resolves the hovered mark via `event.target.closest('[data-gc-mark]')` →
`readMark()`, and drives an overlay. **The wrapped chart never re-renders on
hover** — the tooltip and highlight live above/around it.

```tsx
import { BarChart } from 'goldenchart';
import { InteractiveChart } from 'goldenchart/interactive';

<InteractiveChart tooltip>
  <BarChart width={480} height={300} vibe="pencil" data={data} />
</InteractiveChart>;
```

## Public API (`goldenchart/interactive`)

```ts
export interface InteractiveChartProps {
  children: ReactElement;            // a single GoldenChart element
  tooltip?: boolean | TooltipRenderer;  // true = default sketched tooltip
  highlight?: boolean;               // dim others / emphasize hovered (default true)
  onHover?: (mark: MarkMeta | null) => void;  // notify only; no internal coupling
}

export type TooltipRenderer = (mark: MarkMeta) => ReactNode;
```

```ts
export interface TooltipProps {
  mark: MarkMeta;
  x: number; y: number;     // pointer position in svg space
  bounds: DOMRect;          // for edge-flipping
  format?: (mark: MarkMeta) => { title?: string; rows: [string, string][] };
}
```

## Implementation

1. **`src/interactive/InteractiveChart.tsx`** — clones `children` to capture a
   `ref` to its root `<svg>` (the chart renders `<svg>` via `Surface`; non-`bare`
   wraps it in a div — ref the inner `<svg>`). Binds delegated listeners; tracks
   `{mark, x, y}` in local state; renders an absolutely-positioned overlay
   `<svg>` (or portals into the chart's `<svg>`) for the tooltip.
2. **`src/interactive/Tooltip.tsx`** — built from `RoughRectangle` + `RoughText`
   (reuses the existing halo via `RoughText`'s `haloColor`). Reads the surrounding
   vibe through `useResolvedVibe` so chrome matches (pencil tooltip on a pencil
   chart). Edge-flips against `bounds`. Cache the frame geometry; on pointer move
   only translate it + swap text (avoid re-sketching Rough.js every pixel).
3. **Highlight** — `InteractiveChart` sets a `data-gc-hover="series:index"` on the
   root; a tiny CSS rule (shipped with the interactive entry) dims
   `[data-gc-mark]:not(.is-hovered)` and emphasizes the match. No React re-render
   of marks.
4. **Throttle** `pointermove` with `requestAnimationFrame`.

## Accessibility

- Make marks focusable (`tabindex` via the interactive layer enhancing tagged
  `<g>`s, or a roving-tabindex overlay). `focusin` drives the same tooltip path
  as hover.
- Tooltip content linked via `aria-describedby`; the visually-hidden `dataTable`
  (already emitted when `dataTable` is set) remains the screen-reader source of
  truth.
- Respect `prefers-reduced-motion` (no tooltip fade/slide when set).
- Touch: `pointerdown` reveals; tapping empty space dismisses.

## SSR / invariants

- No change to server/`bare`/MCP output; `InteractiveChart` is client-only and
  enhances already-rendered SVG. With JS disabled the chart is the current static
  chart.
- All new code lands in `goldenchart/interactive`; `check:bundle` for `.`
  unaffected; interactive budget updated to fit Tooltip + listeners.

## Tests

- Unit (jsdom + Testing Library): synthetic `pointermove` over a tagged `<g>`
  surfaces the right `MarkMeta`; `pointerleave` clears; `onHover` fires with the
  mark then `null`.
- Tooltip: renders title/rows from `format`; flips near the right/bottom edge.
- A11y: `focusin` opens the tooltip; reduced-motion path asserted.
- Snapshot: the interactive tooltip SVG for one vibe (so chrome stays sketched).

## Acceptance

- Hover a bar → sketched, vibe-matched tooltip with label + value; peers dim;
  pointer-out clears. Keyboard-only reaches every mark. Static SVG byte-identical
  to Phase 0. `./interactive` within budget; `.` guard green.

## Risks

- **Tooltip re-sketch thrash** — mitigated by caching frame geometry + text swap.
- **Ref into a cloned child** — if `bare` vs non-`bare` changes the root element,
  resolve the `<svg>` defensively (query within the wrapper).
- **Line/area hit targets** — depend on Phase 0's transparent hit layer; verify
  hover lands on points, not the merged line path.
