import { createElement } from 'react';
import type { ComponentType, ReactElement } from 'react';
import { z } from 'zod';
import {
  Surface,
  BarChart,
  LineChart,
  AreaChart,
  ScatterPlot,
  PieChart,
  Flowchart,
} from 'goldenchart';
import type { FlowEdge, FlowNode, FlowNodeShape, VibeConfig } from 'goldenchart';
import { renderToSVGString } from 'goldenchart/server';
import type { ToolDef } from './registry';
import { primitiveToElement } from './primitives';
import type { PrimitiveSpec, SceneNode } from './schemas';
import {
  FlowDirectionSchema,
  FlowEdgeSchema,
  FlowNodeSchema,
  SceneNodeSchema,
  VibeConfigSchema,
  renderOutputShape,
} from './schemas';

const CHART_COMPONENTS: Record<string, ComponentType<any>> = {
  bar: BarChart,
  line: LineChart,
  area: AreaChart,
  scatter: ScatterPlot,
  pie: PieChart,
  flow: Flowchart,
};

function sceneNodeToElement(node: SceneNode, key: number, sceneVibe: VibeConfig | undefined): ReactElement {
  if (node.kind === 'chart') {
    const Component = CHART_COMPONENTS[node.chart];
    const chart = createElement(Component, {
      width: node.width,
      height: node.height,
      vibe: sceneVibe,
      bare: true,
      ...(node.props ?? {}),
    });
    const at = node.at ?? { x: 0, y: 0 };
    return createElement('g', { key, transform: `translate(${at.x}, ${at.y})` }, chart);
  }
  return primitiveToElement(node as PrimitiveSpec, key);
}

/** Pick a node shape from light structural heuristics. */
function pickShape(node: FlowNode, outDegree: number): FlowNodeShape {
  if (!node.parent) return 'ellipse'; // root / entry
  if (outDegree === 0) return 'ellipse'; // terminal
  if (node.label.trim().endsWith('?') || outDegree > 1) return 'diamond'; // decision / branch
  return 'rect';
}

/** Level 4 — combine fragments and build diagrams from intent. */
export const orchestrationTools: ToolDef[] = [
  {
    name: 'compose_surface',
    config: {
      title: 'Compose Surface',
      description:
        'Render a list of scene nodes (primitives and positioned charts) into a single SVG with one shared vibe.',
      inputSchema: {
        width: z.number().positive(),
        height: z.number().positive(),
        vibe: VibeConfigSchema.optional(),
        children: z.array(SceneNodeSchema).min(1),
      },
      outputSchema: renderOutputShape,
    },
    handler: async (args) => {
      const width = args.width as number;
      const height = args.height as number;
      const vibe = args.vibe as VibeConfig | undefined;
      const children = (args.children as SceneNode[]).map((node, i) => sceneNodeToElement(node, i, vibe));
      const svg = renderToSVGString(createElement(Surface, { width, height, vibe, bare: true }, children));
      return {
        content: [{ type: 'text', text: svg }],
        structuredContent: { svg, meta: { kind: 'composed', width, height } },
      };
    },
  },
  {
    name: 'build_flowchart_from_spec',
    config: {
      title: 'Build Flowchart From Spec',
      description:
        'Render a flowchart, auto-assigning node shapes (entry/terminal -> ellipse, decision/branch -> diamond, else rect) unless shapes are given.',
      inputSchema: {
        nodes: z.array(FlowNodeSchema).min(1),
        edges: z.array(FlowEdgeSchema).optional(),
        direction: FlowDirectionSchema.optional(),
        autoShape: z.boolean().optional(),
        width: z.number().positive(),
        height: z.number().positive(),
        vibe: VibeConfigSchema.optional(),
      },
      outputSchema: renderOutputShape,
    },
    handler: async (args) => {
      const nodes = args.nodes as FlowNode[];
      const autoShape = (args.autoShape as boolean | undefined) ?? true;

      const outDegree = new Map<string, number>();
      for (const node of nodes) {
        if (node.parent) outDegree.set(node.parent, (outDegree.get(node.parent) ?? 0) + 1);
      }

      const shaped = autoShape
        ? nodes.map((node) => ({ ...node, shape: node.shape ?? pickShape(node, outDegree.get(node.id) ?? 0) }))
        : nodes;

      const width = args.width as number;
      const height = args.height as number;
      const svg = renderToSVGString(
        createElement(Flowchart, {
          width,
          height,
          vibe: args.vibe as VibeConfig | undefined,
          nodes: shaped,
          edges: args.edges as FlowEdge[] | undefined,
          direction: (args.direction as 'TB' | 'BT' | 'LR' | 'RL' | undefined) ?? 'TB',
          bare: true,
        }),
      );
      return {
        content: [{ type: 'text', text: svg }],
        structuredContent: { svg, meta: { kind: 'flow', width, height } },
      };
    },
  },
];
