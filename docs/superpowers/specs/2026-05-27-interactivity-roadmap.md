# GoldenChart — Interactivity Roadmap

**Status:** Approved (design) · **Date:** 2026-05-27 · **Owner:** Ben Severn

Adds hover, selection, navigation, and transitions to GoldenChart without
compromising its static-first identity. Interactivity is a **progressive
enhancement** layered on top of the existing SVG output — the server,
headless, and MCP render paths never change.

---

## 1. Context & baseline

GoldenChart today is a static renderer. Concretely:

- `BaseChartProps` (`src/types/charts.ts`) exposes **no interaction props** —
  only `width/height/vibe/margin/title/description/ariaLabel/dataTable/bare`.
- Primitives forward **`onClick` only** (`src/types/primitives.ts`); no hover,
  pointer, or tooltip plumbing.
- The library is deliberately static/SSR-first: `goldenchart/server`
  auto-embeds fonts, `bare` mode emits a raw `<svg>`, the MCP server renders to
  SVG strings, and `check:bundle` keeps the browser entry ~35 KB gzipped and
  font-free.

So interactivity is not a patch to existing behavior — it is a **new, additive
layer**. The peers it closes the gap against (roughViz, chart.xkcd) ship no
interactivity at all; the peers it does *not* try to match feature-for-feature
(Recharts, visx, Nivo) are the bar for the full tier.

## 2. Decisions (locked)

| Axis | Decision |
| --- | --- |
| **Scope** | Phased, all tiers — hover → selection → navigation → ecosystem. Each phase ships independently. |
| **SSR model** | Progressive enhancement. Static SVG stays the source of truth; an optional client layer hydrates it. Server output is byte-identical with and without the client layer. |
| **Aesthetic** | Hand-drawn, vibe-aware chrome. Tooltips/highlights are sketched through the existing vibe engine (`RoughRectangle` + `RoughText` halo), not plain HTML. |
| **Bundle** | Core `goldenchart` entry stays static and `check:bundle`-guarded. Interactivity ships behind a gated `goldenchart/interactive` export with its own budget — mirrors the `goldenchart/fonts` pattern. |
| **Architecture** | **A** — bake inert `data-gc-*` attributes into the static SVG and delegate events on the root `<svg>`. Re-render only when data/visibility changes (Phase 2+). |

## 3. Architecture A — the spine

### 3.1 The `data-gc-*` contract

The static render emits semantic, **inert** attributes on each interactive
element. They cost only bytes on the server and carry no behavior; the client
layer reads them on pointer events.

Proposed initial vocabulary (versioned via `data-gc` on the root `<svg>`):

| Attribute | On | Meaning |
| --- | --- | --- |
| `data-gc` | root `<svg>` | Schema version, e.g. `"1"` — lets the client layer refuse mismatched output. |
| `data-gc-mark` | each datum's group | Mark type: `bar`, `point`, `slice`, `cell`, `node`, … |
| `data-gc-series` | mark | Series id/index (for grouped/stacked). |
| `data-gc-index` | mark | Datum index within its series. |
| `data-gc-label` | mark | Category/label string. |
| `data-gc-value` | mark | Numeric value(s), JSON for multi-value marks. |

The contract is the keystone: it is the *only* change Phase 0 makes to the
static path, it is inert (snapshots stay stable aside from the added attrs), and
it doubles as machine-readable structure for the MCP/agent story.

### 3.2 The client boundary

`<InteractiveChart>` (client-only, from `goldenchart/interactive`) wraps any
chart element:

```tsx
import { BarChart } from 'goldenchart';
import { InteractiveChart } from 'goldenchart/interactive';

<InteractiveChart onSelect={(d) => …} tooltip>
  <BarChart width={480} height={300} vibe="pencil" data={data} />
</InteractiveChart>;
```

It attaches **one** delegated listener set on the root `<svg>`, hit-tests via
`event.target.closest('[data-gc-mark]')`, reads the `data-gc-*` attrs, and
drives an overlay. The wrapped chart's body **does not re-render on hover** —
the overlay and CSS highlight live above it.

### 3.3 Gated build

- New `exports["./interactive"]` entry in `package.json`, built by `tsup`.
- `scripts/check-bundle.mjs` keeps asserting the static `.` entry is font-free
  and under budget; add a separate budget line for `./interactive`.
- `goldenchart/interactive` may pull in event/animation helpers the static core
  must never carry.

## 4. Phases

Each phase is independently shippable and leaves the static path untouched. Each
has its own detailed spec:

- [Phase 0 — Foundations](./2026-05-27-interactivity-phase-0-foundations.md)
- [Phase 1 — Hover + Tooltips](./2026-05-27-interactivity-phase-1-hover-tooltips.md)
- [Phase 2 — Selection + Interactive Legend](./2026-05-27-interactivity-phase-2-selection-legend.md)
- [Phase 3 — Navigation + Transitions](./2026-05-27-interactivity-phase-3-navigation-transitions.md)
- [Phase 4 — Ecosystem](./2026-05-27-interactivity-phase-4-ecosystem.md)

### Phase 0 — Foundations *(no behavior change)*

**Goal:** unlock interactivity without shipping any.

