import { describe, expect, it } from 'vitest';
import { markAttrs } from '../core/interaction';
import { markFromEvent } from './InteractiveChart';
import type { MarkMeta } from '../types/interaction';

// jsdom is not a project dependency (see readMark.test.ts), so we exercise
// markFromEvent against a minimal Element stub rather than a real DOM.
function fakeHost(attrs: Record<string, string>): Element {
  const host = {
    getAttribute: (n: string) => (n in attrs ? attrs[n] : null),
    closest: (sel: string) => (sel === '[data-gc-mark]' && 'data-gc-mark' in attrs ? host : null),
  };
  return host as unknown as Element;
}

function fakeChildOf(host: Element): Element {
  return { closest: (sel: string) => (sel === '[data-gc-mark]' ? host : null) } as unknown as Element;
}

const fakeSvg = {} as unknown as SVGSVGElement;

describe('markFromEvent', () => {
  it('returns the mark + svg-space anchor (the mark cx/cy) for a tagged target', () => {
    const meta: MarkMeta = { kind: 'bar', index: 0, label: 'Q1', value: 12, cx: 40, cy: 20 };
    const out = markFromEvent(fakeSvg, fakeHost(markAttrs(meta)), 0, 0);
    expect(out?.mark.label).toBe('Q1');
    expect(out?.x).toBe(40);
    expect(out?.y).toBe(20);
  });

  it('resolves via closest() from a child element', () => {
    const meta: MarkMeta = { kind: 'point', series: 's1', index: 0, value: { x: 1, y: 2 }, cx: 5, cy: 6 };
    const host = fakeHost(markAttrs(meta));
    expect(markFromEvent(fakeSvg, fakeChildOf(host), 0, 0)?.mark.series).toBe('s1');
  });

  it('returns null for an untagged target', () => {
    expect(markFromEvent(fakeSvg, fakeHost({}), 0, 0)).toBeNull();
  });
});
