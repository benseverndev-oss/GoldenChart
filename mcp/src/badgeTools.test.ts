import { describe, it, expect, afterEach, vi } from 'vitest';
import {
  renderBadgeTool, renderGithubBadgeTool, renderGithubBadgeRowTool, __setGithubClientForTests,
} from './badgeTools';
import { GithubFetchError, type GithubClient } from './githubClient';

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

const stubClient = (overrides?: Partial<GithubClient>): GithubClient => ({
  getRepo: async () => ({
    stars: 12345, forks: 678, openIssues: 0,
    license: 'MIT', language: 'TypeScript',
    pushedAt: '2026-05-01T00:00:00Z', defaultBranch: 'main',
  }),
  getLatestRelease: async () => ({ tag: 'v1.2.3', name: '1.2.3', publishedAt: '2026-05-01T00:00:00Z' }),
  getWorkflowStatus: async () => ({ name: 'CI', conclusion: 'success', status: 'completed', htmlUrl: '' }),
  getContributorsCount: async () => 42,
  ...overrides,
});

describe('render-github-badge', () => {
  afterEach(() => __setGithubClientForTests(null));

  it('renders a stars badge with k-formatted value and info tone', async () => {
    __setGithubClientForTests(stubClient());
    const res = await renderGithubBadgeTool.handler({
      owner: 'o', repo: 'r', metric: 'stars',
    });
    const svg = (res.content[0] as { text: string }).text;
    expect(svg).toContain('12.3k');
    expect(svg).toMatchSnapshot();
  });
  it('renders a workflow badge as success (green)', async () => {
    __setGithubClientForTests(stubClient());
    const res = await renderGithubBadgeTool.handler({
      owner: 'o', repo: 'r', metric: 'workflow',
    });
    const svg = (res.content[0] as { text: string }).text;
    expect(svg).toContain('#3a8a3a');
  });
  it('reports rate-limited errors as structured tool errors', async () => {
    __setGithubClientForTests(stubClient({
      getRepo: async () => { throw new GithubFetchError('rate-limited', 403, 'rate'); },
    }));
    const res = await renderGithubBadgeTool.handler({
      owner: 'o', repo: 'r', metric: 'stars',
    });
    expect(res.isError).toBe(true);
    expect((res.content[0] as { text: string }).text).toContain('rate-limited');
  });
});

describe('render-github-badge-row', () => {
  afterEach(() => __setGithubClientForTests(null));

  it('renders a row that triggers exactly one repo call for repo-derived metrics', async () => {
    const repo = vi.fn(async () => ({
      stars: 100, forks: 10, openIssues: 0, license: 'MIT',
      language: 'TS', pushedAt: new Date().toISOString(), defaultBranch: 'main',
    }));
    __setGithubClientForTests(stubClient({ getRepo: repo }));
    const res = await renderGithubBadgeRowTool.handler({
      owner: 'o', repo: 'r',
      metrics: ['stars', 'forks', 'open-issues', 'license', 'language'],
    });
    expect(repo).toHaveBeenCalledTimes(1);
    expect((res.content[0] as { text: string }).text).toMatchSnapshot();
  });
});
