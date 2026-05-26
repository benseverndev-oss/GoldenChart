import { describe, expect, it } from 'vitest';
import { createElement } from 'react';
import { BarChart } from '../components/BarChart';
import { renderToSVGString } from './renderToString';

const data = [{ label: 'a', value: 3 }, { label: 'b', value: 6 }];
const render = (vibe: unknown) =>
  renderToSVGString(createElement(BarChart, { width: 200, height: 140, vibe, data, bare: true } as any));

describe('renderToSVGString headless font embedding', () => {
  it('embeds the @font-face for a single-quoted family vibe', () => {
    const svg = render('clean_blueprint'); // resolves to Cousine (bundled)
    expect(svg).toContain('@font-face');
    expect(svg).toContain("font-family:'Cousine'");
    expect(svg).toContain('data:font/ttf;base64,');
  });

  it('decodes &quot; entities so double-quoted families still match', () => {
    const svg = render('messy_sketch'); // '"Comic Neue", ...' → escaped to &quot; in markup
    expect(svg).toContain('@font-face');
    expect(svg).toContain("font-family:'Comic Neue'");
  });

  it('embeds each bundled family at most once and keeps a single <svg> root', () => {
    const svg = render('clean_blueprint');
    expect(svg.startsWith('<svg')).toBe(true);
    expect(svg.match(/@font-face/g)?.length).toBe(1);
  });

  it('omits @font-face when the vibe uses a non-bundled family', () => {
    const svg = render({ preset: 'pencil', fontFamily: 'Arial, sans-serif' });
    expect(svg).not.toContain('@font-face');
    expect(svg).toContain('font-family'); // CSS reference still present
  });
});
