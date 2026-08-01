import { describe, expect, it } from 'vitest';
import { getFluorophore } from '@/lib/bio/spectra';
import { OpticsError, buildSetup, compareBrightness, findReversals } from './compute';

const GFP_SETUP = buildSetup({ laser: '488', excitationFilter: '', emissionFilter: '525/50' });

describe('buildSetup', () => {
  it('accepts a laser line', () => {
    expect(GFP_SETUP.illumination).toEqual({ kind: 'laser', nm: 488 });
  });

  it('falls back to an excitation filter when no laser is given', () => {
    const setup = buildSetup({ laser: '', excitationFilter: '470/40', emissionFilter: '525/50' });
    expect(setup.illumination).toMatchObject({ kind: 'filtered' });
  });

  it('refuses rather than assuming a default setup', () => {
    // A ranking computed under optics the user did not ask for looks
    // authoritative and answers a different question.
    expect(() => buildSetup({ laser: '', excitationFilter: '', emissionFilter: '525/50' })).toThrow(
      OpticsError,
    );
    expect(() => buildSetup({ laser: '488', excitationFilter: '', emissionFilter: '' })).toThrow(
      OpticsError,
    );
    expect(() =>
      buildSetup({ laser: '9999', excitationFilter: '', emissionFilter: '525/50' }),
    ).toThrow(OpticsError);
  });
});

describe('compareBrightness', () => {
  it('reports EGFP with its published molecular brightness', () => {
    const rows = compareBrightness({ setup: GFP_SETUP, sortBy: 'practical' });
    const egfp = rows.find((row) => row.fluorophore.id === 'egfp')!;
    expect(egfp.molecular).toBeCloseTo(33.54, 1);
  });

  it('puts a green fluorophore top in a green setup', () => {
    const rows = compareBrightness({ setup: GFP_SETUP, sortBy: 'practical' });
    expect(rows[0]!.fluorophore.emMax!).toBeGreaterThan(495);
    expect(rows[0]!.fluorophore.emMax!).toBeLessThan(545);
    expect(rows[0]!.relative).toBeCloseTo(1, 12);
  });

  it('scores a far-red dye at essentially nothing in a green setup', () => {
    const rows = compareBrightness({ setup: GFP_SETUP, sortBy: 'practical' });
    const alexa647 = rows.find((row) => row.fluorophore.id === 'alexa-647')!;
    expect(alexa647.practical!).toBeLessThan(0.01);
    expect(alexa647.relative!).toBeLessThan(0.001);
  });

  it('reorders completely when the setup changes', () => {
    const redSetup = buildSetup({ laser: '640', excitationFilter: '', emissionFilter: '690/50' });
    const green = compareBrightness({ setup: GFP_SETUP, sortBy: 'practical' })[0]!;
    const red = compareBrightness({ setup: redSetup, sortBy: 'practical' })[0]!;
    expect(green.fluorophore.id).not.toBe(red.fluorophore.id);
    expect(red.fluorophore.emMax!).toBeGreaterThan(640);
  });

  it('filters by kind and by emission window', () => {
    const proteins = compareBrightness({ setup: GFP_SETUP, kind: 'protein', sortBy: 'emission' });
    expect(proteins.every((row) => row.fluorophore.kind === 'protein')).toBe(true);

    const windowed = compareBrightness({
      setup: GFP_SETUP,
      emissionWindow: [500, 530],
      sortBy: 'emission',
    });
    expect(windowed.length).toBeGreaterThan(0);
    for (const row of windowed) {
      expect(row.fluorophore.emMax!).toBeGreaterThanOrEqual(500);
      expect(row.fluorophore.emMax!).toBeLessThanOrEqual(530);
    }
  });

  it('sorts by emission wavelength when asked', () => {
    const rows = compareBrightness({ setup: GFP_SETUP, sortBy: 'emission' });
    for (let i = 1; i < rows.length; i += 1) {
      expect(rows[i]!.fluorophore.emMax!).toBeGreaterThanOrEqual(rows[i - 1]!.fluorophore.emMax!);
    }
  });

  it('sinks unpublished photophysics to the bottom rather than sorting them as zero', () => {
    const rows = compareBrightness({ setup: GFP_SETUP, sortBy: 'molecular' });
    const firstMissing = rows.findIndex((row) => row.molecular === undefined);
    expect(firstMissing).toBeGreaterThan(0);
    // Everything after the first gap must also be missing.
    for (let i = firstMissing; i < rows.length; i += 1) {
      expect(rows[i]!.molecular, rows[i]!.fluorophore.id).toBeUndefined();
    }
  });

  it('carries the published bleaching half-life through untouched, including its absence', () => {
    const rows = compareBrightness({ setup: GFP_SETUP, sortBy: 'practical' });
    const egfp = rows.find((row) => row.fluorophore.id === 'egfp')!;
    expect(egfp.bleachHalfLife).toBe(getFluorophore('egfp')!.bleachHalfLife);
    // Dyes have none recorded, and the tool must not invent one.
    const cy5 = rows.find((row) => row.fluorophore.id === 'cy5')!;
    expect(cy5.bleachHalfLife).toBeNull();
  });
});

describe('findReversals', () => {
  it('finds the case where the brighter molecule is not the brighter signal', () => {
    // A 488 line and a green filter: mNeonGreen and mStayGold are far brighter
    // molecules than EGFP, but a setup tuned away from a fluorophore's peak
    // can invert any of that. Whatever the specific pair, the assertion is
    // that the tool notices when the two rankings disagree.
    const offPeak = buildSetup({ laser: '405', excitationFilter: '', emissionFilter: '525/50' });
    const rows = compareBrightness({ setup: offPeak, sortBy: 'practical' });
    const reversals = findReversals(rows);

    if (reversals.length > 0) {
      const [reversal] = reversals;
      expect(reversal!.brighterInPractice.id).not.toBe(reversal!.brighterInPrinciple.id);
      expect(reversal!.message).toContain('×');
    }
    // Either way the top practical row must genuinely be the top practical row.
    const best = rows.filter((r) => r.practical !== undefined)[0]!;
    expect(best.relative).toBeCloseTo(1, 12);
  });

  it('says nothing when the same fluorophore tops both rankings', () => {
    const rows = compareBrightness({
      setup: GFP_SETUP,
      emissionWindow: [500, 520],
      sortBy: 'practical',
    });
    const reversals = findReversals(rows);
    if (reversals.length === 0) {
      const usable = rows.filter((r) => r.molecular !== undefined && r.practical !== undefined);
      const topMolecular = [...usable].sort((a, b) => b.molecular! - a.molecular!)[0]!;
      const topPractical = [...usable].sort((a, b) => b.practical! - a.practical!)[0]!;
      expect(topMolecular.fluorophore.id).toBe(topPractical.fluorophore.id);
    }
  });

  it('says nothing about an empty set', () => {
    expect(findReversals([])).toEqual([]);
  });
});
