import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { PieChart } from './PieChart';
import { renderToSVGString } from '../render/renderToString';

describe('PieChart data-gc tagging', () => {
  it('tags each slice with kind/label/value', () => {
    const svg = renderToSVGString(
      createElement(PieChart, {
        width: 200,
        height: 200,
        bare: true,
        data: [
          { label: 'A', value: 3 },
          { label: 'B', value: 7 },
        ],
      } as never),
    );
    expect(svg).toContain('data-gc-mark="slice"');
    expect(svg).toContain('data-gc-label="A"');
    expect(svg).toContain('data-gc-value="7"');
  });
});
