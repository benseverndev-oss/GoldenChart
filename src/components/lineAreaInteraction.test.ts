import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { LineChart } from './LineChart';
import { AreaChart } from './AreaChart';
import { renderToSVGString } from '../render/renderToString';

const series = [{ id: 's1', points: [{ x: 0, y: 1 }, { x: 1, y: 3 }] }];

describe('Line/Area hit layer', () => {
  it('LineChart emits transparent tagged hit circles per point', () => {
    const svg = renderToSVGString(createElement(LineChart, { width: 240, height: 160, bare: true, series } as never));
    expect(svg).toContain('data-gc-mark="point"');
    expect(svg).toContain('data-gc-series="s1"');
    expect(svg).toContain('fill="transparent"');
  });

  it('AreaChart emits transparent tagged hit circles per point', () => {
    const svg = renderToSVGString(createElement(AreaChart, { width: 240, height: 160, bare: true, series } as never));
    expect(svg).toContain('data-gc-mark="point"');
    expect(svg).toContain('data-gc-series="s1"');
  });
});
