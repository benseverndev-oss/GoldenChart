---
title: BarChart
description: Single, grouped, or stacked bar chart. d3-scale computes the geometry; <RoughRectangle> sketches each bar.
---

The reference chart for the calc/render split. `bandScale` + `linearScale` lay out the geometry; `<RoughRectangle>` draws each bar. Supports single-series and multi-series (grouped or stacked) modes.

## Single series

```tsx
import { BarChart } from 'goldenchart';

<BarChart
  width={480}
  height={300}
  data={[
    { label: 'Q1', value: 12 },
    { label: 'Q2', value: 19 },
    { label: 'Q3', value: 7 },
    { label: 'Q4', value: 24 },
  ]}
/>
```

## Grouped multi-series

```tsx
<BarChart
  width={480}
  height={300}
  mode="grouped"
  data={[
    { label: 'Q1', values: { team_a: 12, team_b: 8, team_c: 15 } },
    { label: 'Q2', values: { team_a: 19, team_b: 14, team_c: 22 } },
  ]}
/>
```

## Stacked

```tsx
<BarChart
  width={480}
  height={300}
  mode="stacked"
  data={[
    { label: 'Q1', values: { team_a: 12, team_b: 8, team_c: 15 } },
    { label: 'Q2', values: { team_a: 19, team_b: 14, team_c: 22 } },
  ]}
/>
```

## Props

| Prop | Type | Default | Notes |
|---|---|---|---|
| `data` | `ChartDatum[] \| MultiSeriesDatum[]` | required | `{label, value}` for single; `{label, values}` for grouped/stacked. |
| `width` | `number` | required | Pixel width of the surface. |
| `height` | `number` | required | Pixel height of the surface. |
| `mode` | `'single' \| 'grouped' \| 'stacked'` | `'single'` | Layout for multi-series data. |
| `seriesKeys` | `string[]` | union of value keys | Order/filter the series in multi-series modes. |
| `margin` | `Partial<Margin>` | per-chart defaults | Plot inset. |
| `vibe` | `VibeConfig` | inherited | Aesthetic. See [Brand vs. vibe](/start/brand-vs-vibe/). |
| `brand` | `BrandConfig` | inherited | Identity (palette / ink / page / font / logo). |
| `title` | `string` | — | Rendered as `<title>` / `aria-label`. |
| `description` | `string` | auto from data | Rendered as `<desc>`. Falls back to a generated summary. |
| `ariaLabel` | `string` | falls back to `title` | Explicit accessible label. |
| `dataTable` | `boolean` | — | Emit a visually-hidden data table for screen readers. |
| `showAxes` | `boolean` | `true` | |
| `showGrid` | `boolean` | `true` | |
| `showLegend` | `boolean` | `true` | Multi-series only. |
| `annotations` | `Annotation[]` | — | Lines, bands, callouts. |
| `xAxis` / `yAxis` | `AxisFormat` | — | Tick/format overrides. |
| `transitions` | `{ enabled?, durationMs? }` | `{ enabled: false }` | Opt-in enter/update animation on data change. Honours `prefers-reduced-motion`. |

## Accessibility

`BarChart` sets `role="img"` on the SVG, emits a `<title>` from the `title` prop, and a `<desc>` from the `description` prop (or an auto-generated summary like "Bar chart with 4 categories, values from 7 to 24."). Pair with `dataTable={true}` for full screen-reader parity.

## See also

- [Stacked vs. grouped semantics](/start/brand-vs-vibe/)
- [Responsive sizing](/recipes/responsive/)
- [Export to PNG/SVG](/recipes/export/)
