import { describe, expect, it } from 'vitest';
import { paperSpeckles, speckleTierFor } from './texture';

describe('paperSpeckles', () => {
  it('is deterministic for a given seed', () => {
    expect(paperSpeckles(460, 300, 7)).toEqual(paperSpeckles(460, 300, 7));
  });

  it('produces a different pattern for a different seed', () => {
    const a = paperSpeckles(460, 300, 1);
    const b = paperSpeckles(460, 300, 2);
    expect(a).not.toEqual(b);
  });

  it('scales count with area (~ area / 550)', () => {
    const specks = paperSpeckles(460, 300, 7);
    expect(specks.length).toBe(Math.round((460 * 300) / 550));
  });

  it('keeps every speck inside the surface bounds', () => {
    for (const s of paperSpeckles(200, 120, 7)) {
      expect(s.cx).toBeGreaterThanOrEqual(0);
      expect(s.cx).toBeLessThanOrEqual(200);
      expect(s.cy).toBeGreaterThanOrEqual(0);
      expect(s.cy).toBeLessThanOrEqual(120);
    }
  });

  it('keeps radius and opacity within the medium tier', () => {
    for (const s of paperSpeckles(200, 120, 7)) {
      expect(s.r).toBeGreaterThanOrEqual(0.5);
      expect(s.r).toBeLessThanOrEqual(1.0);
      expect(s.opacity).toBeGreaterThanOrEqual(0.05);
      expect(s.opacity).toBeLessThanOrEqual(0.13);
    }
  });

  it('returns nothing for a degenerate surface', () => {
    expect(paperSpeckles(0, 0, 7)).toEqual([]);
  });

  it("defaults to the 'medium' tier (back-compat with the 3-arg call)", () => {
    expect(paperSpeckles(460, 300, 7)).toEqual(paperSpeckles(460, 300, 7, 'medium'));
  });
});

describe('paperSpeckles tiers', () => {
  it('subtle is sparser than medium for the same surface', () => {
    const subtle = paperSpeckles(460, 300, 7, 'subtle');
    const medium = paperSpeckles(460, 300, 7, 'medium');
    expect(subtle.length).toBe(Math.round((460 * 300) / 950));
    expect(subtle.length).toBeLessThan(medium.length);
  });

  it('keeps subtle radius and opacity within its (fainter) tier', () => {
    for (const s of paperSpeckles(200, 120, 7, 'subtle')) {
      expect(s.r).toBeGreaterThanOrEqual(0.4);
      expect(s.r).toBeLessThanOrEqual(0.9);
      expect(s.opacity).toBeGreaterThanOrEqual(0.04);
      expect(s.opacity).toBeLessThanOrEqual(0.1);
    }
  });
});

describe('speckleTierFor', () => {
  it("maps 'paper' and 'paper-medium' to the medium tier", () => {
    expect(speckleTierFor('paper')).toBe('medium');
    expect(speckleTierFor('paper-medium')).toBe('medium');
  });

  it("maps 'paper-subtle' to the subtle tier", () => {
    expect(speckleTierFor('paper-subtle')).toBe('subtle');
  });

  it("returns null for 'none', undefined, and unknown values", () => {
    expect(speckleTierFor('none')).toBeNull();
    expect(speckleTierFor(undefined)).toBeNull();
    expect(speckleTierFor('bogus')).toBeNull();
  });
});
