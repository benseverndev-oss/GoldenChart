import { z } from 'zod';
import { BarChart } from 'goldenchart';
import { makeRenderTool } from './registry';
import type { ToolDef } from './registry';
import { baseChartShape, ChartDatumSchema } from './schemas';

/**
 * The MCP tool catalog. Each chart is one `makeRenderTool` entry; the server
 * iterates this array to register tools and route calls.
 */
export const tools: ToolDef[] = [
  makeRenderTool({
    name: 'render_bar_chart',
    title: 'Render Bar Chart',
    description: 'Render a hand-drawn (sketchy) bar chart as a standalone SVG.',
    kind: 'bar',
    component: BarChart,
    inputShape: {
      ...baseChartShape,
      data: z.array(ChartDatumSchema).min(1),
      showAxes: z.boolean().optional(),
      showGrid: z.boolean().optional(),
    },
  }),
];
