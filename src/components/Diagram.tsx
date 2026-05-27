import { useMemo } from 'react';
import type { BaseChartProps, EdgeRouting, FlowEdge, FlowNode } from '../types/charts';
import { getPlotArea } from '../core/geometry';
import type { DiagramOrientation, LaidGroup, LaidOutEdge, LaidOutNode, LayoutEngine } from '../core/diagram';
import { arrowHeadPath, diamondPath, ellipsePath, linkPath, orthogonalPath, orthogonalPoints } from '../core/shapes';
import { measureText } from '../core/text';
import { nodeSize } from '../core/nodeSize';
import { Surface } from './Surface';
import { resolveVibe } from '../vibe/resolveVibe';
import { useResolvedVibe } from '../vibe/VibeProvider';
import { RoughRectangle } from '../primitives/RoughRectangle';
import { RoughPath } from '../primitives/RoughPath';
import { RoughText } from '../primitives/RoughText';

export interface DiagramProps extends BaseChartProps {
  nodes: FlowNode[];
  edges?: FlowEdge[];
  /** Layout engine that positions the scene (flow/tree/DAG, sequence, …). */
  layout: LayoutEngine;
  routing?: EdgeRouting;
  showArrowheads?: boolean;
}

/**
 * The generic diagram renderer: a `LayoutEngine` positions nodes/edges/groups,
 * then this draws group containers, edges (curved or orthogonal, with optional
 * arrowheads + labels) and per-shape nodes. Flowchart and the other diagram
 * types are thin wrappers that pick a layout engine.
 */
export function Diagram({
  nodes,
  edges,
  layout,
  width,
  height,
  margin,
  vibe,
  title,
  description,
  ariaLabel,
  className,
  style,
  bare,
  routing = 'curved',
  showArrowheads = true,
}: DiagramProps) {
  const plot = getPlotArea(width, height, margin);

  // Size each node to its label (with the vibe's font) before layout, so the
  // engine spaces them by real extent. Explicit width/height on a node win.
  const sizedNodes = useMemo(() => {
    const resolved = resolveVibe(vibe);
    return nodes.map((n) => {
      if (n.width != null && n.height != null) return n;
      const s = nodeSize(n.label, n.shape ?? 'rect', resolved.fontSize, resolved.fontFamily);
      return { ...n, width: n.width ?? s.width, height: n.height ?? s.height };
    });
  }, [nodes, vibe]);

  const scene = useMemo(
    () => layout(sizedNodes, edges, [plot.width, plot.height]),
    [layout, sizedNodes, edges, plot.width, plot.height],
  );

  // Per-edge routing override, keyed by endpoints, falling back to the chart default.
  const edgeRouting = useMemo(() => {
    const map = new Map<string, EdgeRouting>();
    for (const e of edges ?? []) if (e.routing) map.set(`${e.from}->${e.to}`, e.routing);
    return map;
  }, [edges]);

  // Fit the laid-out scene into the plot: scale down (never up) and centre, so a
  // layout that's wider/taller than the canvas is never clipped at the edge.
  const fit = useMemo(() => {
    let minX = Infinity;
    let minY = Infinity;
    let maxX = -Infinity;
    let maxY = -Infinity;
    for (const n of scene.nodes) {
      minX = Math.min(minX, n.x - n.width / 2);
      maxX = Math.max(maxX, n.x + n.width / 2);
      minY = Math.min(minY, n.y - n.height / 2);
      maxY = Math.max(maxY, n.y + n.height / 2);
    }
    for (const g of scene.groups ?? []) {
      minX = Math.min(minX, g.x);
      maxX = Math.max(maxX, g.x + g.width);
      minY = Math.min(minY, g.y);
      maxY = Math.max(maxY, g.y + g.height);
    }
    if (!Number.isFinite(minX)) return `translate(${plot.x}, ${plot.y})`;
    const pad = 4;
    const bw = maxX - minX || 1;
    const bh = maxY - minY || 1;
    const s = Math.min((plot.width - pad * 2) / bw, (plot.height - pad * 2) / bh, 1);
    const tx = plot.x + pad + (plot.width - pad * 2 - bw * s) / 2 - minX * s;
    const ty = plot.y + pad + (plot.height - pad * 2 - bh * s) / 2 - minY * s;
    return `translate(${tx}, ${ty}) scale(${s})`;
  }, [scene, plot.x, plot.y, plot.width, plot.height]);

  return (
    <Surface
      width={width}
      height={height}
      vibe={vibe}
      title={title}
      description={description}
      ariaLabel={ariaLabel}
      className={className}
      style={style}
      bare={bare}
    >
      <g transform={fit}>
        {scene.groups?.map((g) => <DiagramGroup key={g.id} group={g} />)}
        {scene.edges.map((e) => (
          <DiagramEdge
            key={`${e.from}->${e.to}`}
            edge={e}
            orientation={scene.orientation}
            routing={edgeRouting.get(`${e.from}->${e.to}`) ?? routing}
            showArrowhead={showArrowheads}
          />
        ))}
        {scene.nodes.map((n, i) => (
          <DiagramNode key={n.id} node={n} index={i} />
        ))}
      </g>
    </Surface>
  );
}

