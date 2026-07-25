import { describe, expect, it } from 'vitest';
import { FormulaError, orderElements, parseFormula } from './formula';

/**
 * Reference masses are the values printed on reagent bottles, so anyone can
 * check these against the shelf.
 */
describe('parseFormula', () => {
  it('computes the masses on common reagent bottles', () => {
    expect(parseFormula('NaCl').molarMass).toBeCloseTo(58.44, 2);
    expect(parseFormula('H2O').molarMass).toBeCloseTo(18.015, 3);
    expect(parseFormula('C6H12O6').molarMass).toBeCloseTo(180.156, 2);
    // Tris base
    expect(parseFormula('C4H11NO3').molarMass).toBeCloseTo(121.14, 2);
    // Sodium bicarbonate
    expect(parseFormula('NaHCO3').molarMass).toBeCloseTo(84.007, 2);
  });

  it('handles nested groups', () => {
    expect(parseFormula('Ca(OH)2').molarMass).toBeCloseTo(74.09, 2);
    // 132.13, not the 132.14 printed on most supplier bottles. The difference
    // is sulfur: IUPAC's current abridged value is 32.06, where older tables
    // use 32.065. Ours follows IUPAC, and the tool says so.
    expect(parseFormula('(NH4)2SO4').molarMass).toBeCloseTo(132.134, 3);
    expect(parseFormula('K3[Fe(CN)6]').composition).toEqual({ K: 3, Fe: 1, C: 6, N: 6 });
  });

  it('handles hydrates in every notation people paste', () => {
    for (const formula of ['CuSO4·5H2O', 'CuSO4*5H2O', 'CuSO4.5H2O']) {
      expect(parseFormula(formula).molarMass, formula).toBeCloseTo(249.68, 2);
    }
    expect(parseFormula('MgSO4·7H2O').molarMass).toBeCloseTo(246.47, 2);
  });

  it('counts atoms correctly', () => {
    expect(parseFormula('C6H12O6').composition).toEqual({ C: 6, H: 12, O: 6 });
    expect(parseFormula('Ca(OH)2').composition).toEqual({ Ca: 1, O: 2, H: 2 });
  });

  it('ignores whitespace', () => {
    expect(parseFormula(' Na Cl ').molarMass).toBeCloseTo(58.44, 2);
  });

  it('rejects bad input rather than guessing', () => {
    expect(() => parseFormula('')).toThrow(FormulaError);
    expect(() => parseFormula('Xx2')).toThrow(/Unknown element/);
    expect(() => parseFormula('Ca(OH2')).toThrow(/Unbalanced/);
    expect(() => parseFormula('CaOH)2')).toThrow(/Unbalanced/);
    expect(() => parseFormula('H2O!')).toThrow(/Unexpected character/);
    expect(() => parseFormula('C0H4')).toThrow(/cannot be zero/);
  });

  it('rejects lower-case-only symbols instead of silently reading them', () => {
    expect(() => parseFormula('nacl')).toThrow(FormulaError);
  });
});

describe('orderElements', () => {
  it('puts carbon and hydrogen first, then sorts the rest', () => {
    expect(orderElements({ O: 6, C: 6, H: 12 })).toEqual(['C', 'H', 'O']);
    expect(orderElements({ S: 1, C: 2, O: 4, H: 6 })).toEqual(['C', 'H', 'O', 'S']);
  });

  it('sorts alphabetically when there is no carbon', () => {
    expect(orderElements({ Na: 1, Cl: 1 })).toEqual(['Cl', 'Na']);
  });
});
