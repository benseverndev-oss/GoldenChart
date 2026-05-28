# Design: GitHub badge rendering

**Date:** 2026-05-28
**Status:** Approved (design)
**Scope:** `src/components/Badge.tsx` (new component, brand-aware, no network) +
`mcp/src/githubClient.ts` + three new MCP tools (`render-badge`,
`render-github-badge`, `render-github-badge-row`).

## Context

Today GoldenChart renders charts and diagrams in the hand-drawn Rough.js
aesthetic, but has no primitive for the small label/value "shields" that
dominate the top of every GitHub README. Adding one gives the MCP agent a
useful new render surface and a natural showcase for the brand/vibe layer
(text + ink + palette, no axes, no scales).

The capability has three independent pieces:

1. **`Badge`** — a brand-aware library component that takes literal
   `label` / `value` strings. No network, no GitHub knowledge.
2. **`render-badge`** — an MCP tool that calls (1). No network.
3. **`render-github-badge`** / **`render-github-badge-row`** — MCP tools
   that fetch live repo data and feed (1).

Splitting the surface this way keeps the library no-network (preserving the
existing browser-entry / `goldenchart/server` separation) and isolates all
HTTP behind the MCP layer where injectability and caching are easy.

The look-and-feel choice is the GoldenChart-native variant ("B" from
brainstorming): sketchy outline pill, brand ink and palette, brand font,
optional hand-drawn icon glyph. **Not** a shields.io clone. A shields-faithful
variant can be added later as a `variant: 'shields'` prop if anyone asks.

## What gets built

### Library — `Badge` component

**Files:** `src/components/Badge.tsx`, `src/components/Badge.test.ts`,
`src/core/badgeIcons.ts` (small stroke-path table). Exports added to
`src/components/index.ts` and re-exported from `src/index.ts`.

**Props:**

```ts
export type BadgeTone = 'neutral' | 'info' | 'success' | 'warn' | 'danger';
export type BadgeIcon =
  | 'star' | 'fork' | 'issue' | 'tag' | 'commit'
  | 'license' | 'lang' | 'check';

export interface BadgeProps {
  label: string;
  value: string;
  tone?: BadgeTone;          // default 'neutral'
  icon?: BadgeIcon;          // optional
  vibe?: VibeConfig | VibePresetName;
  brand?: BrandConfig;
  seed?: number;
  className?: string;
}
```

**Layout:** intrinsic SVG. Width = `iconWidth + labelWidth + valueWidth +
4*padding + 1*divider`, height ≈ 26px (constant). Text width is measured
through the same helper the rest of the library uses for axis tick labels
(`src/core/text.ts`); no DOM measurement, no font fetch. The component does
not require a parent `<Surface>` and does not paint a background page color.

**Rendering:** one Rough.js outline pill (rounded rect) using
`vibe.roughness`. Left half painted with `brand.ink` at ~12% opacity for the
label region; right half painted with the tone color for the value region; a
single Rough stroke divides the halves. Text uses `brand.font`. Optional icon
sits inside the left half, drawn from `badgeIcons.ts` (a `Record<BadgeIcon,
string>` of SVG path `d` strings) rendered as a Rough path so the stroke
matches the rest of the badge.

**Tone → color** mapping is derived from the resolved brand inside the
component body (per the brand-aware-without-context pattern already
documented in `CLAUDE.md`):

| tone        | source                          |
| ----------- | ------------------------------- |
| `neutral`   | `brand.palette[0]`              |
| `info`      | `brand.palette[1] ?? palette[0]`|
| `success`   | a fixed sketchy green           |
| `warn`      | a fixed sketchy amber           |
| `danger`    | a fixed sketchy red             |

The fixed tone colors live next to `badgeIcons.ts` and are intentionally not
derived from the brand — "success means green" is a stronger convention than
brand fidelity for status pills. (If a brand wants to override this, the
caller passes `tone: 'neutral'` and gets the brand color directly.)

**Brand/vibe wiring:** reads `useBrand()` if a `BrandProvider` is present,
otherwise calls `resolveBrand(undefined)`. Mirrors the existing chart
pattern called out in `CLAUDE.md` for charts that need brand colors without
relying on `Surface`'s providers.

**Bundle:** one component + one small icon table + one tone table. No new
runtime deps. No font byte imports. `npm run check:bundle` is the gate; the
75 KB gzip ceiling must continue to hold.

### MCP — `githubClient.ts`

**Files:** `mcp/src/githubClient.ts`, `mcp/src/githubClient.test.ts`.

```ts
export interface GithubClient {
  getRepo(owner: string, repo: string): Promise<RepoSummary>;
  getLatestRelease(owner: string, repo: string): Promise<ReleaseSummary>;
  getWorkflowStatus(
    owner: string, repo: string, workflow?: string,
  ): Promise<WorkflowStatus>;
  getContributorsCount(owner: string, repo: string): Promise<number>;
}

export interface CreateGithubClientOptions {
  fetch?: typeof globalThis.fetch;     // DI seam
  token?: string;                       // default: process.env.GITHUB_TOKEN
  ttlMs?: number;                       // default: 5 * 60 * 1000
}

export function createGithubClient(
  opts?: CreateGithubClientOptions,
): GithubClient;
```

- **Endpoints used:** `GET /repos/{o}/{r}` (covers stars, forks, open
  issues, license, top language, last push, default branch);
  `GET /repos/{o}/{r}/releases/latest` (release tag);
  `GET /repos/{o}/{r}/actions/runs?per_page=1[&workflow_id=…]`
  (workflow status); `GET /repos/{o}/{r}/contributors?per_page=1&anon=1`
  with `Link`-header parsing for contributor count.
