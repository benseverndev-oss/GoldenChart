import type { VibeOverrides } from './vibe';

/** Corner the brand logo is pinned to on the chart surface. */
export type BrandLogoPosition = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

/**
 * A brand logo / wordmark drawn onto the surface. `src` is a URL or data-URI —
 * the library never bundles image bytes. Sizing keeps the image undistorted
 * (rendered with `preserveAspectRatio="xMidYMid meet"` inside a width×height box).
 */
export interface BrandLogo {
  src: string;
  /** Default `'bottom-right'`. */
  position?: BrandLogoPosition;
  /** Box width in px. Default 64. */
  width?: number;
  /** Box height in px. Defaults to `width` (a square box; the logo scales to fit). */
  height?: number;
  /** 0–1, clamped. Default 1. */
  opacity?: number;
  /** Inset from the surface edge in px. Default 12. */
  margin?: number;
}

/**
 * A user's brand identity, layered on top of a `vibe`. The vibe controls *how*
 * a chart is drawn (texture, roughness, the hand-drawn feel); the brand controls
 * *identity* — colours, font and logo. Every field is optional; omit one to
 * inherit whatever the vibe provides.
 */
export interface Brand {
  /** Categorical hues for multi-series / pie. Replaces the default palette. */
  palette?: string[];
  /** Primary brand fill (single-series bars, accents). Maps to the vibe `fill`. */
  primary?: string;
  /** Line / stroke colour. Maps to the vibe `stroke`. */
  ink?: string;
  /** Page / canvas colour. Maps to the vibe `background`. */
  page?: string;
  /** Font family for all chart text. Maps to the vibe `fontFamily`. */
  font?: string;
  /** Optional corner logo / wordmark. */
  logo?: BrandLogo;
}

/** What consumers pass to `<Surface>`/charts. Currently identical to `Brand`. */
export type BrandConfig = Brand;

/** A logo with every layout field filled in. */
export interface ResolvedBrandLogo extends Required<BrandLogo> {}

/**
 * The vibe knobs a brand can recolour. Layered between the preset defaults and
 * any explicit per-call vibe overrides, so a brand recolours any vibe while an
 * explicit override still wins.
 */
export type BrandVibeOverrides = Partial<Pick<VibeOverrides, 'stroke' | 'fill' | 'background' | 'fontFamily'>>;

/** A `Brand` resolved into the pieces the renderer consumes. */
export interface ResolvedBrand {
  /** Categorical palette (the brand's, or the library default). */
  palette: string[];
  /** Logo with defaults applied, or `undefined` when no logo was given. */
  logo?: ResolvedBrandLogo;
  /** Vibe colour/font overrides derived from the brand. */
  vibeOverrides: BrandVibeOverrides;
}
