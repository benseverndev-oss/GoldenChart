import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { dslTools } from './dslTools';

const renderDiagramTool = dslTools.find((t) => t.name === 'render_diagram')!;

const SPECS: Record<string, Record<string, unknown>> = {
  flowchart: { kind: 'flowchart', nodes: [{ id: 'a', label: 'Start' }, { id: 'b', label: 'End', parent: 'a' }] },
  sequence: {
    kind: 'sequence',
    actors: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }],
    messages: [{ from: 'a', to: 'b', label: 'hi' }],
  },
  mindmap: { kind: 'mindmap', nodes: [{ id: 'r', label: 'Root' }, { id: 'c', label: 'Child', parent: 'r' }] },
  arch: {
    kind: 'arch',
    nodes: [{ id: 'a', label: 'Web', group: 'F' }, { id: 'b', label: 'DB', group: 'D' }],
    edges: [{ from: 'a', to: 'b' }],
  },
  er: { kind: 'er', entities: [{ id: 'u', label: 'User', fields: [{ name: 'id', key: 'PK' }] }] },
  timeline: { kind: 'timeline', events: [{ label: 'Founded', date: '2021' }] },
  org: { kind: 'org', nodes: [{ id: 'ceo', label: 'CEO' }, { id: 'cto', label: 'CTO', parent: 'ceo' }] },
};

describe('render_diagram (diagram DSL tool)', () => {
  it('is registered', () => {
    expect(renderDiagramTool).toBeDefined();
  });

  for (const [kind, spec] of Object.entries(SPECS)) {
    describe(kind, () => {
      const args = { width: 360, height: 280, vibe: 'clean_blueprint', spec };

      it('accepts the spec against the declared schema', () => {
        expect(z.object(renderDiagramTool.config.inputSchema).safeParse(args).success).toBe(true);
      });

      it('renders standalone SVG tagged with the kind', async () => {
        const result = await renderDiagramTool.handler(args);
        expect(result.content[0].text.startsWith('<svg')).toBe(true);
        expect(result.structuredContent?.meta).toMatchObject({ kind });
        expect(result.content[0].text).toMatchSnapshot();
      });
    });
  }

  it('rejects an unknown diagram kind', () => {
    const parsed = z.object(renderDiagramTool.config.inputSchema).safeParse({
      width: 200,
      height: 200,
      spec: { kind: 'gantt', items: [] },
    });
    expect(parsed.success).toBe(false);
  });
});

const mermaidTool = dslTools.find((t) => t.name === 'build_diagram_from_mermaid')!;

describe('build_diagram_from_mermaid', () => {
  it('is registered', () => {
    expect(mermaidTool).toBeDefined();
  });

  it('renders a Mermaid flowchart snippet', async () => {
    const result = await mermaidTool.handler({
      width: 360,
      height: 280,
      vibe: 'clean_blueprint',
      source: 'flowchart TD\n  A[Start] --> B{OK?}\n  B -->|yes| C((Done))',
    });
    expect(result.isError).toBeFalsy();
    expect(result.content[0].text.startsWith('<svg')).toBe(true);
    expect(result.content[0].text).toContain('Start');
    expect(result.structuredContent?.meta).toMatchObject({ kind: 'flowchart' });
    expect(result.content[0].text).toMatchSnapshot();
  });

  it('renders a Mermaid sequenceDiagram snippet', async () => {
    const result = await mermaidTool.handler({
      width: 400,
      height: 300,
      source: 'sequenceDiagram\n  U->>S: request\n  S-->>U: response',
    });
    expect(result.isError).toBeFalsy();
    expect(result.content[0].text).toContain('request');
    expect(result.structuredContent?.meta).toMatchObject({ kind: 'sequence' });
    expect(result.content[0].text).toMatchSnapshot();
  });

  it('returns a structured error (not a crash) for unsupported Mermaid', async () => {
    const result = await mermaidTool.handler({
      width: 300,
      height: 200,
      source: 'gantt\n  title Roadmap',
    });
    expect(result.isError).toBe(true);
    expect(result.content[0].text).toMatch(/Unrecognized Mermaid diagram type/);
  });
});
