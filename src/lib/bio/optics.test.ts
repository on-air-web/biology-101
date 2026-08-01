import { describe, expect, it } from 'vitest';
import {
  EDGE_FRACTION,
  OpticsError,
  bleedthrough,
  channelComposition,
  channelResponse,
  collectionEfficiency,
  crossoverWavelength,
  excitationEfficiency,
  parseFilter,
  stackTransmission,
  suggestFilterSet,
  transmission,
  type Channel,
  type OpticalFilter,
} from './optics';
import { getFluorophore, integrate, sampleSpectrum } from './spectra';

const bandpass = (centre: number, width: number): OpticalFilter => ({
  kind: 'bandpass',
  label: `${centre}/${width}`,
  centre,
  width,
  peak: 0.95,
});

describe('parseFilter', () => {
  it('reads a plain bandpass', () => {
    expect(parseFilter('525/50')).toMatchObject({ kind: 'bandpass', centre: 525, width: 50 });
  });

  it('reads the vendor part numbers people actually write', () => {
    expect(parseFilter('ET470/40x')).toMatchObject({ kind: 'bandpass', centre: 470, width: 40 });
    expect(parseFilter('FF01-525/50-25')).toMatchObject({
      kind: 'bandpass',
      centre: 525,
      width: 50,
    });
    expect(parseFilter('690/50m')).toMatchObject({ kind: 'bandpass', centre: 690, width: 50 });
  });

  it('reads edge filters written either way round', () => {
    expect(parseFilter('495LP')).toMatchObject({ kind: 'longpass', centre: 495 });
    expect(parseFilter('LP 495')).toMatchObject({ kind: 'longpass', centre: 495 });
    expect(parseFilter('T495lpxr')).toMatchObject({ kind: 'longpass', centre: 495 });
    expect(parseFilter('680SP')).toMatchObject({ kind: 'shortpass', centre: 680 });
    expect(parseFilter('sp 680')).toMatchObject({ kind: 'shortpass', centre: 680 });
  });

  it('keeps the text the user typed', () => {
    expect(parseFilter('ET525/50m').label).toBe('ET525/50m');
  });

  it('refuses a bare number rather than guessing', () => {
    // Rule 6 of the project: ambiguous input gets an error. "525" could be a
    // bandpass centre or a longpass edge, and the two behave nothing alike.
    expect(() => parseFilter('525')).toThrow(OpticsError);
  });

  it('refuses empty and unreadable input', () => {
    expect(() => parseFilter('')).toThrow(OpticsError);
    expect(() => parseFilter('the green one')).toThrow(OpticsError);
  });

  it('refuses wavelengths outside the range the model covers', () => {
    expect(() => parseFilter('50/10')).toThrow(OpticsError);
    expect(() => parseFilter('9999LP')).toThrow(OpticsError);
  });
});

