import { createElement } from 'react';
import { z } from 'zod';
import {
  VIBE_PRESETS,
  resolveVibe,
  vibeToRoughOptions,
  Surface,
  RoughRectangle,
  RoughLine,
  RoughCircle,
  RoughText,
} from 'goldenchart';
import type { VibeConfig } from 'goldenchart';
import { renderToSVGString } from 'goldenchart/server';
import type { ToolDef } from './registry';
import { VibeConfigSchema, renderOutputShape } from './schemas';

/** Level 0 tools — discover, resolve, and preview the aesthetic before rendering. */
export const vibeTools: ToolDef[] = [
  {
    name: 'list_vibe_presets',
    config: {
      title: 'List Vibe Presets',
      description: 'List every built-in vibe preset with its fully-resolved Rough.js knobs.',
      inputSchema: {},
      outputSchema: {
        presets: z.array(z.object({ name: z.string(), resolved: z.record(z.string(), z.unknown()) })),
      },
    },
    handler: async () => {
      const presets = Object.entries(VIBE_PRESETS).map(([name, resolved]) => ({ name, resolved }));
      const payload = { presets };
      return { content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }], structuredContent: payload };
    },
  },
  {
    name: 'resolve_vibe',
    config: {
      title: 'Resolve Vibe',
      description:
        'Resolve a vibe config (preset name or preset + overrides) into the full ResolvedVibe and the Rough.js options it maps to.',
      inputSchema: { vibe: VibeConfigSchema },
      outputSchema: { resolved: z.record(z.string(), z.unknown()), roughOptions: z.record(z.string(), z.unknown()) },
    },
    handler: async (args) => {
      const resolved = resolveVibe(args.vibe as VibeConfig);
      const roughOptions = vibeToRoughOptions(resolved);
      const payload = { resolved, roughOptions } as Record<string, unknown>;
      return { content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }], structuredContent: payload };
    },
  },
  {
    name: 'preview_vibe',
    config: {
      title: 'Preview Vibe',
      description: 'Render a small sample (rectangle, line, circle, label) in the given vibe as SVG.',
      inputSchema: {
        vibe: VibeConfigSchema,
        width: z.number().positive().optional(),
        height: z.number().positive().optional(),
      },
      outputSchema: renderOutputShape,
    },
    handler: async (args) => {
      const width = (args.width as number | undefined) ?? 240;
      const height = (args.height as number | undefined) ?? 120;
      const svg = renderToSVGString(
        createElement(
          Surface,
          { width, height, vibe: args.vibe as VibeConfig, bare: true },
          createElement(RoughRectangle, { key: 'r', x: 14, y: 24, width: 72, height: 56 }),
          createElement(RoughLine, { key: 'l', x1: 104, y1: 78, x2: 160, y2: 26 }),
          createElement(RoughCircle, { key: 'c', cx: 196, cy: 44, diameter: 40 }),
          createElement(RoughText, { key: 't', x: width / 2, y: height - 10, anchor: 'middle', children: 'GoldenChart' }),
        ),
      );
      const structuredContent = { svg, meta: { kind: 'vibe-preview', width, height } };
      return { content: [{ type: 'text', text: svg }], structuredContent };
    },
  },
];
