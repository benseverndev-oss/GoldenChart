# GitHub Badge Rendering Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship a hand-drawn GitHub-style `Badge` library component plus three MCP tools (`render-badge`, `render-github-badge`, `render-github-badge-row`) so an agent can render literal or live-data badges for any GitHub repo.

**Architecture:** Pure library component (intrinsic SVG, no network, brand-aware via `resolveBrand(props.brand)` in body — matches the documented `CLAUDE.md` pattern). All HTTP lives in `mcp/src/githubClient.ts` behind an injectable `fetch` with TTL cache + in-flight promise dedup + optional `GITHUB_TOKEN`. MCP tools import the rendering surface from `goldenchart/server` so emitted SVGs are self-contained.

**Tech Stack:** React 19, Rough.js, D3 (existing), Zod schemas, Vitest snapshots. No new runtime deps. Node 18+ `globalThis.fetch`.

**Spec:** `docs/superpowers/specs/2026-05-28-github-badge-rendering-design.md`
**Branch:** `spec/github-badge-rendering` (already exists, spec already committed).

---

## File structure

**Library (`src/`):**
- Create `src/core/badgeIcons.ts` — `BadgeIcon` type, icon path table, fixed tone color table. Pure data + types.
- Create `src/components/Badge.tsx` — the component.
- Create `src/components/Badge.test.ts` — vitest tests: width formula, brand wiring, tone selection, optional-icon branch, server SVG snapshot for one case.
- Modify `src/components/index.ts` — export `Badge`, `BadgeProps`, `BadgeTone`, `BadgeIcon`.
- Modify `src/index.ts` — re-export the same names.

