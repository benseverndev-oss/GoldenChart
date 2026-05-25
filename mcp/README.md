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
| Charts | `render_bar_chart`, `render_line_chart`, `render_area_chart`, `render_scatter_plot`, `render_pie_chart`, `render_flowchart` |
| Vibe | `list_vibe_presets`, `resolve_vibe`, `preview_vibe` |
| Calculation | `compute_scale`, `compute_ticks`, `compute_line_path`, `compute_area_path`, `compute_pie`, `layout_tree` |
| Primitives | `render_rough_path`, `render_rough_rect`, `render_rough_circle`, `render_rough_line`, `render_rough_text` |
| Orchestration / export | `compose_surface`, `build_flowchart_from_spec`, `export_svg`, `export_png` |

## Resources & prompts

- `vibe://presets` — every preset with resolved Rough.js knobs
- `schema://chart/{type}` — JSON Schema for each chart's input (`bar`, `line`, `area`, `scatter`, `pie`, `flow`)
- `docs://architecture` — how the layers fit together
- Prompt `make-me-a-chart` — guided flow: pick a vibe from a mood, choose a chart for the data, render it

## Develop

```bash
npm run dev        # run the server from source via tsx
npm test           # vitest (handlers, in-memory protocol round-trip)
npm run typecheck
```