describe('transmission', () => {
  const band = bandpass(525, 50);

  it('is at peak in the middle of a passband', () => {
    expect(transmission(band, 525)).toBeCloseTo(0.95, 10);
  });

  it('is at half peak on each nominal edge', () => {
    // This is what a catalogue number means: 525/50 passes 500 to 550 at the
    // 50% points, not at the shoulders.
    expect(transmission(band, 500)).toBeCloseTo(0.95 / 2, 6);
    expect(transmission(band, 550)).toBeCloseTo(0.95 / 2, 6);
  });

  it('is zero well outside the band', () => {
    expect(transmission(band, 460)).toBe(0);
    expect(transmission(band, 600)).toBe(0);
  });

  it('runs the edge over the declared fraction of the edge wavelength', () => {
    const edgeWidth = band.centre * EDGE_FRACTION;
    expect(transmission(band, 500 - edgeWidth / 2)).toBeCloseTo(0, 10);
    expect(transmission(band, 500 + edgeWidth / 2)).toBeCloseTo(0.95, 10);
  });

  it('is monotonic across a longpass edge', () => {
    const longpass: OpticalFilter = {
      kind: 'longpass',
      label: '495 LP',
      centre: 495,
      width: 0,
      peak: 0.95,
    };
    expect(transmission(longpass, 480)).toBe(0);
    expect(transmission(longpass, 495)).toBeCloseTo(0.95 / 2, 6);
    expect(transmission(longpass, 520)).toBeCloseTo(0.95, 10);
    for (let nm = 485; nm < 505; nm += 0.5) {
      expect(transmission(longpass, nm + 0.5)).toBeGreaterThanOrEqual(
        transmission(longpass, nm) - 1e-12,
      );
    }
  });

  it('mirrors for a shortpass', () => {
    const shortpass: OpticalFilter = {
      kind: 'shortpass',
      label: '680 SP',
      centre: 680,
      width: 0,
      peak: 0.95,
    };
    expect(transmission(shortpass, 600)).toBeCloseTo(0.95, 10);
    expect(transmission(shortpass, 680)).toBeCloseTo(0.95 / 2, 6);
    expect(transmission(shortpass, 760)).toBe(0);
  });

  it('multiplies through a stack', () => {
    const dichroic: OpticalFilter = {
      kind: 'longpass',
      label: '495 LP',
      centre: 495,
      width: 0,
      peak: 0.95,
    };
    expect(stackTransmission([dichroic, band], 525)).toBeCloseTo(0.95 * 0.95, 10);
    // The dichroic blocks what the bandpass would have passed.
    expect(stackTransmission([bandpass(480, 40), dichroic], 470)).toBe(0);
  });

  it('integrates a passband to roughly its nominal width', () => {
    // A sanity check on the edge model as a whole: the area under a 525/50 at
    // 95% peak should be close to 50 nm × 0.95, because a raised-cosine edge
    // gives away exactly as much below the nominal edge as it gains above.
    const area = integrate((nm) => transmission(band, nm), 460, 600);
    expect(area).toBeCloseTo(50 * 0.95, 1);
  });
});

describe('excitation efficiency', () => {
  const egfp = getFluorophore('egfp')!;
  const mcherry = getFluorophore('mcherry')!;

  it('reads a laser line straight off the excitation curve', () => {
    expect(excitationEfficiency(egfp, { kind: 'laser', nm: 488 })).toBeCloseTo(
      sampleSpectrum(egfp.ex, 488),
      12,
    );
  });

  it('puts EGFP near its maximum at 488 and mCherry near its maximum at 561', () => {
    expect(excitationEfficiency(egfp, { kind: 'laser', nm: 488 })).toBeGreaterThan(0.98);
    expect(excitationEfficiency(mcherry, { kind: 'laser', nm: 561 })).toBeGreaterThan(0.6);
  });

  it('shows why 488 is a poor line for mCherry and 561 a useless one for EGFP', () => {
    expect(excitationEfficiency(mcherry, { kind: 'laser', nm: 488 })).toBeLessThan(0.2);
    expect(excitationEfficiency(egfp, { kind: 'laser', nm: 561 })).toBeLessThan(0.01);
  });

  it('averages over a passband and lands between the extremes it spans', () => {
    const filter = bandpass(470, 40);
    const averaged = excitationEfficiency(egfp, { kind: 'filtered', filter });
    const atEdges = [450, 490].map((nm) => sampleSpectrum(egfp.ex, nm));
    expect(averaged).toBeGreaterThan(Math.min(...atEdges));
    expect(averaged).toBeLessThan(1);
  });

  it('is independent of the filter transmission, being a weighted mean', () => {
    // Halving the peak transmission halves numerator and denominator alike.
    const bright = bandpass(470, 40);
    const dim = { ...bright, peak: 0.4 };
    expect(excitationEfficiency(egfp, { kind: 'filtered', filter: dim })).toBeCloseTo(
      excitationEfficiency(egfp, { kind: 'filtered', filter: bright }),
      10,
    );
  });
});