**MCP (`mcp/src/`):**
- Create `mcp/src/githubClient.ts` — `createGithubClient`, types, errors. No I/O at import time.
- Create `mcp/src/githubClient.test.ts` — TTL cache, in-flight dedup, error mapping, auth header behavior. All via the injected `fetch` stub.
- Create `mcp/src/badgeTools.ts` — three `ToolDef`s. Does NOT go through `makeRenderTool` (that factory assumes `width`/`height` args; the badge tools don't have those).
- Create `mcp/src/badgeTools.test.ts` — snapshot tests for all three tools, fetch stubbed.
- Modify `mcp/src/tools.ts` — import `badgeTools` and add to the exported tool list.
- New snapshot files appear under `mcp/src/__snapshots__/badgeTools.test.ts.snap`.

**Carry-forward render:**
- Modify `mcp/compare/...` (whatever script `npm run compare` already runs — locate before editing) to add one literal `Badge` and one `render-github-badge-row` example with a stubbed client.

---

## Task 1: Icon + tone color tables

**Files:**
- Create: `src/core/badgeIcons.ts`

- [ ] **Step 1: Write the failing test**

```ts
// src/core/badgeIcons.test.ts
import { describe, it, expect } from 'vitest';
import { BADGE_ICON_PATHS, BADGE_TONE_COLORS, BADGE_ICONS, BADGE_TONES } from './badgeIcons';

describe('badgeIcons', () => {
  it('exposes a stroke path string for every icon name', () => {
    for (const name of BADGE_ICONS) {
      const entry = BADGE_ICON_PATHS[name];
      const strokes = Array.isArray(entry) ? entry : [entry];
      expect(strokes.length).toBeGreaterThan(0);
      for (const d of strokes) {
        // Stroke-only contract: no fills (no `Z`), nothing closes the path.
        expect(d).not.toMatch(/[Zz]/);
        expect(d.length).toBeGreaterThan(0);
      }
    }
  });
  it('has a color for every fixed tone (success/warn/danger)', () => {
    expect(BADGE_TONE_COLORS.success).toMatch(/^#/);
    expect(BADGE_TONE_COLORS.warn).toMatch(/^#/);
    expect(BADGE_TONE_COLORS.danger).toMatch(/^#/);
  });
  it('lists every supported tone literal', () => {
    expect(new Set(BADGE_TONES)).toEqual(
      new Set(['neutral', 'info', 'success', 'warn', 'danger']),
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run from project root: `npm test -- src/core/badgeIcons`
Expected: FAIL with `cannot find module './badgeIcons'`.

- [ ] **Step 3: Implement `src/core/badgeIcons.ts`**

```ts
/**
 * Icon stroke paths and fixed tone colors for `Badge`. Pure data, no React.
 *
 * Icon authoring contract (per spec):
 *  - viewBox 16x16
 *  - stroke-only (no `Z`, no fills)
 *  - single open sub-path preferred; if a glyph genuinely needs two strokes,
 *    the entry may be `string[]` and the component renders each as its own
 *    Rough path.
 */

export const BADGE_TONES = ['neutral', 'info', 'success', 'warn', 'danger'] as const;
export type BadgeTone = (typeof BADGE_TONES)[number];

export const BADGE_ICONS = [
  'star',
  'fork',
  'issue',
  'tag',
  'commit',
  'license',
  'lang',
  'check',
] as const;
export type BadgeIcon = (typeof BADGE_ICONS)[number];

/** Stroke-only path data, authored against a 16x16 box. */
export const BADGE_ICON_PATHS: Record<BadgeIcon, string | string[]> = {
  // Five-point star outline (open at the top tip so it remains an open stroke).
  star: 'M8 1 L10 6 L15 6 L11 9.5 L12.5 14.5 L8 11.5 L3.5 14.5 L5 9.5 L1 6 L6 6',
  // Two circles + a connector (git fork glyph).
  fork: [
    'M4 3 a2 2 0 1 0 0 4 a2 2 0 1 0 0 -4',
    'M12 3 a2 2 0 1 0 0 4 a2 2 0 1 0 0 -4',
    'M4 7 L4 11 a2 2 0 0 0 2 2 L10 13',
    'M12 7 L12 9',
  ],
  // Circle with vertical bar (open issue indicator).
  issue: ['M8 1 a7 7 0 1 0 0 14 a7 7 0 1 0 0 -14', 'M8 5 L8 9', 'M8 11 L8 12'],
  // Price-tag silhouette (open stroke; no Z).
  tag: 'M1 8 L8 1 L15 1 L15 8 L8 15 Z'.replace(/Z/g, ''), // sentinel — see below
  // Git commit dot + line.
  commit: ['M2 8 L6 8', 'M10 8 L14 8', 'M8 6 a2 2 0 1 0 0 4 a2 2 0 1 0 0 -4'],
  // Scroll silhouette (open).
  license: ['M3 2 L13 2 L13 13 L8 13', 'M3 2 L3 13 L8 13 L8 11', 'M5 5 L11 5', 'M5 8 L11 8'],
  // Three vertical bars (language stack).
  lang: ['M3 13 L3 5', 'M8 13 L8 3', 'M13 13 L13 7'],
  // Check mark.
  check: 'M2 9 L6 13 L14 3',
};

// The `tag` glyph above is a workaround to keep the string literal honest;
// re-define it cleanly here.
BADGE_ICON_PATHS.tag = 'M1 8 L8 1 L15 1 L15 8 L8 15';

export const BADGE_TONE_COLORS: Record<'success' | 'warn' | 'danger', string> = {
  success: '#3a8a3a',
  warn: '#b8860b',
  danger: '#b13a3a',
};
```

- [ ] **Step 4: Run tests**

Run: `npm test -- src/core/badgeIcons`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/core/badgeIcons.ts src/core/badgeIcons.test.ts
git commit -m "feat(badge): icon stroke paths + fixed tone colors"
```

---

## Task 2: `Badge` component

**Files:**
- Create: `src/components/Badge.tsx`
- Create: `src/components/Badge.test.ts`

The badge does NOT use `<Surface>`, does NOT read brand from context, does NOT register an a11y title (callers can wrap if needed). It calls `resolveBrand(props.brand)` and `resolveVibe(props.vibe)` directly in the body. Width is computed from text measurement via `src/core/text.ts` (the same helper axis ticks use — locate the export before relying on it; if the helper signature is `measureTextWidth(text, fontSize, fontFamily)`, use it; if it returns an approximation, that's fine).

- [ ] **Step 1: Write the failing test**

```ts
// src/components/Badge.test.ts
import { describe, it, expect } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { Badge } from './Badge';

function render(props: Parameters<typeof Badge>[0]) {
  return renderToStaticMarkup(createElement(Badge, props));
}

describe('Badge', () => {
  it('renders an intrinsic <svg> with measurable width and constant height 26', () => {
    const svg = render({ label: 'stars', value: '42.3k' });
    expect(svg).toMatch(/<svg[^>]+width="\d+"/);
    expect(svg).toMatch(/<svg[^>]+height="26"/);
    expect(svg).toContain('stars');
    expect(svg).toContain('42.3k');
  });
  it('renders the icon glyph when `icon` is set', () => {
    const without = render({ label: 'stars', value: '0' });
    const withIcon = render({ label: 'stars', value: '0', icon: 'star' });
    expect(withIcon.length).toBeGreaterThan(without.length);
  });
  it('uses success color for tone="success" and danger for tone="danger"', () => {
    const ok = render({ label: 'build', value: 'passing', tone: 'success' });
    const bad = render({ label: 'build', value: 'failing', tone: 'danger' });
    expect(ok).toContain('#3a8a3a');
    expect(bad).toContain('#b13a3a');
  });
  it('uses brand palette[0] for tone="neutral"', () => {
    const svg = render({
      label: 'x', value: 'y', tone: 'neutral',
      brand: { palette: ['#123456', '#abcdef'] },
    });
    expect(svg).toContain('#123456');
  });
  it('produces a stable snapshot for a known input', () => {
    const svg = render({
      label: 'stars', value: '42.3k', tone: 'info', icon: 'star',
      brand: { palette: ['#222', '#0077cc'], font: 'sans-serif' },
      seed: 1,
    });
    expect(svg).toMatchSnapshot();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- src/components/Badge`
Expected: FAIL with `cannot find module './Badge'`.

- [ ] **Step 3: Implement `src/components/Badge.tsx`**

Sketch (the implementer fills in the exact Rough.js calls based on existing primitives — see `src/primitives/RoughPath.tsx` and `src/primitives/RoughRectangle.tsx` for the established pattern):

```tsx
import { createElement } from 'react';
import { resolveBrand } from '../brand';
import { resolveVibe } from '../vibe';
import type { BrandConfig } from '../brand';
import type { VibeConfig, VibePresetName } from '../vibe';
import { RoughPath } from '../primitives/RoughPath';
import { RoughRectangle } from '../primitives/RoughRectangle';
import { RoughText } from '../primitives/RoughText';
import { measureTextWidth } from '../core/text';
import {
  BADGE_ICON_PATHS,
  BADGE_TONE_COLORS,
  type BadgeIcon,
  type BadgeTone,
} from '../core/badgeIcons';

const HEIGHT = 26;
const PAD_X = 8;
const ICON_SIZE = 16;
const ICON_GAP = 6;
const DIVIDER_GAP = 8;
const DIVIDER_W = 1;

export interface BadgeProps {
  label: string;
  value: string;
  tone?: BadgeTone;          // default 'neutral'
  icon?: BadgeIcon;
  vibe?: VibeConfig | VibePresetName;
  brand?: BrandConfig;
  seed?: number;
  className?: string;
}

export function Badge({
  label, value, tone = 'neutral', icon, vibe, brand, seed, className,
}: BadgeProps) {
  const b = resolveBrand(brand);
  const v = resolveVibe(vibe);
  const font = b.font;
  const labelW = measureTextWidth(label, v.fontSize, font);
  const valueW = measureTextWidth(value, v.fontSize, font);
  const iconW = icon ? ICON_SIZE + ICON_GAP : 0;
  const dividerX = PAD_X + iconW + labelW + DIVIDER_GAP;
  const valueX = dividerX + DIVIDER_W + DIVIDER_GAP;
  const width = valueX + valueW + PAD_X;

  // Tone -> fill
  const valueFill =
    tone === 'neutral' ? b.palette[0]
    : tone === 'info' ? (b.palette[1] ?? b.palette[0])
    : BADGE_TONE_COLORS[tone];
  const labelFill = b.ink; // painted at 12% via opacity prop on the rect

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={HEIGHT}
      viewBox={`0 0 ${width} ${HEIGHT}`}
      className={className}
    >
      {/* Pill outline */}
      <RoughRectangle x={0.5} y={0.5} width={width - 1} height={HEIGHT - 1}
        rx={6} ry={6} stroke={b.ink} fill="none" seed={seed} />
      {/* Label half (ink @ ~12%) */}
      <RoughRectangle x={0.5} y={0.5} width={dividerX - 0.5} height={HEIGHT - 1}
        fill={labelFill} fillStyle="solid" opacity={0.12} stroke="none" seed={seed} />
      {/* Value half (tone color) */}
      <RoughRectangle x={dividerX} y={0.5} width={width - dividerX - 0.5} height={HEIGHT - 1}
        fill={valueFill} fillStyle="solid" opacity={0.18} stroke="none" seed={seed} />
      {/* Divider */}
      <line x1={dividerX} y1={3} x2={dividerX} y2={HEIGHT - 3} stroke={b.ink} strokeWidth={DIVIDER_W} />
      {/* Optional icon */}
      {icon ? renderIcon(icon, PAD_X, (HEIGHT - ICON_SIZE) / 2, b.ink, seed) : null}
      {/* Label text */}
      <RoughText x={PAD_X + iconW} y={HEIGHT / 2 + v.fontSize / 3}
        text={label} fill={b.ink} fontFamily={font} fontSize={v.fontSize} />
      {/* Value text */}
      <RoughText x={valueX} y={HEIGHT / 2 + v.fontSize / 3}
        text={value} fill={b.ink} fontFamily={font} fontSize={v.fontSize} />
    </svg>
  );
}

function renderIcon(name: BadgeIcon, ox: number, oy: number, stroke: string, seed?: number) {
  const entry = BADGE_ICON_PATHS[name];
  const strokes = Array.isArray(entry) ? entry : [entry];
  return (
    <g transform={`translate(${ox}, ${oy})`}>
      {strokes.map((d, i) => (
        <RoughPath key={i} d={d} stroke={stroke} fill="none" seed={seed ?? 0 + i} />
      ))}
    </g>
  );
}
```

If `RoughRectangle` / `RoughPath` / `RoughText` props don't match the names above (e.g. `fillStyle` vs `style`), adjust to the real primitive surface. **Do not** widen the primitive APIs to fit the badge.

- [ ] **Step 4: Run tests**

Run: `npm test -- src/components/Badge`
Expected: PASS. Snapshot file is written on first run; review the snapshot diff in the next commit.

- [ ] **Step 5: Commit**

```bash
git add src/components/Badge.tsx src/components/Badge.test.ts src/components/__snapshots__/Badge.test.ts.snap
git commit -m "feat(badge): intrinsic-SVG Badge component, brand-aware in body"
```

---

## Task 3: Library exports

**Files:**
- Modify: `src/components/index.ts`
- Modify: `src/index.ts`

- [ ] **Step 1: Add to `src/components/index.ts`**

Append:

```ts
export { Badge } from './Badge';
export type { BadgeProps } from './Badge';
export { BADGE_TONES, BADGE_ICONS } from '../core/badgeIcons';
export type { BadgeTone, BadgeIcon } from '../core/badgeIcons';
```

- [ ] **Step 2: Add to `src/index.ts`**

In the existing `export { ... } from './components'` block add `Badge`; in the `export type { ... }` block add `BadgeProps`, `BadgeTone`, `BadgeIcon`.

- [ ] **Step 3: Typecheck and rebuild**

```bash
npm run typecheck
npm run build
npm run check:bundle
```

Expected: `typecheck` PASS, `build` PASS, `check:bundle` PASS (under 75 KB gzip, no font leak).

If `check:bundle` fails, follow the spec's fallback order: drop `commit`/`lang`/`license` from `BADGE_ICONS` first, re-run.

- [ ] **Step 4: Commit**

```bash
git add src/components/index.ts src/index.ts
git commit -m "feat(badge): export Badge + BadgeIcon/BadgeTone from library entries"
```

---

## Task 4: `githubClient` (no MCP wiring yet)

**Files:**
- Create: `mcp/src/githubClient.ts`
- Create: `mcp/src/githubClient.test.ts`

The client is a plain TS module — no React, no MCP types, no environment globals at import time (read `process.env.GITHUB_TOKEN` only inside `createGithubClient`'s body, with a default-argument fallback so tests can override).

- [ ] **Step 1: Write the failing tests**

```ts
// mcp/src/githubClient.test.ts
import { describe, it, expect, vi } from 'vitest';
import { createGithubClient, GithubFetchError } from './githubClient';

function fakeFetch(responses: Record<string, { status: number; body?: unknown; headers?: Record<string, string> }>) {
  return vi.fn(async (input: string | URL) => {
    const url = String(input);
    const r = responses[url];
    if (!r) throw new Error(`unmocked: ${url}`);
    return new Response(r.body == null ? null : JSON.stringify(r.body), {
      status: r.status,
      headers: r.headers ?? { 'content-type': 'application/json' },
    });
  });
}

const REPO_URL = 'https://api.github.com/repos/o/r';

describe('githubClient', () => {
  it('getRepo: parses the upstream shape into RepoSummary', async () => {
    const fetch = fakeFetch({
      [REPO_URL]: {
        status: 200,
        body: {
          stargazers_count: 10, forks_count: 2, open_issues_count: 3,
          license: { spdx_id: 'MIT' }, language: 'TypeScript',
          pushed_at: '2026-05-01T00:00:00Z', default_branch: 'main',
        },
      },
    });
    const c = createGithubClient({ fetch });
    expect(await c.getRepo('o', 'r')).toEqual({
      stars: 10, forks: 2, openIssues: 3, license: 'MIT',
      language: 'TypeScript', pushedAt: '2026-05-01T00:00:00Z', defaultBranch: 'main',
    });
  });

  it('caches completed responses for TTL', async () => {
    const fetch = fakeFetch({ [REPO_URL]: { status: 200, body: { stargazers_count: 1 } } });
    const c = createGithubClient({ fetch, ttlMs: 60_000 });
    await c.getRepo('o', 'r');
    await c.getRepo('o', 'r');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('dedupes in-flight requests', async () => {
    let resolveHttp!: (v: Response) => void;
    const fetch = vi.fn(() => new Promise<Response>((res) => { resolveHttp = res; }));
    const c = createGithubClient({ fetch });
    const p1 = c.getRepo('o', 'r');
    const p2 = c.getRepo('o', 'r');
    resolveHttp(new Response(JSON.stringify({ stargazers_count: 7 }), { status: 200 }));
    await Promise.all([p1, p2]);
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('maps 404 -> not-found, 401 -> unauthorized, 403/429 with rate-limit -> rate-limited', async () => {
    const c = createGithubClient({
      fetch: fakeFetch({
        [REPO_URL]: { status: 404 },
        'https://api.github.com/repos/o/r/releases/latest': { status: 401 },
        'https://api.github.com/repos/o/r/contributors?per_page=1&anon=1': {
          status: 403, headers: { 'x-ratelimit-remaining': '0', 'content-type': 'application/json' }, body: {},
        },
      }),
    });
    await expect(c.getRepo('o', 'r')).rejects.toMatchObject({ kind: 'not-found' });
    await expect(c.getLatestRelease('o', 'r')).rejects.toMatchObject({ kind: 'unauthorized' });
    await expect(c.getContributorsCount('o', 'r')).rejects.toMatchObject({ kind: 'rate-limited' });
  });

  it('sends Authorization header when token is set', async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify({ stargazers_count: 1 }), { status: 200 }));
    const c = createGithubClient({ fetch, token: 'ghp_xxx' });
    await c.getRepo('o', 'r');
    const headers = (fetch.mock.calls[0][1] as RequestInit | undefined)?.headers as Record<string, string>;
    expect(headers.Authorization).toBe('Bearer ghp_xxx');
    expect(headers['X-GitHub-Api-Version']).toBe('2022-11-28');
  });

  it('precedence for ttl: option > env > default', () => {
    const oldEnv = process.env.GOLDENCHART_GH_TTL_MS;
    try {
      process.env.GOLDENCHART_GH_TTL_MS = '1000';
      const c1 = createGithubClient({});
      const c2 = createGithubClient({ ttlMs: 5000 });
      expect((c1 as any).__ttlMs).toBe(1000);   // see implementation note below
      expect((c2 as any).__ttlMs).toBe(5000);
    } finally {
      process.env.GOLDENCHART_GH_TTL_MS = oldEnv;
    }
  });

  it('parses contributor count from Link header last-page', async () => {
    const fetch = fakeFetch({
      'https://api.github.com/repos/o/r/contributors?per_page=1&anon=1': {
        status: 200,
        body: [{}],
        headers: {
          'content-type': 'application/json',
          link: '<https://api.github.com/repos/o/r/contributors?per_page=1&anon=1&page=2>; rel="next", <https://api.github.com/repos/o/r/contributors?per_page=1&anon=1&page=137>; rel="last"',
        },
      },
    });
    const c = createGithubClient({ fetch });
    expect(await c.getContributorsCount('o', 'r')).toBe(137);
  });
});
```

- [ ] **Step 2: Run tests to verify failure**

Run from `mcp/`: `npm test -- githubClient`
Expected: FAIL with `cannot find module './githubClient'`.

- [ ] **Step 3: Implement `mcp/src/githubClient.ts`**

Sketch:

```ts
export type RepoSummary = {
  stars: number; forks: number; openIssues: number;
  license: string | null; language: string | null;
  pushedAt: string; defaultBranch: string;
};
export type ReleaseSummary = { tag: string; name: string | null; publishedAt: string };
export type WorkflowStatus = {
  name: string;
  conclusion: 'success' | 'failure' | 'cancelled' | 'neutral' | 'skipped'
            | 'timed_out' | 'action_required' | 'startup_failure' | 'unknown';
  status: 'queued' | 'in_progress' | 'completed' | 'unknown';
  htmlUrl: string;
};

export type GithubFetchErrorKind =
  | 'not-found' | 'rate-limited' | 'unauthorized' | 'network' | 'unexpected';
export class GithubFetchError extends Error {
  constructor(public kind: GithubFetchErrorKind, public status: number, message: string) {
    super(message);
    this.name = 'GithubFetchError';
  }
}

export interface GithubClient {
  getRepo(owner: string, repo: string): Promise<RepoSummary>;
  getLatestRelease(owner: string, repo: string): Promise<ReleaseSummary>;
  getWorkflowStatus(owner: string, repo: string, workflow?: string): Promise<WorkflowStatus>;
  getContributorsCount(owner: string, repo: string): Promise<number>;
}

export interface CreateGithubClientOptions {
  fetch?: typeof globalThis.fetch;
  token?: string;
  ttlMs?: number;
}

const DEFAULT_TTL_MS = 5 * 60 * 1000;

export function createGithubClient(opts: CreateGithubClientOptions = {}): GithubClient {
  const fetchImpl = opts.fetch ?? globalThis.fetch;
  const token = opts.token ?? process.env.GITHUB_TOKEN;
  const ttlMs = opts.ttlMs ?? Number(process.env.GOLDENCHART_GH_TTL_MS) || DEFAULT_TTL_MS;
  const completed = new Map<string, { value: unknown; expiresAt: number }>();
  const inflight = new Map<string, Promise<unknown>>();

  async function call<T>(url: string, parse: (resp: Response) => Promise<T>): Promise<T> {
    const now = Date.now();
    const hit = completed.get(url);
    if (hit && hit.expiresAt > now) return hit.value as T;
    const existing = inflight.get(url);
    if (existing) return existing as Promise<T>;
    const p = (async () => {
      let resp: Response;
      try {
        resp = await fetchImpl(url, {
          headers: {
            Accept: 'application/vnd.github+json',
            'X-GitHub-Api-Version': '2022-11-28',
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
        });
      } catch (e) {
        throw new GithubFetchError('network', 0, (e as Error).message);
      }
      if (resp.status === 404) throw new GithubFetchError('not-found', 404, url);
      if (resp.status === 401) throw new GithubFetchError('unauthorized', 401, url);
      if (resp.status === 403 || resp.status === 429) {
        if (resp.headers.get('x-ratelimit-remaining') === '0') {
          throw new GithubFetchError('rate-limited', resp.status, url);
        }
      }
      if (resp.status < 200 || resp.status >= 300) {
        throw new GithubFetchError('unexpected', resp.status, url);
      }
      const value = await parse(resp);
      completed.set(url, { value, expiresAt: Date.now() + ttlMs });
      return value;
    })().finally(() => { inflight.delete(url); });
    inflight.set(url, p);
    return p;
  }

  const api: GithubClient = {
    getRepo: (o, r) => call(`https://api.github.com/repos/${o}/${r}`, async (resp) => {
      const j = await resp.json() as any;
      return {
        stars: j.stargazers_count, forks: j.forks_count, openIssues: j.open_issues_count,
        license: j.license?.spdx_id ?? j.license?.name ?? null,
        language: j.language ?? null,
        pushedAt: j.pushed_at, defaultBranch: j.default_branch,
      };
    }),
    getLatestRelease: (o, r) => call(`https://api.github.com/repos/${o}/${r}/releases/latest`, async (resp) => {
      const j = await resp.json() as any;
      return { tag: j.tag_name, name: j.name ?? null, publishedAt: j.published_at };
    }),
    getWorkflowStatus: (o, r, workflow) => {
      const q = workflow ? `&workflow_id=${encodeURIComponent(workflow)}` : '';
      return call(`https://api.github.com/repos/${o}/${r}/actions/runs?per_page=1${q}`, async (resp) => {
        const j = await resp.json() as any;
        const run = j.workflow_runs?.[0];
        if (!run) throw new GithubFetchError('not-found', resp.status, 'no runs');
        return {
          name: run.name ?? '',
          conclusion: run.conclusion ?? 'unknown',
          status: run.status ?? 'unknown',
          htmlUrl: run.html_url ?? '',
        };
      });
    },
    getContributorsCount: (o, r) => call(`https://api.github.com/repos/${o}/${r}/contributors?per_page=1&anon=1`, async (resp) => {
      const link = resp.headers.get('link') ?? '';
      const m = /<[^>]*[?&]page=(\d+)[^>]*>;\s*rel="last"/.exec(link);
      if (m) return Number(m[1]);
      const list = await resp.json() as unknown[];
      return Array.isArray(list) ? list.length : 0;
    }),
  };

  // Test introspection (intentionally non-enumerable so it doesn't appear in JSON):
  Object.defineProperty(api, '__ttlMs', { value: ttlMs });
  return api;
}
```

- [ ] **Step 4: Run tests**

Run from `mcp/`: `npm test -- githubClient`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add mcp/src/githubClient.ts mcp/src/githubClient.test.ts
git commit -m "feat(mcp): GitHub client with TTL cache, in-flight dedup, typed errors"
```

