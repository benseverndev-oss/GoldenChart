import { createElement } from 'react';
import type { ComponentType } from 'react';
import type { z } from 'zod';
import { renderToSVGString } from '@benseverndev-oss/goldenchart/server';
import { renderOutputShape } from './schemas';

export interface ToolResult {
  // The SDK's CallToolResult carries a string index signature; mirror it so our
  // handlers are assignable to `registerTool`.
  [key: string]: unknown;
  content: { type: 'text'; text: string }[];
  structuredContent?: Record<string, unknown>;
  isError?: boolean;
}

export interface ToolDef {
  name: string;
  config: {
    title: string;
    description: string;
    inputSchema: z.ZodRawShape;
    outputSchema?: z.ZodRawShape;
  };
  handler: (args: Record<string, unknown>) => Promise<ToolResult>;
}

/**
 * Build a render tool from a chart component. Every chart shares this codepath:
 * validate (done by the SDK against `inputShape`) → render the component in
 * `bare` mode via the headless renderer → return SVG + metadata. Adding a chart
 * is one call to this factory.
 */
export function makeRenderTool(opts: {
  name: string;
  title: string;
  description: string;
  kind: string;
  inputShape: z.ZodRawShape;
  component: ComponentType<any>;
}): ToolDef {
  return {
    name: opts.name,
    config: {
      title: opts.title,
      description: opts.description,
      inputSchema: opts.inputShape,
      outputSchema: renderOutputShape,
    },
    handler: async (args) => {
      const svg = renderToSVGString(createElement(opts.component, { ...args, bare: true }));
      const structuredContent = {
        svg,
        meta: { kind: opts.kind, width: args.width as number, height: args.height as number },
      };
      return { content: [{ type: 'text', text: svg }], structuredContent };
    },
  };
}
