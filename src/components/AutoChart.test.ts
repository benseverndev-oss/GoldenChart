import { describe, expect, it } from 'vitest';
import type { ComponentType } from 'react';
import { visualize } from './AutoChart';
import { renderToSVGString } from '../render/renderToString';

const name = (el: ReturnType<typeof visualize>) => (el.type as ComponentType).name;

describe('visualize', () => {
  it('chooses a bar chart for category + measure and renders SVG', () => {
    const el = visualize(
      [
        { region: 'NA', sales: 3 },
        { region: 'EU', sales: 7 },
      ],
      { width: 240, height: 160, bare: true },
    );
    expect(name(el)).toBe('BarChart');
    expect(renderToSVGString(el).startsWith('<svg')).toBe(true);
  });

  it('chooses a line chart for a measure over time', () => {
    const el = visualize(
      [
        { date: '2024-01-01', revenue: 10 },
        { date: '2024-02-01', revenue: 20 },
      ],
      { width: 240, height: 160, bare: true },
    );
    expect(name(el)).toBe('LineChart');
  });

  it('chooses a sankey for flow data', () => {
    const el = visualize([{ source: 'a', target: 'b', value: 5 }], { width: 300, height: 200, bare: true });
    expect(name(el)).toBe('SankeyChart');
  });

  it('forwards width/height/vibe and renders a valid SVG', () => {
    const el = visualize([{ x: 1, y: 2 }, { x: 3, y: 4 }, { x: 5, y: 1 }], {
      width: 300,
      height: 200,
      vibe: 'ink',
      bare: true,
    });
    const svg = renderToSVGString(el);
    expect(svg).toContain('<path');
  });
});