---

## Task 5: MCP refresh — pull new library exports into `mcp/`

This is the CLAUDE.md-mandated force-recopy step. The remaining tasks depend on `import { Badge } from 'goldenchart/server'` resolving in `mcp/`.

- [ ] **Step 1: Rebuild root**

From project root:
```bash
npm run build
```

- [ ] **Step 2: Force-recopy `goldenchart` into `mcp/node_modules`**

PowerShell:
```powershell
Remove-Item -Recurse -Force mcp\node_modules\goldenchart
cd mcp; npm install --install-links; cd ..
```

(Plain symlinks are unreliable on Windows; per CLAUDE.md.)

- [ ] **Step 3: Sanity check the new export resolves**

```bash
cd mcp && node -e "console.log(typeof require('goldenchart').Badge)" && cd ..
```

Expected: `function`.

(No commit; this is environment-only.)

---

## Task 6: `render-badge` MCP tool (no network)

**Files:**
- Create: `mcp/src/badgeTools.ts`
- Create: `mcp/src/badgeTools.test.ts`

`makeRenderTool` won't fit — it puts `width`/`height` into `meta` from args, but the badge is intrinsic. Build a fresh `ToolDef`.

- [ ] **Step 1: Add Zod input shape and first tool to `badgeTools.ts`**

