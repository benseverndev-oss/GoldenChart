import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { BarChart } from './BarChart';
import { LineChart } from './LineChart';
import { AreaChart } from './AreaChart';
import { PieChart } from './PieChart';
import { ScatterPlot } from './ScatterPlot';

const BAR_DATA = [
  { label: 'Q1', value: 12 },
  { label: 'Q2', value: 19 },
];
const SERIES_DATA = [
  {
    id: 'a',
    points: [
      { x: 0, y: 1 },
      { x: 1, y: 5 },
    ],
  },
];
const PIE_DATA = [
  { label: 'A', value: 10 },
  { label: 'B', value: 20 },
];
const SCATTER_DATA = [
  { x: 0, y: 0 },
  { x: 1, y: 1 },
];

const render = (el: ReturnType<typeof createElement>) => renderToStaticMarkup(el);

describe('a11y: chart SVGs expose role/title/desc', () => {
  it('BarChart emits role=img and a fallback <desc> from data when description is omitted', () => {
    const svg = render(
      createElement(BarChart, { width: 200, height: 100, data: BAR_DATA, bare: true } as any),
    );
    expect(svg).toContain('role="img"');
    expect(svg).toMatch(/<desc>Bar chart with 2 categories, values from 12 to 19\.<\/desc>/);
  });

  it('BarChart respects an explicit description over the fallback', () => {
    const svg = render(
      createElement(BarChart, {
        width: 200,
        height: 100,
        data: BAR_DATA,
        title: 'Sales',
        description: 'Quarterly sales for FY26.',
        bare: true,
      } as any),
    );
    expect(svg).toContain('<title>Sales</title>');
    expect(svg).toContain('<desc>Quarterly sales for FY26.</desc>');
  });

  it('LineChart emits a series-aware fallback description', () => {
    const svg = render(
      createElement(LineChart, {
        width: 200,
        height: 100,
        series: SERIES_DATA,
        bare: true,
      } as any),
    );
    expect(svg).toMatch(
      /<desc>Line chart with 1 series and 2 points, y values from 1 to 5\.<\/desc>/,
    );
  });

  it('AreaChart fallback labels itself as Area', () => {
    const svg = render(
      createElement(AreaChart, {
        width: 200,
        height: 100,
        series: SERIES_DATA,
        bare: true,
      } as any),
    );
    expect(svg).toMatch(/<desc>Area chart with /);
  });

  it('PieChart fallback describes slice count and total', () => {
    const svg = render(
      createElement(PieChart, {
        width: 200,
        height: 200,
        data: PIE_DATA,
        bare: true,
      } as any),
    );
    expect(svg).toContain('<desc>Pie chart with 2 slices totaling 30.</desc>');
  });

  it('ScatterPlot fallback describes point count', () => {
    const svg = render(
      createElement(ScatterPlot, {
        width: 200,
        height: 100,
        data: SCATTER_DATA,
        bare: true,
      } as any),
    );
    expect(svg).toContain('<desc>Scatter plot with 2 points.</desc>');
  });

  it('aria-label falls back to title when ariaLabel is omitted', () => {
    const svg = render(
      createElement(BarChart, {
        width: 200,
        height: 100,
        data: BAR_DATA,
        title: 'Revenue',
        bare: true,
      } as any),
    );
    expect(svg).toContain('aria-label="Revenue"');
  });
});
