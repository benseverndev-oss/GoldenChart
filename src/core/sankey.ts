import { assignLayers } from './dag';

/**
 * Weighted flow-diagram layout. Reuses the longest-path layering from the DAG
 * engine (`assignLayers`), sizes nodes by throughput, and stacks proportional
 * link ribbons on each node edge. Pure geometry — pixel coordinates + ribbon
 * path strings, ready for the renderer.
 */

export interface SankeyNodeInput {
  id: string;
  label?: string;
  color?: string;
}

export interface SankeyLinkInput {
  source: string;
  target: string;
  value: number;
}

export type SankeyOrientation = 'LR' | 'TB';

export interface SankeyLaidNode {
  id: string;
  label?: string;
  color?: string;
  x: number;
  y: number;
  width: number;
  height: number;
  value: number;
}

export interface SankeyLaidLink {
  source: string;
  target: string;
  value: number;
  width: number;
  path: string;
  color?: string;
}

export interface SankeyLayout {
  nodes: SankeyLaidNode[];
  links: SankeyLaidLink[];
}

export interface SankeyOptions {
  direction?: SankeyOrientation;
  nodeWidth?: number;
  nodePadding?: number;
}

interface Band {
  s0: number;
  t0: number;
  w: number;
}

function ribbonPath(s: SankeyLaidNode, t: SankeyLaidNode, band: Band, horizontal: boolean): string {
  if (horizontal) {
    const sx = s.x + s.width;
    const tx = t.x;
    const sy0 = band.s0;
    const sy1 = band.s0 + band.w;
    const ty0 = band.t0;
    const ty1 = band.t0 + band.w;
    const mid = (sx + tx) / 2;
    return (
      `M${sx},${sy0} C${mid},${sy0} ${mid},${ty0} ${tx},${ty0} ` +
      `L${tx},${ty1} C${mid},${ty1} ${mid},${sy1} ${sx},${sy1} Z`
    );
  }
  const sy = s.y + s.height;
  const ty = t.y;
  const sx0 = band.s0;
  const sx1 = band.s0 + band.w;
  const tx0 = band.t0;
  const tx1 = band.t0 + band.w;
  const mid = (sy + ty) / 2;
  return (
    `M${sx0},${sy} C${sx0},${mid} ${tx0},${mid} ${tx0},${ty} ` +
    `L${tx1},${ty} C${tx1},${mid} ${sx1},${mid} ${sx1},${sy} Z`
  );
}

const pushTo = <T>(map: Map<string, T[]>, key: string, value: T): void => {
  const list = map.get(key);
  if (list) list.push(value);
  else map.set(key, [value]);
};

export function computeSankey(
  nodes: SankeyNodeInput[],
  links: SankeyLinkInput[],
  size: [number, number],
  opts: SankeyOptions = {},
): SankeyLayout {
  if (nodes.length === 0) return { nodes: [], links: [] };

  const direction = opts.direction ?? 'LR';
  const nodeWidth = opts.nodeWidth ?? 16;
  const nodePadding = opts.nodePadding ?? 12;
  const [width, height] = size;
  const horizontal = direction === 'LR';
  const depthExtent = horizontal ? width : height;
  const breadthExtent = horizontal ? height : width;

  const ids = new Set(nodes.map((n) => n.id));
  const valid = links.filter(
    (l) => ids.has(l.source) && ids.has(l.target) && l.source !== l.target && l.value > 0,
  );

  const layer = assignLayers(
    nodes.map((n) => n.id),
    valid.map((l) => ({ from: l.source, to: l.target })),
  );
  const maxLayer = Math.max(...nodes.map((n) => layer.get(n.id)!));

  const inSum = new Map<string, number>();
  const outSum = new Map<string, number>();
  for (const l of valid) {
    outSum.set(l.source, (outSum.get(l.source) ?? 0) + l.value);
    inSum.set(l.target, (inSum.get(l.target) ?? 0) + l.value);
  }
  const throughput = (id: string) => Math.max(inSum.get(id) ?? 0, outSum.get(id) ?? 0, 0);

  const byLayer: string[][] = Array.from({ length: maxLayer + 1 }, () => []);
  for (const n of nodes) byLayer[layer.get(n.id)!].push(n.id);

  // Value→pixel scale so the densest layer fits the breadth axis.
  let scale = Infinity;
  for (const layerIds of byLayer) {
    const sum = layerIds.reduce((s, id) => s + throughput(id), 0);
    const avail = breadthExtent - Math.max(0, layerIds.length - 1) * nodePadding;
    if (sum > 0) scale = Math.min(scale, avail / sum);
  }
  if (!Number.isFinite(scale) || scale <= 0) scale = 1;

  const nodeById = new Map(nodes.map((n) => [n.id, n]));
  const laid = new Map<string, SankeyLaidNode>();
  byLayer.forEach((layerIds, l) => {
    const thicknessOf = (id: string) => Math.max(throughput(id) * scale, 2);
    const total =
      layerIds.reduce((s, id) => s + thicknessOf(id), 0) +
      Math.max(0, layerIds.length - 1) * nodePadding;
    let cursor = (breadthExtent - total) / 2;
    const depthPos =
      maxLayer === 0 ? (depthExtent - nodeWidth) / 2 : (l / maxLayer) * (depthExtent - nodeWidth);
    for (const id of layerIds) {
      const node = nodeById.get(id)!;
      const thickness = thicknessOf(id);
      laid.set(id, {
        id,
        label: node.label,
        color: node.color,
        value: throughput(id),
        x: horizontal ? depthPos : cursor,
        y: horizontal ? cursor : depthPos,
        width: horizontal ? nodeWidth : thickness,
        height: horizontal ? thickness : nodeWidth,
      });
      cursor += thickness + nodePadding;
    }
  });

  const breadthCenter = (id: string) => {
    const n = laid.get(id)!;
    return horizontal ? n.y + n.height / 2 : n.x + n.width / 2;
  };

  const outgoing = new Map<string, SankeyLinkInput[]>();
  const incoming = new Map<string, SankeyLinkInput[]>();
  for (const l of valid) {
    pushTo(outgoing, l.source, l);
    pushTo(incoming, l.target, l);
  }
  outgoing.forEach((list) =>
    list.sort((a, b) => breadthCenter(a.target) - breadthCenter(b.target)),
  );
  incoming.forEach((list) =>
    list.sort((a, b) => breadthCenter(a.source) - breadthCenter(b.source)),
  );

  const bands = new Map<SankeyLinkInput, Band>();
  outgoing.forEach((list, src) => {
    const node = laid.get(src)!;
    let c = horizontal ? node.y : node.x;
    for (const l of list) {
      const w = l.value * scale;
      bands.set(l, { s0: c, t0: 0, w });
      c += w;
    }
  });
  incoming.forEach((list, tgt) => {
    const node = laid.get(tgt)!;
    let c = horizontal ? node.y : node.x;
    for (const l of list) {
      bands.get(l)!.t0 = c;
      c += bands.get(l)!.w;
    }
  });

  const laidLinks: SankeyLaidLink[] = valid.map((l) => {
    const s = laid.get(l.source)!;
    const t = laid.get(l.target)!;
    const band = bands.get(l)!;
    return {
      source: l.source,
      target: l.target,
      value: l.value,
      width: band.w,
      path: ribbonPath(s, t, band, horizontal),
      color: s.color,
    };
  });

  return { nodes: Array.from(laid.values()), links: laidLinks };
}