```ts
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
      structuredContent: { svg, meta: { kind: 'badge', width: 0, height: 26 } },
      // width is intrinsic; 0 here flags "ask the SVG itself". Alternative:
      // parse the emitted width attribute; not worth it for v1.
    };
  },
};

export const badgeTools: ToolDef[] = [renderBadgeTool];
```

- [ ] **Step 2: Snapshot test**

```ts
// mcp/src/badgeTools.test.ts
import { describe, it, expect } from 'vitest';
import { renderBadgeTool } from './badgeTools';

describe('render-badge', () => {
  it('produces a stable SVG for a known input', async () => {
    const res = await renderBadgeTool.handler({
      label: 'stars', value: '42.3k', tone: 'info', icon: 'star',
      brand: { palette: ['#222', '#0077cc'], font: 'sans-serif' },
      seed: 1,
    });
    const svg = (res.content[0] as { text: string }).text;
    expect(svg).toMatchSnapshot();
  });
});
```

- [ ] **Step 3: Run tests**

From `mcp/`: `npm test -- badgeTools`
Expected: PASS. The snapshot file under `mcp/src/__snapshots__/` is created on first run — review the diff before committing. Font bytes should be masked by `mcp/vitest.setup.ts`.

- [ ] **Step 4: Commit**

```bash
git add mcp/src/badgeTools.ts mcp/src/badgeTools.test.ts mcp/src/__snapshots__/badgeTools.test.ts.snap
git commit -m "feat(mcp): render-badge tool"
```

