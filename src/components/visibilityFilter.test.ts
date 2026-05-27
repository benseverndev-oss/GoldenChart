import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { BarChart } from './BarChart';
import { LineChart } from './LineChart';
import { AreaChart } from './AreaChart';
import { SeriesVisibilityProvider } from './SeriesVisibilityContext';
import { renderToSVGString } from '../render/renderToString';

const hide = (set: string[], el: ReturnType<typeof createElement>) =>
  renderToSVGString(
    createElement(SeriesVisibilityProvider, { value: { hidden: new Set(set), toggle: () => {}, interactive: false } }, el),
  );

describe('charts filter hidden series via SeriesVisibility', () => {
  it('grouped BarChart omits a hidden series', () => {
    const bar = createElement(BarChart, {
      width: 320,
      height: 200,
      bare: true,
      mode: 'grouped',
      data: [{ label: 'Q1', values: { north: 3, south: 5 } }],
    } as never);
    const svg = hide(['south'], bar);
    expect(svg).toContain('data-gc-series="north"');
    expect(svg).not.toContain('data-gc-series="south"');
  });

  it('LineChart omits a hidden series', () => {
    const line = createElement(LineChart, {
      width: 240,
      height: 160,
      bare: true,
      series: [
        { id: 'a', points: [{ x: 0, y: 1 }, { x: 1, y: 2 }] },
        { id: 'b', points: [{ x: 0, y: 3 }, { x: 1, y: 4 }] },
      ],
    } as never);
    const svg = hide(['b'], line);
    expect(svg).toContain('data-gc-series="a"');
    expect(svg).not.toContain('data-gc-series="b"');
  });

  it('AreaChart omits a hidden series', () => {
    const area = createElement(AreaChart, {
      width: 240,
      height: 160,
      bare: true,
      series: [
        { id: 'a', points: [{ x: 0, y: 1 }, { x: 1, y: 2 }] },
        { id: 'b', points: [{ x: 0, y: 3 }, { x: 1, y: 4 }] },
      ],
    } as never);
    const svg = hide(['b'], area);
    expect(svg).toContain('data-gc-series="a"');
    expect(svg).not.toContain('data-gc-series="b"');
  });
});
