# Design: `arrow` connector scene kind (SP3)

**Date:** 2026-05-26
**Status:** Approved (design)
**Scope:** `src/core/shapes.ts` (one geometry helper) + `mcp/` (one scene kind).
No new React components.

## Context

Third sub-project under "increase the surface of primitives the agent can
tweak". SP2 shipped a **standalone** arrowhead (just the head). The most common
agent need, though, is "connect point A to point B with an arrow" — shaft + head
+ optional label. This adds that as a composite.

The library already renders exactly this for laid-out flowchart edges in
`DiagramEdge` (`src/components/Diagram.tsx:121`): a shaft via
`linkPath`/`orthogonalPath`/explicit points, an `arrowHeadPath` head aligned to
the final segment, and an optional `RoughText` label. SP3 generalises that to two
arbitrary points and exposes it to the agent, reusing the same core builders
(`linkPath`, `orthogonalPath`, `orthogonalPoints`, `arrowHeadPath` — including
SP2's `filled` option).

## What gets built

### Library — one geometry helper (`src/core/shapes.ts`)

`connectorPath(from, to, { routing, orientation })` → `{ d, startTangent,
endTangent, labelAt }`:

- `routing`: `'straight'` (`M…L…`), `'curved'` (`linkPath`), or `'orthogonal'`
  (`orthogonalPath`). Default `'straight'`.
- `orientation`: `'horizontal' | 'vertical'`. Default inferred from the dominant
  axis (`|to.x - from.x| >= |to.y - from.y|` → `'horizontal'`).
- `endTangent` / `startTangent`: the point each arrowhead aligns against so the
  head reads correctly.
  - straight / curved: `endTangent = from`, `startTangent = to` (head points
    along the straight from→to line — matches existing `DiagramEdge` behavior for
    curved edges).
  - orthogonal: `endTangent = points[len-2]`, `startTangent = points[1]` (the
    axis-aligned end segments), where `points = orthogonalPoints(from, to,
    orientation)`.
- `labelAt`: midpoint (straight/curved) or the middle vertex (orthogonal).

Geometry only — DOM-free, like every other `shapes.ts` builder.

### MCP — `arrow` scene kind (`mcp/src/schemas.ts`, `primitives.ts`)

New `PrimitiveSpec` discriminated-union member:

```
{ kind: 'arrow',
  from: {x,y}, to: {x,y},
  routing?: 'straight' | 'curved' | 'orthogonal',   // default 'straight'
  orientation?: 'horizontal' | 'vertical',           // default inferred
  label?: string,
  endHead?: boolean,    // default true
  startHead?: boolean,  // default false (both true => double-headed)
  filled?: boolean,     // head style (SP2 arrowHeadPath filled)
  size?: number,        // head size
  stroke?, seed?, vibe? }
```

`primitiveToElement`'s new `arrow` case returns a `<g key>` containing:
- shaft: `<RoughPath d={connector.d} fill={null} …>` (always an open stroke),
- end head (when `endHead !== false`): `<RoughPath d={arrowHeadPath(endTangent,
  to, size, filled)} fill={filled ? undefined : null} …>`,
- start head (when `startHead`): `<RoughPath d={arrowHeadPath(startTangent, from,
  size, filled)} …>`,
- label (when `label`): `<RoughText x/y={labelAt} anchor="middle"
  baseline="middle">`.

`stroke`/`seed`/`vibe` propagate to each child. No fill on the shaft; filled
heads fill (vibe/stroke colour), open heads suppress fill (`fill: null`), exactly
like the SP2 `arrowhead` kind.

**No calc tool** — an arrow is a composite of several paths, not a single `d`
string, so it does not fit the Level-1 `compute_*_path` pattern. Scene kind only.

**`DiagramEdge` is intentionally left untouched.** Sharing `connectorPath` into
it would unify the logic but risks changing flowchart snapshot output; SP3 stays
additive. A code comment notes `DiagramEdge` could adopt `connectorPath` later.

## Testing

- **Core `connectorPath` (`src/core/shapes.test.ts`):**
  - straight: `d` is `M…L…`; `endTangent` equals `from`; `labelAt` is the
    midpoint.
  - orthogonal: `d` has multiple `L` segments; `endTangent` is axis-aligned with
    `to` (shares an x or y with it).
  - curved: `d` contains `C`.
  - orientation inference: a wide-but-short delta resolves to `'horizontal'`.
- **MCP arrow scene kind (`mcp/src/shapePrimitives.test.ts`):**
  - renders a `<g>` containing a shaft `<path>` and the label text.
  - `endHead` default on: more than one `<path>` (shaft + head); `startHead`
    true adds another head path (double-headed).
  - `filled: true` head path ends in `Z`; open head does not.
  - `routing: 'orthogonal'` vs `'straight'` produce different shaft `d`s.
- **Regression:** full `src/` and `mcp/` suites green; both typecheck clean.
- **Comparison:** add an `arrow` entry to `compare-agent-surface.mjs` — the SP2
  bare headless line replaced by a labelled, arrowheaded connector. The carried-
  forward baseline supplies the "before".

## Out of scope

- Refactoring `DiagramEdge` to use `connectorPath` (additive only).
- A standalone `render_arrow` MCP tool (scene kind covers it; avoids overlap with
  `compose_surface`).
- Markers other than arrowheads (dots/diamonds at endpoints).
- Self-loops / multi-waypoint arrows (two endpoints only).

## Risks

- **Arrowhead alignment on curved shafts.** The head aligns to the straight
  from→to line, not the curve's true endpoint tangent. This matches the existing
  `DiagramEdge` behavior and looks correct for typical short connectors; flagged
  rather than over-engineered.
- **Orientation inference surprising the agent.** Mitigated by the explicit
  `orientation` override and a clear default rule.