---

## Task 7: `render-github-badge` MCP tool (single metric, fetches)

**Files:**
- Modify: `mcp/src/badgeTools.ts`
- Modify: `mcp/src/badgeTools.test.ts`

The tool accepts an optional `githubClient` for tests; production callers omit it and get `createGithubClient()` lazily.

- [ ] **Step 1: Tests first**

Append to `badgeTools.test.ts`:

```ts
import { renderGithubBadgeTool } from './badgeTools';

const stubClient = (overrides?: Partial<GithubClient>) => ({
  getRepo: async () => ({
    stars: 12345, forks: 678, openIssues: 0,
    license: 'MIT', language: 'TypeScript',
    pushedAt: '2026-05-01T00:00:00Z', defaultBranch: 'main',
  }),
  getLatestRelease: async () => ({ tag: 'v1.2.3', name: '1.2.3', publishedAt: '2026-05-01T00:00:00Z' }),
  getWorkflowStatus: async () => ({ name: 'CI', conclusion: 'success', status: 'completed', htmlUrl: '' }),
  getContributorsCount: async () => 42,
  ...overrides,
} as GithubClient);

describe('render-github-badge', () => {
  it('renders a stars badge with k-formatted value and info tone', async () => {
    const res = await renderGithubBadgeTool.handler({
      owner: 'o', repo: 'r', metric: 'stars',
      __client: stubClient(),  // test seam, see implementation
    });
    expect((res.content[0] as any).text).toMatchSnapshot();
  });
  it('renders a workflow badge as success', async () => {
    const res = await renderGithubBadgeTool.handler({
      owner: 'o', repo: 'r', metric: 'workflow',
      __client: stubClient(),
    });
    const svg = (res.content[0] as any).text;
    expect(svg).toContain('#3a8a3a');  // success color
  });
  it('reports rate-limited errors as structured tool errors', async () => {
    const c = stubClient({
      getRepo: async () => { throw new GithubFetchError('rate-limited', 403, 'rate'); },
    });
    const res = await renderGithubBadgeTool.handler({
      owner: 'o', repo: 'r', metric: 'stars', __client: c,
    });
    expect(res.isError).toBe(true);
    expect((res.content[0] as any).text).toContain('rate-limited');
  });
});
```

