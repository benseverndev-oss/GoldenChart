import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { MindMap } from './MindMap';
import { radialLayout } from '../core/radial';
import { renderToSVGString } from '../render/renderToString';
import type { FlowNode } from '../types/charts';

const NODES: FlowNode[] = [
  { id: 'root', label: 'Idea' },
  { id: 'a', label: 'Branch A', parent: 'root' },
  { id: 'b', label: 'Branch B', parent: 'root' },
  { id: 'a1', label: 'Leaf A1', parent: 'a' },
  { id: 'a2', label: 'Leaf A2', parent: 'a' },
];

describe('radialLayout', () => {
  it('centres the root and fans children onto an outer ring', () => {
    const scene = radialLayout()(NODES, undefined, [300, 300]);
    const root = scene.nodes.find((n) => n.id === 'root')!;
    expect(root.x).toBeCloseTo(150);
    expect(root.y).toBeCloseTo(150);

    const dist = (id: string) => {
      const n = scene.nodes.find((m) => m.id === id)!;
      return Math.hypot(n.x - 150, n.y - 150);
    };
    // Children sit further out than the root, grandchildren further still.
    expect(dist('a')).toBeGreaterThan(1);
    expect(dist('a1')).toBeGreaterThan(dist('a'));
    // Every edge carries straight spoke waypoints.
    expect(scene.edges.every((e) => e.points?.length === 2)).toBe(true);
  });
});

describe('MindMap', () => {
  it('renders a standalone SVG with node labels', () => {
    const svg = renderToSVGString(
      createElement(MindMap, { nodes: NODES, width: 320, height: 320, bare: true }),
    );
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('Idea');
    expect(svg).toContain('Branch A');
    expect(svg).toContain('<path');
  });
});
