import type { Point } from '../types/geometry';

/**
 * Timeline layout. Events are placed in order along a central axis (horizontal
 * or vertical) at even intervals, with their label blocks alternating to either
 * side of the axis so they don't collide. Pure geometry for the renderer.
 */

export interface TimelineEventInput {
  label: string;
  date?: string;
  detail?: string;
}

export type TimelineOrientation = 'horizontal' | 'vertical';

export interface LaidTimelineEvent {
  label: string;
  date?: string;
  detail?: string;
  marker: Point;
  /** Anchor point for the label block. */
  label_at: Point;
  /** Text anchor for the label block. */
  anchor: 'start' | 'middle' | 'end';
  /** Which side of the axis the label sits on: +1 or -1. */
  side: 1 | -1;
}

export interface TimelineLayout {
  orientation: TimelineOrientation;
  axis: { x1: number; y1: number; x2: number; y2: number };
  events: LaidTimelineEvent[];
}

export interface TimelineOptions {
  orientation?: TimelineOrientation;
}

const LABEL_OFFSET = 34;

export function computeTimeline(
  events: TimelineEventInput[],
  size: [number, number],
  opts: TimelineOptions = {},
): TimelineLayout {
  const [width, height] = size;
  const orientation = opts.orientation ?? 'horizontal';
  const n = events.length;

  if (orientation === 'vertical') {
    const axisX = width / 2;
    const step = height / Math.max(1, n);
    const laid: LaidTimelineEvent[] = events.map((e, i) => {
      const my = step * (i + 0.5);
      const side: 1 | -1 = i % 2 === 0 ? 1 : -1;
      return {
        label: e.label,
        date: e.date,
        detail: e.detail,
        marker: { x: axisX, y: my },
        label_at: { x: axisX + side * LABEL_OFFSET, y: my },
        anchor: side === 1 ? 'start' : 'end',
        side,
      };
    });
    return { orientation, axis: { x1: axisX, y1: 0, x2: axisX, y2: height }, events: laid };
  }

  const axisY = height / 2;
  const step = width / Math.max(1, n);
  const laid: LaidTimelineEvent[] = events.map((e, i) => {
    const mx = step * (i + 0.5);
    const side: 1 | -1 = i % 2 === 0 ? -1 : 1; // first event above the axis
    return {
      label: e.label,
      date: e.date,
      detail: e.detail,
      marker: { x: mx, y: axisY },
      label_at: { x: mx, y: axisY + side * LABEL_OFFSET },
      anchor: 'middle',
      side,
    };
  });
  return { orientation, axis: { x1: 0, y1: axisY, x2: width, y2: axisY }, events: laid };
}
