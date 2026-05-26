import { z } from 'zod';
import { VIBE_PRESETS } from 'goldenchart';
import type { VibePreset } from 'goldenchart';

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

/**
 * Every built-in vibe preset, derived at runtime from the library's
 * `VIBE_PRESETS` record so the MCP surface can never drift behind it — a new
 * preset added to the library appears here automatically (ROADMAP principle 4).
 * Cast to the `VibePreset` tuple so `z.enum` still infers the literal union
 * (keeping `VibeConfig` assignability) while sourcing the values at runtime.
 */
export const VIBE_PRESET_NAMES = Object.keys(VIBE_PRESETS) as [VibePreset, ...VibePreset[]];

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
  background: z.string().optional(),
  /** Hand-drawn "draw-on" reveal. A client/runtime concern — has no effect on static render-tool SVG. */
  animate: z.object({ drawOn: z.boolean().optional(), durationMs: z.number().optional() }).optional(),
});

/** A bare preset name or a preset + targeted overrides. */
export const VibeConfigSchema = z.union([z.enum(VIBE_PRESET_NAMES), VibeOverridesSchema]);

/** Data-shaping transform ops; mirrors `Transform` in goldenchart core. */
export const TransformSchema = z.discriminatedUnion('op', [
  z.object({ op: z.literal('sort'), by: z.string(), dir: z.enum(['asc', 'desc']).optional() }),
  z.object({
    op: z.literal('filter'),
    field: z.string(),
    cmp: z.enum(['==', '!=', '>', '>=', '<', '<=', 'in']),
    value: z.unknown(),
  }),
  z.object({
    op: z.literal('topN'),
    by: z.string(),
    n: z.number().int(),
    rest: z.enum(['drop', 'group-other']).optional(),
    labelField: z.string().optional(),
    otherLabel: z.string().optional(),
  }),
  z.object({
    op: z.literal('aggregate'),
    groupBy: z.array(z.string()),
    field: z.string(),
    reducer: z.enum(['sum', 'mean', 'count', 'min', 'max', 'median']),
    as: z.string().optional(),
  }),
  z.object({ op: z.literal('bin'), field: z.string(), bins: z.number().int().positive(), as: z.string().optional(), countAs: z.string().optional() }),
  z.object({ op: z.literal('rolling'), field: z.string(), window: z.number().int().positive(), reducer: z.enum(['mean', 'sum']), as: z.string().optional() }),
  z.object({ op: z.literal('pivot'), index: z.string(), column: z.string(), value: z.string() }),
]);

/** Per-axis scale + formatting; mirrors `AxisFormat` in goldenchart. */
export const AxisFormatSchema = z.object({
  scale: z.enum(['linear', 'log', 'time']).optional(),
  domain: z.union([z.tuple([z.number(), z.number()]), z.enum(['nice', 'zero'])]).optional(),
  tickCount: z.number().int().positive().optional(),
  format: z.string().optional(),
  unit: z.string().optional(),
});

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
  group: z.string().optional(),
  vibe: VibeConfigSchema.optional(),
});

export const FlowEdgeSchema = z.object({
  from: z.string(),
  to: z.string(),
  label: z.string().optional(),
  routing: z.enum(['curved', 'orthogonal']).optional(),
});

/** Structural layout dials; mirrors `LayoutOptions` in goldenchart. */
export const LayoutOptionsSchema = z.object({
  density: z.enum(['compact', 'cozy', 'comfortable']).optional(),
  nodeSpacing: z.number().positive().optional(),
  rankSpacing: z.number().positive().optional(),
  engine: z.enum(['auto', 'tree', 'dag']).optional(),
  laneGutter: z.number().nonnegative().optional(),
});

export const FlowDirectionSchema = z.enum(['TB', 'BT', 'LR', 'RL']);

export const EdgeRoutingSchema = z.enum(['curved', 'orthogonal']);

export const ColorScaleNameSchema = z.enum([
  'viridis',
  'magma',
  'inferno',
  'blues',
  'greens',
  'oranges',
  'rdbu',
  'rdylgn',
  'spectral',
]);

export const MultiSeriesDatumSchema = z.object({
  label: z.string(),
  values: z.record(z.number()),
});

export const BarModeSchema = z.enum(['single', 'grouped', 'stacked']);

export const SankeyNodeSchema = z.object({
  id: z.string(),
  label: z.string().optional(),
  color: z.string().optional(),
});

export const SankeyLinkSchema = z.object({
  source: z.string(),
  target: z.string(),
  value: z.number(),
});

