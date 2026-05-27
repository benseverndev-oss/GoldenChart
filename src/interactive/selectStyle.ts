/** Root attribute present while a selection exists. */
export const SELECTED_ATTR = 'data-gc-selected';
/** Marks a chosen mark group. */
export const CHOSEN_ATTR = 'data-gc-chosen';

/** Persistent selection emphasis: chosen marks stay full-opacity; once any mark
 *  is chosen, the rest recede so the selection reads clearly. */
export function selectCss(dimOpacity = 0.5): string {
  return (
    `[data-gc-mark][${CHOSEN_ATTR}]{opacity:1}` +
    `[${SELECTED_ATTR}] [data-gc-mark]:not([${CHOSEN_ATTR}]){opacity:${dimOpacity}}`
  );
}
