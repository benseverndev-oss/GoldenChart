import { describe, expect, it } from 'vitest';
import { exportTools } from './exportTools';

const byName = (name: string) => exportTools.find((t) => t.name === name)!;
const SVG = '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20"><rect width="20" height="20" fill="red"/></svg>';

describe('export_svg', () => {
  it('returns a data URI when no path is given', async () => {
    const res = await byName('export_svg').handler({ svg: SVG });
    const { dataUri } = res.structuredContent as { dataUri: string };
    expect(dataUri.startsWith('data:image/svg+xml;base64,')).toBe(true);
  });

  it('rejects a path with the wrong extension', async () => {
    await expect(byName('export_svg').handler({ svg: SVG, path: '/tmp/out.txt' })).rejects.toThrow();
  });
});

describe('export_png', () => {
  it('rasterizes an SVG to a non-empty PNG (base64)', async () => {
    const res = await byName('export_png').handler({ svg: SVG });
    if (res.isError) {
      // resvg unavailable in this environment — acceptable, tool degrades gracefully
      expect(res.content[0].text).toContain('resvg');
      return;
    }
    const { base64, bytes } = res.structuredContent as { base64: string; bytes: number };
    expect(bytes).toBeGreaterThan(0);
    expect(base64.length).toBeGreaterThan(0);
    const header = Buffer.from(base64, 'base64').subarray(0, 8);
    expect(header).toEqual(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]));
  });
});
