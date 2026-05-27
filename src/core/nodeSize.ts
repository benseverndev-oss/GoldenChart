import type { FlowNodeShape } from '../types/charts';
import { measureText } from './text';

/**
 * Size a diagram node to its label. Pure and DOM-free (text metrics come from
 * `measureText`). The layout engines size nodes off this so labels never
 * overflow their box and neighbours don't collide. Non-rect shapes need extra
 * room because the label sits inside the inscribed rectangle of the shape.
 */

const PAD_X = 16;
const PAD_Y = 12;
const MIN_W = 56;
const MIN_H = 36;
const MAX_W = 240;

// Extra room so a label fits inside the shape's inscribed box, not its bounds.
const SHAPE_FACTOR: Record<FlowNodeShape, { w: number; h: number }> = {
  rect: { w: 1, h: 1 },
  ellipse: { w: 1.4, h: 1.45 },
  diamond: { w: 1.7, h: 1.9 },
};

export function nodeSize(
  label: string,
  shape: FlowNodeShape,
  fontSize: number,
  fontFamily: string,
): { width: number; height: number } {
  const m = measureText(label, fontSize, fontFamily);
  const f = SHAPE_FACTOR[shape] ?? SHAPE_FACTOR.rect;
  const width = Math.max(MIN_W, Math.min((m.width + PAD_X * 2) * f.w, MAX_W));
  const height = Math.max(MIN_H, (m.height + PAD_Y * 2) * f.h);
  return { width: Math.round(width), height: Math.round(height) };
}
