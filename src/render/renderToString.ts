import { renderToStaticMarkup } from 'react-dom/server';
import type { ReactElement } from 'react';

/**
 * Render a GoldenChart element to a standalone SVG string — no DOM, no browser.
 * This is the seam the MCP server and any server-side export build on.
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
  return markup;
}