- [ ] **Step 2: Append tool to `badgeTools.ts`**

```ts
import type { GithubClient } from './githubClient';

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
      'Fetches a single metric from GitHub (anonymous or with $GITHUB_TOKEN) and renders it as a hand-drawn Badge SVG.',
    inputSchema: githubBadgeInputShape,
    outputSchema: renderOutputShape,
  },
  handler: async (args) => {
    const client: GithubClient = (args as any).__client ?? createGithubClient();
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
        structuredContent: { svg, meta: { kind: 'github-badge', width: 0, height: 26 } },
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

badgeTools.push(renderGithubBadgeTool);
```

`__client` is a documented test seam (prefix `__`; not in the Zod schema; ignored by the SDK validator since it's passed through `args`). If the SDK strips unknown args, swap to importing a `__setGithubClientForTests` setter from `badgeTools.ts` and use that in tests instead.

- [ ] **Step 3: Run tests**

```bash
cd mcp && npm test -- badgeTools
```

Expected: PASS. Review the new snapshot lines.

- [ ] **Step 4: Commit**

```bash
git add mcp/src/badgeTools.ts mcp/src/badgeTools.test.ts mcp/src/__snapshots__/badgeTools.test.ts.snap
git commit -m "feat(mcp): render-github-badge tool with cached, dedup'd fetch"
```

---

## Task 8: `render-github-badge-row` MCP tool

**Files:**
- Modify: `mcp/src/badgeTools.ts`
- Modify: `mcp/src/badgeTools.test.ts`

Reuses the client's in-flight dedup, so calling `resolveMetric` once per metric is fine — duplicate `getRepo` calls collapse to one HTTP roundtrip naturally.

- [ ] **Step 1: Test**

```ts
describe('render-github-badge-row', () => {
  it('renders a row that triggers exactly one repo call for repo-derived metrics', async () => {
    const repo = vi.fn(async () => ({
      stars: 100, forks: 10, openIssues: 0, license: 'MIT',
      language: 'TS', pushedAt: new Date().toISOString(), defaultBranch: 'main',
    }));
    const client = stubClient({ getRepo: repo });
    const res = await renderGithubBadgeRowTool.handler({
      owner: 'o', repo: 'r',
      metrics: ['stars', 'forks', 'open-issues', 'license', 'language'],
      __client: client,
    });
    expect(repo).toHaveBeenCalledTimes(1);
    expect((res.content[0] as any).text).toMatchSnapshot();
  });
});
```

(The single call is guaranteed by the client's in-flight promise map; if `resolveMetric` is called sequentially the cache covers duplicates. Either order satisfies "exactly one HTTP call".)

- [ ] **Step 2: Implement**

```ts
const githubBadgeRowInputShape = {
  owner: z.string().min(1),
  repo: z.string().min(1),
  metrics: z.array(MetricEnum).min(1).max(8),
  workflow: z.string().optional(),
  gap: z.number().int().nonnegative().optional(),
  vibe: VibeConfigSchema.optional(),
  brand: BrandConfigSchema.optional(),
  seed: z.number().optional(),
};

export const renderGithubBadgeRowTool: ToolDef = {
  name: 'render-github-badge-row',
  config: {
    title: 'Render a row of GitHub repo badges',
    description:
      'Resolves multiple GitHub metrics (with cached + deduplicated fetches) and renders them as a single SVG row of hand-drawn Badges.',
    inputSchema: githubBadgeRowInputShape,
    outputSchema: renderOutputShape,
  },
  handler: async (args) => {
    const client: GithubClient = (args as any).__client ?? createGithubClient();
    const { owner, repo, metrics, workflow, gap = 8, vibe, brand, seed } =
      args as Record<string, any>;
    try {
      const resolved = await Promise.all(
        (metrics as string[]).map((m) => resolveMetric(client, owner, repo, m, workflow)),
      );
      // Render each Badge to its own SVG, then concatenate by parsing out the
      // intrinsic widths from the `<svg width="…">` attribute and wrapping in
      // a parent <svg> with <g transform="translate(x, 0)">.
      const parts = resolved.map((r) => ({
        svg: renderToSVGString(createElement(Badge as any, {
          ...r, label: r.label, value: r.value, tone: r.tone, icon: r.icon,
          vibe, brand, seed,
        })),
      }));
      const widths = parts.map((p) => Number(/<svg[^>]*\swidth="(\d+)"/.exec(p.svg)?.[1] ?? 0));
      const inners = parts.map((p) => p.svg.replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, ''));
      const totalW = widths.reduce((a, b) => a + b, 0) + Math.max(0, widths.length - 1) * gap;
      const height = 26;
      let x = 0;
      const children = inners.map((inner, i) => {
        const t = `<g transform="translate(${x}, 0)">${inner}</g>`;
        x += widths[i] + gap;
        return t;
      }).join('');
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${totalW}" height="${height}" viewBox="0 0 ${totalW} ${height}">${children}</svg>`;
      return {
        content: [{ type: 'text', text: svg }],
        structuredContent: { svg, meta: { kind: 'github-badge-row', width: totalW, height } },
      };
    } catch (e) {
      const kind = e instanceof GithubFetchError ? e.kind : 'unexpected';
      return {
        content: [{ type: 'text', text: `github-badge-row error: ${kind}: ${(e as Error).message}` }],
        structuredContent: { error: { kind, message: (e as Error).message } },
        isError: true,
      };
    }
  },
};

