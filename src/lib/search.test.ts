import { describe, expect, it } from 'vitest';
import { searchTools, normalize } from './search';
import { TOOLS } from './tools/registry';

function topId(query: string): string | undefined {
  return searchTools(TOOLS, query)[0]?.tool.id;
}

describe('normalize', () => {
  it('strips punctuation, case and accents', () => {
    expect(normalize('Molarity (µM)!')).toBe('molarity m');
    expect(normalize('  GC   Content ')).toBe('gc content');
  });
});

describe('searchTools', () => {
  it('ranks an exact name match first', () => {
    expect(topId('molarity')).toBe('molarity');
    expect(topId('dilution calculator')).toBe('dilution');
  });

  it('resolves the abbreviations people actually type', () => {
    expect(topId('mw')).toBe('molecular-weight');
    expect(topId('tm')).toBe('melting-temperature');
    expect(topId('pi')).toBe('protein-parameters');
    expect(topId('od600')).toBe('od600');
  });

  it('matches on prefixes as the user types', () => {
    expect(topId('molar')).toBeDefined();
    expect(topId('rev')).toBe('reverse-complement');
  });

  it('narrows rather than widens as terms are added', () => {
    const broad = searchTools(TOOLS, 'dilution').length;
    const narrow = searchTools(TOOLS, 'serial dilution').length;
    expect(narrow).toBeLessThanOrEqual(broad);
    expect(topId('serial dilution')).toBe('serial-dilution');
  });

  it('returns nothing for an unmatched term rather than guessing', () => {
    expect(searchTools(TOOLS, 'centrifuge unicorn')).toHaveLength(0);
    // No fuzzy matching: in a scientific tool these are different words.
    expect(searchTools(TOOLS, 'dilation')).toHaveLength(0);
  });

  it('ranks a built tool above a planned one of equal relevance', () => {
    const results = searchTools(TOOLS, 'calculator');
    const built = results.findIndex((result) => result.tool.status !== 'planned');
    const firstPlanned = results.findIndex((result) => result.tool.status === 'planned');
    expect(built).toBeGreaterThanOrEqual(0);
    expect(built).toBeLessThan(firstPlanned);
  });

  it('returns nothing for an empty query', () => {
    expect(searchTools(TOOLS, '   ')).toHaveLength(0);
  });
});
