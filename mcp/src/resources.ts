import { z } from 'zod';
import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { VIBE_PRESETS } from 'goldenchart';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { chartTools } from './tools';

/** Short chart type -> render tool name, for the schema resource. */
const CHART_TOOL_BY_TYPE: Record<string, string> = {
  bar: 'render_bar_chart',
  line: 'render_line_chart',
  area: 'render_area_chart',
  scatter: 'render_scatter_plot',
  pie: 'render_pie_chart',
  flow: 'render_flowchart',
};

const ARCHITECTURE_DOC = `# GoldenChart architecture

GoldenChart separates *where* things go from *how* they look:

- Calculation layer (d3-scale, d3-shape, d3-hierarchy): coordinates, path strings,
  layouts. Never touches the DOM.
- Rendering layer (roughjs): turns coordinates into hand-drawn SVG paths.
- Vibe engine: maps a semantic config (messy_sketch | clean_blueprint |
  chaotic_notebook, plus overrides) to concrete Rough.js options.

This MCP server surfaces a tool at every level: vibe (list/resolve/preview),
calculation (compute_*), primitives (render_rough_*), charts (render_*),
and orchestration/export (compose_surface, build_flowchart_from_spec, export_*).`;

/** Register the read-only resources: vibe presets, per-chart schemas, docs. */
export function registerResources(server: McpServer): void {
  server.registerResource(
    'vibe-presets',
    'vibe://presets',
    {
      title: 'Vibe presets',
      description: 'Every built-in vibe preset with its fully-resolved Rough.js knobs.',
      mimeType: 'application/json',
    },
    async (uri) => {
      const presets = Object.entries(VIBE_PRESETS).map(([name, resolved]) => ({ name, resolved }));
      return { contents: [{ uri: uri.href, mimeType: 'application/json', text: JSON.stringify({ presets }, null, 2) }] };
    },
  );

  server.registerResource(
    'chart-schema',
    new ResourceTemplate('schema://chart/{type}', {
      list: async () => ({
        resources: Object.keys(CHART_TOOL_BY_TYPE).map((type) => ({
          uri: `schema://chart/${type}`,
          name: `${type} chart input schema`,
          mimeType: 'application/json',
        })),
      }),
    }),
    {
      title: 'Chart input schemas',
      description: 'JSON Schema for each chart render tool, derived from its Zod input schema.',
      mimeType: 'application/json',
    },
    async (uri, variables) => {
      const type = Array.isArray(variables.type) ? variables.type[0] : variables.type;
      const toolName = CHART_TOOL_BY_TYPE[type];
      const tool = chartTools.find((t) => t.name === toolName);
      if (!tool) {
        throw new Error(`Unknown chart type: ${type}`);
      }
      const jsonSchema = zodToJsonSchema(z.object(tool.config.inputSchema), `${type}_chart_input`);
      return { contents: [{ uri: uri.href, mimeType: 'application/json', text: JSON.stringify(jsonSchema, null, 2) }] };
    },
  );

  server.registerResource(
    'architecture',
    'docs://architecture',
    {
      title: 'GoldenChart architecture',
      description: 'How the calculation, rendering, and vibe layers fit together.',
      mimeType: 'text/markdown',
    },
    async (uri) => ({ contents: [{ uri: uri.href, mimeType: 'text/markdown', text: ARCHITECTURE_DOC }] }),
  );
}
