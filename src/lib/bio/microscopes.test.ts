import { describe, expect, it } from 'vitest';
import { MODALITIES, extentOf, getModality, profileFor, solidFor } from './microscopes';
import { drawSolid, type View } from './scope-geometry';
import { TECHNIQUE_GAINS, resolve } from './resolution';

const VIEW: View = { yaw: 0.4, pitch: 0.2, scale: 1.4 };

describe('the modality catalogue', () => {
  it('has unique ids and resolves each by id', () => {
    const ids = MODALITIES.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(getModality(id)?.id).toBe(id);
  });

  it('returns nothing for an unknown id rather than a default', () => {
    expect(getModality('electron')).toBeUndefined();
  });

  it('gives every modality parts, rays and a principle worth reading', () => {
    for (const modality of MODALITIES) {
      expect(modality.parts.length, modality.id).toBeGreaterThan(5);
      expect(modality.rays.length, modality.id).toBeGreaterThan(1);
      expect(modality.principle.length, modality.id).toBeGreaterThan(150);
      expect(modality.caveats.length, modality.id).toBeGreaterThan(0);
    }
  });

  it('gives every part a unique id within its modality', () => {
    for (const modality of MODALITIES) {
      const ids = modality.parts.map((p) => p.id);
      expect(new Set(ids).size, `${modality.id} has a duplicate part id`).toBe(ids.length);
    }
  });

  it('explains what every part does', () => {
    for (const modality of MODALITIES) {
      for (const part of modality.parts) {
        expect(part.role.length, `${modality.id}/${part.id}`).toBeGreaterThan(60);
        expect(part.name.length, `${modality.id}/${part.id}`).toBeGreaterThan(2);
      }
    }
  });

  it('declares a legend entry for every ray band it draws', () => {
    // A band drawn with no legend entry is an unlabelled colour on a diagram,
    // which is worse than not drawing it.
    for (const modality of MODALITIES) {
      const declared = new Set(modality.bands.map((b) => b.band));
      for (const ray of modality.rays) {
        expect(declared.has(ray.band), `${modality.id}: ray ${ray.id} band ${ray.band}`).toBe(true);
      }
    }
  });

  it('draws every declared band at least once', () => {
    for (const modality of MODALITIES) {
      const drawn = new Set(modality.rays.map((r) => r.band));
      for (const band of modality.bands) {
        expect(drawn.has(band.band), `${modality.id}: band ${band.band} has no rays`).toBe(true);
      }
    }
  });
});

