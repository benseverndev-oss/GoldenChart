import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { extname, join, resolve } from 'node:path';
import { z } from 'zod';
import { FONT_TTF_BASE64 } from 'goldenchart';
import type { ToolDef, ToolResult } from './registry';

function validateOutputPath(path: string, expectedExt: string): string {
  const resolved = resolve(path);
  if (extname(resolved).toLowerCase() !== expectedExt) {
    throw new Error(`Output path must end in ${expectedExt}`);
  }
  return resolved;
}

// resvg can't read @font-face data URIs embedded in the SVG, so materialise the
// bundled vibe fonts as files once and point resvg at them via `fontDirs`.
let cachedFontDir: string | undefined;
function bundledFontDir(): string {
  if (cachedFontDir) return cachedFontDir;
  const dir = mkdtempSync(join(tmpdir(), 'gc-fonts-'));
  for (const [family, base64] of Object.entries(FONT_TTF_BASE64)) {
    writeFileSync(join(dir, `${family.replace(/[^A-Za-z0-9]+/g, '_')}.ttf`), Buffer.from(base64, 'base64'));
  }
  cachedFontDir = dir;
  return dir;
}

/** Level 4 — turn an SVG into a returnable/exportable artifact. */
export const exportTools: ToolDef[] = [
  {
    name: 'export_svg',
    config: {
      title: 'Export SVG',
      description:
        'Return an SVG as a data URI, or write it to an explicit `.svg` path. Writes only happen when a path is given.',
      inputSchema: { svg: z.string(), path: z.string().optional() },
      outputSchema: { dataUri: z.string().optional(), path: z.string().optional() },
    },
    handler: async (args) => {
      const svg = args.svg as string;
      const path = args.path as string | undefined;
      if (path) {
        const out = validateOutputPath(path, '.svg');
        writeFileSync(out, svg, 'utf8');
        return { content: [{ type: 'text', text: `Wrote SVG to ${out}` }], structuredContent: { path: out } };
      }
      const dataUri = `data:image/svg+xml;base64,${Buffer.from(svg, 'utf8').toString('base64')}`;
      return { content: [{ type: 'text', text: dataUri }], structuredContent: { dataUri } };
    },
  },
  {
    name: 'export_png',
    config: {
      title: 'Export PNG',
      description:
        'Rasterize an SVG to PNG (via resvg). Returns base64, or writes to an explicit `.png` path. Writes only happen when a path is given.',
      inputSchema: { svg: z.string(), path: z.string().optional() },
      outputSchema: { base64: z.string().optional(), path: z.string().optional(), bytes: z.number() },
    },
    handler: async (args): Promise<ToolResult> => {
      let Resvg: typeof import('@resvg/resvg-js').Resvg;
      try {
        ({ Resvg } = await import('@resvg/resvg-js'));
      } catch {
        return {
          isError: true,
          content: [
            { type: 'text', text: 'PNG export needs the @resvg/resvg-js dependency, which is not available here.' },
          ],
        };
      }

      const png = new Resvg(args.svg as string, {
        font: { fontDirs: [bundledFontDir()], loadSystemFonts: true },
      })
        .render()
        .asPng();
      const path = args.path as string | undefined;
      if (path) {
        const out = validateOutputPath(path, '.png');
        writeFileSync(out, png);
        return {
          content: [{ type: 'text', text: `Wrote ${png.length}-byte PNG to ${out}` }],
          structuredContent: { path: out, bytes: png.length },
        };
      }
      const base64 = Buffer.from(png).toString('base64');
      return {
        content: [{ type: 'text', text: `data:image/png;base64,${base64}` }],
        structuredContent: { base64, bytes: png.length },
      };
    },
  },
];
