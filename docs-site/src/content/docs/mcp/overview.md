---
title: MCP server overview
description: goldenchart-mcp exposes the whole library to LLM agents — render tools at every level, plus a critique-and-revise loop.
---

The `goldenchart-mcp` package ([npm](https://www.npmjs.com/package/goldenchart-mcp)) exposes GoldenChart over the Model Context Protocol so an agent can render hand-drawn charts and diagrams by calling tools. The defining idea: **a tool at every level of the library's architecture**, so an agent can work top-down (`render a bar chart`) or drop to the lowest level (`draw this rough path with this vibe`) when it needs full control.

```
Level 4  Orchestration / export   ── compose_surface, export_*
Level 3  Charts                   ── render_bar_chart, render_line_chart, …
Level 2  Primitives               ── render_rough_path, render_rough_rect, …
Level 1  Calculation (D3, pure)   ── compute_scale, compute_pie, layout_tree, …
Level 0  Vibe (configuration)     ── list_vibe_presets, resolve_vibe, preview_vibe
```

## Smart entry: `visualize_data`

Feed raw records and an optional plain-English query:

```jsonc
{
  "data": [
    { "month": "Jan", "revenue": 120 },
    { "month": "Feb", "revenue": 180 },
    { "month": "Mar", "revenue": 240 }
  ],
  "query": "revenue by month as a line in pencil",
  "width": 480,
  "height": 300
}
```

The server profiles the data, picks the best-fit chart, applies any parsed vibe from the query, and returns the SVG plus a rationale and ranked alternatives.

## Critique-and-revise loop

`suggest_improvements` profiles + renders + critiques. Each critique carries a machine-readable `fix` patch. `render_with_revision` accepts the original data plus a `Revisions` patch (`keepTopCategories`, `groupRemainderAs`, `maxSeries`, `chartType`), re-renders, and returns the next critique pass.

The `iterate-until-good` prompt wires these together: an agent calls `suggest_improvements`, picks the highest-severity fix, applies it via `render_with_revision`, and repeats until critiques empty (capped at 3 iterations).

## Install

```bash
npm install goldenchart-mcp
```

See the [`mcp/README.md`](https://github.com/benseverndev-oss/GoldenChart/tree/main/mcp) on GitHub for the full tool list and stdio configuration.
