import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Surface } from './Surface';
import { RoughText } from '../primitives/RoughText';

const bare = (vibe: unknown) =>
  renderToStaticMarkup(
    createElement(Surface, { width: 100, height: 100, vibe, bare: true } as any,
      createElement(RoughText, { x: 10, y: 10, children: 'hi' } as any)),
  );

describe('Surface', () => {
  it('does not embed @font-face (CSS-only by default)', () => {
    expect(bare('messy_sketch')).not.toContain('@font-face');
  });

  it('still references the vibe font-family', () => {
    expect(bare('messy_sketch')).toContain('font-family');
  });
});
