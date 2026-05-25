import type { ComponentType } from 'react';
import { describe, expect, it } from 'vitest';
import { renderDiagram } from './renderDiagram';
import { renderToSVGString } from '../render/renderToString';
import type { DiagramSpec } from '../core/spec';

const name = (spec: DiagramSpec) =>
  (renderDiagram(spec, { width: 320, height: 240, bare: true }).type as ComponentType).name;

const SPECS: Record<string, { spec: DiagramSpec; component: string; contains: string }> = {
  flowchart: {
    spec: { kind: 'flowchart', nodes: [{ id: 'a', label: 'Start' }, { id: 'b', label: 'End', parent: 'a' }] },
    component: 'Flowchart',
    contains: 'Start',
  },
  sequence: {
    spec: {
      kind: 'sequence',
      actors: [{ id: 'a', label: 'A' }, { id: 'b', label: 'B' }],
      messages: [{ from: 'a', to: 'b', label: 'hi' }],
    },
    component: 'SequenceDiagram',
    contains: 'hi',
  },
  mindmap: {
    spec: { kind: 'mindmap', nodes: [{ id: 'r', label: 'Root' }, { id: 'c', label: 'Child', parent: 'r' }] },
    component: 'MindMap',
    contains: 'Root',
  },
  arch: {
    spec: {
      kind: 'arch',
      nodes: [{ id: 'a', label: 'Web', group: 'F' }, { id: 'b', label: 'DB', group: 'D' }],
      edges: [{ from: 'a', to: 'b' }],
    },
    component: 'ArchitectureDiagram',
    contains: 'Web',
  },
  er: {
    spec: { kind: 'er', entities: [{ id: 'u', label: 'User', fields: [{ name: 'id', key: 'PK' }] }] },
    component: 'ERDiagram',
    contains: 'User',
  },
  timeline: {
    spec: { kind: 'timeline', events: [{ label: 'Founded', date: '2021' }] },
    component: 'Timeline',
    contains: 'Founded',
  },
  org: {
    spec: { kind: 'org', nodes: [{ id: 'ceo', label: 'CEO' }, { id: 'cto', label: 'CTO', parent: 'ceo' }] },
    component: 'OrgChart',
    contains: 'CEO',
  },
};

describe('renderDiagram', () => {
  for (const [kind, { spec, component, contains }] of Object.entries(SPECS)) {
    it(`dispatches "${kind}" to ${component} and renders SVG`, () => {
      expect(name(spec)).toBe(component);
      const svg = renderToSVGString(renderDiagram(spec, { width: 360, height: 280, bare: true }));
      expect(svg.startsWith('<svg')).toBe(true);
      expect(svg).toContain(contains);
    });
  }
});
