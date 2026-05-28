import { describe, expect, it } from 'vitest';
import { chartSvgFrom, extensionFor, mimeFor, svgPixelSize, toSvgString } from './clientExport';

// Project convention is no-jsdom (see src/interactive/InteractiveChart.test.ts).
// The DOM-dependent helpers (toPng / downloadChart / copyToClipboard) are
// integration-only and exercised in the playground; the pure helpers below
// are what carries the test budget.

function fakeSvg(opts: {
  width?: string;
  height?: string;
  viewBox?: string;
  xmlns?: string;
  rect?: { width: number; height: number };
}): SVGSVGElement {
  const attrs: Record<string, string> = {};
  if (opts.width) attrs.width = opts.width;
  if (opts.height) attrs.height = opts.height;
  if (opts.viewBox) attrs.viewBox = opts.viewBox;
  if (opts.xmlns) attrs.xmlns = opts.xmlns;
  const svg = {
    tagName: 'svg',
    getAttribute: (n: string) => attrs[n] ?? null,
    setAttribute: (n: string, v: string) => {
      attrs[n] = v;
    },
    cloneNode: () => svg,
    getBoundingClientRect: () => opts.rect ?? { width: 0, height: 0 },
  };
  return svg as unknown as SVGSVGElement;
}

describe('clientExport pure helpers', () => {
  it('extensionFor returns the format name', () => {
    expect(extensionFor('svg')).toBe('svg');
    expect(extensionFor('png')).toBe('png');
  });

  it('mimeFor returns the canonical MIME type', () => {
    expect(mimeFor('svg')).toBe('image/svg+xml');
    expect(mimeFor('png')).toBe('image/png');
  });

  it('svgPixelSize prefers explicit width/height attrs', () => {
    expect(svgPixelSize(fakeSvg({ width: '300', height: '150' }))).toEqual({
      width: 300,
      height: 150,
    });
  });

  it('svgPixelSize falls back to viewBox when width/height are missing', () => {
    expect(svgPixelSize(fakeSvg({ viewBox: '0 0 480 270' }))).toEqual({
      width: 480,
      height: 270,
    });
  });

  it('svgPixelSize falls back to getBoundingClientRect as a last resort', () => {
    expect(svgPixelSize(fakeSvg({ rect: { width: 99, height: 33 } }))).toEqual({
      width: 99,
      height: 33,
    });
  });

  it('toSvgString sets xmlns when missing', () => {
    let serialised = '';
    const original = (globalThis as { XMLSerializer?: unknown }).XMLSerializer;
    class FakeSerializer {
      serializeToString(node: SVGSVGElement) {
        const xmlns = node.getAttribute('xmlns') ?? '<missing>';
        serialised = `<svg xmlns="${xmlns}"/>`;
        return serialised;
      }
    }
    (globalThis as { XMLSerializer: typeof FakeSerializer }).XMLSerializer = FakeSerializer;
    try {
      const out = toSvgString(fakeSvg({}));
      expect(out).toBe('<svg xmlns="http://www.w3.org/2000/svg"/>');
    } finally {
      (globalThis as { XMLSerializer?: unknown }).XMLSerializer = original;
    }
  });

  it('toSvgString keeps an existing xmlns', () => {
    let captured = '';
    const original = (globalThis as { XMLSerializer?: unknown }).XMLSerializer;
    class FakeSerializer {
      serializeToString(node: SVGSVGElement) {
        captured = node.getAttribute('xmlns') ?? '';
        return `<svg xmlns="${captured}"/>`;
      }
    }
    (globalThis as { XMLSerializer: typeof FakeSerializer }).XMLSerializer = FakeSerializer;
    try {
      toSvgString(fakeSvg({ xmlns: 'http://example.test' }));
      expect(captured).toBe('http://example.test');
    } finally {
      (globalThis as { XMLSerializer?: unknown }).XMLSerializer = original;
    }
  });

  it('chartSvgFrom returns the svg itself when passed one directly', () => {
    const svg = fakeSvg({ width: '10', height: '10' });
    expect(chartSvgFrom(svg as unknown as Element)).toBe(svg);
  });

  it('chartSvgFrom queries an inner <svg> from a container', () => {
    const found = { tagName: 'svg' } as unknown as SVGSVGElement;
    const container = {
      tagName: 'div',
      querySelector: (sel: string) => (sel === 'svg' ? found : null),
    } as unknown as Element;
    expect(chartSvgFrom(container)).toBe(found);
  });

  it('chartSvgFrom returns null for null input', () => {
    expect(chartSvgFrom(null)).toBeNull();
  });
});
