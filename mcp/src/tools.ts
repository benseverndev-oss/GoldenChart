import { z } from 'zod';
import {
  AreaChart,
  BarChart,
  Flowchart,
  HeatmapChart,
  LineChart,
  PieChart,
  RadarChart,
  SankeyChart,
  ScatterPlot,
  TreemapChart,
} from 'goldenchart';
import { makeRenderTool } from './registry';
import type { ToolDef } from './registry';
import { vibeTools } from './vibeTools';
import { calcTools } from './calcTools';
import { primitiveTools } from './primitiveTools';
import { orchestrationTools } from './orchestrationTools';
import { exportTools } from './exportTools';
import {
  AnnotationSchema,
  baseChartShape,
  BarModeSchema,
  ChartDatumSchema,
  ColorScaleNameSchema,
  CurveSchema,
  EdgeRoutingSchema,
  FlowDirectionSchema,
  FlowEdgeSchema,
  FlowNodeSchema,
  HeatmapDatumSchema,
  MultiSeriesDatumSchema,
  RadarSeriesSchema,
  SankeyLinkSchema,
  SankeyNodeSchema,
  ScatterDatumSchema,
  SeriesSchema,
  TreemapDatumSchema,
} from './schemas';

const axesShape = {
  showAxes: z.boolean().optional(),
  showGrid: z.boolean().optional(),
};

const annotationsShape = {
  annotations: z.array(AnnotationSchema).optional(),
};

/**
 * The MCP tool catalog. Each chart is one `makeRenderTool` entry; the server
 * iterates this array to register tools and route calls. Adding a chart is one
 * entry here plus its input shape.
 */
export const chartTools: ToolDef[] = [
  makeRenderTool({
    name: 'render_bar_chart',
    title: 'Render Bar Chart',
    description: 'Render a hand-drawn (sketchy) bar chart as a standalone SVG.',
    kind: 'bar',
    component: BarChart,
    inputShape: {
      ...baseChartShape,
      ...axesShape,
      ...annotationsShape,
      data: z.union([z.array(ChartDatumSchema).min(1), z.array(MultiSeriesDatumSchema).min(1)]),
      mode: BarModeSchema.optional(),
      seriesKeys: z.array(z.string()).optional(),
      showLegend: z.boolean().optional(),
    },
  }),
  makeRenderTool({
    name: 'render_line_chart',
    title: 'Render Line Chart',
    description: 'Render a hand-drawn multi-series line chart as a standalone SVG.',
    kind: 'line',
    component: LineChart,
    inputShape: {
      ...baseChartShape,
      ...axesShape,
      ...annotationsShape,
      series: z.array(SeriesSchema).min(1),
      curve: CurveSchema.optional(),
      showPoints: z.boolean().optional(),
    },
  }),
  makeRenderTool({
    name: 'render_area_chart',
    title: 'Render Area Chart',
    description: 'Render a hand-drawn filled area chart as a standalone SVG.',
    kind: 'area',
    component: AreaChart,
    inputShape: {
      ...baseChartShape,
      ...axesShape,
      ...annotationsShape,
      series: z.array(SeriesSchema).min(1),
      curve: CurveSchema.optional(),
      baseline: z.number().optional(),
      showLine: z.boolean().optional(),
      stacked: z.boolean().optional(),
    },
  }),
  makeRenderTool({
    name: 'render_scatter_plot',
    title: 'Render Scatter Plot',
    description: 'Render a hand-drawn scatter / bubble plot as a standalone SVG.',
    kind: 'scatter',
    component: ScatterPlot,
    inputShape: {
      ...baseChartShape,
      ...axesShape,
      ...annotationsShape,
      data: z.array(ScatterDatumSchema).min(1),
      radius: z.number().optional(),
      maxRadius: z.number().optional(),
    },
  }),
  makeRenderTool({
    name: 'render_pie_chart',
    title: 'Render Pie / Donut Chart',
    description: 'Render a hand-drawn pie or donut chart as a standalone SVG.',
    kind: 'pie',
    component: PieChart,
    inputShape: {
      ...baseChartShape,
      data: z.array(ChartDatumSchema).min(1),
      innerRadius: z.number().optional(),
      padAngle: z.number().optional(),
      showLabels: z.boolean().optional(),
    },
  }),
  makeRenderTool({
    name: 'render_flowchart',
    title: 'Render Flowchart',
    description:
      'Render a hand-drawn flowchart (tree layout, four directions, rect/ellipse/diamond nodes, curved or orthogonal edges) as a standalone SVG.',
    kind: 'flow',
    component: Flowchart,
    inputShape: {
      ...baseChartShape,
      nodes: z.array(FlowNodeSchema).min(1),
      edges: z.array(FlowEdgeSchema).optional(),
      direction: FlowDirectionSchema.optional(),
      routing: EdgeRoutingSchema.optional(),
      showArrowheads: z.boolean().optional(),
    },
  }),
];

/** Charts added beyond the original six; kept separate so the M1 catalog/tests stay stable. */
export const extraChartTools: ToolDef[] = [
  makeRenderTool({
    name: 'render_sankey',
    title: 'Render Sankey Diagram',
    description: 'Render a hand-drawn weighted flow (Sankey) diagram as a standalone SVG.',
    kind: 'sankey',
    component: SankeyChart,
    inputShape: {
      ...baseChartShape,
      nodes: z.array(SankeyNodeSchema).min(1),
      links: z.array(SankeyLinkSchema),
      direction: z.enum(['LR', 'TB']).optional(),
      nodeWidth: z.number().optional(),
      nodePadding: z.number().optional(),
      showValues: z.boolean().optional(),
    },
  }),
  makeRenderTool({
    name: 'render_treemap',
    title: 'Render Treemap',
    description: 'Render a hand-drawn treemap (nested rectangles sized by value) as a standalone SVG.',
    kind: 'treemap',
    component: TreemapChart,
    inputShape: {
      ...baseChartShape,
      data: z.array(TreemapDatumSchema).min(1),
      padding: z.number().optional(),
      tile: z.enum(['squarify', 'binary', 'slice', 'dice']).optional(),
      showLabels: z.boolean().optional(),
    },
  }),
  makeRenderTool({
    name: 'render_heatmap',
    title: 'Render Heatmap',
    description: 'Render a hand-drawn heatmap (grid of cells on a sequential color scale) as a standalone SVG.',
    kind: 'heatmap',
    component: HeatmapChart,
    inputShape: {
      ...baseChartShape,
      data: z.array(HeatmapDatumSchema).min(1),
      xLabels: z.array(z.union([z.string(), z.number()])).optional(),
      yLabels: z.array(z.union([z.string(), z.number()])).optional(),
      colorScale: ColorScaleNameSchema.optional(),
      showValues: z.boolean().optional(),
      showAxes: z.boolean().optional(),
    },
  }),
  makeRenderTool({
    name: 'render_radar',
    title: 'Render Radar Chart',
    description: 'Render a hand-drawn radar / spider chart (polar multi-axis) as a standalone SVG.',
    kind: 'radar',
    component: RadarChart,
    inputShape: {
      ...baseChartShape,
      axes: z.array(z.string()).min(3),
      series: z.array(RadarSeriesSchema).min(1),
      maxValue: z.number().optional(),
      levels: z.number().int().positive().optional(),
      showDots: z.boolean().optional(),
      showLabels: z.boolean().optional(),
    },
  }),
];

/** The full catalog the server registers across every level. */
export const tools: ToolDef[] = [
  ...chartTools,
  ...extraChartTools,
  ...vibeTools,
  ...calcTools,
  ...primitiveTools,
  ...orchestrationTools,
  ...exportTools,
];
