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

const MetricEnum = z.enum([
  'stars', 'forks', 'open-issues', 'release', 'license',
  'last-commit', 'contributors', 'language', 'workflow',
]);

const githubBadgeInputShape = {
  owner: z.string().min(1),
  repo: z.string().min(1),
  metric: MetricEnum,
  workflow: z.string().optional(),
  label: z.string().optional(),
  tone: ToneEnum.optional(),
  icon: IconEnum.optional(),
  vibe: VibeConfigSchema.optional(),
  brand: BrandConfigSchema.optional(),
  seed: z.number().optional(),
};

function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1).replace(/\.0$/, '')}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1).replace(/\.0$/, '')}k`;
  return String(n);
}
function relativeDate(iso: string): string {
  const days = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 86400_000));
  if (days < 1) return 'today';
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.round(days / 30)}mo ago`;
  return `${Math.round(days / 365)}y ago`;
}

type Resolved = { label: string; value: string; tone: string; icon: string };

async function resolveMetric(
  client: GithubClient, owner: string, repo: string, metric: string, workflow?: string,
): Promise<Resolved> {
  switch (metric) {
    case 'stars': {
      const r = await client.getRepo(owner, repo);
      return { label: 'stars', value: formatCount(r.stars), tone: 'info', icon: 'star' };
    }
    case 'forks': {
      const r = await client.getRepo(owner, repo);
      return { label: 'forks', value: formatCount(r.forks), tone: 'info', icon: 'fork' };
    }
    case 'open-issues': {
      const r = await client.getRepo(owner, repo);
      return { label: 'issues', value: formatCount(r.openIssues),
        tone: r.openIssues > 0 ? 'warn' : 'success', icon: 'issue' };
    }
    case 'release': {
      const rel = await client.getLatestRelease(owner, repo);
      return { label: 'release', value: rel.tag, tone: 'info', icon: 'tag' };
    }
    case 'license': {
      const r = await client.getRepo(owner, repo);
      return { label: 'license', value: r.license ?? 'unknown', tone: 'neutral', icon: 'license' };
    }
    case 'last-commit': {
      const r = await client.getRepo(owner, repo);
      const days = Math.round((Date.now() - new Date(r.pushedAt).getTime()) / 86400_000);
      const tone = days <= 30 ? 'success' : days <= 365 ? 'warn' : 'danger';
      return { label: 'last commit', value: relativeDate(r.pushedAt), tone, icon: 'commit' };
    }
    case 'contributors': {
      const n = await client.getContributorsCount(owner, repo);
      return { label: 'contributors', value: formatCount(n), tone: 'info', icon: 'fork' };
    }
    case 'language': {
      const r = await client.getRepo(owner, repo);
      return { label: 'lang', value: r.language ?? 'unknown', tone: 'neutral', icon: 'lang' };
    }
    case 'workflow': {
      const w = await client.getWorkflowStatus(owner, repo, workflow);
      const tone = w.conclusion === 'success' ? 'success' : 'danger';
      const label = workflow ?? (w.name || 'build');
      return { label, value: w.conclusion, tone, icon: 'check' };
    }
    default:
      throw new Error(`unknown metric: ${metric}`);
  }
}

export const renderGithubBadgeTool: ToolDef = {
  name: 'render-github-badge',
  config: {
    title: 'Render a GitHub repo badge',
    description:
      'Fetches a single metric from GitHub (anonymous or with $GITHUB_TOKEN) and renders it as a hand-drawn Badge SVG. Note: the `workflow` arg, when present, is passed to GitHub as `workflow_id`, which accepts the numeric workflow ID or the workflow file name (e.g. `ci.yml`), NOT the human-readable display name; pass a file name to filter, or omit it to get the latest run across any workflow.',
    inputSchema: githubBadgeInputShape,
    outputSchema: renderOutputShape,
  },
  handler: async (args) => {
    const client = getClient();
    const { owner, repo, metric, workflow, label, tone, icon, vibe, brand, seed } =
      args as Record<string, any>;
    try {
      const resolved = await resolveMetric(client, owner, repo, metric, workflow);
      const props = {
        label: label ?? resolved.label,
        value: resolved.value,
        tone: tone ?? resolved.tone,
        icon: icon ?? resolved.icon,
        vibe, brand, seed,
      };
      const svg = renderToSVGString(createElement(Badge as any, props));
      return {
        content: [{ type: 'text', text: svg }],
        structuredContent: { svg, meta: { kind: 'github-badge', width: parseSvgWidth(svg), height: 26 } },
      };
    } catch (e) {
      const kind = e instanceof GithubFetchError ? e.kind : 'unexpected';
      return {
        content: [{ type: 'text', text: `github-badge error: ${kind}: ${(e as Error).message}` }],
        structuredContent: { error: { kind, message: (e as Error).message } },
        isError: true,
      };
    }
  },
};

export const badgeTools: ToolDef[] = [renderBadgeTool];
badgeTools.push(renderGithubBadgeTool);

// Re-exported for symmetry; consumed internally too.
export { GithubFetchError };
