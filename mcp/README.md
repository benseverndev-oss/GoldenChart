# goldenchart-mcp

An [MCP](https://modelcontextprotocol.io) server that renders **GoldenChart**
hand-drawn charts and flowcharts as SVG. It surfaces a tool at every level of the
library — vibe, calculation, primitives, charts, and orchestration/export — so an
agent can render a finished chart or compose a custom diagram from scratch.

## Install & build

```bash
# from the repo root, build the library the server depends on
npm install && npm run build

# then build the server
cd mcp && npm install && npm run build
```

## Use with an MCP client

```bash
claude mcp add goldenchart -- node /absolute/path/to/GoldenChart/mcp/dist/index.js
```

Or add it to a client config manually:

```json
{
  "mcpServers": {
    "goldenchart": {
      "command": "node",
      "args": ["/absolute/path/to/GoldenChart/mcp/dist/index.js"]
    }
  }
}
```

## Tool catalog

| Level | Tools |
|-------|-------|
| Charts | `render_bar_chart` (single/grouped/stacked), `render_line_chart`, `render_area_chart` (+ stacked), `render_scatter_plot`, `render_pie_chart`, `render_flowchart`, `render_sankey`, `render_treemap`, `render_heatmap`, `render_radar` |
| Vibe | `list_vibe_presets`, `resolve_vibe`, `preview_vibe` |
| Calculation | `compute_scale`, `compute_ticks`, `compute_line_path`, `compute_area_path`, `compute_pie`, `layout_tree`, `compute_color_scale` |
| Primitives | `render_rough_path`, `render_rough_rect`, `render_rough_circle`, `render_rough_line`, `render_rough_text` |
| Orchestration / export | `compose_surface`, `build_flowchart_from_spec`, `export_svg`, `export_png` |

The cartesian chart tools accept an `annotations` array (reference lines/bands, callouts,
circled points) and `description` / `ariaLabel` / `dataTable` for accessible output.

## Resources & prompts

- `vibe://presets` — every preset with resolved Rough.js knobs
- `palette://scales` — sequential/diverging color scales with sampled swatches
- `schema://chart/{type}` — JSON Schema for each chart's input (`bar`, `line`, `area`, `scatter`, `pie`, `flow`, `sankey`, `treemap`, `heatmap`, `radar`)
- `docs://architecture` — how the layers fit together
- Prompt `make-me-a-chart` — guided flow: pick a vibe from a mood, choose a chart for the data, render it

## Develop

```bash
npm run dev        # run the server from source via tsx
npm test           # vitest (handlers, in-memory protocol round-trip)
npm run typecheck
```