export const SequenceActorSchema = z.object({
  id: z.string(),
  label: z.string().optional(),
});

export const SequenceMessageSchema = z.object({
  from: z.string(),
  to: z.string(),
  label: z.string().optional(),
  kind: z.enum(['sync', 'async', 'reply']).optional(),
});

export const ERFieldSchema = z.object({
  name: z.string(),
  type: z.string().optional(),
  key: z.enum(['PK', 'FK']).optional(),
});

export const EREntitySchema = z.object({
  id: z.string(),
  label: z.string().optional(),
  fields: z.array(ERFieldSchema).optional(),
});

export const ERRelationshipSchema = z.object({
  from: z.string(),
  to: z.string(),
  label: z.string().optional(),
  fromCardinality: z.string().optional(),
  toCardinality: z.string().optional(),
});

export const TimelineEventSchema = z.object({
  label: z.string(),
  date: z.string().optional(),
  detail: z.string().optional(),
});

/** A high-level diagram spec — one entry per diagram type, keyed by `kind`. */
export const DiagramSpecSchema = z.discriminatedUnion('kind', [
  z.object({
    kind: z.literal('flowchart'),
    nodes: z.array(FlowNodeSchema).min(1),
    edges: z.array(FlowEdgeSchema).optional(),
    direction: FlowDirectionSchema.optional(),
    routing: EdgeRoutingSchema.optional(),
  }),
  z.object({
    kind: z.literal('sequence'),
    actors: z.array(SequenceActorSchema).min(1),
    messages: z.array(SequenceMessageSchema),
  }),
  z.object({
    kind: z.literal('mindmap'),
    nodes: z.array(FlowNodeSchema).min(1),
    edges: z.array(FlowEdgeSchema).optional(),
  }),
  z.object({
    kind: z.literal('arch'),
    nodes: z.array(FlowNodeSchema).min(1),
    edges: z.array(FlowEdgeSchema).optional(),
    direction: FlowDirectionSchema.optional(),
  }),
  z.object({
    kind: z.literal('er'),
    entities: z.array(EREntitySchema).min(1),
    relationships: z.array(ERRelationshipSchema).optional(),
    direction: FlowDirectionSchema.optional(),
  }),
  z.object({
    kind: z.literal('timeline'),
    events: z.array(TimelineEventSchema).min(1),
    orientation: z.enum(['horizontal', 'vertical']).optional(),
  }),
  z.object({
    kind: z.literal('org'),
    nodes: z.array(FlowNodeSchema).min(1),
    edges: z.array(FlowEdgeSchema).optional(),
    direction: FlowDirectionSchema.optional(),
  }),
]);

export const TreemapDatumSchema = z.object({
  id: z.string(),
  parent: z.string().optional(),
  value: z.number().optional(),
  label: z.string().optional(),
  color: z.string().optional(),
});

export const HeatmapDatumSchema = z.object({
  x: z.union([z.string(), z.number()]),
  y: z.union([z.string(), z.number()]),
  value: z.number(),
});

export const RadarSeriesSchema = z.object({
  id: z.string(),
  values: z.array(z.number()),
  color: z.string().optional(),
});

/** Reference-line/band/callout/circle overlays for cartesian charts. */
export const AnnotationSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('x-line'), value: z.number(), label: z.string().optional(), color: z.string().optional() }),
  z.object({ kind: z.literal('y-line'), value: z.number(), label: z.string().optional(), color: z.string().optional() }),
  z.object({
    kind: z.literal('x-band'),
    from: z.number(),
    to: z.number(),
    label: z.string().optional(),
    color: z.string().optional(),
  }),
  z.object({
    kind: z.literal('y-band'),
    from: z.number(),
    to: z.number(),
    label: z.string().optional(),
    color: z.string().optional(),
  }),
  z.object({
    kind: z.literal('point-callout'),
    x: z.number(),
    y: z.number(),
    text: z.string(),
    dx: z.number().optional(),
    dy: z.number().optional(),
    color: z.string().optional(),
  }),
  z.object({
    kind: z.literal('circle'),
    x: z.number(),
    y: z.number(),
    r: z.number(),
    label: z.string().optional(),
    color: z.string().optional(),
  }),
  z.object({
    kind: z.literal('segment'),
    x1: z.number(),
    y1: z.number(),
    x2: z.number(),
    y2: z.number(),
    label: z.string().optional(),
    color: z.string().optional(),
  }),
]);

