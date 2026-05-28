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
  colorRamp,
  divergingColor,
  sequentialColor,
  profileData,
  applyTransforms,
  regularPolygonPath,
  starPath,
  arcStrokePath,
  wedgePath,
  arrowHeadPath,
} from 'goldenchart';
import type { ChartDatum, ColorScaleName, FlowDirection, FlowEdge, FlowNode, Point, Row, Transform } from 'goldenchart';
import type { ToolDef } from './registry';
import {
  ChartDatumSchema,
  ColorScaleNameSchema,
  CurveSchema,
  FlowDirectionSchema,
  FlowEdgeSchema,
  FlowNodeSchema,
  SeriesPointSchema,
  TransformSchema,
} from './schemas';

type Tick = { value: string | number; offset: number };

/** Degrees -> radians. The MCP layer takes friendly degrees; core builders take radians. */
const toRad = (deg: number) => (deg * Math.PI) / 180;

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
      return { content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }], structuredContent: payload };
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
      return { content: [{ type: 'text', text: JSON.stringify({ ticks }, null, 2) }], structuredContent: { ticks } };
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
      const d = areaPath(args.points as { x: number; y: number }[], args.baselineY as number, args.curve as never);
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
      outputSchema: { slices: z.array(z.record(z.string(), z.unknown())) },
    },
    handler: async (args) => {
      const slices = computePie(
        args.data as ChartDatum[],
        args.outerRadius as number,
        args.innerRadius as number | undefined,
        args.padAngle as number | undefined,
      );
      return { content: [{ type: 'text', text: JSON.stringify({ slices }, null, 2) }], structuredContent: { slices } };
    },
  },
  {
    name: 'layout_tree',
    config: {
      title: 'Layout Tree',
      description: 'Lay out flowchart nodes into a tidy tree (any direction); returns node + edge coordinates.',
      inputSchema: {
        nodes: z.array(FlowNodeSchema).min(1),
        width: z.number().positive(),
        height: z.number().positive(),
        edges: z.array(FlowEdgeSchema).optional(),
        direction: FlowDirectionSchema.optional(),
      },
      outputSchema: { nodes: z.array(z.record(z.string(), z.unknown())), edges: z.array(z.record(z.string(), z.unknown())) },
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
  {
    name: 'compute_color_scale',
    config: {
      title: 'Compute Color Scale',
      description:
        'Map a numeric domain onto a named color scale: sample colors, plus the color for a specific value.',
      inputSchema: {
        scale: ColorScaleNameSchema,
        domain: z.tuple([z.number(), z.number()]),
        steps: z.number().int().positive().optional(),
        diverging: z.boolean().optional(),
        value: z.number().optional(),
      },
      outputSchema: {
        ramp: z.array(z.string()),
        valueColor: z.string().optional(),
      },
    },
    handler: async (args) => {
      const scale = args.scale as ColorScaleName;
      const [min, max] = args.domain as [number, number];
      const steps = (args.steps as number | undefined) ?? 7;
      const color = (args.diverging as boolean | undefined)
        ? divergingColor(scale, [min, (min + max) / 2, max])
        : sequentialColor(scale, [min, max]);
      const ramp = colorRamp(scale, steps);
      const valueColor = args.value !== undefined ? color(args.value as number) : undefined;
      const payload = { ramp, valueColor };
      return { content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }], structuredContent: payload };
    },
  },
  {
    name: 'profile_data',
    config: {
      title: 'Profile Data',
      description:
        'Inspect an array of records and report field types/cardinality and the overall data shape (feeds chart recommendation).',
      inputSchema: { data: z.array(z.record(z.string(), z.unknown())).min(1) },
      outputSchema: {
        rowCount: z.number(),
        shape: z.string(),
        fields: z.array(z.record(z.string(), z.unknown())),
      },
    },
    handler: async (args) => {
      const profile = profileData(args.data as Record<string, unknown>[]);
      return {
        content: [{ type: 'text', text: JSON.stringify(profile, null, 2) }],
        structuredContent: profile as unknown as Record<string, unknown>,
      };
    },
  },
  {
    name: 'transform_data',
    config: {
      title: 'Transform Data',
      description:
        'Reshape an array of records with a transform pipeline (sort, filter, topN, aggregate, bin, rolling, pivot) before charting. JSON in, JSON out.',
      inputSchema: { data: z.array(z.record(z.string(), z.unknown())), pipeline: z.array(TransformSchema) },
      outputSchema: { rows: z.array(z.record(z.string(), z.unknown())) },
    },
    handler: async (args) => {
      const rows = applyTransforms(args.data as Row[], args.pipeline as Transform[]);
      return { content: [{ type: 'text', text: JSON.stringify({ rows }, null, 2) }], structuredContent: { rows } };
    },
  },
  {
    name: 'compute_regular_polygon_path',
    config: {
      title: 'Compute Regular Polygon Path',
      description:
        'Build a closed SVG path `d` for a regular n-gon centered at (cx,cy) with radius r. `rotation` is in degrees; 0 points the first vertex up (12 o’clock), positive rotates clockwise.',
      inputSchema: {
        cx: z.number(),
        cy: z.number(),
        r: z.number().positive(),
        sides: z.number().int().min(3),
        rotation: z.number().optional(),
      },
      outputSchema: { d: z.string() },
    },
    handler: async (args) => {
      const d = regularPolygonPath(
        args.cx as number,
        args.cy as number,
        args.r as number,
        args.sides as number,
        toRad((args.rotation as number | undefined) ?? 0),
      );
      return { content: [{ type: 'text', text: d }], structuredContent: { d } };
    },
  },
  {
    name: 'compute_star_path',
    config: {
      title: 'Compute Star Path',
      description:
        'Build a closed SVG path `d` for a star with `points` tips, alternating outerRadius/innerRadius around (cx,cy). `rotation` in degrees; 0 points the first tip up (12 o’clock), positive rotates clockwise.',
      inputSchema: {
        cx: z.number(),
        cy: z.number(),
        outerRadius: z.number().positive(),
        innerRadius: z.number().positive(),
        points: z.number().int().min(2),
        rotation: z.number().optional(),
      },
      outputSchema: { d: z.string() },
    },
    handler: async (args) => {
      const d = starPath(
        args.cx as number,
        args.cy as number,
        args.outerRadius as number,
        args.innerRadius as number,
        args.points as number,
        toRad((args.rotation as number | undefined) ?? 0),
      );
      return { content: [{ type: 'text', text: d }], structuredContent: { d } };
    },
  },
  {
    name: 'compute_arc_path',
    config: {
      title: 'Compute Arc Path',
      description:
        'Build an open SVG path `d` for an arc stroke from startAngle to endAngle (degrees, 0 = east, clockwise) at radius r around (cx,cy). No fill.',
      inputSchema: {
        cx: z.number(),
        cy: z.number(),
        r: z.number().positive(),
        startAngle: z.number(),
        endAngle: z.number(),
      },
      outputSchema: { d: z.string() },
    },
    handler: async (args) => {
      const d = arcStrokePath(
        args.cx as number,
        args.cy as number,
        args.r as number,
        toRad(args.startAngle as number),
        toRad(args.endAngle as number),
      );
      return { content: [{ type: 'text', text: d }], structuredContent: { d } };
    },
  },
  {
    name: 'compute_wedge_path',
    config: {
      title: 'Compute Wedge Path',
      description:
        'Build a closed SVG path `d` for a pie wedge from startAngle to endAngle (degrees, 0 = east, clockwise) at radius r around (cx,cy). With innerRadius, builds an annular (ring) wedge.',
      inputSchema: {
        cx: z.number(),
        cy: z.number(),
        r: z.number().positive(),
        startAngle: z.number(),
        endAngle: z.number(),
        innerRadius: z.number().positive().optional(),
      },
      outputSchema: { d: z.string() },
    },
    handler: async (args) => {
      const d = wedgePath(
        args.cx as number,
        args.cy as number,
        args.r as number,
        toRad(args.startAngle as number),
        toRad(args.endAngle as number),
        args.innerRadius as number | undefined,
      );
      return { content: [{ type: 'text', text: d }], structuredContent: { d } };
    },
  },
  {
    name: 'compute_arrowhead_path',
    config: {
      title: 'Compute Arrowhead Path',
      description:
        'Build an SVG path `d` for an arrowhead at `to`, pointing along from->to. Open two-stroke head by default; `filled` closes it into a solid triangle.',
      inputSchema: {
        from: SeriesPointSchema,
        to: SeriesPointSchema,
        size: z.number().positive().optional(),
        filled: z.boolean().optional(),
      },
      outputSchema: { d: z.string() },
    },
    handler: async (args) => {
      const d = arrowHeadPath(
        args.from as Point,
        args.to as Point,
        args.size as number | undefined,
        (args.filled as boolean | undefined) ?? false,
      );
      return { content: [{ type: 'text', text: d }], structuredContent: { d } };
    },
  },
];
