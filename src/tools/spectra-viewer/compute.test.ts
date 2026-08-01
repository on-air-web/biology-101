import { describe, expect, it } from 'vitest';
import { getFluorophore } from '@/lib/bio/spectra';
import {
  describeFluorophores,
  efficiencyAt,
  emissionOverlap,
  findSeparationProblems,
} from './compute';

const egfp = getFluorophore('egfp')!;
const mcherry = getFluorophore('mcherry')!;
const eyfp = getFluorophore('eyfp')!;
const mvenus = getFluorophore('mvenus')!;
const alexa488 = getFluorophore('alexa-488')!;

describe('describeFluorophores', () => {
  it('carries the published maxima and brightness through unchanged', () => {
    const [row] = describeFluorophores([egfp], []);
    expect(row!.exMax).toBe(488);
    expect(row!.emMax).toBe(507);
    expect(row!.stokes).toBe(19);
    expect(row!.brightness).toBeCloseTo(33.54, 1);
  });

  it('picks the best line out of several', () => {
    const [row] = describeFluorophores([egfp], [405, 488, 561]);
    expect(row!.best!.nm).toBe(488);
    expect(row!.best!.efficiency).toBeGreaterThan(0.98);
    // The 561 entry must still be present and near zero — the whole point of
    // showing every line is that the poor ones are informative.
    expect(row!.atLines[2]).toBeLessThan(0.01);
  });

  it('reports no best line when none was given', () => {
    expect(describeFluorophores([egfp], [])[0]!.best).toBeUndefined();
  });

  it('leaves brightness undefined where the photophysics are unpublished', () => {
    const texasRed = getFluorophore('texas-red')!;
    expect(describeFluorophores([texasRed], [])[0]!.brightness).toBeUndefined();
  });
});

describe('efficiencyAt', () => {
  it('agrees with reading the excitation curve directly', () => {
    expect(efficiencyAt(egfp, 488)).toBeGreaterThan(0.98);
    expect(efficiencyAt(mcherry, 561)).toBeGreaterThan(0.6);
  });

  it('keeps EGFP at about a sixth of peak on the 405 nm line', () => {
    // Not the negligible number it is easy to assume. EGFP's chromophore has
    // a protonated form absorbing near 400 nm, and it survives into the
    // excitation spectrum at roughly 17% — which is why a violet channel in a
    // GFP-expressing sample is never as clean as the peaks suggest.
    expect(efficiencyAt(egfp, 405)).toBeGreaterThan(0.1);
    expect(efficiencyAt(egfp, 405)).toBeLessThan(0.25);
  });
});

describe('emissionOverlap', () => {
  it('is one for a fluorophore against itself', () => {
    // ∫E²/∫E is not one in general, but the *definition* used here divides by
    // A's own total weighted by B — so a fluorophore against itself is the
    // reference case and must come out at its self-overlap, above every
    // cross-pair below.
    expect(emissionOverlap(egfp, egfp)).toBeGreaterThan(emissionOverlap(egfp, mcherry));
  });

  it('is small for a well-separated pair', () => {
    expect(emissionOverlap(egfp, mcherry)).toBeLessThan(0.1);
  });

  it('is large for two yellows', () => {
    expect(emissionOverlap(eyfp, mvenus)).toBeGreaterThan(0.5);
  });

  it('is asymmetric, because a blue tail reaches red and not the reverse', () => {
    // EGFP's emission extends under mCherry's far more than mCherry's extends
    // back under EGFP's. A symmetric measure would hide the direction of the
    // problem, which is the actionable part.
    expect(emissionOverlap(egfp, mcherry)).toBeGreaterThan(emissionOverlap(mcherry, egfp));
  });
});

describe('findSeparationProblems', () => {
  it('finds nothing wrong with a green and a red', () => {
    expect(findSeparationProblems([egfp, mcherry])).toEqual([]);
  });

  it('flags two fluorophores that emit within 25 nm of each other', () => {
    const warnings = findSeparationProblems([eyfp, mvenus]);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]!.message).toContain('No filter separates');
  });

  it('flags EGFP against Alexa Fluor 488, which are the same colour twice', () => {
    const warnings = findSeparationProblems([egfp, alexa488]);
    expect(warnings).toHaveLength(1);
    expect(warnings[0]!.aId).toBe('egfp');
    expect(warnings[0]!.bId).toBe('alexa-488');
  });

  it('reports one warning per pair, not one per fluorophore', () => {
    const warnings = findSeparationProblems([eyfp, mvenus, mcherry]);
    expect(warnings).toHaveLength(1);
  });

  it('says nothing about a single fluorophore or an empty list', () => {
    expect(findSeparationProblems([egfp])).toEqual([]);
    expect(findSeparationProblems([])).toEqual([]);
  });
});
