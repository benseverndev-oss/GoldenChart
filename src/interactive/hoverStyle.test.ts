import { describe, expect, it } from 'vitest';
import { HOVER_ATTR, CURRENT_ATTR, hoverCss } from './hoverStyle';

describe('hoverCss', () => {
  it('dims non-current marks only while a hover is active', () => {
    const css = hoverCss();
    expect(HOVER_ATTR).toBe('data-gc-hover');
    expect(CURRENT_ATTR).toBe('data-gc-current');
    expect(css).toContain(`[${HOVER_ATTR}] [data-gc-mark]:not([${CURRENT_ATTR}])`);
    expect(css).toContain('opacity');
  });
});
