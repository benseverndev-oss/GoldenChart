import { z } from 'zod';
import {
  linearScale,
  sqrtScale,
  bandScale,
  pointScale,
  linePath,
  areaPath,
  computePie,
  layoutTree,
} from '@benseverndev-oss/goldenchart';
import type { ChartDatum, FlowDirection, FlowEdge, FlowNode } from '@benseverndev-oss/goldenchart';
import type { ToolDef } from './registry';
import {
  ChartDatumSchema,
  CurveSchema,
  FlowDirectionSchema,
  FlowEdgeSchema,
  FlowNodeSchema,
  SeriesPointSchema,
} from './schemas';

type Tick = { value: string | number; offset: number };

const scaleInputShape = {
  type: z.enum(['linear', 'sqrt', 'band', 'point']),
  numericDomain: z.tuple([z.number(), z.number()]).optional(),
  categoryDomain: z.array(z.string()).optional(),
  range: z.tuple([z.number(), z.number()]),
  padding: z.number().optional(),
  count: z.number().int().positive().optional(),
};

function buildScaleTicks(args: Record<string, unknown>): { ticks: Tick[]; bandwidth?: number } {
  const type = args.type as 'linear' | 'sqrt' | 'band' | 'point';
  const range = args.range as [number, number];
  const count = (args.count as number | undefined) ?? 5;
  const padding = args.padding as number | undefined;

  if (type === 'linear' || type === 'sqrt') {
    const domain = args.numericDomain as [number, number] | undefined;
    if (!domain) throw new Error(`numericDomain is required for a ${type} scale`);
    const scale = type === 'linear' ? linearScale(domain, range) : sqrtScale(domain, range);
    return { ticks: scale.ticks(count).map((v) => ({ value: v, offset: scale(v) })) };
  }

  const domain = args.categoryDomain as string[] | undefined;
  if (!domain) throw new Error(`categoryDomain is required for a ${type} scale`);
  if (type === 'band') {
    const scale = bandScale(domain, range, padding);
    const half = scale.bandwidth() / 2;
    return {
      ticks: domain.map((v) => ({ value: v, offset: (scale(v) ?? 0) + half })),
      bandwidth: scale.bandwidth(),
    };
  }
  const scale = pointScale(domain, range, padding);
  return { ticks: domain.map((v) => ({ value: v, offset: scale(v) ?? 0 })) };
}

const TickSchema = z.object({ value: z.union([z.string(), z.number()]), offset: z.number() });

/** Level 1 — pure D3 calculation tools. JSON in, geometry out, no SVG. */
export const calcTools: ToolDef[] = [
  {
    name: 'compute_scale',
    config: {
      title: 'Compute Scale',
      description: 'Build a d3 scale (linear/sqrt/band/point) and return its ticks, bandwidth and range.',
      inputSchema: scaleInputShape,
      outputSchema: {
        kind: z.string(),
        ticks: z.array(TickSchema),
        bandwidth: z.number().optional(),
        range: z.tuple([z.number(), z.number()]),
      },
    },
    handler: async (args) => {
      const { ticks, bandwidth } = buildScaleTicks(args);
      const payload = { kind: args.type as string, ticks, bandwidth, range: args.range as [number, number] };
      return {
        content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }],
        structuredContent: payload,
      };
    },
  },
  {
    name: 'compute_ticks',
    config: {
      title: 'Compute Ticks',
      description: 'Return tick {value, offset} pairs for a scale spec.',
      inputSchema: scaleInputShape,
      outputSchema: { ticks: z.array(TickSchema) },
    },
    handler: async (args) => {
      const { ticks } = buildScaleTicks(args);
      return {
        content: [{ type: 'text', text: JSON.stringify({ ticks }, null, 2) }],
        structuredContent: { ticks },
      };
    },
  },
  {
    name: 'compute_line_path',
    config: {
      title: 'Compute Line Path',
      description: 'Build an SVG path `d` string through points (d3-shape line).',
      inputSchema: { points: z.array(SeriesPointSchema).min(1), curve: CurveSchema.optional() },
      outputSchema: { d: z.string() },
    },
    handler: async (args) => {
      const d = linePath(args.points as { x: number; y: number }[], args.curve as never);
      return { content: [{ type: 'text', text: d }], structuredContent: { d } };
    },
  },
  {
    name: 'compute_area_path',
    config: {
      title: 'Compute Area Path',
      description: 'Build an SVG path `d` string for a filled area down to a baseline (d3-shape area).',
      inputSchema: {
        points: z.array(SeriesPointSchema).min(1),
        baselineY: z.number(),
        curve: CurveSchema.optional(),
      },
      outputSchema: { d: z.string() },
    },
    handler: async (args) => {
      const d = areaPath(
        args.points as { x: number; y: number }[],
        args.baselineY as number,
        args.curve as never,
      );
      return { content: [{ type: 'text', text: d }], structuredContent: { d } };
    },
  },
  {
    name: 'compute_pie',
    config: {
      title: 'Compute Pie',
      description: 'Compute pie/donut slice geometry (paths, centroids, angles) from category values.',
      inputSchema: {
        data: z.array(ChartDatumSchema).min(1),
        outerRadius: z.number().positive(),
        innerRadius: z.number().optional(),
        padAngle: z.number().optional(),
      },
      outputSchema: { slices: z.array(z.record(z.unknown())) },
    },
    handler: async (args) => {
      const slices = computePie(
        args.data as ChartDatum[],
        args.outerRadius as number,
        args.innerRadius as number | undefined,
        args.padAngle as number | undefined,
      );
      return {
        content: [{ type: 'text', text: JSON.stringify({ slices }, null, 2) }],
        structuredContent: { slices },
      };
    },
  },
  {
    name: 'layout_tree',
    config: {
      title: 'Layout Tree',
      description:
        'Lay out flowchart nodes into a tidy tree (any direction); returns node + edge coordinates.',
      inputSchema: {
        nodes: z.array(FlowNodeSchema).min(1),
        width: z.number().positive(),
        height: z.number().positive(),
        edges: z.array(FlowEdgeSchema).optional(),
        direction: FlowDirectionSchema.optional(),
      },
      outputSchema: { nodes: z.array(z.record(z.unknown())), edges: z.array(z.record(z.unknown())) },
    },
    handler: async (args) => {
      const layout = layoutTree(
        args.nodes as FlowNode[],
        [args.width as number, args.height as number],
        args.edges as FlowEdge[] | undefined,
        (args.direction as FlowDirection | undefined) ?? 'TB',
      );
      return {
        content: [{ type: 'text', text: JSON.stringify(layout, null, 2) }],
        structuredContent: layout as unknown as Record<string, unknown>,
      };
    },
  },
];
