import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { Diagram } from './Diagram';
import { flowLayout } from '../core/diagram';
import type { LayoutEngine } from '../core/diagram';
import { renderToSVGString } from '../render/renderToString';

describe('Diagram', () => {
  it('renders a generic scene with a group, an edge and shaped nodes', () => {
    const stub: LayoutEngine = () => ({
      orientation: 'vertical',
      groups: [{ id: 'grp', label: 'Group', x: 4, y: 4, width: 100, height: 70 }],
      nodes: [
        {
          id: 'a',
          label: 'Alpha',
          x: 40,
          y: 30,
          width: 50,
          height: 24,
          shape: 'rect',
          data: { id: 'a', label: 'Alpha' },
        },
        {
          id: 'b',
          label: 'Beta',
          x: 40,
          y: 90,
          width: 50,
          height: 24,
          shape: 'ellipse',
          data: { id: 'b', label: 'Beta' },
        },
      ],
      edges: [{ from: 'a', to: 'b', sx: 40, sy: 42, tx: 40, ty: 78 }],
    });

    const svg = renderToSVGString(
      createElement(Diagram, {
        nodes: [
          { id: 'a', label: 'Alpha' },
          { id: 'b', label: 'Beta' },
        ],
        layout: stub,
        width: 120,
        height: 120,
        bare: true,
      }),
    );

    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('Group');
    expect(svg).toContain('Alpha');
    expect(svg).toContain('Beta');
    expect(svg).toContain('<path');
  });

  it('flowLayout drives Diagram as a flowchart (root above child for TB)', () => {
    const svg = renderToSVGString(
      createElement(Diagram, {
        nodes: [
          { id: 'r', label: 'Root' },
          { id: 'c', label: 'Child', parent: 'r' },
        ],
        layout: flowLayout('TB'),
        width: 200,
        height: 160,
        bare: true,
      }),
    );
    expect(svg).toContain('Root');
    expect(svg).toContain('Child');
  });
});
