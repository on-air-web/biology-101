import { describe, expect, it } from 'vitest';
import { MODALITIES, getModality } from '@/lib/bio/microscopes';
import {
  ResolutionError,
  conjugateSets,
  defaultBands,
  explore,
  partsInLightOrder,
} from './compute';

const BRIGHTFIELD = { modalityId: 'brightfield', criterion: 'abbe' as const };

describe('explore', () => {
  it('resolves each modality with its own objective', () => {
    for (const modality of MODALITIES) {
      const result = explore({ modalityId: modality.id, criterion: 'abbe' });
      expect(result.modality.id).toBe(modality.id);
      expect(result.resolution.lateral).toBeGreaterThan(0);
    }
  });

  it('gives the 1.4 NA fluorescence modalities about 186 nm at 520 nm', () => {
    // Hand-checkable: 520 / (2 × 1.4) = 185.7 nm.
    const epi = explore({ modalityId: 'epifluorescence', criterion: 'abbe' });
    expect(epi.resolution.lateral).toBeCloseTo(185.71, 1);
  });

  it('lets the objective be overridden without touching the modality', () => {
    const stock = explore(BRIGHTFIELD);
    const better = explore({ ...BRIGHTFIELD, numericalAperture: 1.4, refractiveIndex: 1.515 });
    expect(better.resolution.lateral).toBeLessThan(stock.resolution.lateral);
    expect(better.modality.id).toBe('brightfield');
  });

  it('refuses an objective that cannot exist in its medium', () => {
    expect(() => explore({ ...BRIGHTFIELD, numericalAperture: 1.4, refractiveIndex: 1 })).toThrow(
      ResolutionError,
    );
  });

  it('refuses an unknown modality rather than falling back to a default', () => {
    expect(() => explore({ modalityId: 'electron', criterion: 'abbe' })).toThrow(ResolutionError);
  });

  it('applies the confocal axial gain but claims no lateral gain', () => {
    const result = explore({ modalityId: 'confocal', criterion: 'abbe' });
    expect(result.effectiveLateral).toBeCloseTo(result.resolution.lateral, 10);
    expect(result.effectiveAxial).toBeLessThan(result.resolution.axial);
  });

  it('says plainly when a technique does not move the diffraction limit', () => {
    // The single most common misconception about phase contrast and DIC, and
    // the sentence the tool exists to put in front of someone.
    for (const id of ['phase-contrast', 'dic', 'epifluorescence']) {
      const result = explore({ modalityId: id, criterion: 'abbe' });
      expect(result.notes.join(' '), id).toContain('does not move the diffraction limit');
    }
  });

  it('does not say that about confocal, which does improve sectioning', () => {
    const result = explore({ modalityId: 'confocal', criterion: 'abbe' });
    expect(result.notes.join(' ')).not.toContain('does not move the diffraction limit');
  });

  it('carries the condenser into the answer for transmitted-light modalities', () => {
    // Brightfield declares a condenser NA, so Abbe's two-NA form applies and
    // the note explaining the trade must appear.
    expect(explore(BRIGHTFIELD).notes.join(' ')).toMatch(/condenser/i);
    // Epifluorescence has no condenser in the path at all.
    expect(
      explore({ modalityId: 'epifluorescence', criterion: 'abbe' }).notes.join(' '),
    ).not.toMatch(/condenser at NA/i);
  });

  it('changes with the criterion, as it must', () => {
    const abbe = explore(BRIGHTFIELD).resolution.lateral;
    const rayleigh = explore({ ...BRIGHTFIELD, criterion: 'rayleigh' }).resolution.lateral;
    expect(rayleigh / abbe).toBeCloseTo(0.61 / 0.5, 6);
  });
});

describe('partsInLightOrder', () => {
  it('starts at a source and ends at a detector for every modality', () => {
    for (const modality of MODALITIES) {
      const ordered = partsInLightOrder(modality);
      expect(ordered[0]!.kind, `${modality.id} should start at the source`).toBe('source');
      expect(ordered[ordered.length - 1]!.kind, `${modality.id} should end at the detector`).toBe(
        'detector',
      );
    }
  });

  it('keeps every part exactly once', () => {
    for (const modality of MODALITIES) {
      const ordered = partsInLightOrder(modality);
      expect(ordered).toHaveLength(modality.parts.length);
      expect(new Set(ordered.map((p) => p.id)).size).toBe(modality.parts.length);
    }
  });

  it('runs up the column, specimen before objective before tube lens', () => {
    const ids = partsInLightOrder(getModality('brightfield')!).map((p) => p.id);
    expect(ids.indexOf('specimen')).toBeLessThan(ids.indexOf('objective'));
    expect(ids.indexOf('objective')).toBeLessThan(ids.indexOf('tube-lens'));
    expect(ids.indexOf('condenser')).toBeLessThan(ids.indexOf('specimen'));
  });

  it('puts the epi arm before the column rather than sorting it by height', () => {
    // The lamp of an epifluorescence stand sits beside the column at the height
    // of the dichroic. Sorting purely by height would list it in the middle of
    // the imaging path, which is exactly backwards.
    const ids = partsInLightOrder(getModality('epifluorescence')!).map((p) => p.id);
    expect(ids.indexOf('lamp')).toBe(0);
    expect(ids.indexOf('excitation-filter')).toBeLessThan(ids.indexOf('specimen'));
  });
});

describe('conjugateSets', () => {
  it('finds both sets in a Köhler brightfield column', () => {
    const sets = conjugateSets(getModality('brightfield')!);
    expect(sets.map((s) => s.kind).sort()).toEqual(['aperture', 'field']);
  });

  it('groups the field diaphragm with the specimen and the intermediate image', () => {
    // The defining property of Köhler illumination, and the thing the diagram
    // is drawn to show.
    const field = conjugateSets(getModality('brightfield')!).find((s) => s.kind === 'field')!;
    for (const id of ['field-diaphragm', 'specimen', 'intermediate-image']) {
      expect(field.partIds, id).toContain(id);
    }
  });

  it('groups the condenser diaphragm with the objective back focal plane', () => {
    const aperture = conjugateSets(getModality('brightfield')!).find((s) => s.kind === 'aperture')!;
    expect(aperture.partIds).toContain('aperture-diaphragm');
    expect(aperture.partIds).toContain('bfp');
  });

  it('puts the phase annulus and phase plate in the same aperture set', () => {
    const aperture = conjugateSets(getModality('phase-contrast')!).find(
      (s) => s.kind === 'aperture',
    )!;
    expect(aperture.partIds).toContain('condenser-annulus');
    expect(aperture.partIds).toContain('phase-plate');
  });

  it('omits a set with only one member, which conjugates with nothing', () => {
    for (const modality of MODALITIES) {
      for (const set of conjugateSets(modality)) {
        expect(set.partIds.length, `${modality.id}/${set.kind}`).toBeGreaterThan(1);
      }
    }
  });
});

describe('defaultBands', () => {
  it('turns on every band a modality declares', () => {
    for (const modality of MODALITIES) {
      expect(defaultBands(modality)).toEqual(modality.bands.map((b) => b.band));
    }
  });
});
