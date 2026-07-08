import { createElement, type ComponentType } from 'react';
import { z } from 'zod';
// 8 standard components + fusionToGoldenChart from the main `goldenchart` entry
// (same source `tools.ts` imports components from). ChoroplethMap +
// renderToSVGString are server-only (`goldenchart/server`).
import {
  fusionToGoldenChart,
  BarChart,
  LineChart,
  AreaChart,
  PieChart,
  ScatterPlot,
  HeatmapChart,
  TreemapChart,
  RadarChart,
} from 'goldenchart';
import { renderToSVGString, ChoroplethMap } from 'goldenchart/server';
import type { ToolDef } from './registry';
import { baseChartShape, renderOutputShape } from './schemas';

// Crosswalk-local component lookup (keeps ChoroplethMap out of visualizeTool's
// ComponentName-typed REGISTRY). Keys match fusionToGoldenChart's result.component.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const COMPONENTS: Record<string, ComponentType<any>> = {
  BarChart,
  LineChart,
  AreaChart,
  PieChart,
  ScatterPlot,
  HeatmapChart,
  TreemapChart,
  RadarChart,
  ChoroplethMap,
};

export const fusionTools: ToolDef[] = [
  {
    name: 'build_chart_from_fusioncharts',
    config: {
      title: 'Build Chart From FusionCharts',
      description:
        'Translate a FusionCharts config (JSON `{type, dataSource}`) into a GoldenChart render. Supports the common bar/column, line, area, pie/doughnut, scatter/bubble, and maps/usa families; unsupported chart types return a structured error rather than a wrong render.',
      inputSchema: { ...baseChartShape, source: z.string().min(1) },
      outputSchema: renderOutputShape,
    },
    handler: async (args) => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(args.source as string);
      } catch (err) {
        return {
          content: [{ type: 'text', text: `Invalid FusionCharts JSON: ${(err as Error).message}` }],
          isError: true,
        };
      }
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const result = fusionToGoldenChart(parsed as any);
      if ('unsupported' in result) {
        return {
          content: [
            {
              type: 'text',
              text: `Unsupported FusionCharts type "${result.unsupported.type}": ${result.unsupported.reason}`,
            },
          ],
          isError: true,
        };
      }
      const Comp = COMPONENTS[result.component];
      const svg = renderToSVGString(
        createElement(Comp, {
          ...result.props,
          width: args.width as number,
          height: args.height as number,
          vibe: args.vibe,
          bare: true,
        }),
      );
      return {
        content: [{ type: 'text', text: svg }],
        structuredContent: {
          svg,
          meta: { kind: 'fusioncharts', width: args.width as number, height: args.height as number },
        },
      };
    },
  },
];
