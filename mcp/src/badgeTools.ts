import { createElement } from 'react';
import { z } from 'zod';
import { renderToSVGString } from 'goldenchart/server';
import { Badge, BADGE_TONES, BADGE_ICONS } from 'goldenchart';
import type { ToolDef } from './registry';
import { renderOutputShape, VibeConfigSchema, BrandConfigSchema } from './schemas';
import {
  createGithubClient, GithubFetchError, type GithubClient,
} from './githubClient';

const ToneEnum = z.enum(BADGE_TONES as unknown as [string, ...string[]]);
const IconEnum = z.enum(BADGE_ICONS as unknown as [string, ...string[]]);

/**
 * Module-level seam for tests. Default `null` means "construct a fresh client
 * via `createGithubClient()` per tool invocation"; tests call
 * `__setGithubClientForTests(stub)` to inject a stub. Module-level (not arg-
 * level) so the SDK input validator doesn't strip the seam from `args`.
 */
let injectedClient: GithubClient | null = null;
export function __setGithubClientForTests(c: GithubClient | null) {
  injectedClient = c;
}
function getClient(): GithubClient {
  return injectedClient ?? createGithubClient();
}

/** Parse the intrinsic `width="N"` attribute the Badge writes into its root SVG. */
function parseSvgWidth(svg: string): number {
  const m = /<svg[^>]*\swidth="(\d+(?:\.\d+)?)"/.exec(svg);
  return m ? Math.round(Number(m[1])) : 0;
}

const badgeInputShape = {
  label: z.string().min(1),
  value: z.string().min(1),
  tone: ToneEnum.optional(),
  icon: IconEnum.optional(),
  vibe: VibeConfigSchema.optional(),
  brand: BrandConfigSchema.optional(),
  seed: z.number().optional(),
};

export const renderBadgeTool: ToolDef = {
  name: 'render-badge',
  config: {
    title: 'Render a hand-drawn badge',
    description: 'Renders a GoldenChart Badge (label/value pill) as a self-contained SVG. No network.',
    inputSchema: badgeInputShape,
    outputSchema: renderOutputShape,
  },
  handler: async (args) => {
    const svg = renderToSVGString(createElement(Badge as any, args));
    return {
      content: [{ type: 'text', text: svg }],
      structuredContent: { svg, meta: { kind: 'badge', width: parseSvgWidth(svg), height: 26 } },
    };
  },
};

export const badgeTools: ToolDef[] = [renderBadgeTool];

// Silence unused warnings for symbols re-exported for later tasks.
export { GithubFetchError };