describe('the optical trains are physically ordered', () => {
  it('puts the specimen between the illumination and the detector', () => {
    for (const modality of MODALITIES) {
      const specimen = modality.parts.find((p) => p.kind === 'sample');
      const detector = modality.parts.find((p) => p.kind === 'detector');
      expect(specimen, modality.id).toBeDefined();
      expect(detector, modality.id).toBeDefined();
      expect(
        detector!.at[1],
        `${modality.id}: detector must be above the specimen`,
      ).toBeGreaterThan(specimen!.at[1]);
    }
  });

  it('puts the objective above the specimen and below the tube lens', () => {
    for (const modality of MODALITIES) {
      const objective = modality.parts.find((p) => p.kind === 'objective');
      const specimen = modality.parts.find((p) => p.kind === 'sample')!;
      const tube = modality.parts.find((p) => p.id === 'tube-lens');
      expect(objective, modality.id).toBeDefined();
      expect(objective!.at[1]).toBeGreaterThan(specimen.at[1]);
      if (tube) expect(tube.at[1]).toBeGreaterThan(objective!.at[1]);
    }
  });

  it('puts the condenser below the specimen wherever there is one', () => {
    for (const modality of MODALITIES) {
      const condenser = modality.parts.find((p) => p.id === 'condenser');
      if (!condenser) continue;
      const specimen = modality.parts.find((p) => p.kind === 'sample')!;
      expect(condenser.at[1], modality.id).toBeLessThan(specimen.at[1]);
    }
  });

  it('sends each ray band the way the light actually goes', () => {
    // Excitation in an epi instrument travels *down* the objective to the
    // specimen; everything else travels up from it. Asserting one direction for
    // all of them would have been wrong in exactly the way the diagram must not
    // be, so the two cases are separated here.
    for (const modality of MODALITIES) {
      for (const ray of modality.rays) {
        expect(ray.points.length, `${modality.id}/${ray.id}`).toBeGreaterThan(1);
        const first = ray.points[0]![1];
        const last = ray.points[ray.points.length - 1]![1];

        if (ray.band === 'excitation') {
          expect(
            last,
            `${modality.id}/${ray.id}: excitation must descend to the specimen`,
          ).toBeLessThan(first);
          expect(last, `${modality.id}/${ray.id}: excitation must reach the specimen`).toBe(0);
        } else {
          expect(last, `${modality.id}/${ray.id} must travel upwards overall`).toBeGreaterThan(
            first,
          );
        }
      }
    }
  });

  it('places the phase plate and the condenser annulus in conjugate planes', () => {
    // The whole of phase contrast: the annulus is imaged onto the ring of the
    // phase plate. Both must therefore be declared aperture-conjugate, and both
    // must be annular rather than solid discs.
    const phase = getModality('phase-contrast')!;
    const annulus = phase.parts.find((p) => p.id === 'condenser-annulus')!;
    const plate = phase.parts.find((p) => p.id === 'phase-plate')!;
    expect(annulus.conjugate).toBe('aperture');
    expect(plate.conjugate).toBe('aperture');
    expect(annulus.innerRadius).toBeGreaterThan(0);
    expect(plate.innerRadius).toBeGreaterThan(0);
  });

  it('puts the confocal pinhole in a field plane, not an aperture plane', () => {
    // The pinhole works because it is conjugate with the illuminated focus.
    // Placing it in an aperture plane would make it a field stop instead, which
    // is a different instrument that does not section.
    const pinhole = getModality('confocal')!.parts.find((p) => p.kind === 'pinhole')!;
    expect(pinhole.conjugate).toBe('field');
    expect(pinhole.innerRadius).toBeGreaterThan(0);
  });

  it('gives DIC two prisms and two crossed polarisers', () => {
    const parts = getModality('dic')!.parts;
    expect(parts.filter((p) => p.kind === 'prism')).toHaveLength(2);
    expect(parts.filter((p) => p.kind === 'polariser')).toHaveLength(2);
  });

  it('shears the DIC rays at the specimen but recombines them afterwards', () => {
    const dic = getModality('dic')!;
    const o = dic.rays.find((r) => r.band === 'ordinary')!;
    const e = dic.rays.find((r) => r.band === 'extraordinary')!;
    const atSample = (ray: typeof o) => ray.points.find((p) => p[1] === 0)![0];
    // Separated at the specimen…
    expect(Math.abs(atSample(o) - atSample(e))).toBeGreaterThan(0);
    // …and back together by the analyser.
    expect(o.points[o.points.length - 1]![0]).toBeCloseTo(e.points[e.points.length - 1]![0], 6);
  });

  it('faces every turning mirror the way its ray actually turns', () => {
    /**
     * The reflection law, applied to the drawing itself.
     *
     * A 45° mirror has two possible orientations and they send the beam to
     * opposite places. This walks each ray to the vertex that sits on a mirror,
     * takes the incoming and outgoing directions, and checks that reflecting
     * the first about the mirror's normal gives the second. It caught the
     * epifluorescence dichroic facing the wrong way — drawn sending excitation
     * up to the camera while the ray went down into the objective.
     */
    const reflect = (d: readonly number[], n: readonly number[]) => {
      const dot = d[0]! * n[0]! + d[1]! * n[1]! + d[2]! * n[2]!;
      return [d[0]! - 2 * dot * n[0]!, d[1]! - 2 * dot * n[1]!, d[2]! - 2 * dot * n[2]!];
    };
    const unit = (v: readonly number[]) => {
      const l = Math.hypot(v[0]!, v[1]!, v[2]!);
      return l === 0 ? [0, 0, 0] : [v[0]! / l, v[1]! / l, v[2]! / l];
    };

    let checked = 0;
    for (const modality of MODALITIES) {
      const mirrors = modality.parts.filter(
        (part) => (part.kind === 'mirror' || part.kind === 'dichroic') && part.axis,
      );
      for (const mirror of mirrors) {
        for (const ray of modality.rays) {
          // A scanning mirror is at more than one angle; a ray drawn for a
          // different angle cannot match the one orientation drawn.
          if (ray.mirrorMoved) continue;
          for (let i = 1; i < ray.points.length - 1; i += 1) {
            const at = ray.points[i]!;
            // Anywhere on the mirror face, not just its centre: a beam is
            // entitled to strike a mirror off-axis, and only checking the
            // centre quietly skipped every epifluorescence ray.
            const onMirror =
              Math.hypot(at[0] - mirror.at[0], at[1] - mirror.at[1]) <= mirror.radius;
            if (!onMirror) continue;

            const incoming = unit([
              at[0] - ray.points[i - 1]![0],
              at[1] - ray.points[i - 1]![1],
              at[2] - ray.points[i - 1]![2],
            ]);
            const outgoing = unit([
              ray.points[i + 1]![0] - at[0],
              ray.points[i + 1]![1] - at[1],
              ray.points[i + 1]![2] - at[2],
            ]);
            // A dichroic reflects one band and transmits the other, so only
            // the reflections can be checked against its normal. The threshold
            // is 1.0, which is a 60° change of direction: a fold is 90° and
            // gives √2, while a transmitted ray crossing a tilted plate bends
            // by a few degrees at most. A looser threshold read the confocal's
            // transmitted out-of-focus path as a reflection.
            const turns = Math.hypot(
              outgoing[0]! - incoming[0]!,
              outgoing[1]! - incoming[1]!,
              outgoing[2]! - incoming[2]!,
            );
            if (turns < 1) continue;

            const expected = reflect(incoming, unit(mirror.axis!));
            for (let axis = 0; axis < 3; axis += 1) {
              expect(
                outgoing[axis]!,
                `${modality.id}/${ray.id} at ${mirror.id}: axis ${axis}`,
              ).toBeCloseTo(expected[axis]!, 1);
            }
            checked += 1;
          }
        }
      }
    }
    // Guard against the check silently matching nothing.
    expect(checked).toBeGreaterThan(2);
  });

  it('tilts both dichroics to 45 degrees', () => {
    for (const id of ['epifluorescence', 'confocal']) {
      const dichroic = getModality(id)!.parts.find((p) => p.kind === 'dichroic')!;
      expect(dichroic.axis, id).toBeDefined();
      // A 45° normal in the XY plane has equal-magnitude x and y components.
      expect(Math.abs(dichroic.axis![0]), id).toBeCloseTo(Math.abs(dichroic.axis![1]), 6);
    }
  });
});