badgeTools.push(renderGithubBadgeRowTool);
```

If a font `<style>` block appears in each per-badge SVG (because `goldenchart/server` auto-embeds `@font-face`), the row's concatenated output will contain N duplicated style blocks. That's wasteful but not broken — the implementer should dedupe once during this task by stripping `<style>…</style>` blocks from `inners[1..]` and keeping only the one from `inners[0]`. Verify against the snapshot.

- [ ] **Step 3: Run tests**

```bash
cd mcp && npm test -- badgeTools
```

Expected: PASS. Review the row snapshot carefully — this is the most complex output of the feature.

- [ ] **Step 4: Commit**

```bash
git add mcp/src/badgeTools.ts mcp/src/badgeTools.test.ts mcp/src/__snapshots__/badgeTools.test.ts.snap
git commit -m "feat(mcp): render-github-badge-row tool"
```

---

## Task 9: Registry wiring

**Files:**
- Modify: `mcp/src/tools.ts`

- [ ] **Step 1: Add the import**

Near the other tool-module imports:

```ts
import { badgeTools } from './badgeTools';
```

- [ ] **Step 2: Add to the exported tool list**

Find the existing aggregated tool array (e.g. `[...calcTools, ...vibeTools, ...primitiveTools, ...]`) and append `...badgeTools`.

- [ ] **Step 3: Smoke test the registry**

```bash
cd mcp && npm test -- server
```

Expected: PASS. The existing server tests enumerate registered tools — they should now include `render-badge`, `render-github-badge`, `render-github-badge-row`. If they assert exact counts, update the assertion.

- [ ] **Step 4: Commit**

```bash
git add mcp/src/tools.ts
git commit -m "feat(mcp): register badge tools"
```

---

## Task 10: Carry-forward render in `npm run compare`

**Files:**
- Modify: whatever script `cd mcp && npm run compare` invokes (locate from `mcp/package.json` `scripts.compare`).

- [ ] **Step 1: Locate the compare script and its scene file(s)**

```bash
node -e "console.log(require('./mcp/package.json').scripts.compare)"
```

Read whichever file builds the scene list.

- [ ] **Step 2: Add two new scenes**

- One: `render-badge` with `{ label: 'stars', value: '42.3k', tone: 'info', icon: 'star', seed: 1 }`.
- One: `render-github-badge-row` with `metrics: ['stars', 'forks', 'open-issues', 'release', 'license']` against a stubbed client returning a fixed `RepoSummary` / `ReleaseSummary` (do **not** hit live GitHub in this script).

- [ ] **Step 3: Generate and commit the carry-forward**

```bash
cd mcp && npm run compare
```

Then commit the produced PNG/SVG into the location the existing carry-forwards live (look at the latest such commit on `main` for precedent).

```bash
git add mcp/compare/...  # adjust to wherever the artifacts land
git commit -m "chore(mcp): carry-forward render for badge tools"
```

---

## Task 11: Full verification + PR

- [ ] **Step 1: Full local gates (library + mcp typecheck only; full vitest goes to CI)**

```bash
npm run typecheck
npm run build
npm run check:bundle
cd mcp && npm run typecheck && cd ..
```

Expected: all PASS. If `check:bundle` fails, follow the spec's fallback order.

- [ ] **Step 2: Verify branch state**

```bash
git status
git log --oneline -15
```

Expected: clean working tree, commits land on `spec/github-badge-rendering`.

- [ ] **Step 3: Switch gh account and open PR**

Per memory `gh-account-write-access`:

```bash
gh auth switch --user benzsevern
git push -u origin spec/github-badge-rendering
gh pr create --base main --head spec/github-badge-rendering \
  --title "feat: hand-drawn GitHub badges (library + MCP)" \
  --body-file - <<'EOF'
