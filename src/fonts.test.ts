import { describe, expect, it } from 'vitest';
import { fontFaceFor, bundledFontFor, FONT_TTF_BASE64 } from './fonts';

describe('goldenchart/fonts subpath', () => {
  it('re-exports the font data + lookup', () => {
    expect(typeof FONT_TTF_BASE64).toBe('object');
    expect(bundledFontFor("'Caveat', cursive")?.family).toBe('Caveat');
  });

  it('fontFaceFor returns @font-face CSS for a bundled-font vibe', () => {
    const css = fontFaceFor('pencil'); // pencil → Caveat (bundled)
    expect(css).toContain('@font-face');
    expect(css).toContain("font-family:'Caveat'");
  });

  it('fontFaceFor returns undefined for a non-bundled family', () => {
    expect(fontFaceFor({ preset: 'pencil', fontFamily: 'Arial, sans-serif' })).toBeUndefined();
  });
});
