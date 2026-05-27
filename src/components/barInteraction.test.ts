import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { BarChart } from './BarChart';
import { renderToSVGString } from '../render/renderToString';

describe('BarChart data-gc tagging', () => {
  it('tags each bar with kind/index/label/value', () => {
    const svg = renderToSVGString(
      createElement(BarChart, {
        width: 240,
        height: 160,
        bare: true,
        data: [
          { label: 'Q1', value: 12 },
          { label: 'Q2', value: 19 },
        ],
      } as never),
    );
    expect(svg).toContain('data-gc-mark="bar"');
    expect(svg).toContain('data-gc-label="Q1"');
    expect(svg).toContain('data-gc-value="12"');
    expect(svg).toContain('data-gc-index="1"');
  });

  it('tags grouped bars with their series key', () => {
    const svg = renderToSVGString(
      createElement(BarChart, {
        width: 320,
        height: 200,
        bare: true,
        mode: 'grouped',
        data: [
          { label: 'Q1', values: { north: 3, south: 5 } },
          { label: 'Q2', values: { north: 7, south: 2 } },
        ],
      } as never),
    );
    expect(svg).toContain('data-gc-series="north"');
    expect(svg).toContain('data-gc-series="south"');
  });
});
