import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { ScatterPlot } from './ScatterPlot';
import { renderToSVGString } from '../render/renderToString';

describe('ScatterPlot data-gc tagging', () => {
  it('tags each point with kind/index/label and a JSON x/y value', () => {
    const svg = renderToSVGString(
      createElement(ScatterPlot, {
        width: 240,
        height: 160,
        bare: true,
        data: [
          { x: 1, y: 2 },
          { x: 3, y: 4, label: 'p2' },
        ],
      } as never),
    );
    expect(svg).toContain('data-gc-mark="point"');
    expect(svg).toContain('data-gc-index="1"');
    expect(svg).toContain('data-gc-label="p2"');
    // renderToStaticMarkup HTML-escapes the quotes inside the JSON value attribute.
    expect(svg).toMatch(/data-gc-value="\{(&quot;|")x(&quot;|"):3/);
  });
});
