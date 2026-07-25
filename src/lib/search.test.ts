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
    expect(topId('pi')).toBe('protein-parameters');
    expect(topId('od600')).toBe('od600');
    expect(topId('melting temperature')).toBe('melting-temperature');
  });

  it('surfaces a usable tool ahead of a planned one, but keeps both in reach', () => {
    // "tm" matches Primer3, which is live and does compute Tm, ahead of the
    // melting temperature calculator, which is still only announced. That
    // ordering is correct: a tool someone can open beats one they cannot.
    const ids = searchTools(TOOLS, 'tm')
      .slice(0, 4)
      .map((result) => result.tool.id);
    expect(ids).toContain('melting-temperature');
    expect(ids.indexOf('primer3')).toBeLessThan(ids.indexOf('melting-temperature'));
  });

  it('finds external tools by their provider', () => {
    const ebi = searchTools(TOOLS, 'ebi').map((result) => result.tool.id);
    expect(ebi.length).toBeGreaterThan(2);
    expect(ebi).toContain('clustal-omega');
    expect(topId('alphafold')).toBe('alphafold-server');
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
