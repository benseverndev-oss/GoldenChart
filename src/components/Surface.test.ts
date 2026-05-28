import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Surface } from './Surface';
import { RoughText } from '../primitives/RoughText';

const bare = (vibe: unknown) =>
  renderToStaticMarkup(
    createElement(
      Surface,
      { width: 100, height: 100, vibe, bare: true } as any,
      createElement(RoughText, { x: 10, y: 10, children: 'hi' } as any),
    ),
  );

describe('Surface', () => {
  it('does not embed @font-face (CSS-only by default)', () => {
    expect(bare('messy_sketch')).not.toContain('@font-face'); // double-quoted family
    expect(bare('pencil')).not.toContain('@font-face'); // single-quoted family
  });

  it('still references the vibe font-family', () => {
    expect(bare('messy_sketch')).toContain('font-family');
  });

  it('paints the brand page colour as the surface background', () => {
    const svg = renderToStaticMarkup(
      createElement(
        Surface,
        { width: 100, height: 100, brand: { page: '#0d1b2a' }, bare: true } as any,
        createElement(RoughText, { x: 10, y: 10, children: 'hi' } as any),
      ),
    );
    expect(svg).toContain('#0d1b2a');
  });

  it('renders a corner logo as an <image> with the given src', () => {
    const svg = renderToStaticMarkup(
      createElement(Surface, {
        width: 200,
        height: 120,
        brand: { logo: { src: 'https://example.com/logo.svg' } },
        bare: true,
      } as any),
    );
    expect(svg).toContain('<image');
    expect(svg).toContain('https://example.com/logo.svg');
  });
});
