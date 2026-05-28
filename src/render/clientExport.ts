/**
 * Browser-side export helpers: serialize a live `<svg>` to a string, rasterize
 * it to a PNG blob, trigger a download, or copy it to the clipboard.
 *
 * No font embedding: the browser is already painting the chart, so any font
 * the consumer has loaded via CSS will be present. For standalone SVGs that
 * must render with no font installed, use `goldenchart/server`'s
 * `renderToSVGString` instead — that path embeds `@font-face` rules.
 */

export type ExportFormat = 'svg' | 'png';

export interface ToPngOptions {
  /** Pixel-density multiplier for the rasterised image. Default 2. */
  scale?: number;
  /** Override the output width (px). Defaults to the SVG's viewport width. */
  width?: number;
  /** Override the output height (px). Defaults to the SVG's viewport height. */
  height?: number;
  /** Solid background colour painted under the SVG. Default: transparent. */
  background?: string;
}

export interface DownloadOptions extends ToPngOptions {
  /** File name *without* extension; the format's extension is appended. */
  filename: string;
  format: ExportFormat;
}

const SVG_NS = 'http://www.w3.org/2000/svg';

/** Returns the SVG string for a live `<svg>` element (no font embedding). */
export function toSvgString(svg: SVGSVGElement): string {
  const clone = svg.cloneNode(true) as SVGSVGElement;
  if (!clone.getAttribute('xmlns')) clone.setAttribute('xmlns', SVG_NS);
  return new XMLSerializer().serializeToString(clone);
}

/** Default size for a rasterised SVG; honours `width`/`height` attrs or viewBox. */
export function svgPixelSize(svg: SVGSVGElement): { width: number; height: number } {
  const widthAttr = svg.getAttribute('width');
  const heightAttr = svg.getAttribute('height');
  const w = widthAttr ? Number.parseFloat(widthAttr) : NaN;
  const h = heightAttr ? Number.parseFloat(heightAttr) : NaN;
  if (Number.isFinite(w) && Number.isFinite(h)) return { width: w, height: h };
  const vb = svg.getAttribute('viewBox');
  if (vb) {
    const parts = vb.split(/\s+/).map(Number);
    if (parts.length === 4 && parts.every(Number.isFinite)) {
      return { width: parts[2], height: parts[3] };
    }
  }
  const bbox = svg.getBoundingClientRect();
  return { width: bbox.width, height: bbox.height };
}

/** File extension for an export format (no leading dot). */
export function extensionFor(format: ExportFormat): string {
  return format;
}

/** MIME type for an export format. */
export function mimeFor(format: ExportFormat): string {
  return format === 'svg' ? 'image/svg+xml' : 'image/png';
}

/** Rasterises an SVG to a PNG blob via an off-DOM `<canvas>`. */
export async function toPng(svg: SVGSVGElement, opts: ToPngOptions = {}): Promise<Blob> {
  const { scale = 2, background } = opts;
  const { width: nativeWidth, height: nativeHeight } = svgPixelSize(svg);
  const width = opts.width ?? nativeWidth;
  const height = opts.height ?? nativeHeight;
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new Error('toPng: could not determine SVG pixel size');
  }

  const svgBlob = new Blob([toSvgString(svg)], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(svgBlob);
  try {
    const image = await loadImage(url);
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('toPng: 2d canvas context unavailable');
    if (background) {
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob((blob) => {
        if (blob) resolve(blob);
        else reject(new Error('toPng: canvas.toBlob returned null'));
      }, 'image/png');
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('toPng: SVG failed to load into an Image'));
    image.src = src;
  });
}

/** Triggers a browser download of the chart in the chosen format. */
export async function downloadChart(svg: SVGSVGElement, opts: DownloadOptions): Promise<void> {
  const blob =
    opts.format === 'svg'
      ? new Blob([toSvgString(svg)], { type: mimeFor('svg') })
      : await toPng(svg, opts);
  const url = URL.createObjectURL(blob);
  try {
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${opts.filename}.${extensionFor(opts.format)}`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  } finally {
    URL.revokeObjectURL(url);
  }
}

/** Best-effort: writes the chart to the clipboard. Requires HTTPS + user gesture. */
export async function copyToClipboard(
  svg: SVGSVGElement,
  format: ExportFormat = 'svg',
): Promise<void> {
  const clipboard = (globalThis as { navigator?: { clipboard?: Clipboard } }).navigator?.clipboard;
  if (!clipboard) throw new Error('copyToClipboard: navigator.clipboard unavailable');
  if (format === 'svg') {
    if (typeof clipboard.writeText !== 'function') {
      throw new Error('copyToClipboard: writeText unavailable');
    }
    await clipboard.writeText(toSvgString(svg));
    return;
  }
  if (typeof ClipboardItem === 'undefined' || typeof clipboard.write !== 'function') {
    throw new Error('copyToClipboard: ClipboardItem unavailable; cannot copy PNG');
  }
  const blob = await toPng(svg);
  await clipboard.write([new ClipboardItem({ [mimeFor('png')]: blob })]);
}

/** Convenience: find the `<svg>` inside a chart container (e.g. a ref's `current`). */
export function chartSvgFrom(container: Element | null): SVGSVGElement | null {
  if (!container) return null;
  if (container.tagName?.toLowerCase() === 'svg') return container as SVGSVGElement;
  return container.querySelector('svg');
}
