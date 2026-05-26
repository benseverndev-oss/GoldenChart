import { z } from 'zod';
import { ResourceTemplate } from '@modelcontextprotocol/sdk/server/mcp.js';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { COLOR_SCALE_NAMES, VIBE_PRESETS, colorRamp } from 'goldenchart';
import { zodToJsonSchema } from 'zod-to-json-schema';
import { chartTools, extraChartTools } from './tools';

const allChartTools = [...chartTools, ...extraChartTools];

/** Short chart type -> render tool name, for the schema resource. */
const CHART_TOOL_BY_TYPE: Record<string, string> = {
  bar: 'render_bar_chart',
  line: 'render_line_chart',
  area: 'render_area_chart',
  scatter: 'render_scatter_plot',
  pie: 'render_pie_chart',
  flow: 'render_flowchart',
  sankey: 'render_sankey',
  treemap: 'render_treemap',
  heatmap: 'render_heatmap',
  radar: 'render_radar',
};

const ARCHITECTURE_DOC = `# GoldenChart architecture

GoldenChart separates *where* things go from *how* they look:

- Calculation layer (d3-scale, d3-shape, d3-hierarchy): coordinates, path strings,
  layouts. Never touches the DOM.
- Rendering layer (roughjs): turns coordinates into hand-drawn SVG paths.
- Vibe engine: maps a semantic config (one of many named presets such as
  messy_sketch, clean_blueprint, pencil, neon, …, plus overrides) to concrete
  Rough.js options. Call list_vibe_presets or read vibe://presets for the full set.

This MCP server surfaces a tool at every level: vibe (list/resolve/preview),
calculation (compute_*), primitives (render_rough_*), charts (render_*),
and orchestration/export (compose_surface, build_flowchart_from_spec, export_*).`;

const DIAGRAM_SPEC_DOC = `# GoldenChart diagram spec

\`render_diagram\` takes one high-level spec \`{ kind, ... }\` and dispatches to the
matching hand-drawn diagram. \`build_diagram_from_mermaid\` parses a Mermaid
snippet into the same spec.

## Kinds and their fields
- **flowchart** — \`nodes: { id, label, parent?, shape?: rect|ellipse|diamond }[]\`,
  \`edges?: { from, to, label? }[]\`, \`direction?: TB|BT|LR|RL\`, \`routing?: curved|orthogonal\`.
- **org** — same shape as flowchart (boxes + elbow connectors); \`direction?\`.
- **mindmap** — \`nodes\` (a single-root tree via \`parent\`), \`edges?\`.
- **arch** — \`nodes\` with optional \`group\` (zone container), \`edges?\`, \`direction?\`;
  connectors route orthogonally around boxes.
- **sequence** — \`actors: { id, label? }[]\`, \`messages: { from, to, label?, kind?: sync|async|reply }[]\`.
- **er** — \`entities: { id, label?, fields?: { name, type?, key?: PK|FK }[] }[]\`,
  \`relationships?: { from, to, label?, fromCardinality?, toCardinality? }[]\`, \`direction?\`.
- **timeline** — \`events: { label, date?, detail? }[]\`, \`orientation?: horizontal|vertical\`.

All kinds also take the base chart props (\`width\`, \`height\`, \`vibe\`, \`title\`, …).

## Mermaid subset (build_diagram_from_mermaid)
Supported headers: \`flowchart\`/\`graph\` (directions TB/TD/BT/LR/RL; node shapes
\`[rect]\`, \`(round)\`, \`([stadium])\`, \`((circle))\`, \`{diamond}\`; edges \`-->\`, \`---\`,
labels via \`-->|text|\` or \`-- text -->\`), \`sequenceDiagram\` (\`participant X as Name\`,
messages \`A->>B: text\`, dashed \`A-->>B: text\`), and \`mindmap\` (indentation-nested
nodes). Unsupported headers (e.g. \`erDiagram\`, \`gantt\`) and constructs (notes,
loops, activations) return a structured error.`;

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
      const tool = allChartTools.find((t) => t.name === toolName);
      if (!tool) {
        throw new Error(`Unknown chart type: ${type}`);
      }
      const jsonSchema = zodToJsonSchema(z.object(tool.config.inputSchema), `${type}_chart_input`);
      return { contents: [{ uri: uri.href, mimeType: 'application/json', text: JSON.stringify(jsonSchema, null, 2) }] };
    },
  );

  server.registerResource(
    'color-scales',
    'palette://scales',
    {
      title: 'Color scales',
      description: 'Available sequential/diverging color scales with sampled swatches.',
      mimeType: 'application/json',
    },
    async (uri) => {
      const scales = COLOR_SCALE_NAMES.map((name) => ({ name, swatches: colorRamp(name, 7) }));
      return { contents: [{ uri: uri.href, mimeType: 'application/json', text: JSON.stringify({ scales }, null, 2) }] };
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

  server.registerResource(
    'diagram-spec',
    'docs://diagram-spec',
    {
      title: 'GoldenChart diagram spec',
      description: 'The render_diagram spec union and the supported Mermaid subset.',
      mimeType: 'text/markdown',
    },
    async (uri) => ({ contents: [{ uri: uri.href, mimeType: 'text/markdown', text: DIAGRAM_SPEC_DOC }] }),
  );
}
