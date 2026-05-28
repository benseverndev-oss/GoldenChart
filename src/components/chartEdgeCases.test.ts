import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { BarChart } from './BarChart';
import { PieChart } from './PieChart';
import { ScatterPlot } from './ScatterPlot';
import { LineChart } from './LineChart';
import { AreaChart } from './AreaChart';
import { SankeyChart } from './SankeyChart';
import { TreemapChart } from './TreemapChart';
import { HeatmapChart } from './HeatmapChart';
import { RadarChart } from './RadarChart';
import { renderToSVGString } from '../render/renderToString';

// Degenerate data shouldn't crash the calc/render pipeline or leak NaN/Infinity
// into the SVG. (The NaN-poisons-geometry hang is covered at the unit level in
// core/scales.test.ts and render/roughGenerator.test.ts — rendering a NaN datum
// here would OOM rather than fail cleanly if the primitive guards regressed.)
const renderBar = (data: unknown) =>
  renderToSVGString(createElement(BarChart, { width: 220, height: 140, data, bare: true } as never));

describe('chart edge cases', () => {
  it('BarChart renders empty data as a bare <svg> with no NaN', () => {
    const svg = renderBar([]);
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).not.toMatch(/NaN|Infinity/);
  });

  it('BarChart renders a single datum', () => {
    const svg = renderBar([{ label: 'only', value: 5 }]);
    expect(svg).toContain('<svg');
    expect(svg).not.toMatch(/NaN|Infinity/);
  });

  it('BarChart renders negative values', () => {
    const svg = renderBar([{ label: 'a', value: -4 }, { label: 'b', value: 6 }]);
    expect(svg).not.toMatch(/NaN|Infinity/);
  });

  it('BarChart renders an all-zero series without collapsing', () => {
    const svg = renderBar([{ label: 'a', value: 0 }, { label: 'b', value: 0 }]);
    expect(svg).not.toMatch(/NaN|Infinity/);
  });

  it('PieChart renders empty data and a single slice', () => {
    const empty = renderToSVGString(
      createElement(PieChart, { width: 200, height: 200, data: [], bare: true } as never),
    );
    const single = renderToSVGString(
      createElement(PieChart, { width: 200, height: 200, data: [{ label: 'a', value: 1 }], bare: true } as never),
    );
    expect(empty.startsWith('<svg')).toBe(true);
    expect(single).not.toMatch(/NaN|Infinity/);
  });

  it('ScatterPlot renders empty and single-point data', () => {
    const empty = renderToSVGString(
      createElement(ScatterPlot, { width: 200, height: 160, data: [], bare: true } as never),
    );
    const single = renderToSVGString(
      createElement(ScatterPlot, { width: 200, height: 160, data: [{ x: 1, y: 2 }], bare: true } as never),
    );
    expect(empty.startsWith('<svg')).toBe(true);
    expect(single).not.toMatch(/NaN|Infinity/);
  });
});

// The remaining chart types: same degenerate-data contract — a valid bare <svg>
// with no NaN/Infinity leaking into coordinates — exercised across empty data,
// a single datum, and a flat/all-zero domain (the cases most likely to divide by
// zero or collapse a scale).
describe('chart edge cases — remaining chart types', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const render = (Comp: any, props: Record<string, unknown>): string =>
    renderToSVGString(createElement(Comp, { width: 240, height: 160, bare: true, ...props }));

  const clean = (svg: string) => {
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).not.toMatch(/NaN|Infinity/);
  };

  it('LineChart handles empty, single-point, and flat series', () => {
    clean(render(LineChart, { series: [] }));
    clean(render(LineChart, { series: [{ id: 's', points: [{ x: 0, y: 5 }] }] }));
    clean(render(LineChart, { series: [{ id: 's', points: [{ x: 0, y: 3 }, { x: 1, y: 3 }] }] }));
  });

  it('AreaChart handles empty, single-point, and empty-stacked series', () => {
    clean(render(AreaChart, { series: [] }));
    clean(render(AreaChart, { series: [{ id: 's', points: [{ x: 0, y: 4 }] }] }));
    clean(render(AreaChart, { series: [], stacked: true }));
  });

  it('SankeyChart handles empty, a lone node, and a zero-value link', () => {
    clean(render(SankeyChart, { nodes: [], links: [] }));
    clean(render(SankeyChart, { nodes: [{ id: 'a', label: 'A' }], links: [] }));
    clean(
      render(SankeyChart, {
        nodes: [{ id: 'a' }, { id: 'b' }],
        links: [{ source: 'a', target: 'b', value: 0 }],
      }),
    );
  });

  it('TreemapChart handles empty, root-only, and all-zero values', () => {
    clean(render(TreemapChart, { data: [] }));
    clean(render(TreemapChart, { data: [{ id: 'root' }] }));
    clean(
      render(TreemapChart, {
        data: [
          { id: 'root' },
          { id: 'a', parent: 'root', value: 0 },
          { id: 'b', parent: 'root', value: 0 },
        ],
      }),
    );
  });

  it('HeatmapChart handles empty, a single cell, and uniform values', () => {
    clean(render(HeatmapChart, { data: [] }));
    clean(render(HeatmapChart, { data: [{ x: 'c0', y: 'r0', value: 5 }] }));
    clean(
      render(HeatmapChart, {
        data: [{ x: 'c0', y: 'r0', value: 7 }, { x: 'c1', y: 'r0', value: 7 }],
      }),
    );
  });

  it('RadarChart handles empty series, a single axis, and all-zero values', () => {
    clean(render(RadarChart, { axes: ['A', 'B', 'C'], series: [] }));
    clean(render(RadarChart, { axes: ['A'], series: [{ id: 's', values: [4] }] }));
    clean(render(RadarChart, { axes: ['A', 'B', 'C'], series: [{ id: 's', values: [0, 0, 0] }] }));
  });
});
