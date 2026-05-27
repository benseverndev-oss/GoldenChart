import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Tooltip } from './Tooltip';

describe('Tooltip', () => {
  it('renders a group with the title and a value row', () => {
    const markup = renderToStaticMarkup(
      createElement(Tooltip, {
        mark: { kind: 'bar', index: 0, label: 'Q1', value: 12, cx: 40, cy: 20 },
        x: 50,
        y: 30,
      }),
    );
    expect(markup).toContain('Q1');
    expect(markup).toContain('12');
    expect(markup.startsWith('<g')).toBe(true);
  });
});
