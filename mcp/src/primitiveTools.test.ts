import { describe, expect, it } from 'vitest';
import { primitiveTools } from './primitiveTools';

const byName = (name: string) => primitiveTools.find((t) => t.name === name)!;
const viewport = { width: 120, height: 120 };

describe('primitive render tools', () => {
  it('registers all five primitives', () => {
    expect(primitiveTools.map((t) => t.name).sort()).toEqual(
      [
        'render_rough_circle',
        'render_rough_line',
        'render_rough_path',
        'render_rough_rect',
        'render_rough_text',
      ].sort(),
    );
  });

  it('render_rough_path renders a standalone SVG with a path', async () => {
    const res = await byName('render_rough_path').handler({ viewport, d: 'M10,10 L100,100' });
    const svg = res.content[0].text;
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('<path');
    expect(svg).toMatchSnapshot();
  });

  it('render_rough_rect honors a vibe override', async () => {
    const res = await byName('render_rough_rect').handler({
      viewport,
      x: 10,
      y: 10,
      width: 80,
      height: 60,
      fill: '#fde68a',
      vibe: 'chaotic_notebook',
    });
    const svg = res.content[0].text;
    expect(svg).toContain('<path');
    expect(svg).toMatchSnapshot();
  });

  it('render_rough_text includes the label text', async () => {
    const res = await byName('render_rough_text').handler({ viewport, x: 60, y: 60, text: 'hi there' });
    const svg = res.content[0].text;
    expect(svg).toContain('hi there');
    expect(svg).toMatchSnapshot();
  });

  it('render_rough_circle renders a standalone SVG with a path', async () => {
    const res = await byName('render_rough_circle').handler({ viewport, cx: 60, cy: 60, diameter: 80 });
    const svg = res.content[0].text;
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('<path');
    expect(svg).toMatchSnapshot();
  });

  it('render_rough_line renders a standalone SVG with a path', async () => {
    const res = await byName('render_rough_line').handler({ viewport, x1: 10, y1: 10, x2: 100, y2: 100 });
    const svg = res.content[0].text;
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('<path');
    expect(svg).toMatchSnapshot();
  });
});
