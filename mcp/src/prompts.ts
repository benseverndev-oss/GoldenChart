import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

/** Register the guided prompts that steer first-time tool callers. */
export function registerPrompts(server: McpServer): void {
  server.registerPrompt(
    'make-me-a-chart',
    {
      title: 'Make me a chart',
      description:
        'Guided flow: pick a vibe from the mood, choose a chart for the data, then render it.',
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

  server.registerPrompt(
    'make-me-a-diagram',
    {
      title: 'Make me a diagram',
      description:
        'Guided flow: pick a vibe, describe the diagram, then render it from a spec or Mermaid.',
      argsSchema: { diagramDescription: z.string(), mood: z.string().optional() },
    },
    ({ diagramDescription, mood }) => ({
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              'You are creating a hand-drawn diagram with the GoldenChart MCP tools. Follow these steps:',
              '',
              `1. The diagram to create: ${diagramDescription}`,
              mood
                ? `2. Desired mood: "${mood}". Call list_vibe_presets, pick the closest preset, optionally fine-tune with resolve_vibe.`
                : '2. Call list_vibe_presets and pick a preset (default: messy_sketch).',
              '3. Read docs://diagram-spec to see the diagram kinds (flowchart, sequence, mindmap, arch, er, timeline, org) and their fields, plus the supported Mermaid subset.',
              '4. Already have Mermaid? Call build_diagram_from_mermaid with the source and chosen vibe.',
              '5. Otherwise call render_diagram with a spec `{ kind, ... }` for the chosen diagram type and the vibe.',
              '6. If a raster image is needed, pass the returned SVG to export_png.',
              '',
              'Return the final SVG (or PNG) and mention which diagram kind you used.',
            ].join('\n'),
          },
        },
      ],
    }),
  );

  server.registerPrompt(
    'iterate-until-good',
    {
      title: 'Iterate until good',
      description:
        'Refine loop: pick a chart for the data, critique it, apply the highest-severity fix, re-render, repeat. Stops when critiques are empty or `maxIterations` is reached.',
      argsSchema: {
        dataDescription: z.string(),
        maxIterations: z.string().optional(),
      },
    },
    ({ dataDescription, maxIterations }) => ({
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              'You are refining a hand-drawn chart with the GoldenChart MCP tools. Follow this loop:',
              '',
              `1. The data to visualize: ${dataDescription}`,
              `2. Call suggest_improvements with the data, width, and height. Note the chosen chart, the SVG, and the \`critiques\` array. Each critique has a stable \`rule\`, a \`severity\` (\`warn\` outranks \`info\`), and an optional machine-readable \`fix\`.`,
              `3. If \`critiques\` is empty, return the SVG — you're done.`,
              `4. Otherwise pick the highest-severity critique that carries a \`fix\` (prefer \`warn\` over \`info\`). Call render_with_revision with the *original* data, the same width/height/vibe, and \`revisions\` set to the critique's \`fix\` object. Supported fix fields: \`keepTopCategories\`, \`groupRemainderAs\`, \`maxSeries\`, \`chartType\`.`,
              `5. Inspect the new \`critiques\` returned by render_with_revision. If it's smaller (or empty), keep iterating from step 3 using the new chart's recommendations. Cap the loop at ${maxIterations ?? '3'} iterations to avoid thrashing.`,
              `6. Return the final SVG and a short log of which revisions you applied at each step.`,
              '',
              "Don't apply the same revision twice; if a critique persists after one fix, try the next-highest critique instead of repeating.",
            ].join('\n'),
          },
        },
      ],
    }),
  );

  server.registerPrompt(
    'compose-a-figure',
    {
      title: 'Compose a figure',
      description:
        'Guided flow: pick a vibe, then assemble a custom figure from scene-node primitives and shapes with compose_surface.',
      argsSchema: { figureDescription: z.string(), mood: z.string().optional() },
    },
    ({ figureDescription, mood }) => ({
      messages: [
        {
          role: 'user' as const,
          content: {
            type: 'text' as const,
            text: [
              'You are composing a custom hand-drawn figure with the GoldenChart MCP tools. Use this when the result is not a single standard chart or diagram, but an arbitrary arrangement of shapes, labels, arrows, and (optionally) embedded charts. Follow these steps:',
              '',
              `1. The figure to build: ${figureDescription}`,
              mood
                ? `2. Desired mood: "${mood}". Call list_vibe_presets, pick the closest preset, optionally fine-tune with resolve_vibe.`
                : '2. Call list_vibe_presets and pick a preset (default: messy_sketch).',
              '3. Read docs://compose-spec for the scene-node kinds (primitives, shapes like regular-polygon/star/arc/wedge/ellipse/arrowhead/arrow, and positioned charts) and their fields and angle conventions.',
              '4. Lay out the figure: choose coordinates within your width/height and build a `children` array of scene nodes `{ kind, ... }`. Shape kinds go straight in `children`; only call the compute_* calc tools if you need a raw `d` for a custom `path` node.',
              '5. Call compose_surface with `{ width, height, vibe, children }` to render the whole figure as one SVG.',
              '6. If a raster image is needed, pass the returned SVG to export_png.',
              '',
              'Return the final SVG (or PNG).',
            ].join('\n'),
          },
        },
      ],
    }),
  );
}
