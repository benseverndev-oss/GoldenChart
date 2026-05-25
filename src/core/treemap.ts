import { stratify, treemap, treemapBinary, treemapDice, treemapSlice, treemapSquarify } from 'd3-hierarchy';
import type { HierarchyRectangularNode } from 'd3-hierarchy';

type TileFn = (node: HierarchyRectangularNode<TreemapDatum>, x0: number, y0: number, x1: number, y1: number) => void;

/**
 * Treemap layout via d3-hierarchy (already a dependency). Pure: takes a flat
 * parent-linked list, returns leaf rectangles. The renderer tiles them with
 * `<RoughRectangle>`.
 */

export interface TreemapDatum {
  id: string;
  parent?: string;
  value?: number;
  label?: string;
  color?: string;
}

export type TreemapTile = 'squarify' | 'binary' | 'slice' | 'dice';

export interface TreemapLeaf {
  id: string;
  label?: string;
  color?: string;
  groupId: string;
  x0: number;
  y0: number;
  x1: number;
  y1: number;
  value: number;
  depth: number;
  datum: TreemapDatum;
}

export interface TreemapOptions {
  padding?: number;
  tile?: TreemapTile;
}

const TILES: Record<TreemapTile, TileFn> = {
  squarify: treemapSquarify,
  binary: treemapBinary,
  slice: treemapSlice,
  dice: treemapDice,
};

export function computeTreemap(
  data: TreemapDatum[],
  size: [number, number],
  opts: TreemapOptions = {},
): TreemapLeaf[] {
  if (data.length === 0) return [];

  const root = stratify<TreemapDatum>()
    .id((d) => d.id)
    .parentId((d) => d.parent)(data);
  root.sum((d) => Math.max(0, d.value ?? 0));

  const laid = treemap<TreemapDatum>()
    .tile(TILES[opts.tile ?? 'squarify'])
    .size(size)
    .paddingInner(opts.padding ?? 1)(root);

  return laid.leaves().map((leaf) => {
    const group = leaf.ancestors().find((a) => a.depth === 1) ?? leaf;
    return {
      id: leaf.data.id,
      label: leaf.data.label,
      color: leaf.data.color,
      groupId: group.data.id,
      x0: leaf.x0,
      y0: leaf.y0,
      x1: leaf.x1,
      y1: leaf.y1,
      value: leaf.value ?? 0,
      depth: leaf.depth,
      datum: leaf.data,
    };
  });
}
