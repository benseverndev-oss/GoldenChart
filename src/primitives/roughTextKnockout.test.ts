import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { RoughText } from './RoughText';

/**
 * Knockout = a solid background-coloured rect painted behind the glyphs, so a
 * line crossing the whole label (sequence lifelines, ER/arch edges) gets a
 * clean continuous break instead of the gappy per-glyph halo. #140.
 */
describe('RoughText knockout', () => {
  it('paints no rect by default', () => {
    const markup = renderToStaticMarkup(
      createElement(RoughText, { x: 50, y: 20, children: 'send()' }),
    );
    expect(markup).not.toContain('<rect');
  });

  it('paints a solid rect behind the text when knockout is set', () => {
    const markup = renderToStaticMarkup(
      createElement(RoughText, { x: 50, y: 20, children: 'send()', knockout: '#ffffff' }),
    );
    expect(markup).toContain('<rect');
    // Filled with the knockout colour, no stroke — a solid break, not an outline.
    expect(markup).toContain('fill="#ffffff"');
  });

  it('falls back to the resolved vibe background when knockout is `true`', () => {
    // The default vibe resolves to a non-empty background, so a bare `knockout`
    // flag should still paint a rect (no explicit colour needed).
    const markup = renderToStaticMarkup(
      createElement(RoughText, { x: 50, y: 20, children: 'reply', knockout: true }),
    );
    expect(markup).toContain('<rect');
  });
});