describe('collection efficiency', () => {
  const egfp = getFluorophore('egfp')!;

  it('is bounded by the filter transmission', () => {
    // No stack can collect a larger fraction of the emission than it transmits
    // at its best wavelength.
    const filter = bandpass(525, 50);
    expect(collectionEfficiency(egfp, [filter])).toBeLessThan(filter.peak);
    expect(collectionEfficiency(egfp, [filter])).toBeGreaterThan(0.3);
  });

  it('rises as the passband widens', () => {
    const narrow = collectionEfficiency(egfp, [bandpass(515, 20)]);
    const wide = collectionEfficiency(egfp, [bandpass(530, 60)]);
    expect(wide).toBeGreaterThan(narrow);
  });

  it('collects a little, not nothing, through a filter well past the emission', () => {
    // About 1% of EGFP's photons come out beyond 625 nm. That tail is small,
    // real, and the reason a bright GFP sample is visible in a red channel —
    // asserting it away as zero would be asserting away the phenomenon these
    // tools exist to quantify.
    const farRed = collectionEfficiency(egfp, [bandpass(650, 50)]);
    expect(farRed).toBeGreaterThan(0.001);
    expect(farRed).toBeLessThan(0.03);
  });

  it('approaches the stack transmission for a filter that passes everything', () => {
    const everything: OpticalFilter = {
      kind: 'longpass',
      label: '300 LP',
      centre: 300,
      width: 0,
      peak: 1,
    };
    expect(collectionEfficiency(egfp, [everything])).toBeCloseTo(1, 2);
  });
});

describe('channels and cross-talk', () => {
  const green: Channel = {
    id: 'green',
    label: 'GFP',
    illumination: { kind: 'laser', nm: 488 },
    emission: [bandpass(525, 50)],
  };
  const red: Channel = {
    id: 'red',
    label: 'RFP',
    illumination: { kind: 'laser', nm: 561 },
    emission: [bandpass(600, 50)],
  };

  const egfp = getFluorophore('egfp')!;
  const mcherry = getFluorophore('mcherry')!;

  it('sends each fluorophore to the channel built for it', () => {
    expect(bleedthrough(egfp, [green, red])!.homeChannelId).toBe('green');
    expect(bleedthrough(mcherry, [green, red])!.homeChannelId).toBe('red');
  });

  it('scores the home channel at exactly 1 and the others below it', () => {
    const spill = bleedthrough(egfp, [green, red])!;
    expect(spill.relative.green).toBeCloseTo(1, 12);
    expect(spill.relative.red).toBeLessThan(0.02);
  });

  it('finds the mCherry-into-green leak small but not zero', () => {
    // 561 does not excite EGFP at all, so EGFP cannot appear in the red
    // channel; 488 does excite mCherry weakly, and mCherry's emission does
    // not reach 525/50. Both leaks are small, and they are small for
    // different reasons — which is the thing a panel designer needs to see.
    const spill = bleedthrough(mcherry, [green, red])!;
    expect(spill.relative.green).toBeGreaterThan(0);
    expect(spill.relative.green).toBeLessThan(0.05);
  });

  it('cancels brightness and expression out of the relative figures', () => {
    // The claim the tool makes about bleed-through: it is a property of the
    // molecule and the optics alone. Scaling ε and Φ must not move it.
    const brighter = { ...egfp, extCoeff: egfp.extCoeff! * 10, quantumYield: 0.99 };
    const original = bleedthrough(egfp, [green, red])!;
    const scaled = bleedthrough(brighter, [green, red])!;
    expect(scaled.relative.red!).toBeCloseTo(original.relative.red!, 12);
  });

  it('scales detected signal with brightness, unlike the spectral figure', () => {
    const response = channelResponse(egfp, green);
    const doubled = channelResponse({ ...egfp, quantumYield: egfp.quantumYield! * 2 }, green);
    expect(doubled.detected!).toBeCloseTo(response.detected! * 2, 8);
    expect(doubled.spectral).toBeCloseTo(response.spectral, 12);
  });

  it('leaves detected signal undefined where the photophysics are unpublished', () => {
    const texasRed = getFluorophore('texas-red')!;
    expect(texasRed.extCoeff).toBeNull();
    expect(channelResponse(texasRed, red).detected).toBeUndefined();
    expect(channelResponse(texasRed, red).spectral).toBeGreaterThan(0);
  });

  it('returns nothing for an empty channel list rather than inventing a home', () => {
    expect(bleedthrough(egfp, [])).toBeUndefined();
  });
});

