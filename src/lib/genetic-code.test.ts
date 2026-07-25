import { describe, expect, it } from 'vitest';
import {
  GENETIC_CODES,
  codonIndex,
  getGeneticCode,
  isStartCodon,
  translateCodon,
  translateFrame,
} from './genetic-code';

const standard = getGeneticCode('standard');
const mito = getGeneticCode('vertebrate-mitochondrial');

describe('code tables', () => {
  it('are 64 characters long', () => {
    for (const code of GENETIC_CODES) {
      expect(code.aminoAcids, code.name).toHaveLength(64);
      expect(code.starts, code.name).toHaveLength(64);
    }
  });

  it('indexes codons in NCBI order', () => {
    expect(codonIndex('TTT')).toBe(0);
    expect(codonIndex('ATG')).toBe(35);
    expect(codonIndex('GGG')).toBe(63);
  });

  it('rejects ambiguous codons rather than guessing', () => {
    expect(codonIndex('ATN')).toBe(-1);
    expect(translateCodon('ATN', standard)).toBe('X');
  });
});

describe('standard code', () => {
  it('translates the codons everyone can check by hand', () => {
    expect(translateCodon('ATG', standard)).toBe('M');
    expect(translateCodon('TGG', standard)).toBe('W');
    expect(translateCodon('TAA', standard)).toBe('*');
    expect(translateCodon('TAG', standard)).toBe('*');
    expect(translateCodon('TGA', standard)).toBe('*');
    expect(translateCodon('AAA', standard)).toBe('K');
  });

  it('treats U as T', () => {
    expect(translateCodon('AUG', standard)).toBe('M');
  });

  it('recognises alternative initiators', () => {
    expect(isStartCodon('ATG', standard)).toBe(true);
    expect(isStartCodon('TTG', standard)).toBe(true);
    expect(isStartCodon('CTG', standard)).toBe(true);
    expect(isStartCodon('AAA', standard)).toBe(false);
  });
});

describe('vertebrate mitochondrial code', () => {
  it('differs from the standard code in the documented four places', () => {
    expect(translateCodon('TGA', mito)).toBe('W'); // stop in the standard code
    expect(translateCodon('ATA', mito)).toBe('M'); // isoleucine in the standard code
    expect(translateCodon('AGA', mito)).toBe('*'); // arginine in the standard code
    expect(translateCodon('AGG', mito)).toBe('*');
  });
});

describe('translateFrame', () => {
  it('translates a known open reading frame', () => {
    // Start of EGFP: ATG GTG AGC AAG GGC GAG GAG -> MVSKGEE
    expect(translateFrame('ATGGTGAGCAAGGGCGAGGAG', { code: standard, frame: 1 })).toBe('MVSKGEE');
  });

  it('respects the reading frame offset', () => {
    expect(translateFrame('CCATGGTGAGC', { code: standard, frame: 3 })).toBe('MVS');
  });

  it('drops a trailing partial codon rather than padding it', () => {
    expect(translateFrame('ATGGTGA', { code: standard, frame: 1 })).toBe('MV');
  });
});
