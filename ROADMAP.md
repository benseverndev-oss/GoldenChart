# GoldenChart MCP Server — Roadmap

> **Status: shipped.** The MCP server described below is built, tested, and
> published to npm as [`goldenchart-mcp`](https://www.npmjs.com/package/goldenchart-mcp).
> Its source lives in [`mcp/`](./mcp); see [`mcp/README.md`](./mcp/README.md) for
> the current tool list and usage. This document is kept as the original design
> record — read it in the past tense.

The original plan, for an **MCP server** (`@modelcontextprotocol/sdk`) that exposes
GoldenChart so an agent can generate hand-drawn charts and flowcharts by calling
tools. The defining idea: **surface a tool at every level of the library's
architecture**, so an agent can work top-down (`render a bar chart`) or drop down
to the lowest level (`draw this exact rough path with this vibe`) when it needs
full control.

```
Level 4  Orchestration / export   ── compose_surface, build_flowchart_from_spec, export_*
Level 3  Charts                   ── render_bar_chart, render_line_chart, render_flowchart, …
Level 2  Primitives               ── render_rough_path, render_rough_rect, render_rough_text, …
Level 1  Calculation (D3, pure)   ── compute_scale, compute_pie, layout_tree, compute_ticks, …
Level 0  Vibe (configuration)     ── list_vibe_presets, resolve_vibe, preview_vibe
```

## Guiding principles

1. **Every tool returns deterministic, self-contained output** — an SVG string +
   structured metadata (bbox, element count, resolved vibe). No live React tree,
   no DOM, no browser required.
2. **Tools mirror `src/` layers**, so an agent can descend from a chart to its
   primitives without leaving the toolset.
3. **Calc tools are pure and cheap** (just geometry); render tools wrap them.
4. **One source of truth for schemas** — derive tool input schemas from the
   existing TypeScript prop types so the MCP surface can't drift from the library.

## Phase 0 — Enabling foundation (the real blocker)

Rendering today flows through React components, but MCP tools must return strings.
We need a headless `renderToSVGString`.

- **Decision:** `react-dom/server` `renderToStaticMarkup` (reuse every component
  as-is, highest fidelity) **vs.** a pure non-React serializer (the primitives
  already emit DOM-free path descriptors via `drawableToPaths` in
  `src/render/roughGenerator.ts`, so a string builder is feasible and dependency-light).
  **Recommendation:** ship `react-dom/server` first for correctness, keep the pure
  serializer as a later optimization.
- New workspace `mcp/` (or `packages/mcp`) with the MCP SDK + stdio transport.
- Add `src/render/renderToString.ts` to the library and export it.
- **Exit criteria:** one proof tool — `render_bar_chart` — returns valid SVG over stdio.

## Levels & tool inventory

### Level 0 — Vibe (`src/vibe`)
| Tool | Wraps | Returns |
|------|-------|---------|
| `list_vibe_presets` | `VIBE_PRESETS` | preset names + resolved knobs |
| `resolve_vibe` | `resolveVibe` + `vibeToRoughOptions` | `ResolvedVibe` and the Rough.js options it maps to |
| `preview_vibe` | a few primitives on a `Surface` | small SVG sample of the look |

### Level 1 — Calculation (`src/core`, pure / DOM-free)
| Tool | Wraps |
|------|-------|
| `compute_scale` | `linearScale` / `bandScale` / `pointScale` / `sqrtScale` |
| `compute_ticks` | `ticksForScale` |
| `compute_line_path` / `compute_area_path` | `linePath` / `areaPath` |
| `compute_pie` | `computePie` |
| `layout_tree` | `layoutTree` (returns node + edge coordinates) |

These return raw geometry so an agent can reason about coordinates or feed them
straight into Level 2.

### Level 2 — Primitives (`src/primitives`)
| Tool | Wraps |
|------|-------|
| `render_rough_path` | `RoughPath` (d + vibe → `<g>`) |
| `render_rough_rect` | `RoughRectangle` |
| `render_rough_circle` | `RoughCircle` |
| `render_rough_line` | `RoughLine` |
| `render_rough_text` | `RoughText` |

Composable: an agent concatenates these into a custom drawing inside one surface.

### Level 3 — Charts (`src/components`)
`render_bar_chart`, `render_line_chart`, `render_area_chart`,
`render_scatter_plot`, `render_pie_chart`, `render_flowchart`.
Input = the component props (data + vibe + size + options); output = a complete
SVG document plus bbox/metadata.

### Level 4 — Composition & orchestration
| Tool | Purpose |
|------|---------|
| `compose_surface` | wrap an arbitrary list of primitive/chart fragments into one SVG with a shared vibe |
| `build_flowchart_from_spec` | accept nodes/edges + intent, auto-pick shapes/direction |
| `export_svg` / `export_png` | return a data URI or write a file (PNG via a rasterizer) |

## MCP resources & prompts (later)

- **Resources:** `vibe://presets`, `schema://chart/{type}` (JSON schema of each
  chart's inputs), `docs://architecture`.
- **Prompts:** a guided `make-me-a-chart` prompt that walks data → vibe → chart tool.

## Cross-cutting concerns

- **Validation:** zod schemas for every tool input, generated from the TS types.
- **Determinism:** force/echo a stable `seed` so repeated calls are reproducible.
- **Tests:** golden-file snapshots (tool call → SVG) + schema round-trip tests.
- **Errors:** a structured error envelope for malformed data/vibe.

## Milestones

| Milestone | Scope | Done when |
|-----------|-------|-----------|
| **M0 Foundation** | headless render, server scaffold, `render_bar_chart` proof | one tool returns valid SVG over stdio |
| **M1 Charts** | all 6 chart render tools + zod schemas + snapshot tests | every chart renders via a tool call |
| **M2 Vibe** | `list_vibe_presets`, `resolve_vibe`, `preview_vibe` | agent can discover and preview every preset |
| **M3 Primitives + Calc** | Level 1 & 2 tools | agent composes a custom diagram from low-level tools |
| **M4 Orchestration + Export** | `compose_surface`, `build_flowchart_from_spec`, `export_png` | agent produces a multi-part figure and a raster file |
| **M5 Resources/Prompts + Packaging** | MCP resources, guided prompt, publish | server installable + documented |

## Open decisions

- `react-dom/server` vs. a pure SVG serializer for headless rendering.
- Separate package vs. in-repo `mcp/` workspace.
- PNG rasterizer dependency: `@resvg/resvg-js` vs. `sharp` vs. defer PNG entirely.
- Whether the Level 1 calc tools earn their keep, or stay internal helpers behind
  the render tools.
