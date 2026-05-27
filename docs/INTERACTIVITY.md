# Interactivity

GoldenChart's interactivity is an **opt-in, progressive enhancement**. The static
`goldenchart` core renders the same SVG it always has; everything interactive
lives behind the `goldenchart/interactive` subpath and is layered on top of that
SVG at runtime. Server, headless, and MCP output never change — with JavaScript
disabled you get exactly the static chart.

```
goldenchart            -> static charts (SSR/headless/MCP), no interaction code
goldenchart/interactive -> <InteractiveChart>, tooltips, zoom, brush, …
```

## The model

1. **Charts emit an inert `data-gc-*` contract.** Every mark (bar, point, slice,
   …) carries `data-gc-mark`, `data-gc-series`, `data-gc-index`, `data-gc-label`,
   `data-gc-value`, and a pixel anchor `data-gc-cx`/`data-gc-cy`. These are plain
   attributes — no behavior, no bundle cost beyond the bytes.
2. **`<InteractiveChart>` hydrates the SVG.** It wraps a chart, delegates pointer
   and focus events on the root `<svg>`, and reads the contract via `readMark()`.
   Hover and selection are **render-free** (imperative attributes + CSS); only
   legend toggles, zoom, and data transitions re-render the wrapped chart.

```tsx
import { BarChart } from 'goldenchart';
import { InteractiveChart } from 'goldenchart/interactive';

<InteractiveChart tooltip highlight>
  <BarChart width={480} height={300} vibe="pencil" data={data} />
</InteractiveChart>;
```

## `<InteractiveChart>` props

| Prop | Type | Purpose |
| --- | --- | --- |
| `tooltip` | `boolean \| (mark) => ReactNode` | Sketched, vibe-matched tooltip (or a custom renderer). Default `true`. |
| `highlight` | `boolean` | Dim non-hovered marks (render-free). Default `true`. |
| `onHover` | `(mark \| null) => void` | Hover notifications. |
| `selectable` | `boolean` | Click/keyboard mark selection. Default `false`. |
| `selected` / `defaultSelected` | `string \| string[] \| null` | Controlled / uncontrolled selection (mark keys). |
| `multiSelect` | `boolean` | Allow multiple selected marks. |
| `onSelect` | `(mark, selectedKeys) => void` | Selection callback. |
| `legendToggle` | `boolean` | Legend toggles series visibility (re-renders + rescales). Default `true`. |
| `crosshair` | `boolean` | Sketched focus line snapped to the nearest mark (line/area/scatter). |
| `zoom` | `boolean` | Wheel-zoom the continuous x-axis (re-scale + re-sketch). |
| `pan` | `boolean` | Drag to pan the zoomed x-axis. |
| `brush` | `boolean` | Drag a sketched x-range selection. Takes precedence over `pan`. |
| `onBrush` | `(marks) => void` | Brushed marks on release. |
| `transition` | `boolean \| { durationMs? }` | Animate the `data`/`series` prop on change (snaps under reduced-motion). |
| `linkGroup` | `string` | This chart's id within a surrounding `<LinkedCharts>` group. |
| `vibe` | `VibeConfig` | Mirror the chart's vibe so the chrome is sketched to match. |

## Recipes

### Custom tooltip

```tsx
<InteractiveChart tooltip={(mark) => <MyTooltip label={mark.label} value={mark.value} />}>
  <LineChart … />
</InteractiveChart>
```

### Selection

```tsx
<InteractiveChart selectable multiSelect onSelect={(_, keys) => setSelected(keys)}>
  <BarChart … />
</InteractiveChart>
```

### Zoom + brush

```tsx
<InteractiveChart zoom pan>
  <LineChart … />
</InteractiveChart>

<InteractiveChart brush onBrush={(marks) => setRange(marks)}>
  <ScatterPlot … />
</InteractiveChart>
```

Zoom narrows the scale **domain** and re-sketches — strokes stay crisp because
it is never a CSS transform. Per-mark seeds are index-based, so the hand-drawn
wobble stays stable across zoom steps.

### Linked crossfilter

```tsx
import { LinkedCharts, InteractiveChart } from 'goldenchart/interactive';

<LinkedCharts>
  <InteractiveChart linkGroup="a" brush onBrush={…}><BarChart … /></InteractiveChart>
  <InteractiveChart linkGroup="b" selectable><LineChart … /></InteractiveChart>
</LinkedCharts>
```

A brush/selection in one member emphasizes the matching marks across the group.

### Animated data transitions

```tsx
<InteractiveChart transition={{ durationMs: 600 }}>
  <BarChart data={liveData} />
</InteractiveChart>
```

Honors `prefers-reduced-motion` (snaps instead of animating).

## Self-contained interactive embeds

`interactiveEmbed(svg, opts)` wraps a static (`data-gc-*` tagged) SVG into a
standalone HTML document with a tiny vanilla hover-tooltip hydrator — no React,
renders offline.

```ts
import { interactiveEmbed } from 'goldenchart/interactive';
const html = interactiveEmbed(svgString, { title: 'Sales' });
```

The MCP server exposes the same via the `export_interactive_html` tool, so an
agent can emit an interactive chart a reader can hover — not just a static image.

## Accessibility

Marks are keyboard-focusable with `aria-label`s; the tooltip path is reachable
via focus, not just hover. The visually-hidden `dataTable` (when enabled on the
chart) remains the screen-reader source of truth. Motion honors
`prefers-reduced-motion` throughout.

## Bundle

The static `goldenchart` entry stays font-free and small (`check:bundle` guards
it). `goldenchart/interactive` is a separate, budgeted entry — you only pay for
interactivity when you import it.