- Emit `data-gc-*` attributes from the calculation→render path for every chart
  (start: Bar, Line, Area, Scatter, Pie; then the rest).
- Extend `RoughPrimitiveProps` to forward the full pointer set
  (`onPointerEnter/Move/Leave/Down/Up`) in addition to `onClick`. Opt-in, no
  defaults, no behavior in the static build.
- Add the `goldenchart/interactive` export skeleton + `tsup` + `check:bundle`
  budget line.
- Define interaction types: `ChartDatum`, `HitTarget`, `InteractionEvent`.

**Acceptance:** golden snapshots update only with the added inert attributes;
`check:bundle` still passes for `.`; no new runtime code in the static entry.

### Phase 1 — Hover + tooltips *(table-stakes)*

**Goal:** match and exceed roughViz/chart.xkcd; the headline interactive win.

- `<InteractiveChart>` boundary with delegated pointer handling, no body
  re-render.
- Hand-drawn, vibe-aware `<Tooltip>` from `RoughRectangle` + `RoughText` halo;
  edge-flipping, follows pointer, configurable formatter.
- Hover highlight (emphasize hovered / dim others) via CSS keyed on
  `data-gc-*` — render-free.
- A11y: keyboard focus traversal across marks, `aria-describedby` tooltip,
  `prefers-reduced-motion` respected; touch (tap-to-reveal) support.

**Acceptance:** hover a bar → sketched tooltip with label+value, peers dim;
keyboard-only path works; static SVG unchanged; `./interactive` within budget.

### Phase 2 — Selection + interactive legend *(engagement)*

**Goal:** charts respond to clicks and the legend becomes a control.

- `onSelect` / `onHover` callbacks; controlled + uncontrolled selection.
- Interactive `<Legend>`: toggle series visibility, hover-to-highlight. This
  tier accepts a real re-render (visibility changes the data shown).
- Crosshair / focus line for line/area/scatter.
- Nearest-point snapping using the existing d3 scales' inverse mapping.

**Acceptance:** clicking a legend item hides/shows a series with a redraw;
`onSelect` fires with the datum; crosshair tracks the nearest point.

### Phase 3 — Navigation + transitions *(full Recharts-tier)*

**Goal:** the heavy interactive features, done the hand-drawn way.

- Semantic pan/zoom — **re-scale and re-sketch**, never a CSS transform, so
  strokes stay crisp at any zoom.
- Brush range-select on axes + `onBrush`.
- Animated data transitions when `data` changes: interpolate scaled
  coordinates, reusing the `drawOn` animation infra; reduced-motion aware.
- Linked/crossfilter: a shared selection context so multiple charts brush
  together.

**Acceptance:** zoom redraws crisp sketch geometry; brushing one chart filters a
linked one; data change animates rather than snaps.

### Phase 4 — Ecosystem

**Goal:** extend the interactive layer to the agent + demo surfaces.

- MCP: a tool output that emits static SVG **plus** a small hydration snippet,
  so the agent story reaches interactive embeds.
- Playground: interaction controls + a live event log.
- Docs: interaction guide + recipes; per-component interaction props in
  `docs/API.md`.

## 5. Invariants (every phase)

1. **Server output never changes** — `data-gc-*` attrs are inert; no hydration
   markup in the SSR/`bare`/MCP path.
2. **Static core stays guarded** — `check:bundle` keeps `.` font-free and under
   budget; interactivity is only in `./interactive`.
3. **Render-free hover** — Phase 1 hover/tooltip is an overlay + CSS; re-renders
   begin only at Phase 2 (visibility) and Phase 3 (zoom/transition).
4. **Vibe-consistent chrome** — interaction UI is sketched through the vibe
   engine, with an escape hatch to supply a custom renderer.
5. **Accessible + reduced-motion-safe** from Phase 1 onward.

## 6. Risks & open questions

- **Snapshot churn (Phase 0).** Adding `data-gc-*` touches every chart snapshot
  once. Land it as one reviewable diff; consider masking values the way
  `mcp/vitest.setup.ts` masks font bytes.
- **Hit-testing sketchy geometry.** Rough.js fills are multiple paths; hit areas
  should target the *group*, not individual hachure strokes — wrap each mark in a
  `<g data-gc-mark>` with the clip rect as the hit surface.
- **Tooltip cost.** A sketched tooltip re-rendering on every pointer move could
  thrash Rough.js. Throttle, and/or cache the tooltip frame geometry and only
  move it + swap text.
- **Heatmap/Treemap/Sankey/diagrams** have denser marks — confirm the `data-gc`
  vocabulary covers cells/nodes/edges before Phase 0 ships beyond the core five.
- **Zoom + re-sketch (Phase 3)** changes Rough.js seeds → geometry "wobbles" on
  every zoom step. Pin per-mark seeds so the sketch is stable under zoom.

## 7. Sequencing

Phase 0 is a hard prerequisite for everything. Phases 1→3 are strictly ordered
(each builds on the prior boundary/selection model). Phase 4 can begin once
Phase 1 lands (MCP interactive embed only needs hover) and continues alongside
2–3.

```
Phase 0 ──► Phase 1 ──► Phase 2 ──► Phase 3
                 └──────────────► Phase 4 (starts after P1)
```
