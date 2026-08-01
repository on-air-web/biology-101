import { describe, expect, it } from 'vitest';
import { getFluorophore } from '@/lib/bio/spectra';
import { FretError, assessPair, directAcceptorExcitation } from './compute';

const mturquoise2 = getFluorophore('mturquoise2')!;
const mvenus = getFluorophore('mvenus')!;
const egfp = getFluorophore('egfp')!;
const mcherry = getFluorophore('mcherry')!;
const cy3 = getFluorophore('cy3')!;
const cy5 = getFluorophore('cy5')!;
const ebfp2 = getFluorophore('ebfp2')!;
const cy7 = getFluorophore('cy7')!;

const standard = { kappaSquared: 2 / 3, refractiveIndex: 1.4, separation: 5 };

describe('assessPair', () => {
  it('reproduces the published Förster radius for mTurquoise2 to mVenus', () => {
    // External check. The cyan-to-yellow protein pairs are tabulated around
    // 5.4 nm; nothing here was fitted to that.
    const result = assessPair({ donor: mturquoise2, acceptor: mvenus, ...standard });
    expect(result.forsterRadius).toBeGreaterThan(5);
    expect(result.forsterRadius).toBeLessThan(6);
  });

  it('reproduces the published radius for the Cy3–Cy5 single-molecule pair', () => {
    // The other value with a firm literature figure, near 5.4 nm, and the
    // reason Cy3–Cy5 is the standard smFRET pair.
    const result = assessPair({ donor: cy3, acceptor: cy5, ...standard });
    expect(result.forsterRadius).toBeGreaterThan(4.8);
    expect(result.forsterRadius).toBeLessThan(6.2);
  });

  it('gives exactly half transfer at the Förster radius', () => {
    const first = assessPair({ donor: mturquoise2, acceptor: mvenus, ...standard });
    const atRadius = assessPair({
      donor: mturquoise2,
      acceptor: mvenus,
      ...standard,
      separation: first.forsterRadius,
    });
    expect(atRadius.efficiency).toBeCloseTo(0.5, 10);
  });

  it('brackets the working range at 90% and 10% transfer', () => {
    const result = assessPair({ donor: mturquoise2, acceptor: mvenus, ...standard });
    const [near, far] = result.workingRange;
    expect(near).toBeLessThan(result.forsterRadius);
    expect(far).toBeGreaterThan(result.forsterRadius);
    // r(E) = R₀ (1/E − 1)^(1/6), so the ratio is 9^(1/6) ÷ (1/9)^(1/6) = 9^(1/3)
    // — the whole usable window is barely a factor of two wide, which is the
    // point of printing it next to the radius.
    expect(far / near).toBeCloseTo(Math.cbrt(9), 6);
    expect(far / near).toBeLessThan(2.1);
  });

  it('draws a curve that starts at one and decreases throughout', () => {
    const { curve } = assessPair({ donor: mturquoise2, acceptor: mvenus, ...standard });
    expect(curve[0]!.efficiency).toBe(1);
    for (let i = 1; i < curve.length; i += 1) {
      expect(curve[i]!.efficiency).toBeLessThan(curve[i - 1]!.efficiency);
    }
    expect(curve[curve.length - 1]!.efficiency).toBeLessThan(0.05);
  });

  it('refuses a donor with no published quantum yield', () => {
    const texasRed = getFluorophore('texas-red')!;
    expect(() => assessPair({ donor: texasRed, acceptor: mcherry, ...standard })).toThrow(
      FretError,
    );
  });

  it('refuses a non-positive separation', () => {
    expect(() =>
      assessPair({ donor: mturquoise2, acceptor: mvenus, ...standard, separation: 0 }),
    ).toThrow(FretError);
  });

  it('refuses a reversed pair that cannot transfer at all', () => {
    // mCherry emits from 590 nm up; mTurquoise2 absorbs nothing there. Rule 6:
    // an impossible pair gets an error, not a very small number dressed up as
    // an answer.
    expect(() => assessPair({ donor: mcherry, acceptor: mturquoise2, ...standard })).toThrow(
      FretError,
    );
  });
});

describe('directAcceptorExcitation', () => {
  it('is the acceptor absorptivity at the donor excitation maximum', () => {
    // The dominant artefact in intensity-based FRET, and it is much worse for
    // the green-to-red pairs than the cyan-to-yellow ones.
    const cyanYellow = directAcceptorExcitation(mturquoise2, mvenus);
    const blueGreen = directAcceptorExcitation(ebfp2, egfp);
    expect(cyanYellow).toBeGreaterThanOrEqual(0);
    expect(cyanYellow).toBeLessThan(1);
    expect(blueGreen).toBeGreaterThanOrEqual(0);
  });

  it('is zero where the donor line is far below the acceptor absorption', () => {
    expect(directAcceptorExcitation(ebfp2, cy7)).toBe(0);
  });
});

describe('the concerns raised', () => {
  it('warns when donor and acceptor emit too close together to separate', () => {
    // EGFP into EYFP: a real FRET pair on paper, unusable ratiometrically.
    const eyfp = getFluorophore('eyfp')!;
    const result = assessPair({ donor: egfp, acceptor: eyfp, ...standard });
    expect(result.concerns.some((c) => c.includes('lifetime measurement'))).toBe(true);
  });

  it('warns about a dim donor', () => {
    const result = assessPair({ donor: mcherry, acceptor: cy7, ...standard });
    expect(result.concerns.some((c) => c.includes('quantum yield'))).toBe(true);
  });

  it('measures donor bleed-through when an acceptor filter is given', () => {
    const result = assessPair({
      donor: mturquoise2,
      acceptor: mvenus,
      ...standard,
      acceptorFilter: '535/30',
    });
    expect(result.donorBleedIntoAcceptorChannel).toBeGreaterThan(0);
  });

  it('leaves bleed-through undefined when no acceptor filter is given', () => {
    const result = assessPair({ donor: mturquoise2, acceptor: mvenus, ...standard });
    expect(result.donorBleedIntoAcceptorChannel).toBeUndefined();
  });

  it('says when a spectrum came from absorption rather than excitation', () => {
    // mCerulean3 is one of the entries FPbase carries an absorption curve for.
    const mcerulean3 = getFluorophore('mcerulean3')!;
    expect(mcerulean3.exFromAbsorption).toBe(true);
    const result = assessPair({ donor: mcerulean3, acceptor: mvenus, ...standard });
    expect(result.concerns.some((c) => c.includes('absorption spectrum'))).toBe(true);
  });
});
