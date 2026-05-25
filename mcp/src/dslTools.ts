import { renderDiagram } from 'goldenchart';
import type { DiagramSpec, VibeConfig } from 'goldenchart';
import { renderToSVGString } from 'goldenchart/server';
import type { ToolDef } from './registry';
import { DiagramSpecSchema, baseChartShape, renderOutputShape } from './schemas';

function render(spec: DiagramSpec, args: Record<string, unknown>): string {
  return renderToSVGString(
    renderDiagram(spec, {
      width: args.width as number,
      height: args.height as number,
      vibe: args.vibe as VibeConfig | undefined,
      title: args.title as string | undefined,
      description: args.description as string | undefined,
      bare: true,
    }),
  );
}

/** Level 4 — the diagram DSL: one spec in, the right hand-drawn diagram out. */
export const dslTools: ToolDef[] = [
  {
    name: 'render_diagram',
    config: {
      title: 'Render Diagram',
      description:
        'Render any diagram from one high-level spec `{ kind, ... }`. Dispatches by kind to flowchart / sequence / mindmap / arch / er / timeline / org — the single entry point for diagrams.',
      inputSchema: { ...baseChartShape, spec: DiagramSpecSchema },
      outputSchema: renderOutputShape,
    },
    handler: async (args) => {
      const spec = args.spec as DiagramSpec;
      const svg = render(spec, args);
      return {
        content: [{ type: 'text', text: svg }],
        structuredContent: { svg, meta: { kind: spec.kind, width: args.width as number, height: args.height as number } },
      };
    },
  },
];
