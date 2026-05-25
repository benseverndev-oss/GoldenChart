import { z } from 'zod';
import { AreaChart, BarChart, Flowchart, LineChart, PieChart, ScatterPlot } from 'goldenchart';
import { makeRenderTool } from './registry';
import type { ToolDef } from './registry';
import { vibeTools } from './vibeTools';
import { calcTools } from './calcTools';
import { primitiveTools } from './primitiveTools';
import { orchestrationTools } from './orchestrationTools';
import { exportTools } from './exportTools';
import {
  baseChartShape,
  ChartDatumSchema,
  CurveSchema,
  EdgeRoutingSchema,
  FlowDirectionSchema,
  FlowEdgeSchema,
  FlowNodeSchema,
  ScatterDatumSchema,
  SeriesSchema,
} from './schemas';

const axesShape = {
  showAxes: z.boolean().optional(),
  showGrid: z.boolean().optional(),
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
      data: z.array(ChartDatumSchema).min(1),
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
      series: z.array(SeriesSchema).min(1),
      curve: CurveSchema.optional(),
      baseline: z.number().optional(),
      showLine: z.boolean().optional(),
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

/** The full catalog the server registers across every level. */
export const tools: ToolDef[] = [
  ...chartTools,
  ...vibeTools,
  ...calcTools,
  ...primitiveTools,
  ...orchestrationTools,
  ...exportTools,
];
