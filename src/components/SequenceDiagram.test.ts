import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { SequenceDiagram } from './SequenceDiagram';
import { computeSequence } from '../core/sequence';
import { renderToSVGString } from '../render/renderToString';
import type { SequenceActorInput, SequenceMessageInput } from '../core/sequence';

const ACTORS: SequenceActorInput[] = [
  { id: 'user', label: 'User' },
  { id: 'app', label: 'App' },
  { id: 'db', label: 'DB' },
];

const MESSAGES: SequenceMessageInput[] = [
  { from: 'user', to: 'app', label: 'click' },
  { from: 'app', to: 'db', label: 'query' },
  { from: 'app', to: 'app', label: 'validate' },
  { from: 'db', to: 'app', label: 'rows', kind: 'reply' },
  { from: 'app', to: 'user', label: 'render', kind: 'reply' },
];

describe('computeSequence', () => {
  it('spreads actors into columns and orders messages top-to-bottom', () => {
    const layout = computeSequence(ACTORS, MESSAGES, [480, 320]);
    expect(layout.actors).toHaveLength(3);
    // Columns are left-to-right in input order.
    expect(layout.actors[0].x).toBeLessThan(layout.actors[1].x);
    expect(layout.actors[1].x).toBeLessThan(layout.actors[2].x);
    // Lifelines start below the header box.
    expect(layout.actors[0].lifelineTop).toBe(layout.actors[0].boxHeight);
    // Messages keep input order and descend.
    expect(layout.messages.map((m) => m.label)).toEqual([
      'click',
      'query',
      'validate',
      'rows',
      'render',
    ]);
    for (let i = 1; i < layout.messages.length; i++) {
      expect(layout.messages[i].y).toBeGreaterThan(layout.messages[i - 1].y);
    }
    // Self-message and reply flags resolved.
    expect(layout.messages[2].self).toBe(true);
    expect(layout.messages[3].dashed).toBe(true);
  });

  it('drops messages referencing unknown actors', () => {
    const layout = computeSequence(ACTORS, [{ from: 'user', to: 'ghost' }], [400, 200]);
    expect(layout.messages).toHaveLength(0);
  });

  it('gives a self-message extra vertical room so its loop clears the next message', () => {
    const layout = computeSequence(ACTORS, MESSAGES, [480, 320]);
    const ys = layout.messages.map((m) => m.y);
    // index 2 is the 'validate' self-message; its gap to the next message should
    // exceed the gap between two ordinary messages.
    const selfGap = ys[3] - ys[2];
    const normalGap = ys[1] - ys[0];
    expect(selfGap).toBeGreaterThan(normalGap);
  });
});

describe('SequenceDiagram', () => {
  it('renders actors, lifelines and messages as standalone SVG', () => {
    const svg = renderToSVGString(
      createElement(SequenceDiagram, {
        actors: ACTORS,
        messages: MESSAGES,
        width: 480,
        height: 320,
        bare: true,
      }),
    );
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('User');
    expect(svg).toContain('query');
    expect(svg).toContain('<path');
    // Reply / self messages request a dashed stroke.
    expect(svg).toContain('stroke-dasharray');
  });

  it('knocks out a solid rect behind message labels so lifelines never run through them (#140)', () => {
    // `pencil` resolves to no background, the exact case the per-glyph halo
    // missed — the knockout box must still paint, falling back to white.
    const svg = renderToSVGString(
      createElement(SequenceDiagram, {
        actors: ACTORS,
        messages: MESSAGES,
        width: 480,
        height: 320,
        vibe: 'pencil',
        bare: true,
      }),
    );
    // One knockout rect per message label (5 messages here).
    const rects = svg.match(/<rect[^>]*fill="#ffffff"/g) ?? [];
    expect(rects.length).toBeGreaterThanOrEqual(5);
  });
});
