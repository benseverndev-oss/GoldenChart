# Design: compose_surface discoverability (SP4)

**Date:** 2026-05-26
**Status:** Approved (design)
**Scope:** `mcp/` only — `prompts.ts`, `resources.ts`, and their tests. No library
(`src/`) changes.

## Context

SP2/SP3 gave agents a rich set of `compose_surface` scene kinds (polygon,
regular-polygon, star, arc, wedge, ellipse, arrowhead, arrow) on top of the base
primitives (path, rect, circle, line, text) and positioned charts. The kinds are
reachable — `compose_surface`'s zod input schema is exposed as the tool's JSON
schema — but there is **no narrative guidance**: no catalog of the kinds and no
worked recipe telling an agent how to assemble a figure. Every other capability
area has this. The MCP server pairs a guided prompt with a docs resource:

- `make-me-a-chart` ↔ (charts/vibe tools)
- `make-me-a-diagram` ↔ `docs://diagram-spec`

`compose_surface` has neither. SP4 closes that gap, following the exact same
pattern.

## What gets built

### 1. `docs://compose-spec` resource (`mcp/src/resources.ts`)

A `text/markdown` resource (a `COMPOSE_SPEC_DOC` string, registered like
`docs://diagram-spec`) that:

- Explains `compose_surface` renders a `children` array of scene nodes into one
  SVG sharing a single `vibe`.
- Catalogs every scene-node `kind` with its fields:
  - **Primitives:** `path` (`d`), `rect`, `circle`, `line`, `text`.
  - **Shapes:** `polygon` (`points`), `regular-polygon` (`cx,cy,r,sides,rotation?`),
    `star` (`cx,cy,outerRadius,innerRadius,points,rotation?`), `arc`
    (`cx,cy,r,startAngle,endAngle`), `wedge` (`…,innerRadius?`), `ellipse`
    (`cx,cy,rx,ry`), `arrowhead` (`from,to,size?,filled?`), `arrow`
    (`from,to,routing?,orientation?,label?,endHead?,startHead?,filled?,size?`).
  - **Charts:** `{ kind: 'chart', chart, at?, width, height, props? }`.
- States the angle conventions explicitly: polygon/star `rotation` is degrees
  with **0 = first vertex at top** (clockwise); arc/wedge `startAngle`/`endAngle`
  are degrees with **0 = east** (clockwise). Open shapes (`arc`, and `arrowhead`
  when not `filled`) never fill.
- Points at the shape calc tools (`compute_regular_polygon_path`,
  `compute_star_path`, `compute_arc_path`, `compute_wedge_path`,
  `compute_arrowhead_path`) for obtaining `d` strings when an agent wants to
  reason about geometry or feed a `path` node.
- Includes one short worked example: a `children` array (e.g. a labelled `arrow`
  between a `regular-polygon` and an `ellipse`) passed to `compose_surface`.

The catalog is hand-authored markdown (matching `DIAGRAM_SPEC_DOC`), not derived
from the schema — it adds the prose/examples the raw JSON schema lacks.

### 2. `compose-a-figure` prompt (`mcp/src/prompts.ts`)

A guided prompt registered like `make-me-a-diagram`, args
`{ figureDescription: string, mood?: string }`, that walks:

1. The figure to build (`figureDescription`).
2. Pick a vibe (`list_vibe_presets`, optional `resolve_vibe`; mood-aware).
3. Read `docs://compose-spec` for the scene-node kinds and their fields.
4. Build a `children` array of scene nodes; optionally call the `compute_*` calc
   tools for exact path geometry.
5. Call `compose_surface` with `width`/`height`/`vibe`/`children`.
6. `export_png` if a raster is needed.

## Testing

- Add to the existing prompt/resource coverage in `mcp/src/server.test.ts`
  (which already exercises registered prompts/resources):
  - `docs://compose-spec` registers and returns markdown that mentions the new
    kinds (assert it contains e.g. `arrow`, `wedge`, `regular-polygon`).
  - the `compose-a-figure` prompt registers and its generated message references
    `compose_surface` and `docs://compose-spec`.
- Existing tests (tool/prompt/resource counts or name lists) updated if they
  assert exact counts.
- `npm run typecheck` + full `mcp/` suite stay green.

## Out of scope

- A machine-readable `schema://scene-node` JSON resource — `compose_surface`'s
  tool input schema already exposes the scene-node union; the missing piece is
  the narrative catalog + recipe, not another schema dump.
- Any library (`src/`) change.
- New scene kinds or tools (this is documentation/guidance only).

## Risks

- **Doc drift:** a hand-authored catalog can fall behind the schema if new kinds
  are added later. Mitigated by keeping the doc terse and adding a test that
  asserts the doc mentions the current shape kinds, so a future kind addition
  that forgets the doc is at least visible. (Full schema-derivation is the
  heavier alternative, deliberately not chosen — the value here is prose.)
