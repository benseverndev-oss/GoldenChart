import { describe, expect, it } from 'vitest';
import { MermaidParseError, parseMermaid } from './mermaid';
import type { ArchSpec, FlowchartSpec, MindMapSpec, SequenceSpec } from './spec';

describe('parseMermaid — flowchart', () => {
  it('parses direction, node shapes, edges and labels', () => {
    const spec = parseMermaid(
      [
        'flowchart LR',
        '  A([Start]) --> B[Work]',
        '  B --> C{OK?}',
        '  C -->|yes| D((Done))',
        '  C -- no --> B',
      ].join('\n'),
    ) as FlowchartSpec;

    expect(spec.kind).toBe('flowchart');
    expect(spec.direction).toBe('LR');
    const byId = Object.fromEntries(spec.nodes.map((n) => [n.id, n]));
    expect(byId.A.label).toBe('Start');
    expect(byId.A.shape).toBe('ellipse');
    expect(byId.B.shape).toBe('rect');
    expect(byId.C.shape).toBe('diamond');
    expect(byId.D.shape).toBe('ellipse');
    // 4 edges; the yes/no labels are captured.
    const edges = spec.edges ?? [];
    expect(edges).toHaveLength(4);
    expect(edges.find((e) => e.from === 'C' && e.to === 'D')?.label).toBe('yes');
    expect(edges.find((e) => e.from === 'C' && e.to === 'B')?.label).toBe('no');
  });

  it('defaults direction and treats graph as an alias', () => {
    const spec = parseMermaid('graph\n  A --> B') as FlowchartSpec;
    expect(spec.kind).toBe('flowchart');
    expect(spec.direction).toBeUndefined();
    expect(spec.nodes).toHaveLength(2);
  });
});

describe('parseMermaid — sequenceDiagram', () => {
  it('parses participants (with aliases) and message kinds', () => {
    const spec = parseMermaid(
      [
        'sequenceDiagram',
        '  participant U as User',
        '  participant S as Server',
        '  U->>S: request',
        '  S-->>U: response',
      ].join('\n'),
    ) as SequenceSpec;

    expect(spec.kind).toBe('sequence');
    expect(spec.actors).toEqual([
      { id: 'U', label: 'User' },
      { id: 'S', label: 'Server' },
    ]);
    expect(spec.messages[0]).toMatchObject({ from: 'U', to: 'S', label: 'request', kind: 'sync' });
    expect(spec.messages[1]).toMatchObject({
      from: 'S',
      to: 'U',
      label: 'response',
      kind: 'reply',
    });
  });

  it('auto-registers actors first seen in messages', () => {
    const spec = parseMermaid('sequenceDiagram\n  A->>B: hi') as SequenceSpec;
    expect(spec.actors.map((a) => a.id)).toEqual(['A', 'B']);
  });
});

describe('parseMermaid — mindmap', () => {
  it('builds a tree from indentation', () => {
    const spec = parseMermaid(
      ['mindmap', '  root((Plan))', '    Design', '    Build', '      API', '    Ship'].join('\n'),
    ) as MindMapSpec;

    expect(spec.kind).toBe('mindmap');
    const root = spec.nodes.find((n) => n.parent == null)!;
    expect(root.label).toBe('Plan');
    const api = spec.nodes.find((n) => n.label === 'API')!;
    const build = spec.nodes.find((n) => n.label === 'Build')!;
    expect(api.parent).toBe(build.id);
  });
});

describe('parseMermaid — errors', () => {
  it('throws a structured error for unknown diagram types', () => {
    expect(() => parseMermaid('gantt\n title X')).toThrow(MermaidParseError);
  });

  it('throws for recognised-but-unsupported constructs', () => {
    expect(() => parseMermaid('erDiagram\n A ||--o{ B : has')).toThrow(/not yet supported/);
    expect(() => parseMermaid('sequenceDiagram\n loop every minute')).toThrow(
      /Unsupported sequenceDiagram/,
    );
  });

  it('throws when a mindmap has multiple roots', () => {
    expect(() => parseMermaid('mindmap\n  A\n  B')).toThrow(/exactly one root/);
  });

  it('does not type "arch" — that has no Mermaid form here', () => {
    // Sanity: the union still includes arch even though the parser never emits it.
    const arch: ArchSpec = { kind: 'arch', nodes: [{ id: 'a', label: 'A' }] };
    expect(arch.kind).toBe('arch');
  });
});
