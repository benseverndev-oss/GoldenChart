import { describe, expect, it } from 'vitest';
import { fontFaceCss } from './fonts';

describe('fontFaceCss', () => {
  it('builds the exact @font-face rule used today', () => {
    const css = fontFaceCss({ family: 'Caveat', ttfBase64: 'QUJD' });
    expect(css).toBe(
      "@font-face{font-family:'Caveat';font-style:normal;font-weight:400;" +
        "src:url(data:font/ttf;base64,QUJD) format('truetype');}",
    );
  });
});
