import { describe, expect, it } from 'vitest';
import { interactiveEmbed } from './embed';

const SVG =
  '<svg viewBox="0 0 100 100" data-gc="1"><g data-gc-mark="bar" data-gc-label="Q1" data-gc-value="12"></g></svg>';

describe('interactiveEmbed', () => {
  it('wraps the svg in a self-contained HTML document', () => {
    const html = interactiveEmbed(SVG);
    expect(html.startsWith('<!doctype html>')).toBe(true);
    expect(html).toContain(SVG);
    expect(html).toContain('</html>');
  });

  it('includes a vanilla hover-tooltip hydrator referencing the data-gc contract', () => {
    const html = interactiveEmbed(SVG);
    expect(html).toContain('<script>');
    expect(html).toContain('data-gc-mark');
    expect(html).toContain('data-gc-label');
    expect(html).toContain('data-gc-value');
    expect(html).toContain('id="gc-tip"');
  });

  it('omits the hydrator script when tooltip is disabled', () => {
    const html = interactiveEmbed(SVG, { tooltip: false });
    expect(html).toContain(SVG);
    expect(html).not.toContain('<script>');
  });

  it('uses a provided document title', () => {
    expect(interactiveEmbed(SVG, { title: 'Sales' })).toContain('<title>Sales</title>');
  });

  it('does not embed font bytes (the static svg carries its own)', () => {
    expect(interactiveEmbed(SVG)).not.toContain('data:font/ttf;base64');
  });
});