Adds a new `Badge` component to `goldenchart` (intrinsic SVG, brand-aware, no
network) plus three MCP tools:

- `render-badge` — literal label/value, no network.
- `render-github-badge` — single GitHub metric, fetched with cache + dedup.
- `render-github-badge-row` — N metrics in one SVG, one HTTP call where possible.

Backed by a new `mcp/src/githubClient.ts` with optional `GITHUB_TOKEN` auth,
5-min TTL cache, in-flight promise dedup, and typed errors.

Spec: `docs/superpowers/specs/2026-05-28-github-badge-rendering-design.md`.
Plan: `docs/superpowers/plans/2026-05-28-github-badge-rendering.md`.

CI runs the full vitest suite (local Windows OOMs on it, per docs).
EOF
```

- [ ] **Step 4: Watch CI**

```bash
gh pr view --web   # or: gh run watch
```

Expected: `library` and `mcp` workflows both green.

- [ ] **Step 5: Merge per Ben's merge-on-green pattern**

Stage only the explicit paths that were touched (do not `git add -A` — per memory `workflow-merge-on-green-loop`). Once CI is green, merge via `gh pr merge --squash --delete-branch`.

---

## Out of scope (do not implement)

- `variant: 'shields'` mode on Badge.
- `<BadgeRow>` library component.
- Remote SVG logo glyphs.
- GitLab / Bitbucket clients.
- Caller-supplied per-metric tone thresholds.
- A separate `react` package export for Badge.
