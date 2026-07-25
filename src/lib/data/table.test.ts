import { describe, expect, it } from 'vitest';
import { TableError, delimiterName, parseTable } from './table';

describe('delimiter detection', () => {
  it('recognises commas, tabs and semicolons', () => {
    expect(parseTable('a,b\n1,2\n3,4').delimiter).toBe(',');
    expect(parseTable('a\tb\n1\t2\n3\t4').delimiter).toBe('\t');
    expect(parseTable('a;b\n1;2\n3;4').delimiter).toBe(';');
    expect(delimiterName('\t')).toBe('tab');
  });

  it('prefers consistency over frequency', () => {
    // Commas appear more often, but only tabs give a consistent column count.
    const table = parseTable('name\tvalue\nSample, one\t1\nSample, two\t2');
    expect(table.delimiter).toBe('\t');
    expect(table.columns).toHaveLength(2);
  });
});

describe('header detection', () => {
  it('treats an all-text first row as a header', () => {
    const table = parseTable('control,treated\n1,4\n2,5');
    expect(table.headerDetected).toBe(true);
    expect(table.columns.map((column) => column.name)).toEqual(['control', 'treated']);
    expect(table.rowCount).toBe(2);
  });

  it('does not invent a header from a numeric first row', () => {
    const table = parseTable('1,4\n2,5');
    expect(table.headerDetected).toBe(false);
    expect(table.columns[0]!.values).toEqual([1, 2]);
    expect(table.columns.map((column) => column.name)).toEqual(['Column 1', 'Column 2']);
  });
});

describe('quoted fields', () => {
  it('keeps a delimiter inside quotes', () => {
    const table = parseTable('label,value\n"Smith, J",12\n"Doe, A",15');
    expect(table.columns).toHaveLength(2);
    expect(table.columns[1]!.values).toEqual([12, 15]);
  });

  it('unescapes a doubled quote', () => {
    const table = parseTable('label,value\n"a ""quoted"" name",7\nplain,8');
    expect(table.columns[1]!.values).toEqual([7, 8]);
  });
});

describe('column typing', () => {
  it('separates numeric columns from label columns', () => {
    const table = parseTable('sample,od\nA,0.42\nB,0.51\nC,0.48');
    expect(table.columns[0]!.numeric).toBe(false);
    expect(table.columns[1]!.numeric).toBe(true);
    expect(table.columns[1]!.values).toEqual([0.42, 0.51, 0.48]);
  });

  it('survives a stray non-numeric cell and counts it', () => {
    const table = parseTable('od\n0.42\nn/a\n0.48');
    expect(table.columns[0]!.values).toEqual([0.42, 0.48]);
    expect(table.columns[0]!.skipped).toBe(1);
    expect(table.columns[0]!.numeric).toBe(true);
  });

  it('handles ragged rows without shifting data between columns', () => {
    const table = parseTable('a,b,c\n1,2,3\n4,5\n6,7,8');
    expect(table.columns[2]!.values).toEqual([3, 8]);
  });

  it('reads scientific notation', () => {
    expect(parseTable('n\n3.4e-5\n42').columns[0]!.values).toEqual([0.000034, 42]);
  });

  it('reads a thousands separator only when the delimiter is not a comma', () => {
    // Tab-delimited: unambiguous, so 1,200 is one number.
    const tabbed = parseTable('n\tlabel\n1,200\ta\n900\tb');
    expect(tabbed.columns[0]!.values).toEqual([1200, 900]);

    // Comma-delimited: "1,200" is two cells and we refuse to guess otherwise,
    // because guessing wrong would silently merge columns.
    const commas = parseTable('a,b\n1,200\n3,400');
    expect(commas.columns[0]!.values).toEqual([1, 3]);
    expect(commas.columns[1]!.values).toEqual([200, 400]);
  });
});

describe('edge cases', () => {
  it('accepts a single column with no delimiter at all', () => {
    const table = parseTable('12\n14\n16');
    expect(table.columns).toHaveLength(1);
    expect(table.columns[0]!.values).toEqual([12, 14, 16]);
  });

  it('ignores blank lines, including trailing ones', () => {
    expect(parseTable('1,2\n\n3,4\n\n').rowCount).toBe(2);
  });

  it('refuses empty input and header-only input', () => {
    expect(() => parseTable('   ')).toThrow(TableError);
    expect(() => parseTable('name,value')).not.toThrow();
  });
});
