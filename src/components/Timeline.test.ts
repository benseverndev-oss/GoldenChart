import { createElement } from 'react';
import { describe, expect, it } from 'vitest';
import { Timeline } from './Timeline';
import { computeTimeline } from '../core/timeline';
import { renderToSVGString } from '../render/renderToString';
import type { TimelineEventInput } from '../core/timeline';

const EVENTS: TimelineEventInput[] = [
  { date: '2021', label: 'Founded', detail: 'Two people, one idea' },
  { date: '2022', label: 'Seed round' },
  { date: '2023', label: 'Launch', detail: 'Public beta' },
  { date: '2024', label: 'Series A' },
];

describe('computeTimeline', () => {
  it('places events in order along a horizontal axis, alternating sides', () => {
    const layout = computeTimeline(EVENTS, [600, 240]);
    expect(layout.orientation).toBe('horizontal');
    // Markers sit on the axis and advance left-to-right.
    expect(layout.events.every((e) => e.marker.y === layout.axis.y1)).toBe(true);
    for (let i = 1; i < layout.events.length; i++) {
      expect(layout.events[i].marker.x).toBeGreaterThan(layout.events[i - 1].marker.x);
    }
    // Labels alternate above / below the axis.
    expect(layout.events[0].side).toBe(-1);
    expect(layout.events[1].side).toBe(1);
  });

  it('anchors labels to the side of a vertical axis', () => {
    const layout = computeTimeline(EVENTS, [240, 600], { orientation: 'vertical' });
    expect(layout.orientation).toBe('vertical');
    expect(layout.events.every((e) => e.marker.x === layout.axis.x1)).toBe(true);
    expect(layout.events[0].anchor).toBe('start');
    expect(layout.events[1].anchor).toBe('end');
  });
});

describe('Timeline', () => {
  it('renders an axis, markers and event labels as standalone SVG', () => {
    const svg = renderToSVGString(
      createElement(Timeline, { events: EVENTS, width: 600, height: 240, bare: true }),
    );
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg).toContain('Founded');
    expect(svg).toContain('Series A');
    expect(svg).toContain('<path');
  });
});
