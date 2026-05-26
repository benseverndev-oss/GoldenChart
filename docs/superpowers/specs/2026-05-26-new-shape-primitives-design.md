# Design: New shape primitives for the agent surface (SP2)

**Date:** 2026-05-26
**Status:** Approved (design)
**Scope:** `src/core/` (path-builders) + `mcp/` (calc tools + scene kinds).
No new React components.

## Context

This is the second sub-project under "increase the surface of primitives the
agent can tweak". SP1 closed the drift gap (exposed existing library
capabilities through MCP). SP2 adds genuinely new drawable shapes.

Key facts about the existing code that shape this design:

- Every higher-level shape in the library is a pure SVG path `d`-string built in
  `src/core/` and rendered through the existing `<RoughPath>` primitive
  (`diamondPath`, `ellipsePath`, `linkPath`, `arrowHeadPath`, `linePath`,
  `areaPath`). Only the five base primitives (rect/circle/line/path/text) have
  dedicated React components calling native Rough.js generator methods. So new
  shapes follow the path-builder idiom — **no new React components**.
- `src/core/polar.ts` already provides `polarToCartesian(cx, cy, r, angleRad)`
  (radians; `angleRad = 0` is east / 3 o'clock, increasing clockwise because SVG
  y points down) and `polygonPath(points)` (arbitrary closed polygon). Note:
  `axisAngle` starts its index 0 at the top, but that is just a local `-π/2`
  offset layered on `polarToCartesian` — it is not a different module
  convention. The new builders call `polarToCartesian` directly, so their
  `0` = east.
- `src/core/shapes.ts` provides `ellipsePath(cx, cy, rx, ry)`,
  `arrowHeadPath(from, to, size)` (an open two-stroke head), and `linePath`.
- The MCP calc-tool `compute_line_path` already exposes `linePath`, so the
  **polyline / open-curve family is already reachable** and needs no new tool.
- The MCP `compose_surface` scene is an array of `PrimitiveSpec` discriminated-
  union nodes mapped to elements by the shared `primitiveToElement`
  (`mcp/src/primitives.ts`), used by both the primitive render tools and
  `compose_surface`.

## What gets built

### Library — path-builders (`src/core`)

Reused as-is: `polygonPath` (arbitrary closed polygon), `ellipsePath`,
`linePath` (open polyline, straight or curved), `arrowHeadPath`.

New builders, placed by responsibility:

| Builder | Module | Signature | Notes |
|---|---|---|---|
| `regularPolygonPath` | `polar.ts` | `(cx, cy, r, sides, rotationRad?)` | n-gon vertices via `polarToCartesian`, delegated to `polygonPath` |
| `starPath` | `polar.ts` | `(cx, cy, outerR, innerR, points, rotationRad?)` | alternating radii, delegated to `polygonPath` |
| `arcStrokePath` | `polar.ts` | `(cx, cy, r, startRad, endRad)` | open arc stroke (SVG `A` command); named for clarity vs `computePie`'s closed slices — no actual name collision exists |
| `wedgePath` | `polar.ts` | `(cx, cy, r, startRad, endRad, innerR?)` | closed pie wedge, or annular wedge when `innerR` is set |
| `arrowHeadPath` (extend) | `shapes.ts` | add `filled?: boolean` | existing open two-stroke head when `false`/omitted; closed solid triangle when `true` |

Radial builders live in `polar.ts` next to `polarToCartesian`/`polygonPath`; the
arrowhead extension stays in `shapes.ts` where `arrowHeadPath` already lives.

