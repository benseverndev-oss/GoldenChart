import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { ChoroplethMap } from './ChoroplethMap';

const render = (props: Record<string, unknown>) =>
  renderToStaticMarkup(
    createElement(ChoroplethMap, { width: 960, height: 600, bare: true, ...props } as any),
  );

describe('ChoroplethMap', () => {
  it('renders a bare svg with region paths', () => {
    const svg = render({
      data: [
        { region: 'CA', value: 10 },
        { region: 'TX', value: 5 },
      ],
    });
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('<path');
    expect(svg).not.toContain('<div');
  });

  it('shades higher values differently from lower ones', () => {
    const svg = render({
      data: [
        { region: 'CA', value: 100 },
        { region: 'TX', value: 0 },
      ],
      colorScale: 'blues',
    });
    const fills = new Set(svg.match(/fill="(#[0-9a-fA-F]{6})"/g) || []);
    expect(fills.size).toBeGreaterThan(1);
  });
});