/** Data-relative emphasis; mirrors `EmphasisSpec` in goldenchart core. */
export const EmphasisSchema = z.discriminatedUnion('kind', [
  z.object({ kind: z.literal('trend'), series: z.string().optional(), method: z.enum(['linear', 'mean']).optional(), color: z.string().optional() }),
  z.object({
    kind: z.literal('auto-callout'),
    pick: z.enum(['max', 'min', 'first', 'last', 'peak']),
    series: z.string().optional(),
    template: z.string().optional(),
    color: z.string().optional(),
  }),
  z.object({ kind: z.literal('highlight-series'), id: z.string(), mode: z.enum(['emphasize', 'mute-others']).optional() }),
]);

/** Common chart dimension/vibe/a11y fields shared by every render tool. */
export const baseChartShape = {
  width: z.number().positive(),
  height: z.number().positive(),
  margin: MarginSchema.optional(),
  vibe: VibeConfigSchema.optional(),
  title: z.string().optional(),
  description: z.string().optional(),
  ariaLabel: z.string().optional(),
  dataTable: z.boolean().optional(),
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
    fill: z.string().optional(),
    maxWidth: z.number().positive().optional(),
    seed: z.number().optional(),
    vibe: VibeConfigSchema.optional(),
  }),
  // SP2 shape primitives. Angles are degrees (0 = east, clockwise); converted to
  // radians in primitiveToElement. Open kinds (`arc`, unfilled `arrowhead`)
  // suppress fill in the mapper so hachure can't smear across the open edge.
  z.object({
    kind: z.literal('polygon'),
    points: z.array(SeriesPointSchema).min(3),
    stroke: z.string().optional(),
    fill: z.string().nullable().optional(),
    seed: z.number().optional(),
    vibe: VibeConfigSchema.optional(),
  }),
  z.object({
    kind: z.literal('regular-polygon'),
    cx: z.number(),
    cy: z.number(),
    r: z.number().positive(),
    sides: z.number().int().min(3),
    rotation: z.number().optional(),
    stroke: z.string().optional(),
    fill: z.string().nullable().optional(),
    seed: z.number().optional(),
    vibe: VibeConfigSchema.optional(),
  }),
  z.object({
    kind: z.literal('star'),
    cx: z.number(),
    cy: z.number(),
    outerRadius: z.number().positive(),
    innerRadius: z.number().positive(),
    points: z.number().int().min(2),
    rotation: z.number().optional(),
    stroke: z.string().optional(),
    fill: z.string().nullable().optional(),
    seed: z.number().optional(),
    vibe: VibeConfigSchema.optional(),
  }),
  z.object({
    kind: z.literal('arc'),
    cx: z.number(),
    cy: z.number(),
    r: z.number().positive(),
    startAngle: z.number(),
    endAngle: z.number(),
    stroke: z.string().optional(),
    // No `fill`: an arc is an open stroke; the mapper always renders it unfilled.
    seed: z.number().optional(),
    vibe: VibeConfigSchema.optional(),
  }),
  z.object({
    kind: z.literal('wedge'),
    cx: z.number(),
    cy: z.number(),
    r: z.number().positive(),
    startAngle: z.number(),
    endAngle: z.number(),
    innerRadius: z.number().positive().optional(),
    stroke: z.string().optional(),
    fill: z.string().nullable().optional(),
    seed: z.number().optional(),
    vibe: VibeConfigSchema.optional(),
  }),
  z.object({
    kind: z.literal('ellipse'),
    cx: z.number(),
    cy: z.number(),
    rx: z.number().positive(),
    ry: z.number().positive(),
    stroke: z.string().optional(),
    fill: z.string().nullable().optional(),
    seed: z.number().optional(),
    vibe: VibeConfigSchema.optional(),
  }),
  z.object({
    kind: z.literal('arrowhead'),
    from: SeriesPointSchema,
    to: SeriesPointSchema,
    size: z.number().positive().optional(),
    filled: z.boolean().optional(),
    stroke: z.string().optional(),
    fill: z.string().nullable().optional(),
    seed: z.number().optional(),
    vibe: VibeConfigSchema.optional(),
  }),
  z.object({
    kind: z.literal('arrow'),
    from: SeriesPointSchema,
    to: SeriesPointSchema,
    routing: z.enum(['straight', 'curved', 'orthogonal']).optional(),
    orientation: z.enum(['horizontal', 'vertical']).optional(),
    label: z.string().optional(),
    endHead: z.boolean().optional(),
    startHead: z.boolean().optional(),
    filled: z.boolean().optional(),
    size: z.number().positive().optional(),
    stroke: z.string().optional(),
    fill: z.string().nullable().optional(),
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
