import { describe, expect, it } from 'vitest';
import { formatValue } from './format';

describe('formatValue', () => {
  it('passes through with no spec, appending a unit', () => {
    expect(formatValue(42)).toBe('42');
    expect(formatValue(42, undefined, ' ms')).toBe('42 ms');
  });

  it('formats fixed decimals with grouping', () => {
    expect(formatValue(1234.5, ',.0f')).toBe('1,235');
    expect(formatValue(1234.5, '.2f')).toBe('1234.50');
  });

  it('formats SI suffixes', () => {
    expect(formatValue(1500, '.1s')).toBe('1.5k');
    expect(formatValue(2_300_000, '.1s')).toBe('2.3M');
    expect(formatValue(0, '.1s')).toBe('0.0');
  });

  it('formats currency and percent', () => {
    expect(formatValue(1200, '$,.0f')).toBe('$1,200');
    expect(formatValue(0.25, '.0%')).toBe('25%');
  });

  it('formats dates from a strftime subset', () => {
    const d = Date.UTC(2024, 2, 9); // 2024-03-09
    expect(formatValue(d, '%Y')).toBe('2024');
    expect(formatValue(d, '%b %Y')).toBe('Mar 2024');
  });

  it('appends a unit after formatting', () => {
    expect(formatValue(0.5, '.0%', '')).toBe('50%');
    expect(formatValue(12, '.0f', '°C')).toBe('12°C');
  });
});