describe('channel composition', () => {
  const green: Channel = {
    id: 'green',
    label: 'GFP',
    illumination: { kind: 'laser', nm: 488 },
    emission: [bandpass(525, 50)],
  };
  const red: Channel = {
    id: 'red',
    label: 'RFP',
    illumination: { kind: 'laser', nm: 561 },
    emission: [bandpass(600, 50)],
  };

  const egfp = getFluorophore('egfp')!;
  const mcherry = getFluorophore('mcherry')!;

  it('shares sum to one in every channel', () => {
    for (const channel of channelComposition([egfp, mcherry], [green, red])) {
      const total = channel.shares.reduce((sum, s) => sum + s.share, 0);
      expect(total, channel.channelId).toBeCloseTo(1, 10);
    }
  });

  it('attributes each channel mostly to its own fluorophore', () => {
    const [greenChannel, redChannel] = channelComposition([egfp, mcherry], [green, red]);
    expect(greenChannel!.shares[0]!.fluorophoreId).toBe('egfp');
    expect(greenChannel!.shares[0]!.share).toBeGreaterThan(0.9);
    expect(redChannel!.shares[0]!.fluorophoreId).toBe('mcherry');
    expect(redChannel!.shares[0]!.share).toBeGreaterThan(0.9);
  });

  it('names the fluorophores it had to leave out', () => {
    const texasRed = getFluorophore('texas-red')!;
    const [first] = channelComposition([egfp, texasRed], [green]);
    expect(first!.excludedIds).toEqual(['texas-red']);
    expect(first!.shares.map((s) => s.fluorophoreId)).toEqual(['egfp']);
  });
});

describe('suggestFilterSet', () => {
  const egfp = getFluorophore('egfp')!;

  it('puts the dichroic between the two maxima', () => {
    const crossover = crossoverWavelength(egfp);
    expect(crossover).toBeGreaterThan(egfp.exMax!);
    expect(crossover).toBeLessThan(egfp.emMax!);
  });

  it('lands close to the cube everyone actually uses for GFP', () => {
    // An external check on the optimiser: a standard GFP cube is roughly
    // 470/40 excitation, a 495 dichroic and 525/50 emission. The suggestion is
    // derived from the spectra alone and knows nothing of that catalogue, so
    // agreeing to within a few nanometres is real corroboration rather than a
    // restatement.
    const set = suggestFilterSet(egfp);
    expect(Math.abs(set.excitation.centre - 470)).toBeLessThan(15);
    expect(Math.abs(set.dichroic.centre - 495)).toBeLessThan(12);
    expect(Math.abs(set.emission.centre - 525)).toBeLessThan(20);
  });

  it('keeps excitation below the dichroic and emission above it', () => {
    for (const id of ['egfp', 'mcherry', 'mturquoise2', 'alexa-647']) {
      const set = suggestFilterSet(getFluorophore(id)!);
      expect(set.excitation.centre + set.excitation.width / 2, id).toBeLessThanOrEqual(
        set.dichroic.centre,
      );
      expect(set.emission.centre - set.emission.width / 2, id).toBeGreaterThanOrEqual(
        set.dichroic.centre,
      );
    }
  });

  it('produces a workable set for every fluorophore in the catalogue', () => {
    for (const id of ['ebfp2', 'egfp', 'eyfp', 'mcherry', 'irfp713', 'dapi', 'cy7']) {
      const set = suggestFilterSet(getFluorophore(id)!);
      expect(set.excitationEfficiency, id).toBeGreaterThan(0.3);
      expect(set.collectionEfficiency, id).toBeGreaterThan(0.2);
    }
  });
});
