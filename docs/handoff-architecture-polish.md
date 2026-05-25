# Handoff: two architecture-diagram polish nits

Two small, isolated visual issues remain on the **architecture / network** diagram
after the layout polish pass. Both are cosmetic and contained — no API changes
expected. This doc gives you everything to fix them from a cold start.

## Repo orientation (60 seconds)

GoldenChart is a monorepo: a React charting/diagramming **library** at the root
(`src/`) and an **MCP server** in `mcp/` that renders components headlessly to SVG.

- **Calculation layer** (`src/core/`, pure, DOM-free): scales, shapes, layouts.
- **Rendering** (`src/primitives/` → roughjs): `RoughRectangle`, `RoughPath`, `RoughText`, …
- **Components** (`src/components/`): `Surface` (the `<svg>` container) + each chart/diagram.
- Diagrams share one renderer, `components/Diagram.tsx`, driven by a `LayoutEngine`
  (`core/diagram.ts`). The architecture diagram is `components/ArchitectureDiagram.tsx`
  → `core/architecture.ts` (layout) → `core/routing.ts` (the hand-rolled orthogonal
  obstacle router).

### Build / test / preview commands

```bash
# library (run from repo root)
npm run typecheck && npm test && npm run build

# MCP (run from ./mcp) — consumes the built library via file:..
cd mcp && npm run typecheck && npm test

# Regenerate the demo gallery to eyeball changes (run from ./mcp)
cd mcp && npm run gallery        # writes assets/gallery/*.{svg,png}
```

The gallery script is `mcp/scripts/generate-gallery.ts`; the architecture sample
is the `architecture` entry. Open `assets/gallery/architecture.png` (raster) and
`assets/gallery/architecture.svg` (inspect the path data) after regenerating.

### Important: golden snapshots

The MCP has golden-snapshot tests of each render tool's SVG. **Fixing either nit
will change `render_architecture`'s output**, so its snapshot in
`mcp/src/__snapshots__/diagrams.test.ts.snap` will fail. After you've **visually
confirmed** the new render is correct, update it:

```bash
cd mcp && npm test -- -u      # updates ONLY the snapshots that changed
```

Sanity-check that *only* `render_architecture` (and not flowchart/org/er/etc.)
changed — if other snapshots move, your change leaked further than intended.

---

## Nit 1 — Zone labels sit on the container's top border

### Symptom
Each architecture zone is a labelled container (e.g. "Frontend", "Backend",
"Data"). The label text is drawn just inside the top-left corner, so the
container's (hand-drawn, slightly wobbly) **top border stroke crosses through the
label glyphs**. See `assets/gallery/architecture.png` — the "Frontend" and "Data"
labels have a line through them.

### Where
`src/components/Diagram.tsx`, the `DiagramGroup` component (~line 90):

```tsx
function DiagramGroup({ group }: { group: LaidGroup }) {
  return (
    <g>
      <RoughRectangle x={group.x} y={group.y} width={group.width} height={group.height} fill={null} />
      {group.label && (
        <RoughText x={group.x + 6} y={group.y + 6} anchor="start" baseline="hanging">
          {group.label}
        </RoughText>
      )}
    </g>
  );
}
```

