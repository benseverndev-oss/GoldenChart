import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactElement } from 'react';
import { bundledFontFor, fontFaceCss } from '../assets/fonts';

const FONT_FAMILY_ATTR = /font-family="([^"]*)"/g;

/** Decode the HTML entities `renderToStaticMarkup` puts in attribute values. */
function decodeEntities(value: string): string {
  return value.replace(/&quot;/g, '"').replace(/&#x27;|&#39;/g, "'").replace(/&amp;/g, '&');
}

/**
 * Build a single deduped, sorted `<style>` of `@font-face` rules for every
 * bundled family the markup references. Sorted by family for deterministic
 * output (stable snapshots). Returns '' when no bundled family is used.
 */
function embeddedFontFaces(markup: string): string {
  const byFamily = new Map<string, string>();
  for (const match of markup.matchAll(FONT_FAMILY_ATTR)) {
    const font = bundledFontFor(decodeEntities(match[1]));
    if (font && !byFamily.has(font.family)) byFamily.set(font.family, fontFaceCss(font));
  }
  if (byFamily.size === 0) return '';
  const rules = [...byFamily.keys()].sort().map((f) => byFamily.get(f)!).join('');
  return `<style>${rules}</style>`;
}

/**
 * Render a GoldenChart element to a standalone SVG string — no DOM, no browser.
 * This is the seam the MCP server and any server-side export build on. The
 * vibe's font is embedded as `@font-face` so the SVG renders identically in a
 * headless rasterizer with no installed/network fonts.
 *
 * The element must render a bare `<svg>` root (pass `bare` to the chart or
 * `Surface`); otherwise the Tailwind wrapper `<div>` leaks into the output.
 */
export function renderToSVGString(element: ReactElement): string {
  const markup = renderToStaticMarkup(element);
  if (!markup.startsWith('<svg')) {
    throw new Error(
      'renderToSVGString expected a bare <svg> root. Pass `bare` to the chart or Surface.',
    );
  }
  const fonts = embeddedFontFaces(markup);
  if (!fonts) return markup;
  const tagEnd = markup.indexOf('>') + 1; // end of the opening <svg ...> tag
  return markup.slice(0, tagEnd) + fonts + markup.slice(tagEnd);
}
