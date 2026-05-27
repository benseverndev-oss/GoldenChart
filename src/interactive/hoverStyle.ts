/** Root attribute present only while something is hovered. */
export const HOVER_ATTR = 'data-gc-hover';
/** Marks the currently-hovered mark group so the dim rule can exclude it. */
export const CURRENT_ATTR = 'data-gc-current';

/** Render-free hover emphasis: dim every mark except the current one, but only
 *  while a hover is active. The opacity transition is gated behind reduced-motion
 *  so it stays instant for users who prefer that. */
export function hoverCss(dimOpacity = 0.35): string {
  return (
    `[${HOVER_ATTR}] [data-gc-mark]:not([${CURRENT_ATTR}]){opacity:${dimOpacity}}` +
    `@media (prefers-reduced-motion: no-preference){` +
    `[data-gc-mark]{transition:opacity 120ms ease}}`
  );
}
