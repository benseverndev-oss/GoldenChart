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
