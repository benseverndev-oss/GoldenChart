import { describe, expect, it } from 'vitest';
import { nodeSize } from './nodeSize';

const FONT = 'sans-serif';

describe('nodeSize', () => {
  it('grows with label length', () => {
    const short = nodeSize('Hi', 'rect', 14, FONT).width;
    const long = nodeSize('A much longer label here', 'rect', 14, FONT).width;
    expect(long).toBeGreaterThan(short);
  });

  it('enforces a minimum size for tiny labels', () => {
    const s = nodeSize('x', 'rect', 14, FONT);
    expect(s.width).toBeGreaterThanOrEqual(56);
    expect(s.height).toBeGreaterThanOrEqual(36);
  });

  it('caps very long labels at the max width', () => {
    expect(nodeSize('x'.repeat(200), 'rect', 14, FONT).width).toBeLessThanOrEqual(240);
  });

  it('makes diamonds and ellipses larger than a rect for the same label', () => {
    const rect = nodeSize('Decision', 'rect', 14, FONT);
    const diamond = nodeSize('Decision', 'diamond', 14, FONT);
    const ellipse = nodeSize('Decision', 'ellipse', 14, FONT);
    expect(diamond.width).toBeGreaterThan(rect.width);
    expect(diamond.height).toBeGreaterThan(rect.height);
    expect(ellipse.width).toBeGreaterThan(rect.width);
  });

  it('is deterministic', () => {
    expect(nodeSize('Engineering', 'rect', 14, FONT)).toEqual(nodeSize('Engineering', 'rect', 14, FONT));
  });
});
