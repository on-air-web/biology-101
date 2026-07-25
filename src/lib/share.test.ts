import { describe, expect, it } from 'vitest';
import {
  ShareError,
  buildShareUrl,
  decodeNumberList,
  decodeString,
  encodeShareState,
} from './share';

describe('encoding', () => {
  it('round-trips a pair of number lists', () => {
    const query = encodeShareState({ a: [1, 2, 3], b: [4.5, 5.5] });
    const params = new URLSearchParams(query);
    expect(decodeNumberList(params, 'a')).toEqual([1, 2, 3]);
    expect(decodeNumberList(params, 'b')).toEqual([4.5, 5.5]);
  });

  it('trims float noise rather than encoding it', () => {
    const query = encodeShareState({ a: [0.1 + 0.2] });
    expect(query).toContain('0.3');
    expect(query).not.toContain('0.30000000000000004');
  });

  it('skips empty and undefined values', () => {
    expect(encodeShareState({ a: [], b: undefined, c: '' })).toBe('');
  });

  it('carries a method alongside the data', () => {
    const params = new URLSearchParams(encodeShareState({ test: 'welch', a: [1, 2] }));
    expect(decodeString(params, 'test', ['welch', 'student'])).toBe('welch');
  });
});

describe('decoding', () => {
  it('returns undefined for missing or malformed lists', () => {
    const params = new URLSearchParams('a=1,2,banana&b=&c=1,2');
    expect(decodeNumberList(params, 'a')).toBeUndefined();
    expect(decodeNumberList(params, 'b')).toBeUndefined();
    expect(decodeNumberList(params, 'missing')).toBeUndefined();
    expect(decodeNumberList(params, 'c')).toEqual([1, 2]);
  });

  it('rejects a value outside the allowed set rather than trusting the URL', () => {
    const params = new URLSearchParams('test=../../etc/passwd');
    expect(decodeString(params, 'test', ['welch', 'student'])).toBeUndefined();
  });
});

describe('buildShareUrl', () => {
  it('appends the query to the base', () => {
    expect(buildShareUrl('https://x.dev/tools/t-test/', { a: [1, 2] })).toBe(
      'https://x.dev/tools/t-test/?a=1%2C2',
    );
  });

  it('returns the bare URL when there is nothing to share', () => {
    expect(buildShareUrl('https://x.dev/t/', {})).toBe('https://x.dev/t/');
  });

  it('refuses rather than truncating a dataset that will not fit', () => {
    const huge = Array.from({ length: 5000 }, (_, index) => index * 1.123456);
    expect(() => buildShareUrl('https://x.dev/t/', { a: huge })).toThrow(ShareError);
  });
});
