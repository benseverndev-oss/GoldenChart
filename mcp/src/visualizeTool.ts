import { createElement } from 'react';
import type { ComponentType } from 'react';
import { z } from 'zod';
import {
  AreaChart,
  BarChart,
  HeatmapChart,
  LineChart,
  PieChart,
  RadarChart,
  SankeyChart,
  ScatterPlot,
  TreemapChart,
  compileChart,
  critiqueChart,
  planChart,
  profileData,
  recommendChart,
} from 'goldenchart';
import type { ComponentName, Critique, Intent, VibeConfig } from 'goldenchart';
import { renderToSVGString } from 'goldenchart/server';
import type { ToolDef } from './registry';
import { VibeConfigSchema } from './schemas';

const REGISTRY: Record<ComponentName, ComponentType<any>> = {
  BarChart,
  LineChart,
  AreaChart,
  ScatterPlot,
  PieChart,
  HeatmapChart,
  SankeyChart,
  TreemapChart,
  RadarChart,
};

const summarize = (r: { chartType: string; rationale: string; confidence: number }) => ({
  chartType: r.chartType,
  rationale: r.rationale,
  confidence: r.confidence,
});

/** Level 4 — the smart entry point: data in, the right chart (+ rationale) out. */
export const visualizeTools: ToolDef[] = [
  {
    name: 'visualize_data',
    config: {
      title: 'Visualize Data',
      description:
        'Profile raw records, auto-pick the best-fit chart, and render it as SVG. Optionally pass a plain-English `query` (e.g. "revenue by month as a line in pencil") to steer the chart type, field roles, and vibe. Returns the chosen chart with its rationale, ranked alternatives, and — when a query is given — how the query was interpreted.',
      inputSchema: {
        data: z.array(z.record(z.string(), z.unknown())).min(1),
        query: z
          .string()
          .optional()
          .describe('Plain-English description, e.g. "compare revenue by region as a pie".'),
        intent: z
          .enum(['trend', 'compare', 'composition', 'distribution', 'correlation', 'flow', 'hierarchy'])
          .optional(),
        width: z.number().positive(),
        height: z.number().positive(),
        vibe: VibeConfigSchema.optional(),
      },
      outputSchema: {
        svg: z.string(),
        chosen: z.object({ chartType: z.string(), rationale: z.string(), confidence: z.number() }),
        alternatives: z.array(z.object({ chartType: z.string(), rationale: z.string(), confidence: z.number() })),
        interpretation: z
          .object({
            intent: z.string().optional(),
            chartType: z.string().optional(),
            roles: z.record(z.string(), z.string()).optional(),
            vibe: z.unknown().optional(),
            unresolved: z.array(z.string()),
            confidence: z.number(),
          })
          .optional(),
      },
    },
    handler: async (args) => {
      const data = args.data as Record<string, unknown>[];
      const plan = planChart(data, {
        query: args.query as string | undefined,
        intent: args.intent as Intent | undefined,
      });
      const { compiled, recommendation, alternatives, hints } = plan;
      const svg = renderToSVGString(
        createElement(REGISTRY[compiled.component], {
          ...compiled.props,
          width: args.width as number,
          height: args.height as number,
          // explicit vibe arg wins over a vibe parsed from the query
          vibe: (args.vibe as VibeConfig | undefined) ?? (compiled.props.vibe as VibeConfig | undefined),
          bare: true,
        }),
      );
      const structuredContent = {
        svg,
        chosen: summarize(recommendation),
        alternatives: alternatives.slice(0, 3).map(summarize),
        ...(args.query ? { interpretation: hints } : {}),
      };
      return { content: [{ type: 'text', text: svg }], structuredContent };
    },
  },
  {
    name: 'suggest_improvements',
    config: {
      title: 'Suggest Improvements',
      description:
        'Profile data, pick the best-fit chart, and critique it for common dataviz mistakes (too many categories, label collisions, misleading pies, too many colours, …). Returns actionable critiques (with fix patches) an agent can act on in a refine loop, plus the rendered chart.',
      inputSchema: {
        data: z.array(z.record(z.string(), z.unknown())).min(1),
        intent: z
          .enum(['trend', 'compare', 'composition', 'distribution', 'correlation', 'flow', 'hierarchy'])
          .optional(),
        width: z.number().positive(),
        height: z.number().positive(),
        vibe: VibeConfigSchema.optional(),
      },
      outputSchema: {
        svg: z.string(),
        chosen: z.object({ chartType: z.string(), rationale: z.string(), confidence: z.number() }),
        critiques: z.array(
          z.object({
            severity: z.enum(['info', 'warn']),
            rule: z.string(),
            message: z.string(),
            fix: z.record(z.string(), z.unknown()).optional(),
          }),
        ),
      },
    },
    handler: async (args) => {
      const data = args.data as Record<string, unknown>[];
      const width = args.width as number;
      const profile = profileData(data);
      const rec = recommendChart(profile, args.intent as Intent | undefined)[0];
      const compiled = compileChart(data, rec);
      const critiques: Critique[] = critiqueChart(compiled, profile, { width });
      const svg = renderToSVGString(
        createElement(REGISTRY[compiled.component], {
          ...compiled.props,
          width,
          height: args.height as number,
          vibe: args.vibe as VibeConfig | undefined,
          bare: true,
        }),
      );
      return {
        content: [{ type: 'text', text: JSON.stringify(critiques, null, 2) }],
        structuredContent: { svg, chosen: summarize(rec), critiques },
      };
    },
  },
];
