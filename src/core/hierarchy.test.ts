import { describe, expect, it } from 'vitest';
import { layoutTree } from './hierarchy';
import type { FlowNode } from '../types/charts';

const nodes: FlowNode[] = [
  { id: 'root', label: 'Root' },
  { id: 'a', label: 'A', parent: 'root' },
  { id: 'b', label: 'B', parent: 'root' },
];

describe('layoutTree', () => {
  it('returns empty layout for no nodes', () => {
    expect(layoutTree([], [100, 100])).toEqual({ nodes: [], edges: [] });
  });

  it('derives edges from parent links when none are given', () => {
    const { edges } = layoutTree(nodes, [200, 100]);
    expect(edges).toHaveLength(2);
  });

  it('places children below the root for TB', () => {
    const { nodes: laid } = layoutTree(nodes, [200, 100], undefined, 'TB');
    const root = laid.find((n) => n.id === 'root')!;
    const child = laid.find((n) => n.id === 'a')!;
    expect(root.y).toBeLessThan(child.y);
  });

  it('places children to the right of the root for LR', () => {
    const { nodes: laid } = layoutTree(nodes, [200, 100], undefined, 'LR');
    const root = laid.find((n) => n.id === 'root')!;
    const child = laid.find((n) => n.id === 'a')!;
    expect(root.x).toBeLessThan(child.x);
  });

  it('defaults node shape to rect', () => {
    const { nodes: laid } = layoutTree(nodes, [200, 100]);
    expect(laid.every((n) => n.shape === 'rect')).toBe(true);
  });
});
