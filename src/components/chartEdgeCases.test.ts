import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { BarChart } from './BarChart';
import { PieChart } from './PieChart';
import { ScatterPlot } from './ScatterPlot';
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
