import { z } from 'zod';

/**
 * Shared Zod fragments for the MCP tool inputs. These mirror the GoldenChart
 * TypeScript types (`src/types/*`); the type-assertion tests keep them honest.
 */

export const FILL_STYLES = [
  'hachure',
  'solid',
  'zigzag',
  'cross-hatch',
  'dots',
  'dashed',
  'zigzag-line',
] as const;

export const VIBE_PRESET_NAMES = ['messy_sketch', 'clean_blueprint', 'chaotic_notebook'] as const;

export const VibeOverridesSchema = z.object({
  preset: z.enum(VIBE_PRESET_NAMES).optional(),
  roughness: z.number().optional(),
  bowing: z.number().optional(),
  strokeWidth: z.number().optional(),
  stroke: z.string().optional(),
  fill: z.string().nullable().optional(),
  fillStyle: z.enum(FILL_STYLES).optional(),
  fillWeight: z.number().optional(),
  hachureAngle: z.number().optional(),
  hachureGap: z.number().optional(),
  curveStepCount: z.number().optional(),
  curveTightness: z.number().optional(),
  disableMultiStroke: z.boolean().optional(),
  seed: z.number().optional(),
  fontFamily: z.string().optional(),
  fontSize: z.number().optional(),
});

/** A bare preset name or a preset + targeted overrides. */
export const VibeConfigSchema = z.union([z.enum(VIBE_PRESET_NAMES), VibeOverridesSchema]);

export const MarginSchema = z
  .object({
    top: z.number(),
    right: z.number(),
    bottom: z.number(),
    left: z.number(),
  })
  .partial();

export const ChartDatumSchema = z.object({
  label: z.string(),
  value: z.number(),
  color: z.string().optional(),
});

export const SeriesPointSchema = z.object({ x: z.number(), y: z.number() });

export const SeriesSchema = z.object({
  id: z.string(),
  points: z.array(SeriesPointSchema),
  color: z.string().optional(),
});

export const CurveSchema = z.enum(['linear', 'basis', 'catmullRom', 'monotoneX']);

export const ScatterDatumSchema = z.object({
  x: z.number(),
  y: z.number(),
  r: z.number().optional(),
  color: z.string().optional(),
  label: z.string().optional(),
});

export const FlowNodeSchema = z.object({
  id: z.string(),
  label: z.string(),
  parent: z.string().optional(),
  width: z.number().optional(),
  height: z.number().optional(),
  shape: z.enum(['rect', 'ellipse', 'diamond']).optional(),
  vibe: VibeConfigSchema.optional(),
});

export const FlowEdgeSchema = z.object({
  from: z.string(),
  to: z.string(),
  label: z.string().optional(),
});

export const FlowDirectionSchema = z.enum(['TB', 'BT', 'LR', 'RL']);

export const EdgeRoutingSchema = z.enum(['curved', 'orthogonal']);

/** Common chart dimension/vibe fields shared by every render tool. */
export const baseChartShape = {
  width: z.number().positive(),
  height: z.number().positive(),
  margin: MarginSchema.optional(),
  vibe: VibeConfigSchema.optional(),
  title: z.string().optional(),
};

/** Standard structured output for every render tool. */
export const renderOutputShape = {
  svg: z.string(),
  meta: z.object({ kind: z.string(), width: z.number(), height: z.number() }),
};

export const ViewportSchema = z.object({
  width: z.number().positive(),
  height: z.number().positive(),
});

/**
 * Serializable description of a single sketched primitive. Shared by the
 * Level-2 primitive render tools (M3) and `compose_surface` (M4), so a scene is
 * just an array of these.
 */
export const PrimitiveSpecSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('path'),
    d: z.string(),
    stroke: z.string().optional(),
    fill: z.string().nullable().optional(),
    seed: z.number().optional(),
    vibe: VibeConfigSchema.optional(),
  }),
  z.object({
    kind: z.literal('rect'),
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number(),
    stroke: z.string().optional(),
    fill: z.string().nullable().optional(),
    seed: z.number().optional(),
    vibe: VibeConfigSchema.optional(),
  }),
  z.object({
    kind: z.literal('circle'),
    cx: z.number(),
    cy: z.number(),
    diameter: z.number(),
    stroke: z.string().optional(),
    fill: z.string().nullable().optional(),
    seed: z.number().optional(),
    vibe: VibeConfigSchema.optional(),
  }),
  z.object({
    kind: z.literal('line'),
    x1: z.number(),
    y1: z.number(),
    x2: z.number(),
    y2: z.number(),
    stroke: z.string().optional(),
    seed: z.number().optional(),
    vibe: VibeConfigSchema.optional(),
  }),
  z.object({
    kind: z.literal('text'),
    x: z.number(),
    y: z.number(),
    text: z.string(),
    anchor: z.enum(['start', 'middle', 'end']).optional(),
    baseline: z.enum(['auto', 'middle', 'hanging']).optional(),
    rotate: z.number().optional(),
    seed: z.number().optional(),
    vibe: VibeConfigSchema.optional(),
  }),
]);

export type PrimitiveSpec = z.infer<typeof PrimitiveSpecSchema>;

/** A chart placed within a composed scene (offset by `at`, own dimensions). */
export const ChartNodeSchema = z.object({
  kind: z.literal('chart'),
  chart: z.enum(['bar', 'line', 'area', 'scatter', 'pie', 'flow']),
  at: z.object({ x: z.number(), y: z.number() }).optional(),
  width: z.number().positive(),
  height: z.number().positive(),
  /** Chart-specific props (data/series/nodes, options) passed straight through. */
  props: z.record(z.unknown()).optional(),
});

/** A node in a composed scene: a primitive or a positioned chart. */
export const SceneNodeSchema = z.union([PrimitiveSpecSchema, ChartNodeSchema]);
export type SceneNode = z.infer<typeof SceneNodeSchema>;