**Angle convention:** core builders take **radians**, matching
`polarToCartesian`/`axisAngle`. `0` points east (3 o'clock); angles increase
clockwise (SVG y-axis points down). The MCP layer accepts **degrees** and
converts at the tool boundary — one conversion point, agent-friendly inputs.

**Name-collision check:** `src/core/arc.ts` exports only `PieSlice` and
`computePie` — none of the new builder names collide with it or any other core
module (verified). The `arcStrokePath` name is chosen for clarity (open stroke
vs `computePie`'s closed slices), not to avoid a collision. Re-confirm during
implementation before adding the `export *` symbols.

### MCP — calc tools (`mcp/src/calcTools.ts`)

New Level-1 tools, each mirroring `compute_line_path` (JSON in, `d` string out),
**degrees in**. Trig-heavy shapes only — arbitrary polygon and ellipse are
trivial `d`s and get scene kinds only; polyline already has `compute_line_path`:

- `compute_regular_polygon_path` — `{ cx, cy, r, sides, rotation? }`
- `compute_star_path` — `{ cx, cy, outerRadius, innerRadius, points, rotation? }`
- `compute_arc_path` — `{ cx, cy, r, startAngle, endAngle }`
- `compute_wedge_path` — `{ cx, cy, r, startAngle, endAngle, innerRadius? }`
- `compute_arrowhead_path` — `{ from, to, size?, filled? }`

### MCP — `compose_surface` scene kinds (`mcp/src/schemas.ts`, `primitives.ts`)

New `PrimitiveSpec` discriminated-union members, each with the usual
`stroke?`/`fill?`/`seed?`/`vibe?` and **degrees** for angles:

- `polygon` — `{ points: [{x,y}, …] }`
- `regular-polygon` — `{ cx, cy, r, sides, rotation? }`
- `star` — `{ cx, cy, outerRadius, innerRadius, points, rotation? }`
- `arc` — `{ cx, cy, r, startAngle, endAngle }` (open stroke)
- `wedge` — `{ cx, cy, r, startAngle, endAngle, innerRadius? }`
- `ellipse` — `{ cx, cy, rx, ry }`
- `arrowhead` — `{ from, to, size?, filled? }` (standalone head; agent composes
  with a `line`/`polyline` for a full arrow)

**All seven new kinds map to `<RoughPath>`** using the matching builder's `d`
— none are straight 2-point segments, so `RoughLine` is never used (the existing
`line` kind already covers that). Because the mapper is shared, the new kinds
work anywhere `primitiveToElement` is used. Angles are converted degrees→radians
in the mapper / handlers, the single conversion boundary.

**Fill semantics for open shapes.** `RoughPath` inherits the vibe fill unless
`fill: null` is passed (`fill === undefined ? resolved.fill : fill`), which
would smear a hachure fill across an open arc's chord or an open arrowhead's
notch. The mapper therefore passes `fill: null` for inherently-open kinds —
`arc`, and `arrowhead` when `filled` is not `true` — and only honors a caller's
`fill` for the closed kinds (`polygon`, `regular-polygon`, `star`, `wedge`,
`ellipse`, and filled `arrowhead`).

## Decisions (confirmed)

- **Library shape:** path-builders in core, not new React components — matches
  the existing `diamondPath`/`ellipsePath` idiom.
- **MCP exposure:** calc tools + scene kinds; no redundant single-shape render
  tools (`render_rough_path` already renders any `d`).
- **Arrowhead:** a standalone head primitive (open or filled), not a shaft+head
  connector. Atomic and composable.
- **Calc tools:** only for trig-heavy shapes (regular-polygon, star, arc, wedge,
  arrowhead). Arbitrary polygon and ellipse are scene-kind only.

## Testing

- **Core (vitest, `src/core`):** one focused test per builder.
  - `regularPolygonPath`: a hexagon has 6 distinct vertices and the path closes
    (`Z`); rotation shifts vertices.
  - `starPath`: `2 * points` vertices alternating between inner and outer radius.
  - `arcStrokePath`: start/end points equal `polarToCartesian` at the given
    angles; path is open (no `Z`).
  - `wedgePath`: closed; an annular wedge (`innerR` set) includes the inner ring.
  - `arrowHeadPath`: `filled` produces a closed triangle (`Z`), open produces the
    two-stroke `M…L…L…` with no `Z`.
- **MCP (vitest, `mcp/src`):** added to the SP1 `driftSurface.test.ts` or a new
  `shapePrimitives.test.ts`.
  - Each calc tool returns a `d` string beginning with `M`.
  - Degree→radian boundary: `compute_arc_path` with `startAngle: 0,
    endAngle: 90` produces endpoints at east (`cx+r, cy`) and south
    (`cx, cy+r`) — south is `cy+r` because SVG y points down, not a bug.
  - Each new scene kind renders inside `compose_surface` (output SVG contains a
    `<path>`); a `regular-polygon` scene node yields the expected vertex count
    in its `d`.
  - Open `arc` scene node produces no fill path (fill suppressed), guarding the
    open-shape fill rule above.
- **Regression:** full `src/` and `mcp/` suites stay green; typecheck clean in
  both packages.

## Out of scope

- New React primitive components (the path-builder idiom is used instead).
- Single-shape render tools (`render_rough_polygon`, …) — `render_rough_path`
  covers single-`d` rendering.
- An `arrow` connector (shaft + head) — arrowhead is standalone.
- Markers other than arrowheads (dots/diamonds at line ends) — not requested.

## Risks

- **Angle-convention confusion.** Mitigated by a single documented convention
  (degrees at the MCP boundary, radians in core, `0`=east clockwise) and an
  explicit degree→radian boundary test.
- **Name collisions** with `src/core/arc.ts` or other core modules under the
  barrel's `export *`. Mitigated by the pre-implementation name check and the
  `arcStrokePath` name.
- **Rough.js `.path()` fidelity on closed polygons/wedges.** Already proven
  acceptable — `diamondPath`/`ellipsePath` ship this way in the polished
  diagrams. No new rendering path is introduced.
