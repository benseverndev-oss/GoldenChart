import { describe, expect, it } from 'vitest';
import { calcTools } from './calcTools';
import { primitiveTools } from './primitiveTools';

describe('calc -> render composition', () => {
  it('feeds compute_line_path output into render_rough_path', async () => {
    const calc = await calcTools
      .find((t) => t.name === 'compute_line_path')!
      .handler({
        points: [
          { x: 0, y: 0 },
          { x: 50, y: 40 },
          { x: 100, y: 10 },
        ],
        curve: 'catmullRom',
      });
    const { d } = calc.structuredContent as { d: string };

    const render = await primitiveTools
      .find((t) => t.name === 'render_rough_path')!
      .handler({
        viewport: { width: 120, height: 60 },
        d,
        fill: null,
      });
    const svg = render.content[0].text;
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('<path');
  });
});
