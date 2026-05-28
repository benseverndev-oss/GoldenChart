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
  const ttlMs = opts.ttlMs ?? (Number(process.env.GOLDENCHART_GH_TTL_MS) || DEFAULT_TTL_MS);
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
        if (!run) throw new GithubFetchError('not-found', 404, 'no workflow runs');
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
