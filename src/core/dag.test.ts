import { describe, expect, it } from 'vitest';
import { layoutDag, layoutFlow } from './dag';
import type { FlowEdge, FlowNode } from '../types/charts';

describe('layoutDag', () => {
  it('returns empty layout for no nodes', () => {
    expect(layoutDag([], [200, 200], [])).toEqual({ nodes: [], edges: [] });
  });

  it('layers a merge (multi-parent) node below both parents', () => {
    const nodes: FlowNode[] = [
      { id: 'a', label: 'A' },
      { id: 'b', label: 'B' },
      { id: 'c', label: 'C' },
    ];
    const edges: FlowEdge[] = [
      { from: 'a', to: 'c' },
      { from: 'b', to: 'c' },
    ];
    const { nodes: laid, edges: laidEdges } = layoutDag(nodes, [300, 200], edges, 'TB');
    const a = laid.find((n) => n.id === 'a')!;
    const b = laid.find((n) => n.id === 'b')!;
    const c = laid.find((n) => n.id === 'c')!;
    expect(c.y).toBeGreaterThan(a.y);
    expect(c.y).toBeGreaterThan(b.y);
    expect(a.y).toBe(b.y); // siblings share a layer
    expect(laidEdges).toHaveLength(2);
  });

  it('places a long edge by longest path, not shortest', () => {
    // a -> b -> c and a -> c: c must sit below b (layer 2), not next to b.
    const nodes: FlowNode[] = [
      { id: 'a', label: 'A' },
      { id: 'b', label: 'B' },
      { id: 'c', label: 'C' },
    ];
    const edges: FlowEdge[] = [
      { from: 'a', to: 'b' },
      { from: 'b', to: 'c' },
      { from: 'a', to: 'c' },
    ];
    const { nodes: laid } = layoutDag(nodes, [300, 300], edges, 'TB');
    const b = laid.find((n) => n.id === 'b')!;
    const c = laid.find((n) => n.id === 'c')!;
    expect(c.y).toBeGreaterThan(b.y);
  });

  it('does not loop on cycles', () => {
    const nodes: FlowNode[] = [
      { id: 'a', label: 'A' },
      { id: 'b', label: 'B' },
    ];
    const edges: FlowEdge[] = [
      { from: 'a', to: 'b' },
      { from: 'b', to: 'a' },
    ];
    const { nodes: laid, edges: laidEdges } = layoutDag(nodes, [200, 200], edges, 'TB');
    expect(laid).toHaveLength(2);
    expect(laidEdges).toHaveLength(2);
  });

  it('separates same-layer slots by at least their width (no abutting)', () => {
    const nodes: FlowNode[] = [
      { id: 'a', label: 'A' },
      { id: 'b', label: 'B' },
      { id: 'c', label: 'C' },
    ];
    const edges: FlowEdge[] = [
      { from: 'a', to: 'c' },
      { from: 'b', to: 'c' },
    ];
    // Tiny canvas: a and b share layer 0 and must not overlap.
    const { nodes: laid } = layoutDag(nodes, [200, 200], edges, 'TB');
    const a = laid.find((n) => n.id === 'a')!;
    const b = laid.find((n) => n.id === 'b')!;
    expect(Math.abs(a.x - b.x)).toBeGreaterThanOrEqual(a.width);
  });

  it('ignores self-loops and edges to unknown nodes', () => {
    const nodes: FlowNode[] = [
      { id: 'a', label: 'A' },
      { id: 'b', label: 'B' },
    ];
    const edges: FlowEdge[] = [
      { from: 'a', to: 'a' },
      { from: 'a', to: 'b' },
      { from: 'a', to: 'ghost' },
    ];
    const { edges: laidEdges } = layoutDag(nodes, [200, 200], edges, 'TB');
    expect(laidEdges).toHaveLength(1);
    expect(laidEdges[0]).toMatchObject({ from: 'a', to: 'b' });
  });
});

describe('layoutFlow dispatch', () => {
  const tree: FlowNode[] = [
    { id: 'root', label: 'Root' },
    { id: 'a', label: 'A', parent: 'root' },
    { id: 'b', label: 'B', parent: 'root' },
  ];

  it('routes a single-root tree through the tidy tree layout', () => {
    const { nodes: laid } = layoutFlow(tree, [200, 100], undefined, 'TB');
    const root = laid.find((n) => n.id === 'root')!;
    const child = laid.find((n) => n.id === 'a')!;
    expect(root.y).toBeLessThan(child.y);
  });

  it('routes a merge graph through the DAG layout', () => {
    const nodes: FlowNode[] = [
      { id: 'a', label: 'A' },
      { id: 'b', label: 'B' },
      { id: 'c', label: 'C' },
    ];
    const edges: FlowEdge[] = [
      { from: 'a', to: 'c' },
      { from: 'b', to: 'c' },
    ];
    const { nodes: laid } = layoutFlow(nodes, [300, 200], edges, 'TB');
    const c = laid.find((n) => n.id === 'c')!;
    const a = laid.find((n) => n.id === 'a')!;
    expect(c.y).toBeGreaterThan(a.y);
  });

  it('routes multiple roots through the DAG layout without throwing', () => {
    const nodes: FlowNode[] = [
      { id: 'r1', label: 'R1' },
      { id: 'r2', label: 'R2' },
      { id: 'j', label: 'Join' },
    ];
    const edges: FlowEdge[] = [
      { from: 'r1', to: 'j' },
      { from: 'r2', to: 'j' },
    ];
    const { nodes: laid } = layoutFlow(nodes, [300, 200], edges, 'TB');
    expect(laid).toHaveLength(3);
  });

  it('builds tree layout from explicit edges when nodes lack a parent', () => {
    const nodes: FlowNode[] = [
      { id: 'root', label: 'Root' },
      { id: 'a', label: 'A' },
    ];
    const edges: FlowEdge[] = [{ from: 'root', to: 'a' }];
    const { nodes: laid } = layoutFlow(nodes, [200, 100], edges, 'TB');
    const root = laid.find((n) => n.id === 'root')!;
    const child = laid.find((n) => n.id === 'a')!;
    expect(root.y).toBeLessThan(child.y);
  });
});
