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
              '3. Choose the right chart: bar (categories), line/area (trends over a numeric x), scatter (correlation), pie (parts of a whole), flow (process/decisions).',
              '4. Call the matching render tool (render_bar_chart, render_line_chart, render_area_chart, render_scatter_plot, render_pie_chart, or render_flowchart) with the data and chosen vibe.',
              '5. If a raster image is needed, pass the returned SVG to export_png.',
              '',
              'Return the final SVG (or PNG) to the user.',
            ].join('\n'),
          },
        },
      ],
    }),
  );
}
