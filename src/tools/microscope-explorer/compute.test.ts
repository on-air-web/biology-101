import { describe, expect, it } from 'vitest';
import { MODALITIES, getModality } from '@/lib/bio/microscopes';
import {
  ResolutionError,
  conjugateSets,
  defaultBands,
  explore,
  partsInLightOrder,
  standParts,
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

  it('keeps every optical part exactly once, and no structural one', () => {
    for (const modality of MODALITIES) {
      const ordered = partsInLightOrder(modality);
      const optical = modality.parts.filter((part) => !part.structural);
      expect(ordered).toHaveLength(optical.length);
      expect(new Set(ordered.map((p) => p.id)).size).toBe(optical.length);
      // The stand carries no light, so listing it in a light path would be
      // nonsense — the base sits below the lamp and the limb behind everything.
      expect(ordered.some((part) => part.structural)).toBe(false);
    }
  });

  it('accounts for every part between the two lists, losing none', () => {
    for (const modality of MODALITIES) {
      const both = [...partsInLightOrder(modality), ...standParts(modality)];
      expect(both).toHaveLength(modality.parts.length);
      expect(new Set(both.map((p) => p.id)).size).toBe(modality.parts.length);
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

describe('standParts', () => {
  it('gives every modality a recognisable stand', () => {
    // Without these the drawing is a stack of discs in mid-air and nobody can
    // map "condenser aperture diaphragm" onto the knob they are about to turn.
    for (const modality of MODALITIES) {
      const stand = standParts(modality);
      expect(stand.length, modality.id).toBeGreaterThan(4);
      for (const id of ['base', 'limb', 'stage', 'nosepiece', 'head']) {
        expect(
          stand.map((p) => p.id),
          `${modality.id} is missing ${id}`,
        ).toContain(id);
      }
    }
  });

  it('reads downwards, the way you look at an instrument', () => {
    for (const modality of MODALITIES) {
      const heights = standParts(modality).map((part) => part.at[1]);
      for (let i = 1; i < heights.length; i += 1) {
        expect(heights[i]!, modality.id).toBeLessThanOrEqual(heights[i - 1]!);
      }
    }
  });

  it('marks every stand part structural and gives it a role', () => {
    for (const modality of MODALITIES) {
      for (const part of standParts(modality)) {
        expect(part.structural, `${modality.id}/${part.id}`).toBe(true);
        expect(part.kind, `${modality.id}/${part.id}`).toBe('body');
        expect(part.role.length, `${modality.id}/${part.id}`).toBeGreaterThan(60);
        // Nothing structural may claim to sit in a conjugate plane.
        expect(part.conjugate, `${modality.id}/${part.id}`).toBeUndefined();
      }
    }
  });

  it('gives the transmitted stands a substage and the epi stands a cube turret', () => {
    const ids = (id: string) => standParts(getModality(id)!).map((p) => p.id);
    expect(ids('brightfield')).toContain('substage');
    expect(ids('phase-contrast')).toContain('substage');
    expect(ids('epifluorescence')).toContain('cube-turret');
    expect(ids('epifluorescence')).not.toContain('substage');
    expect(ids('confocal')).toContain('cube-turret');
  });

  it('puts the base below the lamp and the limb behind the column', () => {
    const brightfield = getModality('brightfield')!;
    const base = brightfield.parts.find((p) => p.id === 'base')!;
    const lamp = brightfield.parts.find((p) => p.kind === 'source')!;
    const limb = brightfield.parts.find((p) => p.id === 'limb')!;
    expect(base.at[1]).toBeLessThan(lamp.at[1]);
    // Behind, in +Z, so rotating the scene swings it round the optics.
    expect(limb.at[2]).toBeGreaterThan(20);
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
