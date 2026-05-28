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
    const c = createGithubClient({ fetch: fetch as unknown as typeof globalThis.fetch });
    expect(await c.getRepo('o', 'r')).toEqual({
      stars: 10, forks: 2, openIssues: 3, license: 'MIT',
      language: 'TypeScript', pushedAt: '2026-05-01T00:00:00Z', defaultBranch: 'main',
    });
  });

  it('caches completed responses for TTL', async () => {
    const fetch = fakeFetch({ [REPO_URL]: { status: 200, body: { stargazers_count: 1 } } });
    const c = createGithubClient({ fetch: fetch as unknown as typeof globalThis.fetch, ttlMs: 60_000 });
    await c.getRepo('o', 'r');
    await c.getRepo('o', 'r');
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('dedupes in-flight requests', async () => {
    let resolveHttp!: (v: Response) => void;
    const fetch = vi.fn(() => new Promise<Response>((res) => { resolveHttp = res; }));
    const c = createGithubClient({ fetch: fetch as unknown as typeof globalThis.fetch });
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
      }) as unknown as typeof globalThis.fetch,
    });
    await expect(c.getRepo('o', 'r')).rejects.toMatchObject({ kind: 'not-found' });
    await expect(c.getLatestRelease('o', 'r')).rejects.toMatchObject({ kind: 'unauthorized' });
    await expect(c.getContributorsCount('o', 'r')).rejects.toMatchObject({ kind: 'rate-limited' });
  });

  it('sends Authorization header when token is set', async () => {
    const fetch = vi.fn(async () => new Response(JSON.stringify({ stargazers_count: 1 }), { status: 200 }));
    const c = createGithubClient({ fetch: fetch as unknown as typeof globalThis.fetch, token: 'ghp_xxx' });
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
      expect((c1 as any).__ttlMs).toBe(1000);
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
    const c = createGithubClient({ fetch: fetch as unknown as typeof globalThis.fetch });
    expect(await c.getContributorsCount('o', 'r')).toBe(137);
  });
});
