import { describe, expect, it } from 'vitest';
import { markAttrs } from '../core/interaction';
import { readMark } from './readMark';
import type { MarkMeta } from '../types/interaction';

// jsdom is not a project dependency, so we exercise readMark against a minimal
// Element stub (getAttribute + closest) rather than a real DOM. This keeps the
// test runnable in the default node environment and in CI.
function fakeHost(attrs: Record<string, string>): Element {
  const host = {
    getAttribute: (n: string) => (n in attrs ? attrs[n] : null),
    closest: (sel: string) => (sel === '[data-gc-mark]' && 'data-gc-mark' in attrs ? host : null),
  };
  return host as unknown as Element;
}

function fakeChildOf(host: Element): Element {
  return {
    closest: (sel: string) => (sel === '[data-gc-mark]' ? host : null),
  } as unknown as Element;
}

describe('readMark', () => {
  it('round-trips a single-value mark', () => {
    const meta: MarkMeta = { kind: 'bar', index: 1, label: 'Q2', value: 19, cx: 12, cy: 34 };
    expect(readMark(fakeHost(markAttrs(meta)))).toEqual(meta);
  });

  it('parses multi-value and resolves via closest() from a child', () => {
    const meta: MarkMeta = {
      kind: 'point',
      series: 's1',
      index: 0,
      value: { x: 1, y: 2 },
      cx: 5,
      cy: 6,
    };
    const host = fakeHost(markAttrs(meta));
    expect(readMark(fakeChildOf(host))).toEqual(meta);
  });

  it('returns null when untagged', () => {
    expect(readMark(fakeHost({}))).toBeNull();
  });
});
