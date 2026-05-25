import { createElement } from 'react';
import { z } from 'zod';
import { Surface } from '@benseverndev-oss/goldenchart';
import type { VibeConfig } from '@benseverndev-oss/goldenchart';
import { renderToSVGString } from '@benseverndev-oss/goldenchart/server';
import type { ToolDef, ToolResult } from './registry';
import { primitiveToElement } from './primitives';
import type { PrimitiveSpec } from './schemas';
import { ViewportSchema, VibeConfigSchema, renderOutputShape } from './schemas';

function renderPrimitive(args: Record<string, unknown>, spec: PrimitiveSpec): ToolResult {
  const viewport = args.viewport as { width: number; height: number };
  const svg = renderToSVGString(
    createElement(
      Surface,
      {
        width: viewport.width,
        height: viewport.height,
        vibe: args.vibe as VibeConfig | undefined,
        bare: true,
      },
      primitiveToElement(spec, 'p'),
    ),
  );
  return {
    content: [{ type: 'text', text: svg }],
    structuredContent: { svg, meta: { kind: spec.kind, width: viewport.width, height: viewport.height } },
  };
}

const viewportShape = { viewport: ViewportSchema, vibe: VibeConfigSchema.optional() };

/** Level 2 — render a single sketched primitive inside a standalone SVG. */
export const primitiveTools: ToolDef[] = [
  {
    name: 'render_rough_path',
    config: {
      title: 'Render Rough Path',
      description: 'Render an SVG path `d` string as a sketched path inside a standalone SVG.',
      inputSchema: {
        ...viewportShape,
        d: z.string(),
        stroke: z.string().optional(),
        fill: z.string().nullable().optional(),
        seed: z.number().optional(),
      },
      outputSchema: renderOutputShape,
    },
    handler: async (args) =>
      renderPrimitive(args, {
        kind: 'path',
        d: args.d as string,
        stroke: args.stroke as string | undefined,
        fill: args.fill as string | null | undefined,
        seed: args.seed as number | undefined,
      }),
  },
  {
    name: 'render_rough_rect',
    config: {
      title: 'Render Rough Rectangle',
      description: 'Render a sketched rectangle inside a standalone SVG.',
      inputSchema: {
        ...viewportShape,
        x: z.number(),
        y: z.number(),
        width: z.number(),
        height: z.number(),
        stroke: z.string().optional(),
        fill: z.string().nullable().optional(),
        seed: z.number().optional(),
      },
      outputSchema: renderOutputShape,
    },
    handler: async (args) =>
      renderPrimitive(args, {
        kind: 'rect',
        x: args.x as number,
        y: args.y as number,
        width: args.width as number,
        height: args.height as number,
        stroke: args.stroke as string | undefined,
        fill: args.fill as string | null | undefined,
        seed: args.seed as number | undefined,
      }),
  },
  {
    name: 'render_rough_circle',
    config: {
      title: 'Render Rough Circle',
      description: 'Render a sketched circle inside a standalone SVG.',
      inputSchema: {
        ...viewportShape,
        cx: z.number(),
        cy: z.number(),
        diameter: z.number().positive(),
        stroke: z.string().optional(),
        fill: z.string().nullable().optional(),
        seed: z.number().optional(),
      },
      outputSchema: renderOutputShape,
    },
    handler: async (args) =>
      renderPrimitive(args, {
        kind: 'circle',
        cx: args.cx as number,
        cy: args.cy as number,
        diameter: args.diameter as number,
        stroke: args.stroke as string | undefined,
        fill: args.fill as string | null | undefined,
        seed: args.seed as number | undefined,
      }),
  },
  {
    name: 'render_rough_line',
    config: {
      title: 'Render Rough Line',
      description: 'Render a sketched line inside a standalone SVG.',
      inputSchema: {
        ...viewportShape,
        x1: z.number(),
        y1: z.number(),
        x2: z.number(),
        y2: z.number(),
        stroke: z.string().optional(),
        seed: z.number().optional(),
      },
      outputSchema: renderOutputShape,
    },
    handler: async (args) =>
      renderPrimitive(args, {
        kind: 'line',
        x1: args.x1 as number,
        y1: args.y1 as number,
        x2: args.x2 as number,
        y2: args.y2 as number,
        stroke: args.stroke as string | undefined,
        seed: args.seed as number | undefined,
      }),
  },
  {
    name: 'render_rough_text',
    config: {
      title: 'Render Rough Text',
      description: 'Render vibe-styled text inside a standalone SVG.',
      inputSchema: {
        ...viewportShape,
        x: z.number(),
        y: z.number(),
        text: z.string(),
        anchor: z.enum(['start', 'middle', 'end']).optional(),
        baseline: z.enum(['auto', 'middle', 'hanging']).optional(),
        rotate: z.number().optional(),
        seed: z.number().optional(),
      },
      outputSchema: renderOutputShape,
    },
    handler: async (args) =>
      renderPrimitive(args, {
        kind: 'text',
        x: args.x as number,
        y: args.y as number,
        text: args.text as string,
        anchor: args.anchor as 'start' | 'middle' | 'end' | undefined,
        baseline: args.baseline as 'auto' | 'middle' | 'hanging' | undefined,
        rotate: args.rotate as number | undefined,
        seed: args.seed as number | undefined,
      }),
  },
];
