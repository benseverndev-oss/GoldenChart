/**
 * Sequence-diagram layout. Actors become evenly spaced columns with a header
 * box and a lifeline running down the plot; messages are ordered top-to-bottom
 * as horizontal arrows between lifelines (self-messages loop back). Pure
 * geometry — pixel coordinates ready for the renderer.
 */

export interface SequenceActorInput {
  id: string;
  label?: string;
}

export type SequenceMessageKind = 'sync' | 'async' | 'reply';

export interface SequenceMessageInput {
  from: string;
  to: string;
  label?: string;
  /** `reply` renders dashed; `sync`/`async` solid. Defaults to `sync`. */
  kind?: SequenceMessageKind;
}

export interface LaidActor {
  id: string;
  label: string;
  x: number;
  boxX: number;
  boxY: number;
  boxWidth: number;
  boxHeight: number;
  lifelineTop: number;
  lifelineBottom: number;
}

export interface LaidMessage {
  from: string;
  to: string;
  label?: string;
  x1: number;
  x2: number;
  y: number;
  dashed: boolean;
  self: boolean;
}

export interface SequenceLayout {
  actors: LaidActor[];
  messages: LaidMessage[];
}

export interface SequenceOptions {
  actorHeight?: number;
  topPadding?: number;
}

export const SELF_LOOP_WIDTH = 44;

export function computeSequence(
  actors: SequenceActorInput[],
  messages: SequenceMessageInput[],
  size: [number, number],
  opts: SequenceOptions = {},
): SequenceLayout {
  const [width, height] = size;
  if (actors.length === 0) return { actors: [], messages: [] };

  const actorHeight = opts.actorHeight ?? 36;
  const topPadding = opts.topPadding ?? 28;
  const colWidth = width / actors.length;
  const boxWidth = Math.max(50, Math.min(colWidth - 16, 150));

  const laidActors: LaidActor[] = actors.map((a, i) => {
    const x = colWidth * (i + 0.5);
    return {
      id: a.id,
      label: a.label ?? a.id,
      x,
      boxX: x - boxWidth / 2,
      boxY: 0,
      boxWidth,
      boxHeight: actorHeight,
      lifelineTop: actorHeight,
      lifelineBottom: height,
    };
  });

  const xOf = new Map(laidActors.map((a) => [a.id, a.x]));

  const top = actorHeight + topPadding;
  const bottom = height - 8;
  const valid = messages.filter((m) => xOf.has(m.from) && xOf.has(m.to));
  const rowStep = (bottom - top) / Math.max(1, valid.length);

  const laidMessages: LaidMessage[] = valid.map((m, k) => {
    const y = top + (k + 0.5) * rowStep;
    return {
      from: m.from,
      to: m.to,
      label: m.label,
      x1: xOf.get(m.from)!,
      x2: xOf.get(m.to)!,
      y,
      dashed: m.kind === 'reply',
      self: m.from === m.to,
    };
  });

  return { actors: laidActors, messages: laidMessages };
}
