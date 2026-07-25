import { describe, expect, it } from 'vitest';
import { formatNumber, parseNumber } from './format';

describe('formatNumber', () => {
  it('removes floating point noise', () => {
    expect(formatNumber(0.1 + 0.2)).toBe('0.3');
    expect(formatNumber(4.383000000000001)).toBe('4.383');
  });

  it('applies significant figures rather than fixed decimals', () => {
    expect(formatNumber(58.44)).toBe('58.44');
    expect(formatNumber(1234.5678)).toBe('1235');
    expect(formatNumber(0.00123456)).toBe('0.001235');
  });

  it('drops trailing zeros', () => {
    expect(formatNumber(2.5)).toBe('2.5');
    expect(formatNumber(10)).toBe('10');
  });

  it('uses scientific notation only at the extremes', () => {
    expect(formatNumber(5.8e-7)).toBe('5.8e-7');
    expect(formatNumber(2.5e9)).toBe('2.5e+9');
    expect(formatNumber(999999)).not.toContain('e');
  });

  it('returns a dash for non-finite values', () => {
    expect(formatNumber(Number.NaN)).toBe('—');
    expect(formatNumber(Number.POSITIVE_INFINITY)).toBe('—');
  });
});

describe('parseNumber', () => {
  it('accepts what people actually type', () => {
    expect(parseNumber(' 1 000 ')).toBe(1000);
    expect(parseNumber('1,500')).toBe(1500);
    expect(parseNumber('5.8e-6')).toBeCloseTo(5.8e-6, 12);
  });

  it('returns undefined for empty or invalid input', () => {
    expect(parseNumber('')).toBeUndefined();
    expect(parseNumber('  ')).toBeUndefined();
    expect(parseNumber('abc')).toBeUndefined();
  });
});
