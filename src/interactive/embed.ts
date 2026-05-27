export interface InteractiveEmbedOptions {
  /** Include the hover-tooltip hydrator. Default `true`. */
  tooltip?: boolean;
  /** Document `<title>`. Default `'GoldenChart'`. */
  title?: string;
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

const TIP_CSS =
  '#gc-tip{position:fixed;display:none;pointer-events:none;background:#111;color:#fff;' +
  'font:12px/1.4 system-ui,sans-serif;padding:4px 8px;border-radius:4px;' +
  'box-shadow:0 1px 4px rgba(0,0,0,.3);z-index:10}';

// Vanilla (no-React) hover-tooltip hydrator. Reads the data-gc-* contract baked
// into the static SVG. Kept free of template literals so it embeds cleanly.
const HYDRATOR =
  '(function(){' +
  "var tip=document.getElementById('gc-tip');" +
  "var root=document.querySelector('svg[data-gc]')||document.querySelector('svg');" +
  'if(!root||!tip)return;' +
  "root.addEventListener('pointermove',function(e){" +
  "var g=e.target.closest&&e.target.closest('[data-gc-mark]');" +
  "if(!g){tip.style.display='none';return;}" +
  "var label=g.getAttribute('data-gc-label')||'';" +
  "var value=g.getAttribute('data-gc-value')||'';" +
  "tip.textContent=label?(label+': '+value):value;" +
  "tip.style.display='block';" +
  "tip.style.left=(e.clientX+12)+'px';" +
  "tip.style.top=(e.clientY+12)+'px';" +
  '});' +
  "root.addEventListener('pointerleave',function(){tip.style.display='none';});" +
  '})();';

/**
 * Wrap a static (already `data-gc-*` tagged) GoldenChart SVG into a
 * self-contained HTML document with a tiny vanilla hover-tooltip hydrator — no
 * React or runtime bundling. Renders identically offline (the SVG carries its
 * own embedded fonts when produced by the headless/server renderer).
 */
export function interactiveEmbed(svg: string, opts: InteractiveEmbedOptions = {}): string {
  const tooltip = opts.tooltip !== false;
  const title = escapeHtml(opts.title ?? 'GoldenChart');
  const head =
    '<!doctype html>\n<html>\n<head>\n<meta charset="utf-8">\n<title>' +
    title +
    '</title>\n' +
    (tooltip ? '<style>' + TIP_CSS + '</style>\n' : '') +
    '</head>\n<body>\n';
  const body = svg + '\n' + (tooltip ? '<div id="gc-tip"></div>\n<script>' + HYDRATOR + '</script>\n' : '');
  return head + body + '</body>\n</html>\n';
}
