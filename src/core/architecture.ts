import type { FlowDirection, LayoutOptions } from '../types/charts';
import type { Point } from '../types/geometry';
import type { LaidGroup, LayoutEngine } from './diagram';
import { layoutFlow } from './dag';
import { isHorizontal } from './hierarchy';
import type { LaidOutEdge, LaidOutNode } from './hierarchy';
import { boxPort, routeOrthogonal, simplify, type Obstacle } from './routing';
import { measureText } from './text';

const toBox = (n: LaidOutNode): Obstacle => ({
  x: n.x - n.width / 2,
  y: n.y - n.height / 2,
  width: n.width,
  height: n.height,
});

/** Length of the straight lead-in/out kept perpendicular to each box face. */
const STUB = 14;

/** Outward unit normal of the box side a port sits on. */
function portNormal(box: Obstacle, port: Point): Point {
  if (Math.abs(port.x - box.x) < 0.5) return { x: -1, y: 0 };
  if (Math.abs(port.x - (box.x + box.width)) < 0.5) return { x: 1, y: 0 };
  if (Math.abs(port.y - box.y) < 0.5) return { x: 0, y: -1 };
  return { x: 0, y: 1 };
}

const along = (p: Point, n: Point, d: number): Point => ({ x: p.x + n.x * d, y: p.y + n.y * d });

/** Gap between members within a band, and between consecutive bands. */
const MEMBER_GAP = 36;
const BAND_GAP = 56;
/** Padding between a lane's border and its member nodes. */
const LANE_PAD = 14;

const DENSITY_MUL: Record<NonNullable<LayoutOptions['density']>, number> = {
  compact: 0.7,
  cozy: 1,
  comfortable: 1.4,
};
/** Breathing room on either side of a swimlane title within its gutter. */
const LABEL_MARGIN = 10;
// The layout runs before a vibe is resolved, so titles are sized with a
// representative font just to reserve the gutter; the renderer measures again
// with the real font when it draws.
const LABEL_FONT_PX = 14;
const LABEL_FONT = 'serif';

interface BandLayout {
  placed: LaidOutNode[];
  groups: LaidGroup[];
}

/**
 * Lay each `group` out as a swimlane: a band across the flow (a row in TB/BT, a
 * column in LR/RL), with the title parked in a gutter on the lane's leading
 * cross-edge — left for vertical flow, top for horizontal. Because members sit
 * in the lane *body* past that gutter, connectors flowing band-to-band never
 * cross a title. Lanes share one cross-extent so they read as aligned tracks,
 * and can never overlap on the flow axis. The base flow layout is reused only
 * for ordering (bands by mean flow position, members by cross position), so the
 * existing crossing-reduction still informs the result. Ungrouped nodes each
 * occupy a singleton, container-less band.
 */
function bandLayout(
  base: LaidOutNode[],
  direction: FlowDirection,
  size: [number, number],
  options?: LayoutOptions,
): BandLayout {
  if (base.length === 0) return { placed: base, groups: [] };
  const horizontal = isHorizontal(direction);
  const mul = DENSITY_MUL[options?.density ?? 'cozy'];
  const memberGap = options?.nodeSpacing ?? MEMBER_GAP * mul;
  const bandGap = options?.rankSpacing ?? BAND_GAP * mul;
  const extraGutter = options?.laneGutter ?? 0;
  const flowKey = (n: LaidOutNode) => (horizontal ? n.x : n.y);
  const crossKey = (n: LaidOutNode) => (horizontal ? n.y : n.x);
  const flowExt = (n: LaidOutNode) => (horizontal ? n.width : n.height);
  const crossExt = (n: LaidOutNode) => (horizontal ? n.height : n.width);
  const mean = (xs: number[]) => xs.reduce((s, v) => s + v, 0) / xs.length;

  const order: string[] = [];
  const bands = new Map<string, LaidOutNode[]>();
  for (const n of base) {
    const key = n.data.group ?? `__node__:${n.id}`;
    const list = bands.get(key);
    if (list) list.push(n);
    else {
      bands.set(key, [n]);
      order.push(key);
    }
  }

  const laidBands = order
    .map((key) => {
      const members = bands
        .get(key)!
        .slice()
        .sort((a, b) => crossKey(a) - crossKey(b));
      const group = key.startsWith('__node__:') ? undefined : key;
      return { group, members, flowAt: mean(members.map(flowKey)) };
    })
    .sort((a, b) => a.flowAt - b.flowAt);

  // Title gutter on the leading cross-edge, sized to the widest title.
  const titleDims = laidBands.map((b) =>
    b.group ? measureText(b.group, LABEL_FONT_PX, LABEL_FONT) : null,
  );
  const gutter = (() => {
    const dims = titleDims.filter((d): d is { width: number; height: number } => d != null);
    if (dims.length === 0) return 0;
    const base = horizontal
      ? Math.max(...dims.map((d) => d.height)) + LABEL_MARGIN * 2
      : Math.max(...dims.map((d) => d.width)) + LABEL_MARGIN * 2;
    return base + extraGutter;
  })();

  const bandFlow = laidBands.map((b) => Math.max(...b.members.map(flowExt)));
  const bandCross = laidBands.map(
    (b) => b.members.reduce((s, m) => s + crossExt(m), 0) + memberGap * (b.members.length - 1),
  );
  const contentFlow = bandFlow.reduce((s, v) => s + v, 0) + bandGap * (laidBands.length - 1);
  const contentCross = Math.max(...bandCross);

  const flowSpan = horizontal ? size[0] : size[1];
  const crossSpan = horizontal ? size[1] : size[0];
  const flowOrigin = (flowSpan - contentFlow) / 2;
  // A lane spans: pad | gutter | body(contentCross) | pad. Centre that block.
  const laneCross = LANE_PAD + gutter + contentCross + LANE_PAD;
  const laneCrossStart = (crossSpan - laneCross) / 2;
  const bodyStart = laneCrossStart + LANE_PAD + gutter;
  // Mirror the flow axis for BT/RL so source bands sit at the bottom/right.
  const flip = direction === 'BT' || direction === 'RL';
  const toFlow = (f: number) => (flip ? 2 * flowOrigin + contentFlow - f : f);

  const placed: LaidOutNode[] = [];
  const groups: LaidGroup[] = [];
  let flowCursor = flowOrigin;
  laidBands.forEach((band, i) => {
    const flowCenter = toFlow(flowCursor + bandFlow[i] / 2);
    let crossCursor = bodyStart + (contentCross - bandCross[i]) / 2;
    for (const m of band.members) {
      const crossCenter = crossCursor + crossExt(m) / 2;
      placed.push(
        horizontal
          ? { ...m, x: flowCenter, y: crossCenter }
          : { ...m, x: crossCenter, y: flowCenter },
      );
      crossCursor += crossExt(m) + memberGap;
    }

    if (band.group) {
      const fa = toFlow(flowCursor - LANE_PAD);
      const fb = toFlow(flowCursor + bandFlow[i] + LANE_PAD);
      const flowLo = Math.min(fa, fb);
      const flowSize = Math.abs(fb - fa);
      const rect = horizontal
        ? { x: flowLo, y: laneCrossStart, width: flowSize, height: laneCross }
        : { x: laneCrossStart, y: flowLo, width: laneCross, height: flowSize };
      // Title sits in the gutter: centred along the lane for a top gutter
      // (horizontal flow), left-aligned for a side gutter (vertical flow).
      const labelPoint = horizontal
        ? {
            x: flowCenter,
            y: laneCrossStart + LANE_PAD + (gutter - LABEL_MARGIN * 2) / 2 + LABEL_MARGIN,
          }
        : { x: laneCrossStart + LANE_PAD + LABEL_MARGIN, y: flowCenter };
      groups.push({
        id: band.group,
        label: band.group,
        ...rect,
        labelPoint,
        labelAnchor: horizontal ? 'middle' : 'start',
      });
    }
    flowCursor += bandFlow[i] + bandGap;
  });
  return { placed, groups };
}

