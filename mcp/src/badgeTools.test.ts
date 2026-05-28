import { describe, it, expect } from 'vitest';
import { renderBadgeTool } from './badgeTools';

describe('render-badge', () => {
  it('produces a stable SVG for a known input', async () => {
    const res = await renderBadgeTool.handler({
      label: 'stars', value: '42.3k', tone: 'info', icon: 'star',
      brand: { palette: ['#222', '#0077cc'], font: 'sans-serif' },
      seed: 1,
    });
    const svg = (res.content[0] as { text: string }).text;
    expect(svg).toMatchSnapshot();
  });
});
