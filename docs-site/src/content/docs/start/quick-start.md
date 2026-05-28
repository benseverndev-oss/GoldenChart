---
title: Quick start
description: Install GoldenChart and render your first hand-drawn chart in under a minute.
---

## Install

```bash
npm install goldenchart roughjs d3-scale d3-shape d3-hierarchy
```

`react` / `react-dom` (v18+) are peer dependencies.

## Render a chart

```tsx
import { BarChart } from 'goldenchart';

export function Sales() {
  return (
    <BarChart
      width={480}
      height={300}
      vibe="chaotic_notebook"
      data={[
        { label: 'Q1', value: 12 },
        { label: 'Q2', value: 19 },
        { label: 'Q3', value: 7 },
        { label: 'Q4', value: 24 },
      ]}
    />
  );
}
```

That's it — a hand-drawn bar chart, no extra setup.

## Make it fit the page

`<BarChart>` requires explicit pixel dimensions. To fill the parent container, wrap it in `<ResponsiveContainer>`:

```tsx
import { BarChart, ResponsiveContainer } from 'goldenchart';

<ResponsiveContainer aspectRatio={16 / 9} maxHeight={400}>
  {({ width, height }) => (
    <BarChart width={width} height={height} data={data} />
  )}
</ResponsiveContainer>
```

## Next steps

- **[Brand vs. vibe](/start/brand-vs-vibe/)** — how identity (palette/ink/page/font) layers on top of the hand-drawn aesthetic.
- **[BarChart reference](/charts/bar-chart/)** — every prop, with examples for single, grouped, and stacked.
- **[Recipes](/recipes/responsive/)** — responsive layouts, dark mode, PNG export.
- **[MCP server](/mcp/overview/)** — generate charts from an LLM agent.