The rectangle's top edge is at `group.y`; the label baseline-hangs at `group.y + 6`,
so the glyph tops sit right on the stroke. `LaidGroup` is defined in
`src/core/diagram.ts`; group boxes are computed by `computeGroups` there (each box
is the members' bounding box + padding).

### Suggested approaches (pick one; all are local to `DiagramGroup`)
1. **Legend tab (recommended):** draw a small opaque (white, `fillStyle: 'solid'`)
   rectangle sized to the label behind the text, so it "breaks" the border line —
   the fieldset-legend look. Size it with `measureText(label, fontSize, fontFamily)`
   from `src/core/text.ts`. Keep the label where it is (top-left, inside).
2. **Float the label above the border:** render the label just *above* `group.y`
   (e.g. `y={group.y - 4}`, `baseline="auto"`). The diagram already fits its
   `viewBox` to content with padding (see `sceneBounds` in `core/diagram.ts`), so a
   label poking above the box won't clip. Risk: a top-row group's label could near
   the canvas edge — verify with the gallery.
3. **Reserve a label gutter:** keep the label inside but give `computeGroups` extra
   top padding so the first member node never sits under the label, and move the
   label down a touch. (Larger blast radius — changes group box geometry.)

Approach 1 is the most robust and most "designed". Note `RoughText` takes a `fill`
and the primitives take a `vibe`/`seed`; the white chip should be drawn *before*
(under) the text.

### Acceptance
- Zone labels are fully legible with no stroke crossing the glyphs, in all three
  vibes (the gallery uses `clean_blueprint`; spot-check `messy_sketch` too).
- No regression to ungrouped diagrams (groups only render when nodes set `group`).

---

## Nit 2 — API-Gateway → Worker connector: arrowhead "into the side"

### Symptom
In the architecture sample, the `API Gateway → Worker` connector approaches Worker
with an arrowhead that reads as stabbing the box's side / floating just before it,
rather than a clean square-on arrival like the sibling `API Gateway → Auth` edge.
Visible in `assets/gallery/architecture.png`.

### Where (the pipeline for one edge)
1. `src/core/architecture.ts` → `architectureLayout` (~line 27): for each edge it
   picks a **source port** and **target port** with `boxPort(box, towardPeerCenter)`
   then routes between them:
   ```ts
   const sPort = boxPort(sBox, { x: t.x, y: t.y });
   const tPort = boxPort(tBox, { x: s.x, y: s.y });
   const points = routeOrthogonal(sPort, tPort, obstacles, { padding: 10 });
   ```
2. `src/core/routing.ts`:
   - `boxPort(box, toward)` returns the **midpoint of the box side facing `toward`**
     (chooses the side by the dominant axis of the delta — left/right vs top/bottom).
   - `routeOrthogonal(from, to, obstacles, { padding })` is a lattice A* that returns
     the orthogonal polyline (simplified to corners) from `from` to `to`.
3. `src/components/Diagram.tsx` → `DiagramEdge` (~line 121): when an edge has
   `points`, it draws the polyline and the arrowhead aligned to the **final
   segment**:
   ```ts
   arrowTail = pts[pts.length - 2];
   // ...
   {showArrowhead && <RoughPath d={arrowHeadPath(arrowTail, to)} fill={null} />}
   ```
   `arrowHeadPath(from, to)` (in `src/core/shapes.ts`) draws a two-stroke head at
   `to`, angled along `from → to`.

### Likely root cause
`boxPort` selects the target side purely from the **center-to-center** direction,
but the *route* (which detours around obstacles with `padding`) can arrive at that
port from a different direction — so the final segment isn't a clean perpendicular
stub into the chosen side, and the arrowhead ends up angled or arriving where the
side label/border is. The `API Gateway → Auth` edge happens to line up; the
`→ Worker` one doesn't because Worker sits down-and-to-the-side of the gateway.

### How to investigate
1. `cd mcp && npm run gallery`, then open `assets/gallery/architecture.svg` and find
   the `<path>` for the Worker connector (it's the polyline whose last point lands on
   Worker's box edge). Print/inspect the edge's `points` — e.g. add a temporary
   `console.log` in `architectureLayout` for the `e.from === 'gateway' && e.to === 'worker'`
   edge, or write a tiny scratch script that calls `architectureLayout('TB')(nodes, edges, [w,h])`
   with the gallery's architecture data.
2. Look at the **last two points**: is the final segment axis-aligned and a sensible
   length, and does `tPort` sit on the side the route actually approaches from?

### Suggested fixes (evaluate against the gallery)
- **Guarantee a perpendicular entry stub.** In `routeOrthogonal` (or in
  `architectureLayout` post-routing), ensure the first and last segments are short,
  axis-aligned stubs leaving/entering the port perpendicular to its side. A clean
  final stub makes `arrowHeadPath(pts[len-2], to)` always read square-on.
- **Make port choice route-aware.** Pick `tPort`'s side from the *incoming route
  direction* rather than center-to-center (e.g. route to the box center first, then
  snap the endpoint to whichever side the penultimate segment approaches).
- **Guard a degenerate final segment** in `DiagramEdge`: if `pts[len-2]` is within a
  few px of `to` (tiny last segment), walk back to an earlier point for the
  arrowhead angle so the head isn't computed from a near-zero vector.

Prefer a fix in the **router/layout** (`routing.ts` / `architecture.ts`) so the
geometry is correct for everyone, over a render-only patch.

### Acceptance
- The `→ Worker` connector arrives square-on with a clean arrowhead, matching the
  `→ Auth` edge.
- No other architecture edges regress; re-check the gallery for all six connectors.
- Spot-check a second grouped graph (vary the data in the gallery entry) to make
  sure the fix generalizes and isn't tuned to this one layout.

---

## Constraints / guardrails
- Keep the **hand-drawn aesthetic** — all strokes go through the roughjs primitives
  (`RoughRectangle`/`RoughPath`/`RoughText`), never raw SVG shapes.
- `src/core/` is **pure and DOM-free** (it's shared with the headless MCP build).
  Geometry belongs in `core/`; only rendering belongs in `components/`.
- Don't change unrelated golden snapshots. Only `render_architecture` should move;
  update it with `npm test -- -u` (from `mcp/`) after a visual check.
- Verification checklist before handing back:
  - [ ] root: `npm run typecheck && npm test && npm run build`
  - [ ] mcp: `npm run typecheck && npm test` (architecture snapshot updated intentionally)
  - [ ] `npm run gallery` regenerated; `assets/gallery/architecture.{svg,png}` eyeballed
  - [ ] `npm run playground:build` (root) still succeeds