/**
 * Architecture / network layout: position components into per-`group` bands so
 * the zone containers tile cleanly, then route every connector orthogonally
 * around the other boxes (hand-rolled A* router). Ports sit on the box side
 * facing the peer, and connectors leave and arrive square-on via perpendicular
 * stubs.
 */
export function architectureLayout(
  direction: FlowDirection = 'TB',
  options?: LayoutOptions,
): LayoutEngine {
  return (nodes, edges, size) => {
    const base = layoutFlow(nodes, size, edges, direction);
    const { placed, groups } = bandLayout(base.nodes, direction, size, options);
    const byId = new Map(placed.map((n) => [n.id, n]));

    // Keep connectors off the swimlane titles too, not just the boxes.
    const labelBoxes: Obstacle[] = groups.flatMap((g) => {
      if (!g.label || !g.labelPoint) return [];
      const m = measureText(g.label, LABEL_FONT_PX, LABEL_FONT);
      const x = g.labelAnchor === 'middle' ? g.labelPoint.x - m.width / 2 : g.labelPoint.x;
      return [{ x, y: g.labelPoint.y - m.height / 2, width: m.width, height: m.height }];
    });

    const routed: LaidOutEdge[] = base.edges.flatMap((e) => {
      const s = byId.get(e.from);
      const t = byId.get(e.to);
      if (!s || !t) return [];
      const sBox = toBox(s);
      const tBox = toBox(t);
      const sPort = boxPort(sBox, { x: t.x, y: t.y });
      const tPort = boxPort(tBox, { x: s.x, y: s.y });
      // Route between short stubs set off each face's normal, then re-attach the
      // ports. This forces the connector to leave and arrive perpendicular to the
      // box — so the arrowhead always points squarely into the target rather than
      // grazing along its edge when the route had to approach from the side.
      const sStub = along(sPort, portNormal(sBox, sPort), STUB);
      const tStub = along(tPort, portNormal(tBox, tPort), STUB);
      const obstacles = placed
        .filter((n) => n.id !== e.from && n.id !== e.to)
        .map(toBox)
        .concat(labelBoxes);
      const route = routeOrthogonal(sStub, tStub, obstacles, { padding: 10 });
      // The router snaps lattice nodes to 2dp; round the exact ports to match so
      // the perpendicular joins stay precisely axis-aligned (not off by ~1e-9).
      const snap = (p: Point): Point => ({
        x: Math.round(p.x * 100) / 100,
        y: Math.round(p.y * 100) / 100,
      });
      const points = simplify([sPort, ...route, tPort].map(snap));
      return [{ ...e, sx: sPort.x, sy: sPort.y, tx: tPort.x, ty: tPort.y, points }];
    });

    return {
      nodes: placed,
      edges: routed,
      groups,
      orientation: isHorizontal(direction) ? 'horizontal' : 'vertical',
    };
  };
}
