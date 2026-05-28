import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { ArchitectureDiagram } from './ArchitectureDiagram';
import { architectureLayout } from '../core/architecture';
import { renderToSVGString } from '../render/renderToString';
import type { FlowEdge, FlowNode } from '../types/charts';

const NODES: FlowNode[] = [
  { id: 'web', label: 'Web', group: 'Frontend' },
  { id: 'api', label: 'API', group: 'Backend' },
  { id: 'worker', label: 'Worker', group: 'Backend' },
  { id: 'db', label: 'Database', group: 'Data' },
];

const EDGES: FlowEdge[] = [
  { from: 'web', to: 'api' },
  { from: 'api', to: 'db' },
  { from: 'worker', to: 'db' },
];

describe('architectureLayout', () => {
  it('builds zone containers and routes every edge with waypoints', () => {
    const scene = architectureLayout('TB')(NODES, EDGES, [480, 320]);
    expect(scene.nodes).toHaveLength(4);
    // One container per distinct group.
    expect(new Set(scene.groups?.map((g) => g.id))).toEqual(
      new Set(['Frontend', 'Backend', 'Data']),
    );
    // Every edge is an orthogonal polyline (>= 2 waypoints, axis-aligned).
    for (const e of scene.edges) {
      expect(e.points && e.points.length >= 2).toBe(true);
      const pts = e.points!;
      expect(pts.slice(1).every((p, i) => p.x === pts[i].x || p.y === pts[i].y)).toBe(true);
    }
  });
});

describe('ArchitectureDiagram', () => {
  it('renders nodes, zone labels and connectors as standalone SVG', () => {
    const svg = renderToSVGString(
      createElement(ArchitectureDiagram, {
        nodes: NODES,
        edges: EDGES,
        width: 480,
        height: 320,
        bare: true,
      }),
    );
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('Database');
    expect(svg).toContain('Frontend');
    expect(svg).toContain('<path');
  });
});
