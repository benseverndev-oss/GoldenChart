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

`connectorPath(from, to, { routing, orientation })` → `{ d, endHeadTail,
startHeadTail, labelAt }`:

- `routing`: `'straight'` (`M…L…`), `'curved'` (`linkPath`), or `'orthogonal'`
  (`orthogonalPath`). Default `'straight'`.
- `orientation`: `'horizontal' | 'vertical'`. Default inferred from the dominant
  axis (`|to.x - from.x| >= |to.y - from.y|` → `'horizontal'`; ties resolve to
  `'horizontal'`).
- `endHeadTail` / `startHeadTail`: the **tail** point each arrowhead points away
  from. The end head is drawn `arrowHeadPath(endHeadTail, to)`; the start head is
  drawn `arrowHeadPath(startHeadTail, from)`. (Field names match the head they
  serve, so there's no chance of wiring a reversed head.)
  - straight / curved: `endHeadTail = from`, `startHeadTail = to` — both heads
    align to the straight from→to line. This matches `DiagramEdge`'s **arrowhead
    alignment** (it likewise aligns curved-edge heads to the straight line); the
    curved *shaft* may differ from a flowchart's because orientation is inferred
    here, not taken from a layout.
  - orthogonal: `endHeadTail = points[len-2]`, `startHeadTail = points[1]` (the
    axis-aligned end segments), where `points = orthogonalPoints(from, to,
    orientation)`.
- `labelAt`: the segment midpoint (straight/curved), or for orthogonal the
  vertex `points[Math.floor((points.length - 1) / 2)]` — i.e. `points[1]` of the
  4-point elbow, matching `DiagramEdge`'s label placement.

Geometry only — DOM-free, like every other `shapes.ts` builder.

**Degenerate inputs.** `from == to` does not throw: the shaft `d` is a
zero-length `M x,y L x,y`, `endHeadTail`/`startHeadTail` collapse to that point,
and `arrowHeadPath` (which is `atan2(0,0) = 0`) renders a small east-pointing
dot. Orthogonal routing where `from` and `to` share an axis collapses the elbow
to a straight segment; `points[len-2]` is still well-defined, so the head aligns
along that axis. Both are tested.

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

`arrow` joins the shared `PrimitiveSpecSchema` discriminated union, so
`SceneNodeSchema` picks it up automatically and `compose_surface` accepts it in
its `children`. Note the union is consumed at **two** call sites:
`sceneNodeToElement` (`compose_surface`) and `renderPrimitive` (the Level-2
`render_rough_*` tools). A `<g>`-returning case is valid in both, so `arrow`
becomes implicitly renderable standalone too — acceptable and consistent with
how the SP2 `arrowhead` kind already flows through the mapper. We add no
dedicated `render_arrow` tool.

`primitiveToElement`'s new `case 'arrow':` `return createElement('g', { key },
[...])` — the outer `<g>` carries the `key` param passed into
`primitiveToElement`, and every inner child gets its own stable key
(`` `${key}-shaft` ``, `-end`, `-start`, `-label`) to avoid React keyless-child
warnings. Children:
- shaft: `RoughPath` with `d = connector.d`, `fill: null` (always an open stroke),
- end head (when `endHead !== false`): `RoughPath` with
  `d = arrowHeadPath(connector.endHeadTail, to, size, filled)`,
- start head (when `startHead`): `RoughPath` with
  `d = arrowHeadPath(connector.startHeadTail, from, size, filled)`,
- label (when `label`): `RoughText` at `connector.labelAt`, `anchor="middle"`,
  `baseline="middle"`.

`stroke`/`seed`/`vibe` propagate to each child. The shaft never fills. **Both**
heads use the identical fill rule — `fill: spec.filled ? spec.fill : null` —
exactly like the SP2 `arrowhead` kind: an open head suppresses fill, a filled
head fills with `spec.fill` or, when that's undefined, the resolved **vibe fill**
(`RoughPath` uses `fill === undefined ? resolved.fill : fill`). This keeps a
double-headed arrow's two heads consistent.

**No calc tool** — an arrow is a composite of several paths, not a single `d`
string, so it does not fit the Level-1 `compute_*_path` pattern. Scene kind only.

**`DiagramEdge` is intentionally left untouched.** Sharing `connectorPath` into
it would unify the logic but risks changing flowchart snapshot output; SP3 stays
additive. A code comment notes `DiagramEdge` could adopt `connectorPath` later.

## Testing

- **Core `connectorPath` (`src/core/shapes.test.ts`):**
  - straight: `d` is `M…L…`; `endHeadTail` equals `from`; `startHeadTail` equals
    `to`; `labelAt` is the midpoint.
  - orthogonal: `d` has multiple `L` segments; `endHeadTail` is axis-aligned with
    `to` (shares an x or y with it).
  - curved: `d` contains `C`.
  - orientation inference: a wide-but-short delta resolves to `'horizontal'`.
  - degenerate `from == to`: does not throw; `d` is `M…L…` over the same point
    and `endHeadTail`/`startHeadTail` equal that point.
  - orthogonal with a shared axis (`from.x == to.x`): does not throw; `endHeadTail`
    is well-defined.
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