function DiagramGroup({ group }: { group: LaidGroup }) {
  const resolved = useResolvedVibe();
  const m = group.label ? measureText(group.label, resolved.fontSize, resolved.fontFamily) : null;
  const anchor = group.labelAnchor ?? 'start';
  const at = group.labelPoint ?? { x: group.x + 8, y: group.y };
  const padX = 4;
  const padY = 1;
  const tabX = anchor === 'middle' && m ? at.x - m.width / 2 - padX : at.x - padX;
  return (
    <g>
      <RoughRectangle x={group.x} y={group.y} width={group.width} height={group.height} fill={null} />
      {group.label && m && (
        <>
          {/* A page-coloured tab sits behind the title so it stays legible even
              where a border or connector passes close by. */}
          <rect
            x={tabX}
            y={at.y - m.height / 2 - padY}
            width={m.width + padX * 2}
            height={m.height + padY * 2}
            fill={resolved.background ?? '#ffffff'}
          />
          <RoughText x={at.x} y={at.y} anchor={anchor} baseline="middle">
            {group.label}
          </RoughText>
        </>
      )}
    </g>
  );
}

function DiagramEdge({
  edge,
  orientation,
  routing,
  showArrowhead,
}: {
  edge: LaidOutEdge;
  orientation: DiagramOrientation;
  routing: EdgeRouting;
  showArrowhead: boolean;
}) {
  const from = { x: edge.sx, y: edge.sy };
  const to = { x: edge.tx, y: edge.ty };
  // For elbow links the head must align with the final (axis-aligned) segment,
  // not the straight source->target line, so it reads as a clean right angle.
  let d: string;
  let arrowTail = from;
  let labelAt = { x: (edge.sx + edge.tx) / 2, y: (edge.sy + edge.ty) / 2 };
  if (edge.points && edge.points.length >= 2) {
    const pts = edge.points;
    d = `M${pts[0].x},${pts[0].y} ` + pts.slice(1).map((p) => `L${p.x},${p.y}`).join(' ');
    arrowTail = pts[pts.length - 2];
    labelAt = pts[Math.floor((pts.length - 1) / 2)];
  } else if (routing === 'orthogonal') {
    const pts = orthogonalPoints(from, to, orientation);
    d = orthogonalPath(from, to, orientation);
    arrowTail = pts[pts.length - 2];
  } else {
    d = linkPath(from, to, orientation);
  }
  const resolved = useResolvedVibe();
  const m = edge.label ? measureText(edge.label, resolved.fontSize, resolved.fontFamily) : null;
  return (
    <g>
      <RoughPath d={d} fill={null} />
      {showArrowhead && <RoughPath d={arrowHeadPath(arrowTail, to)} fill={null} />}
      {edge.label && m && (
        <>
          {/* Page-coloured knockout so the label reads clearly over the connector. */}
          <rect
            x={labelAt.x - m.width / 2 - 3}
            y={labelAt.y - m.height / 2 - 1}
            width={m.width + 6}
            height={m.height + 2}
            fill={resolved.background ?? '#ffffff'}
          />
          <RoughText x={labelAt.x} y={labelAt.y} anchor="middle" baseline="middle">
            {edge.label}
          </RoughText>
        </>
      )}
    </g>
  );
}

function DiagramNode({ node, index }: { node: LaidOutNode; index: number }) {
  const seed = index + 1;
  const vibe = node.data.vibe;
  const fill = useResolvedVibe(vibe).background ?? '#ffffff';

  let outline;
  if (node.shape === 'diamond') {
    outline = <RoughPath d={diamondPath(node.x, node.y, node.width, node.height)} fill={fill} vibe={vibe} seed={seed} />;
  } else if (node.shape === 'ellipse') {
    outline = (
      <RoughPath d={ellipsePath(node.x, node.y, node.width / 2, node.height / 2)} fill={fill} vibe={vibe} seed={seed} />
    );
  } else {
    outline = (
      <RoughRectangle
        x={node.x - node.width / 2}
        y={node.y - node.height / 2}
        width={node.width}
        height={node.height}
        fill={fill}
        vibe={vibe}
        seed={seed}
      />
    );
  }

  return (
    <g>
      {outline}
      <RoughText x={node.x} y={node.y} anchor="middle" baseline="middle" vibe={vibe}>
        {node.label}
      </RoughText>
    </g>
  );
}
