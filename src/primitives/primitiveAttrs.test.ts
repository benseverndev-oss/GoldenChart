import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { RoughRectangle } from './RoughRectangle';

describe('primitive dataAttrs passthrough', () => {
  it('spreads data-* attributes onto the rendered group', () => {
    const markup = renderToStaticMarkup(
      createElement(RoughRectangle, {
        x: 0,
        y: 0,
        width: 10,
        height: 10,
        dataAttrs: { 'data-gc-mark': 'bar', 'data-gc-index': '0' },
      }),
    );
    expect(markup.startsWith('<g')).toBe(true);
    expect(markup).toContain('data-gc-mark="bar"');
    expect(markup).toContain('data-gc-index="0"');
  });
});
