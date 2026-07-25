import { describe, expect, it } from 'vitest';
import {
  DescriptiveError,
  mean,
  median,
  parseNumberList,
  quantile,
  standardDeviation,
  standardError,
  summarise,
  variance,
} from './descriptives';

const SAMPLE = [2, 4, 4, 4, 5, 5, 7, 9];

describe('descriptives', () => {
  it('computes the textbook example', () => {
    expect(mean(SAMPLE)).toBeCloseTo(5, 10);
    // Sample variance (n-1), not the population value of 4.
    expect(variance(SAMPLE)).toBeCloseTo(32 / 7, 10);
    expect(standardDeviation(SAMPLE)).toBeCloseTo(Math.sqrt(32 / 7), 10);
    expect(standardError(SAMPLE)).toBeCloseTo(Math.sqrt(32 / 7) / Math.sqrt(8), 10);
  });

  it('takes the median of both odd and even counts', () => {
    expect(median([3, 1, 2])).toBe(2);
    expect(median([4, 1, 3, 2])).toBe(2.5);
  });

  it('interpolates quantiles the way R does by default', () => {
    // R: quantile(c(1,2,3,4,5), 0.25) = 2
    expect(quantile([1, 2, 3, 4, 5], 0.25)).toBeCloseTo(2, 10);
    expect(quantile([1, 2, 3, 4, 5], 0.5)).toBeCloseTo(3, 10);
    // R: quantile(c(1,2,3,4), 0.25) = 1.75
    expect(quantile([1, 2, 3, 4], 0.25)).toBeCloseTo(1.75, 10);
  });

  it('summarises', () => {
    const summary = summarise(SAMPLE);
    expect(summary).toMatchObject({ n: 8, min: 2, max: 9 });
    expect(summary.median).toBeCloseTo(4.5, 10);
  });

  it('requires two values before claiming a spread', () => {
    expect(() => variance([1])).toThrow(DescriptiveError);
  });
});

describe('parseNumberList', () => {
  it('accepts what a paste actually looks like', () => {
    expect(parseNumberList('1 2 3')).toEqual([1, 2, 3]);
    expect(parseNumberList('1,2,3')).toEqual([1, 2, 3]);
    expect(parseNumberList('1\n2\n3\n')).toEqual([1, 2, 3]);
    expect(parseNumberList(' 1.5 ; 2.5 ,  3 ')).toEqual([1.5, 2.5, 3]);
    expect(parseNumberList('1e-3 -2.5')).toEqual([0.001, -2.5]);
  });

  it('names the offending token rather than failing silently', () => {
    expect(() => parseNumberList('1 2 banana')).toThrow(/banana/);
  });

  it('returns nothing for empty input', () => {
    expect(parseNumberList('   ')).toEqual([]);
  });
});