- **Auth:** when a token is present, sends `Authorization: Bearer <token>`
  and `X-GitHub-Api-Version: 2022-11-28`. Otherwise anonymous.
- **Cache:** a single `Map<string, { value, expiresAt }>` keyed by full
  endpoint URL (including any query string). TTL default 5 min, override
  via env `GOLDENCHART_GH_TTL_MS`.
- **Errors:** a typed `GithubFetchError` discriminated by `kind:
  'not-found' | 'rate-limited' | 'unauthorized' | 'network' |
  'unexpected'`. The HTTP status drives the mapping
  (`404 → not-found`, `403`/`429` with rate-limit headers → `rate-limited`,
  `401 → unauthorized`, fetch rejection → `network`, anything else →
  `unexpected`). MCP tools surface the error directly so the agent can
  decide to retry, swap to a literal `render-badge`, or give up.
- **No new runtime deps.** `globalThis.fetch` is Node-18+ native and the
  `mcp/` package already targets that.

### MCP — three new tools

Registered in `mcp/src/registry.ts`; each gets a snapshot test under
`mcp/src/__snapshots__/` using the existing font-byte masking. Fetch tests
inject a stub `fetch` returning canned JSON via the
`createGithubClient({ fetch })` seam.

#### 1. `render-badge` (no network)

```ts
input: {
  label: string;
  value: string;
  tone?: BadgeTone;
  icon?: BadgeIcon;
  vibe?: VibeInput;
  brand?: BrandInput;
  seed?: number;
}
output: { svg: string }
```

Renders the `Badge` component through the same server-render path used by
the other render tools.

#### 2. `render-github-badge` (single metric, fetches)

```ts
input: {
  owner: string;
  repo: string;
  metric:
    | 'stars' | 'forks' | 'open-issues' | 'release' | 'license'
    | 'last-commit' | 'contributors' | 'language' | 'workflow';
  workflow?: string;           // only used when metric === 'workflow'
  label?: string;              // overrides the per-metric default
  tone?: BadgeTone;            // overrides the per-metric default
  icon?: BadgeIcon;            // overrides the per-metric default
  vibe?: VibeInput;
  brand?: BrandInput;
  seed?: number;
}
output: { svg: string }
```

Per-metric defaults:

| metric        | default label | default icon | default tone (derivation)                   |
| ------------- | ------------- | ------------ | ------------------------------------------- |
| `stars`       | `"stars"`     | `star`       | `info`                                      |
| `forks`       | `"forks"`     | `fork`       | `info`                                      |
| `open-issues` | `"issues"`    | `issue`      | `warn` if > 0, `success` if 0               |
| `release`     | `"release"`   | `tag`        | `info`                                      |
| `license`     | `"license"`   | `license`    | `neutral`                                   |
| `last-commit` | `"last commit"`| `commit`    | `success` if ≤ 30 d, `warn` if ≤ 365 d, `danger` otherwise |
| `contributors`| `"contributors"`| `fork`     | `info`                                      |
| `language`    | `"lang"`      | `lang`       | `neutral`                                   |
| `workflow`    | workflow name or `"build"` | `check` | `success` / `danger` from run conclusion    |

Values formatted with simple suffixing (`42300 → "42.3k"`, dates as `"3d
ago"`, releases as the raw tag).

#### 3. `render-github-badge-row` (multi-metric, fetches)

```ts
input: {
  owner: string;
  repo: string;
  metrics: Metric[];           // 1..8 items
  workflow?: string;
  gap?: number;                // default 8
  vibe?: VibeInput;
  brand?: BrandInput;
  seed?: number;
}
output: { svg: string }
```

Resolves all requested metrics through the cached client (so a row of five
metrics that all live on `getRepo` triggers a single HTTP call). Lays the
rendered badges out in a single SVG, left-to-right, vertically centered,
with `gap` pixels between them. Outer SVG width = sum of badge widths + (N-1)
* gap; height = badge height.

### Wiring

- `src/components/index.ts`: export `Badge`, types.
- `src/index.ts`: re-export same.
- `mcp/src/registry.ts`: register the three tools.
- `mcp/src/__snapshots__/`: new `.snap` files for each tool. Font bytes are
  masked by the existing `mcp/vitest.setup.ts`.

## Verification gates

Matches the project's existing CI gates and the constraints documented in
`CLAUDE.md`:

- `npm run typecheck` + `npm test` (root) and the same in `mcp/`.
- `npm run build` then `npm run check:bundle` — must not leak fonts into the
  browser entry and must stay under 75 KB gzipped.
- `cd mcp && npm run compare` — carry-forward render of one literal badge
  and one row, since this is an output-affecting change.
- Push the PR and let CI run the full vitest suite; the local Windows
  environment OOMs on the full suite (per memory
  `goldenchart-windows-shell-and-oom`).

## Out of scope (v1)

- Logo glyphs sourced from a remote SVG (`<image>`-embedded). Only the
  built-in stroke set lives in v1.
- GitLab / Bitbucket / Sourcehut. GitHub only.
- A `<BadgeRow>` library component. The MCP row tool composes badges
  directly; a row in JSX is `<div style={{display:'flex',gap}}>`, not worth
  a named component.
- Caller-supplied per-metric tone thresholds. The thresholds in the
  per-metric table above are hard-coded in v1 and can become inputs later
  if anyone asks.
- A `variant: 'shields'` mode on `Badge`. Additive follow-up if requested.
