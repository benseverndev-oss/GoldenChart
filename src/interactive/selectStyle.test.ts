import { describe, expect, it } from 'vitest';
import { SELECTED_ATTR, CHOSEN_ATTR, selectCss } from './selectStyle';

describe('selectCss', () => {
  it('keeps chosen marks prominent and dims the rest once a selection exists', () => {
    expect(SELECTED_ATTR).toBe('data-gc-selected');
    expect(CHOSEN_ATTR).toBe('data-gc-chosen');
    const css = selectCss();
    expect(css).toContain(`[data-gc-mark][${CHOSEN_ATTR}]{opacity:1}`);
    expect(css).toContain(`[${SELECTED_ATTR}] [data-gc-mark]:not([${CHOSEN_ATTR}])`);
  });
});
