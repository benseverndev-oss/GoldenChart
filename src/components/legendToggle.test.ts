import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Legend } from './Legend';
import { SeriesVisibilityProvider, type SeriesVisibility } from './SeriesVisibilityContext';

const items = [
  { label: 'A', color: '#f00' },
  { label: 'B', color: '#00f' },
];

const render = (value?: SeriesVisibility) => {
  const legend = createElement(Legend, { items, x: 0, y: 0, width: 200 });
  return renderToStaticMarkup(value ? createElement(SeriesVisibilityProvider, { value }, legend) : legend);
};

describe('Legend toggling', () => {
  it('emits no interactive attributes in the default (non-interactive) render', () => {
    const markup = render();
    expect(markup).not.toContain('role="button"');
    expect(markup).not.toContain('aria-pressed');
    expect(markup).not.toContain('opacity');
  });

  it('renders focusable toggle controls and dims hidden items when interactive', () => {
    const markup = render({ hidden: new Set(['B']), toggle: () => {}, interactive: true });
    expect(markup).toContain('role="button"');
    expect(markup).toContain('aria-pressed="true"'); // A is visible
    expect(markup).toContain('aria-pressed="false"'); // B is hidden
    expect(markup).toContain('opacity="0.4"'); // B dimmed
  });
});
