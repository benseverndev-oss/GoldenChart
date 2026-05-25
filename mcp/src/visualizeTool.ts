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
        'Profile raw records, auto-pick the best-fit chart, and render it as SVG. Returns the chosen chart with its rationale plus ranked alternatives.',
      inputSchema: {
        data: z.array(z.record(z.unknown())).min(1),
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
      },
    },
    handler: async (args) => {
      const data = args.data as Record<string, unknown>[];
      const recs = recommendChart(profileData(data), args.intent as Intent | undefined);
      const rec = recs[0];
      const compiled = compileChart(data, rec);
      const svg = renderToSVGString(
        createElement(REGISTRY[compiled.component], {
          ...compiled.props,
          width: args.width as number,
          height: args.height as number,
          vibe: args.vibe as VibeConfig | undefined,
          bare: true,
        }),
      );
      const structuredContent = {
        svg,
        chosen: summarize(rec),
        alternatives: recs.slice(1, 4).map(summarize),
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
        data: z.array(z.record(z.unknown())).min(1),
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
            fix: z.record(z.unknown()).optional(),
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
