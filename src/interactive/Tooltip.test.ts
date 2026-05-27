import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Tooltip } from './Tooltip';

describe('Tooltip', () => {
  it('renders a group with the title and a value row', () => {
    const markup = renderToStaticMarkup(
      createElement(Tooltip, {
        mark: { kind: 'bar', index: 0, label: 'Q1', value: 12, cx: 40, cy: 20 },
        anchor: { x: 50, y: 30 },
        bounds: { width: 400, height: 300 },
      }),
    );
    expect(markup).toContain('Q1');
    expect(markup).toContain('12');
    expect(markup.startsWith('<g')).toBe(true);
  });

  it('flips to stay inside the bounds when anchored near the far edge', () => {
    const markup = renderToStaticMarkup(
      createElement(Tooltip, {
        mark: { kind: 'bar', index: 0, label: 'Q1', value: 12, cx: 40, cy: 20 },
        anchor: { x: 398, y: 298 },
        bounds: { width: 400, height: 300 },
      }),
    );
    // Placed up-and-left of the anchor, so the translate is well inside the box.
    const m = markup.match(/translate\(([-\d.]+), ([-\d.]+)\)/);
    expect(m).not.toBeNull();
    expect(Number(m![1])).toBeLessThan(398);
    expect(Number(m![2])).toBeLessThan(298);
  });
});
