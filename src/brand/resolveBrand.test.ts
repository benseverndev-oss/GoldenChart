import { describe, expect, it } from 'vitest';
import { resolveBrand, brandVibeOverrides } from './resolveBrand';
import { DEFAULT_PALETTE } from '../core/palette';

describe('resolveBrand', () => {
  it('falls back to the default palette and empty overrides with no brand', () => {
    const resolved = resolveBrand();
    expect(resolved.palette).toBe(DEFAULT_PALETTE);
    expect(resolved.vibeOverrides).toEqual({});
    expect(resolved.logo).toBeUndefined();
  });

  it('uses a supplied palette but falls back when it is empty', () => {
    expect(resolveBrand({ palette: ['#abc', '#def'] }).palette).toEqual(['#abc', '#def']);
    expect(resolveBrand({ palette: [] }).palette).toBe(DEFAULT_PALETTE);
  });

  it('maps brand identity onto vibe overrides', () => {
    const overrides = brandVibeOverrides({
      ink: '#111',
      primary: '#f00',
      page: '#fff',
      font: 'Brand Sans',
    });
    expect(overrides).toEqual({
      stroke: '#111',
      fill: '#f00',
      background: '#fff',
      fontFamily: 'Brand Sans',
    });
  });

  it('omits vibe-override keys for unset brand fields', () => {
    expect(brandVibeOverrides({ primary: '#f00' })).toEqual({ fill: '#f00' });
  });

  it('fills in logo defaults', () => {
    const logo = resolveBrand({ logo: { src: 'logo.svg' } }).logo;
    expect(logo).toEqual({
      src: 'logo.svg',
      position: 'bottom-right',
      width: 64,
      height: 64,
      opacity: 1,
      margin: 12,
    });
  });

  it('defaults logo height to width and clamps opacity', () => {
    const logo = resolveBrand({ logo: { src: 'l.png', width: 100, opacity: 2.5 } }).logo;
    expect(logo?.height).toBe(100);
    expect(logo?.opacity).toBe(1);
    expect(resolveBrand({ logo: { src: 'l.png', opacity: -1 } }).logo?.opacity).toBe(0);
  });

  it('respects an explicit logo height', () => {
    expect(resolveBrand({ logo: { src: 'l.png', width: 120, height: 40 } }).logo?.height).toBe(40);
  });
});
