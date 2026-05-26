// `goldenchart/fonts` — opt-in font bytes + helpers. Kept off the main entry so
// browser consumers only pay for fonts when they explicitly want self-contained
// SVGs. The headless renderer embeds fonts automatically (see src/render).
import type { VibeConfig } from './types/vibe';
import { resolveVibe } from './vibe/resolveVibe';
import { FONT_TTF_BASE64, bundledFontFor, primaryFamily, fontFaceCss } from './assets/fonts';

export { FONT_TTF_BASE64, bundledFontFor, primaryFamily, fontFaceCss };

/**
 * The `@font-face` CSS for a vibe's bundled font, or `undefined` if the vibe
 * uses a system font. Inject the returned string into your document (or an SVG
 * `<style>`) to make a browser-rendered chart self-contained.
 */
export function fontFaceFor(vibe?: VibeConfig): string | undefined {
  const font = bundledFontFor(resolveVibe(vibe).fontFamily);
  return font ? fontFaceCss(font) : undefined;
}
