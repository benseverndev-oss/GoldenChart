import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

/** Register the guided prompts that steer first-time tool callers. */
export function registerPrompts(server: McpServer): void {
  server.registerPrompt(
    'make-me-a-chart',
    {
      title: 'Make me a chart',
      description: 'Guided flow: pick a vibe from the mood, choose a chart for the data, then render it.',
      argsSchema: { dataDescription: z.string(), mood: z.string().optional() },
    },
    ({ dataDescription, mood }) => ({
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              'You are creating a hand-drawn chart with the GoldenChart MCP tools. Follow these steps:',
              '',
              `1. The data to visualize: ${dataDescription}`,
              mood
                ? `2. Desired mood: "${mood}". Call list_vibe_presets, pick the closest preset, and (optionally) call resolve_vibe to fine-tune it.`
                : '2. Call list_vibe_presets and pick a preset that suits the data (default: messy_sketch).',
              '3. Fastest path: if you have the data as records, call visualize_data with the data (and an optional intent like "trend"/"composition") and the chosen vibe — it profiles the data, picks the best-fit chart, and returns the SVG plus the rationale and alternatives.',
              '4. Manual path: if you want a specific chart, call the matching render tool (render_bar_chart, render_line_chart, render_area_chart, render_scatter_plot, render_pie_chart, render_flowchart, render_sankey, render_treemap, render_heatmap, render_radar) with the data and vibe.',
              '5. If a raster image is needed, pass the returned SVG to export_png.',
              '',
              'Return the final SVG (or PNG) to the user, and mention which chart was chosen and why if you used visualize_data.',
            ].join('\n'),
          },
        },
      ],
    }),
  );
}
