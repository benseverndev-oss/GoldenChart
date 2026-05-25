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
import type { EdgeRouting, FlowEdge, FlowNode, FlowNodeShape, VibeConfig } from 'goldenchart';
import { renderToSVGString } from 'goldenchart/server';
import type { ToolDef } from './registry';
import { primitiveToElement } from './primitives';
import type { PrimitiveSpec, SceneNode } from './schemas';
import {
  EdgeRoutingSchema,
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

/** Pick a node shape from light structural heuristics (in/out degree). */
function pickShape(node: FlowNode, inDegree: number, outDegree: number): FlowNodeShape {
  if (inDegree === 0) return 'ellipse'; // root / entry
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
        routing: EdgeRoutingSchema.optional(),
        autoShape: z.boolean().optional(),
        width: z.number().positive(),
        height: z.number().positive(),
        vibe: VibeConfigSchema.optional(),
      },
      outputSchema: renderOutputShape,
    },
    handler: async (args) => {
      const nodes = args.nodes as FlowNode[];
      const explicitEdges = args.edges as FlowEdge[] | undefined;
      const autoShape = (args.autoShape as boolean | undefined) ?? true;

      // Degree counts drive the shape heuristic. Prefer explicit edges (which
      // can express merges/DAGs); fall back to the `parent` tree links.
      const degreeEdges: FlowEdge[] =
        explicitEdges && explicitEdges.length > 0
          ? explicitEdges
          : nodes.filter((n) => n.parent != null).map((n) => ({ from: n.parent as string, to: n.id }));
      const inDegree = new Map<string, number>();
      const outDegree = new Map<string, number>();
      for (const edge of degreeEdges) {
        outDegree.set(edge.from, (outDegree.get(edge.from) ?? 0) + 1);
        inDegree.set(edge.to, (inDegree.get(edge.to) ?? 0) + 1);
      }

      const shaped = autoShape
        ? nodes.map((node) => ({
            ...node,
            shape: node.shape ?? pickShape(node, inDegree.get(node.id) ?? 0, outDegree.get(node.id) ?? 0),
          }))
        : nodes;

      const width = args.width as number;
      const height = args.height as number;
      const svg = renderToSVGString(
        createElement(Flowchart, {
          width,
          height,
          vibe: args.vibe as VibeConfig | undefined,
          nodes: shaped,
          edges: explicitEdges,
          direction: (args.direction as 'TB' | 'BT' | 'LR' | 'RL' | undefined) ?? 'TB',
          routing: (args.routing as EdgeRouting | undefined) ?? 'curved',
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
