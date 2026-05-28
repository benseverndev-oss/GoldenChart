import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { Badge } from './Badge';

function render(props: Parameters<typeof Badge>[0]) {
  return renderToStaticMarkup(createElement(Badge, props));
}

describe('Badge', () => {
  it('renders an intrinsic <svg> with measurable width and constant height 26', () => {
    const svg = render({ label: 'stars', value: '42.3k' });
    expect(svg).toMatch(/<svg[^>]+width="\d+"/);
    expect(svg).toMatch(/<svg[^>]+height="26"/);
    expect(svg).toContain('stars');
    expect(svg).toContain('42.3k');
  });
  it('renders the icon glyph when `icon` is set', () => {
    const without = render({ label: 'stars', value: '0' });
    const withIcon = render({ label: 'stars', value: '0', icon: 'star' });
    expect(withIcon.length).toBeGreaterThan(without.length);
  });
  it('uses success color for tone="success" and danger for tone="danger"', () => {
    const ok = render({ label: 'build', value: 'passing', tone: 'success' });
    const bad = render({ label: 'build', value: 'failing', tone: 'danger' });
    expect(ok).toContain('#3a8a3a');
    expect(bad).toContain('#b13a3a');
  });
  it('uses brand palette[0] for tone="neutral"', () => {
    const svg = render({
      label: 'x',
      value: 'y',
      tone: 'neutral',
      brand: { palette: ['#123456', '#abcdef'] },
    });
    expect(svg).toContain('#123456');
  });
  it('produces a stable snapshot for a known input', () => {
    const svg = render({
      label: 'stars',
      value: '42.3k',
      tone: 'info',
      icon: 'star',
      brand: { palette: ['#222', '#0077cc'], font: 'sans-serif' },
      seed: 1,
    });
    expect(svg).toMatchSnapshot();
  });
});