describe('the optics each modality is drawn with', () => {
  it('quotes an NA that is possible in its stated medium', () => {
    for (const modality of MODALITIES) {
      const { numericalAperture, refractiveIndex } = modality.optics;
      expect(numericalAperture, modality.id).toBeLessThanOrEqual(refractiveIndex);
    }
  });

  it('computes a resolution for every modality without throwing', () => {
    for (const modality of MODALITIES) {
      const result = resolve({ ...modality.optics, criterion: 'abbe' });
      expect(result.lateral, modality.id).toBeGreaterThan(100);
      expect(result.lateral, modality.id).toBeLessThan(1000);
    }
  });

  it('names a technique gain that exists', () => {
    for (const modality of MODALITIES) {
      expect(TECHNIQUE_GAINS[modality.optics.gainKey], modality.id).toBeDefined();
    }
  });

  it('costs phase contrast resolution against brightfield, as the annulus must', () => {
    // Both use the same 0.75 NA dry objective. The annulus cuts the condenser
    // NA, so phase contrast has to come out worse — if it did not, the two-NA
    // form would not be wired up to the modality data at all.
    const bright = resolve({ ...getModality('brightfield')!.optics, criterion: 'abbe' });
    const phase = resolve({ ...getModality('phase-contrast')!.optics, criterion: 'abbe' });
    expect(phase.lateral).toBeGreaterThan(bright.lateral);
  });
});

describe('rendering', () => {
  it('draws every part of every modality as a closed path', () => {
    for (const modality of MODALITIES) {
      for (const part of modality.parts) {
        const drawn = drawSolid(solidFor(part), VIEW);
        expect(drawn.d, `${modality.id}/${part.id}`).toMatch(/^M/);
        expect(drawn.d, `${modality.id}/${part.id}`).not.toContain('NaN');
      }
    }
  });

  it('gives an annular part two subpaths and a solid part one', () => {
    const phase = getModality('phase-contrast')!;
    const annulus = phase.parts.find((p) => p.id === 'condenser-annulus')!;
    const lens = phase.parts.find((p) => p.id === 'condenser')!;
    expect(drawSolid(solidFor(annulus), VIEW).d.match(/M/g)).toHaveLength(2);
    expect(drawSolid(solidFor(lens), VIEW).d.match(/M/g)).toHaveLength(1);
  });

  it('gives a lens a bulged profile and an objective a tapered one', () => {
    const lens = profileFor({
      id: 'x',
      name: 'x',
      kind: 'lens',
      at: [0, 0, 0],
      radius: 10,
      thickness: 6,
      role: 'x',
    });
    // Widest in the middle, narrower at the faces: that is what makes it read
    // as glass rather than as a coin.
    expect(Math.max(...lens.map((s) => s.r))).toBeGreaterThan(lens[0]!.r);

    const obj = profileFor({
      id: 'x',
      name: 'x',
      kind: 'objective',
      at: [0, 0, 0],
      radius: 10,
      thickness: 20,
      role: 'x',
    });
    // Narrow nose at the bottom, wide barrel at the top.
    expect(obj[0]!.r).toBeLessThan(obj[obj.length - 1]!.r);
  });

  it('reports an extent tall enough to frame the whole stand', () => {
    for (const modality of MODALITIES) {
      const { minY, maxY } = extentOf(modality);
      expect(maxY - minY, modality.id).toBeGreaterThan(100);
    }
  });
});
