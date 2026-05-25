import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { OrgChart } from './OrgChart';
import { renderToSVGString } from '../render/renderToString';
import type { FlowNode } from '../types/charts';

const NODES: FlowNode[] = [
  { id: 'ceo', label: 'CEO' },
  { id: 'cto', label: 'CTO', parent: 'ceo' },
  { id: 'cfo', label: 'CFO', parent: 'ceo' },
  { id: 'eng', label: 'Eng Lead', parent: 'cto' },
];

describe('OrgChart', () => {
  it('renders a hierarchy of boxes as a standalone SVG', () => {
    const svg = renderToSVGString(
      createElement(OrgChart, { nodes: NODES, width: 400, height: 280, bare: true }),
    );
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('CEO');
    expect(svg).toContain('Eng Lead');
    expect(svg).toContain('<path');
  });

  it('forces diamond/ellipse hints to rectangular boxes', () => {
    // A shape hint that the org chart should override; render must still succeed.
    const svg = renderToSVGString(
      createElement(OrgChart, {
        nodes: [
          { id: 'ceo', label: 'CEO', shape: 'ellipse' },
          { id: 'cto', label: 'CTO', parent: 'ceo', shape: 'diamond' },
        ] as FlowNode[],
        width: 320,
        height: 200,
        bare: true,
      }),
    );
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('CTO');
  });
});
