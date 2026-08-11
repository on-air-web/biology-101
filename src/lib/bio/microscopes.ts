/**
 * The instruments, as data.
 *
 * Five modalities, each a list of parts placed in 3D and a set of ray paths
 * drawn through them. Both come from the same coordinate system, which is the
 * reason this is data rather than five drawings: rotate the scene and the rays
 * turn with the glass, because they are described in the same millimetres.
 *
 * HONESTY ABOUT WHAT THIS IS. The spacings are schematic. Parts sit in the
 * right order, at proportions that look like a real stand, and every ray passes
 * through the correct sequence of conjugate planes — but nothing here is traced
 * through a lens prescription, and no focal length is claimed. It is a diagram
 * that can be rotated, not an optical design, and the interface says so next to
 * the drawing rather than leaving it to be inferred.
 *
 * Sources: the optical trains follow Köhler's arrangement as taught in BB706
 * (IIT Bombay) and the descriptions at microscopyu.com and
 * zeiss-campus.magnet.fsu.edu. Where the lecture notes and the vendor primers
 * differ on a detail — where exactly a phase plate sits, whether a Wollaston is
 * one prism or two — the vendor primers are followed, since they describe
 * shipping instruments.
 *
 * Canonical units: millimetres, optical axis +Y pointing up.
 */

import type { BoxSolid, ProfileStation, Solid, Vec3 } from './scope-geometry';

export type PartKind =
  | 'source'
  | 'lens'
  | 'objective'
  | 'mirror'
  | 'dichroic'
  | 'filter'
  | 'aperture'
  | 'sample'
  | 'detector'
  | 'prism'
  | 'polariser'
  | 'pinhole'
  /** Structural: the stand, not the light path. */
  | 'body';

export interface Part {
  id: string;
  name: string;
  kind: PartKind;
  at: Vec3;
  /** Symmetry axis; defaults to the optical axis. 45° for a dichroic. */
  axis?: Vec3;
  radius: number;
  thickness: number;
  /** Set to make the part an annulus — apertures, phase rings, doughnut stops. */
  innerRadius?: number;
  /** What it does, in one or two sentences. Shown on hover. */
  role: string;
  /** What goes wrong when this part is wrong. Usually the useful part. */
  ifWrong?: string;
  /** Named conjugate plane this part sits in, where it sits in one. */
  conjugate?: 'field' | 'aperture';
  /**
   * Half-extents of a rectangular block. Present instead of a radius/thickness
   * for the parts of the stand that are not surfaces of revolution.
   */
  box?: Vec3;
  /**
   * The stand rather than the optics: base, limb, stage, knobs. Carried in the
   * same list so it is hoverable and labelled like everything else, but kept
   * out of the light-path ordering, where it would be nonsense.
   */
  structural?: boolean;
}

export type RayBand =
  | 'illumination'
  | 'imaging'
  | 'excitation'
  /**
   * The STED depletion beam. Its own band rather than a second excitation,
   * because it travels the same way and does the opposite thing: it drives
   * molecules back down before they can fluoresce.
   */
  | 'depletion'
  | 'emission'
  | 'surround'
  | 'diffracted'
  | 'ordinary'
  | 'extraordinary';

/**
 * Bands that travel towards the specimen rather than away from it.
 *
 * Named once here because two separate things need to agree about it: the
 * direction test, and anybody reading the diagram. Everything else in an
 * optical train leaves the specimen and goes up to a detector.
 */
export const INCIDENT_BANDS: readonly RayBand[] = ['excitation', 'depletion'];

/**
 * Where the illumination comes from, which is the thing that most changes the
 * shape of an instrument.
 *
 * Declared rather than inferred from the geometry. A light sheet illuminates
 * through a second objective at right angles to the first, so its excitation
 * arrives from the side and never descends the imaging column — which is a
 * fact about the instrument, not something to be guessed at from coordinates.
 */
export type IlluminationGeometry = 'transmitted' | 'epi' | 'orthogonal';

/** Groups for the instrument picker, in the order they should be offered. */
export const MODALITY_GROUPS = [
  'Transmitted light',
  'Fluorescence',
  'Confocal and scanning',
  'Super-resolution',
  'Light sheet',
] as const;

export type ModalityGroup = (typeof MODALITY_GROUPS)[number];

export interface Ray {
  id: string;
  band: RayBand;
  points: Vec3[];
  /**
   * Drawn with a scanning mirror at a different angle from the one the part is
   * drawn at.
   *
   * A galvanometer mirror is, by definition, at more than one orientation, so a
   * ray showing where the spot goes next cannot obey the reflection law against
   * the single orientation the mirror is drawn in. Flagged rather than quietly
   * excused, so the check that every other turn is geometrically honest still
   * has teeth.
   */
  mirrorMoved?: boolean;
}

export interface Modality {
  id: string;
  name: string;
  shortName: string;
  /** Which group of the picker it belongs under. */
  group: ModalityGroup;
  /** Where the excitation comes from. See IlluminationGeometry. */
  illumination: IlluminationGeometry;
  /** One line for the picker. */
  summary: string;
  /** What the technique is actually for, and its cost. */
  principle: string;
  parts: Part[];
  rays: Ray[];
  /** Which ray bands this modality draws, with a label for the legend. */
  bands: { band: RayBand; label: string; description: string }[];
  /** Objective and condenser this modality is drawn with, for the numbers. */
  optics: {
    numericalAperture: number;
    refractiveIndex: number;
    condenserNA?: number;
    wavelength: number;
    /** Key for TECHNIQUE_GAINS. */
    gainKey: string;
  };
  /**
   * Part ids in the order the light meets them, where the geometry cannot say.
   *
   * Sorting up the column works for a transmitted-light instrument and fails
   * for anything whose path folds: in a confocal the detector sits at the far
   * end of the same arm the laser enters by, so sorting sideways puts the PMT
   * first. Declared explicitly rather than guessed at with another heuristic.
   * A part passed twice is listed at its first pass.
   */
  lightOrder?: string[];
  /** Anything the drawing cannot show. Printed under the scene. */
  caveats: string[];
}

/* -------------------------------------------------------------------------
 * Layout constants. One place, so every modality lines up with every other and
 * switching between them does not make the stand jump about.
 * ---------------------------------------------------------------------- */

const Y = {
  lamp: -200,
  collector: -172,
  fieldDiaphragm: -148,
  apertureDiaphragm: -112,
  condenser: -78,
  sample: 0,
  objective: 40,
  backFocalPlane: 72,
  dichroic: 104,
  emissionFilter: 136,
  tubeLens: 162,
  intermediateImage: 196,
  eyepiece: 220,
  detector: 250,
} as const;

/** The epi arm comes in from −X and turns up at the dichroic. */
const X = {
  lampArm: -118,
  filterArm: -84,
  confocalArm: -56,
  /** The TIRF annulus, in the arm and conjugate with the back focal plane. */
  tirfStop: -60,
  /** Where a light sheet's illumination arm begins. */
  sheetArm: -150,
} as const;

const AXIS_Y: Vec3 = [0, 1, 0];
/**
 * Two 45° orientations, and they are not interchangeable.
 *
 * AXIS_45 turns a beam travelling up into one travelling along +X, which is
 * what the epi dichroic does in reverse. AXIS_45_DOWN turns a beam travelling
 * along +X into one travelling down the column, which is what the confocal
 * scan mirror does. Using one where the other belongs draws a mirror that
 * would send the light out of the instrument.
 */
const AXIS_45: Vec3 = [-Math.SQRT1_2, Math.SQRT1_2, 0];
const AXIS_45_DOWN: Vec3 = [-Math.SQRT1_2, -Math.SQRT1_2, 0];
const AXIS_X: Vec3 = [1, 0, 0];

/* -------------------------------------------------------------------------
 * Shared parts. The transmitted-light column and the imaging column are common
 * to several modalities; assembling them from one definition is what keeps
 * brightfield, phase contrast and DIC honestly comparable.
 * ---------------------------------------------------------------------- */

const lamp = (name: string, role: string): Part => ({
  id: 'lamp',
  name,
  kind: 'source',
  at: [0, Y.lamp, 0],
  radius: 16,
  thickness: 18,
  // The filament is the first aperture plane. That it is imaged at the
  // condenser diaphragm and again at the objective back focal plane — and
  // never at the specimen — is the whole of what Köhler illumination means.
  conjugate: 'aperture',
  role,
  ifWrong:
    'An uneven or badly centred source gives an image bright in the middle and dim at the edges, which is then mistaken for real variation in the sample.',
});

const collector: Part = {
  id: 'collector',
  name: 'Collector lens',
  kind: 'lens',
  at: [0, Y.collector, 0],
  radius: 20,
  thickness: 7,
  role: 'Gathers light from the source and images the filament onto the condenser aperture diaphragm — the first half of what makes Köhler illumination even.',
  ifWrong:
    'Without it the filament is imaged onto the sample, and you look at a picture of the lamp with your specimen faintly behind it.',
};

const fieldDiaphragm: Part = {
  id: 'field-diaphragm',
  name: 'Field diaphragm',
  kind: 'aperture',
  at: [0, Y.fieldDiaphragm, 0],
  radius: 22,
  innerRadius: 11,
  thickness: 2,
  conjugate: 'field',
  role: 'Sets how much of the specimen is lit. It sits in a field plane, so it is conjugate with the sample and comes into focus with it.',
  ifWrong:
    'Opened wider than the field of view it lights the whole slide, and the scattered light from outside the field washes out contrast everywhere inside it.',
};

const apertureDiaphragm: Part = {
  id: 'aperture-diaphragm',
  name: 'Condenser aperture diaphragm',
  kind: 'aperture',
  at: [0, Y.apertureDiaphragm, 0],
  radius: 22,
  innerRadius: 13,
  thickness: 2,
  conjugate: 'aperture',
  role: 'Sets the angle of the illuminating cone, and therefore the condenser NA. It sits in an aperture plane, conjugate with the objective back focal plane.',
  ifWrong:
    'Closing it is the easiest contrast in microscopy and the most expensive: resolution falls with the condenser NA, and the crisp-looking image is genuinely carrying less information.',
};

const condenser: Part = {
  id: 'condenser',
  name: 'Condenser',
  kind: 'lens',
  at: [0, Y.condenser, 0],
  radius: 21,
  thickness: 12,
  role: 'Forms the illuminating cone on the specimen. Its aperture should be matched to the objective — filling about 70 to 90% of the back aperture is the usual compromise.',
  ifWrong:
    'At the wrong height the field diaphragm will not come into focus with the sample, and the illumination is no longer Köhler however well centred it looks.',
};

const specimen: Part = {
  id: 'specimen',
  name: 'Specimen',
  kind: 'sample',
  at: [0, Y.sample, 0],
  radius: 30,
  thickness: 3,
  conjugate: 'field',
  role: 'The object plane. Everything above it is imaging, everything below it is illumination, and the two halves have separate conjugate planes that never meet.',
};

const objective = (na: number, immersion: string): Part => ({
  id: 'objective',
  name: `Objective, NA ${na}`,
  kind: 'objective',
  at: [0, Y.objective, 0],
  radius: 17,
  thickness: 30,
  role: `Collects the light and does nearly all of the resolving. NA ${na} in ${immersion}; resolution goes as λ divided by twice this number, so it is the single most consequential part in the column.`,
  ifWrong:
    'Using an oil objective dry does not merely dim the image — the NA drops below 1 and the spherical aberration from the index mismatch destroys the axial resolution as well.',
});

const backFocalPlane: Part = {
  id: 'bfp',
  name: 'Objective back focal plane',
  kind: 'aperture',
  at: [0, Y.backFocalPlane, 0],
  radius: 15,
  innerRadius: 14,
  thickness: 1,
  conjugate: 'aperture',
  role: 'Where the diffraction pattern of the specimen forms, and where the condenser aperture is imaged. Phase plates, DIC prisms and the field stop of a spinning disc all live here because it is the one plane where the surround and the diffracted light are physically separated.',
};

const tubeLens: Part = {
  id: 'tube-lens',
  name: 'Tube lens',
  kind: 'lens',
  at: [0, Y.tubeLens, 0],
  radius: 18,
  thickness: 8,
  role: 'Takes the infinity-corrected beam from the objective and forms the intermediate image. The space between it and the objective is where filters and prisms can be inserted without shifting focus.',
  ifWrong:
    'Mixing an objective from one manufacturer with a tube lens from another changes the magnification from the number on the barrel, quietly, by up to 25%.',
};

const intermediateImage: Part = {
  id: 'intermediate-image',
  name: 'Intermediate image plane',
  kind: 'aperture',
  at: [0, Y.intermediateImage, 0],
  radius: 20,
  innerRadius: 19,
  thickness: 1,
  conjugate: 'field',
  role: 'The real image formed by the tube lens, and the object the eyepiece looks at. Graticules and reticles sit here because this is where they will be in focus with the specimen.',
};

const eyepiece: Part = {
  id: 'eyepiece',
  name: 'Eyepiece',
  kind: 'lens',
  at: [0, Y.eyepiece, 0],
  radius: 14,
  thickness: 16,
  role: 'Magnifies the intermediate image. The intermediate image sits inside its focal length, so the eyepiece produces a magnified virtual image rather than another real one.',
  ifWrong:
    'Empty magnification: past about 1000 times the NA, more magnification enlarges the Airy discs without separating anything, and the image gets bigger and no better.',
};

const camera: Part = {
  id: 'camera',
  name: 'Camera',
  kind: 'detector',
  at: [0, Y.detector, 0],
  radius: 22,
  thickness: 16,
  conjugate: 'field',
  role: 'A scientific CMOS or CCD sensor at a field plane. Pixel size should sample the Airy disc at least twice over, which is the Nyquist condition for not throwing away the resolution the objective just bought.',
  ifWrong:
    'Pixels too large and the resolution is lost at the sensor; too small and the same photons are spread over more pixels, costing signal to noise for nothing.',
};

/* -------------------------------------------------------------------------
 * The stand.
 *
 * An optical train on its own is a stack of discs floating in space, and a
 * student cannot map "condenser aperture diaphragm" onto the knob they are
 * about to turn. These are the parts you put your hands on. They carry no
 * light, so they are marked structural and kept out of the light-path list —
 * but they are hoverable and labelled like everything else, because "which one
 * is the coarse focus" is a real question.
 *
 * The limb sits behind the column at +Z rather than beside it, which is where
 * it is on a real stand and which makes rotating the scene worth doing: the
 * arm swings round behind the optics.
 */

const LIMB_Z = 60;

const base: Part = {
  id: 'base',
  name: 'Base',
  kind: 'body',
  structural: true,
  at: [0, -224, 10],
  box: [88, 24, 58],
  radius: 88,
  thickness: 48,
  role: 'The foot of the stand, and on a transmitted-light instrument the housing for the lamp and the collector lens. Its mass is not incidental — a light stand transmits every knock from the bench into the image.',
  ifWrong:
    'A microscope on the same bench as a centrifuge will show it at high magnification. Vibration is the reason these are heavy and the reason serious imaging goes on an isolation table.',
};

const limb: Part = {
  id: 'limb',
  name: 'Limb (arm)',
  kind: 'body',
  structural: true,
  // Reaches from the top of the base to the head, so the casting is continuous
  // rather than floating above the foot.
  at: [0, -2, LIMB_Z],
  box: [28, 202, 18],
  radius: 28,
  thickness: 404,
  role: 'The vertical casting that carries the focus mechanism and holds the head above the stage. Everything that must not move relative to anything else is bolted to this.',
};

const stage: Part = {
  id: 'stage',
  name: 'Stage',
  kind: 'body',
  structural: true,
  at: [0, -14, 4],
  box: [72, 4, 48],
  radius: 72,
  thickness: 8,
  role: 'Holds the slide, and on a mechanical stage moves it in x and y by known amounts. On an upright stand the stage moves for focus on some instruments and the nosepiece moves on others.',
  ifWrong:
    'A slide that is not flat on the stage is not perpendicular to the optical axis, so one side of the field focuses before the other — usually blamed on the objective.',
};

const focusKnob: Part = {
  id: 'focus-knob',
  name: 'Coarse and fine focus',
  kind: 'body',
  structural: true,
  at: [34, -70, LIMB_Z],
  axis: AXIS_X,
  radius: 22,
  thickness: 26,
  role: 'Coaxial knobs driving the fine mechanism that sets the distance between objective and specimen. The fine control moves a few micrometres per turn, which is the scale the depth of field is measured in.',
  ifWrong:
    'Focusing downwards onto a slide with a high-power objective drives the front lens into the coverslip. Focus down while watching from the side, then up while watching down the tube.',
};

const substage: Part = {
  id: 'substage',
  name: 'Substage condenser carrier',
  kind: 'body',
  structural: true,
  at: [0, -95, 26],
  box: [26, 34, 24],
  radius: 26,
  thickness: 68,
  role: 'The bracket that raises and lowers the condenser and carries its centring screws. Setting up Köhler illumination is almost entirely a matter of this bracket and the two diaphragms on it.',
  ifWrong:
    'Racked fully down — where it often lives, because that makes the field look evenly lit — the condenser is not imaging the field diaphragm anywhere near the specimen and the illumination is not Köhler.',
};

const nosepiece: Part = {
  id: 'nosepiece',
  name: 'Nosepiece (turret)',
  kind: 'body',
  structural: true,
  at: [0, 90, 0],
  radius: 38,
  thickness: 14,
  role: 'The revolving turret the objectives screw into. Parfocal objectives are matched so that changing magnification leaves the specimen nearly in focus; parcentric ones leave it nearly in the middle.',
  ifWrong:
    'Rotating the turret the short way round on an inverted or oil setup drags a dry objective through the immersion oil on the way past.',
};

const head: Part = {
  id: 'head',
  name: 'Head and body tube',
  kind: 'body',
  structural: true,
  at: [0, 180, 0],
  radius: 32,
  thickness: 110,
  role: 'The upper casting carrying the tube lens and splitting light between the eyepieces and the camera port. The infinity space below it is where filter cubes and prisms can be inserted without shifting focus.',
};

/** The scan head sits where an epi stand carries its cube turret. */
const CONFOCAL_STAND: Part[] = [
  base,
  limb,
  stage,
  focusKnob,
  nosepiece,
  {
    id: 'scan-head',
    name: 'Scan head',
    kind: 'body',
    structural: true,
    at: [-62, Y.dichroic, 0],
    box: [86, 24, 26],
    radius: 86,
    thickness: 48,
    role: 'The sealed box carrying the lasers, the dichroics, the galvanometer mirrors, the pinhole and the detectors. Everything in it is aligned at the factory, which is why a confocal is bought rather than assembled.',
  },
  head,
];

/** The stand for an upright transmitted-light instrument. */
const TRANSMITTED_STAND: Part[] = [base, limb, substage, stage, focusKnob, nosepiece, head];

/** An epi stand needs no substage, and gains a housing for the filter cube. */
const EPI_STAND: Part[] = [
  base,
  limb,
  stage,
  focusKnob,
  nosepiece,
  {
    id: 'cube-turret',
    name: 'Filter cube turret',
    kind: 'body',
    structural: true,
    at: [0, Y.dichroic, 0],
    box: [40, 26, 40],
    radius: 40,
    thickness: 52,
    role: 'Holds four to six filter cubes, each carrying a matched excitation filter, dichroic and emission filter, and swings the chosen one into the infinity space above the objective.',
    ifWrong:
      'Cubes are matched sets. Mixing an excitation filter from one with the dichroic of another is how excitation light ends up in the emission channel, and it is invisible until the background is unaccountably high.',
  },
  head,
];

/* -------------------------------------------------------------------------
 * Ray helpers. Rays are polylines through the correct planes — see the note at
 * the top about what is and is not claimed for them.
 * ---------------------------------------------------------------------- */

const point = (x: number, y: number, z = 0): Vec3 => [x, y, z];

/**
 * Where a ray crosses a 45° fold mirror, so the drawn vertex sits on the glass.
 *
 * The mirror surface through (0, mirrorY) with a 45° normal is the line
 * x + y = mirrorY. Solving the segment against it puts the bend exactly on the
 * mirror instead of near it, which is what lets the reflection law be checked
 * rather than eyeballed.
 *
 * NOTE THE TWO ASSUMPTIONS, both easy to walk into. This is the plane of an
 * AXIS_45_DOWN mirror centred on the optical axis. An AXIS_45 mirror has the
 * plane y − x = c instead, and a mirror out along an arm has neither — so a
 * fold at one of those has to be constructed some other way, not by reaching
 * for this.
 */
function foldOn45(from: Vec3, towards: Vec3, mirrorY: number): Vec3 {
  const dx = towards[0] - from[0];
  const dy = towards[1] - from[1];
  const denominator = dx + dy;
  const t = denominator === 0 ? 0 : (mirrorY - from[0] - from[1]) / denominator;
  return [from[0] + t * dx, from[1] + t * dy, 0];
}

/**
 * The virtual point an epi illuminator aims at, before the fold.
 *
 * Widefield epi-illumination images the source at the objective BACK FOCAL
 * PLANE, so the beam leaves the objective collimated and lights the whole
 * field evenly. The beam is therefore already converging when it reaches the
 * dichroic, and the fold simply moves where it converges. Reflecting the back
 * focal plane through the mirror gives the point the arm must aim at — which is
 * as far beyond the mirror along the arm as the back focal plane is below it.
 */
const EPI_VIRTUAL_FOCUS = point(Y.dichroic - Y.backFocalPlane, Y.dichroic);

/**
 * Where a ray goes after bouncing off a 45° mirror, travelling `runX` in x.
 *
 * Placing the vertex after a fold by hand looks right and is wrong by a few
 * degrees, which is exactly the sort of error a diagram carries indefinitely
 * because nobody can see it. Applying the reflection law here means the drawn
 * bend and the drawn mirror can never disagree.
 */
function afterFold(from: Vec3, at: Vec3, normal: Vec3, runX: number): Vec3 {
  const dx = at[0] - from[0];
  const dy = at[1] - from[1];
  const length = Math.hypot(dx, dy) || 1;
  const d = [dx / length, dy / length] as const;
  const dot = d[0] * normal[0] + d[1] * normal[1];
  const r = [d[0] - 2 * dot * normal[0], d[1] - 2 * dot * normal[1]] as const;
  const t = r[0] === 0 ? 0 : runX / r[0];
  return [at[0] + r[0] * t, at[1] + r[1] * t, 0];
}

/**
 * An imaging ray from a point on the specimen up through the column.
 *
 * `h` is the height of the object point above the axis; the ray leaves at an
 * angle, is collimated by the objective, and is brought back to a point by the
 * tube lens at the inverted image height, which is where the image inversion
 * everyone meets at the eyepiece actually happens.
 */
function imagingRay(id: string, h: number, spread: number): Ray {
  return {
    id,
    band: 'imaging',
    points: [
      point(h, Y.sample),
      point(h + spread, Y.objective),
      point(h + spread, Y.tubeLens),
      point(-h * 0.9, Y.intermediateImage),
      point(-h * 0.5, Y.eyepiece),
      point(-h * 0.35, Y.detector),
    ],
  };
}

/**
 * An illumination ray: the Köhler set.
 *
 * These leave the source, are focused by the collector into the condenser
 * aperture, and emerge from the condenser *collimated* — every point of the
 * source lights every point of the field, which is the entire trick. They then
 * come to a focus again at the objective back focal plane.
 */
function illuminationRay(id: string, h: number): Ray {
  return {
    id,
    band: 'illumination',
    points: [
      point(h, Y.lamp),
      point(h * 1.4, Y.collector),
      point(0, Y.apertureDiaphragm),
      point(-h * 1.5, Y.condenser),
      point(-h * 1.5, Y.sample),
      point(-h * 1.5, Y.objective),
      point(0, Y.backFocalPlane),
      point(h * 0.8, Y.tubeLens),
    ],
  };
}

/**
 * One epi excitation ray, from the lamp to the specimen.
 *
 * `h` is its height in the illumination arm. It folds at the dichroic, comes to
 * a focus at the objective back focal plane, and leaves the objective parallel
 * to the axis — evenly illuminating the field, which is the defining property
 * of widefield epifluorescence and the thing a confocal gives up.
 */
function epiExcitationRay(id: string, h: number): Ray {
  const from = point(X.lampArm, Y.dichroic + h);
  const fold = foldOn45(from, EPI_VIRTUAL_FOCUS, Y.dichroic);
  // Which side of the field this ray ends on: the focus at the back focal
  // plane inverts it, as any focus does.
  const width = h < 0 ? 13 : -13;
  return {
    id,
    band: 'excitation',
    points: [
      from,
      fold,
      point(0, Y.backFocalPlane),
      point(width, Y.objective),
      point(width, Y.sample),
    ],
  };
}

/**
 * One confocal emission ray, from the specimen out to the detector.
 *
 * `halfWidth` is how far off-axis it leaves the objective. The bend at the scan
 * mirror is computed from the reflection law rather than placed, so the drawn
 * fold and the drawn mirror always agree — the in-focus pair then converges on
 * the pinhole, and the out-of-focus pair, which left the objective wider,
 * arrives still spread and lands on the stop.
 */
function confocalEmissionRay(id: string, halfWidth: number, band: RayBand): Ray {
  const leavesObjective = point(halfWidth, Y.objective);
  const hitsMirror = point(halfWidth * 0.75, Y.dichroic);
  const afterMirror = afterFold(leavesObjective, hitsMirror, AXIS_45_DOWN, X.confocalArm);
  const inFocus = band === 'emission';

  return {
    id,
    band,
    points: [
      point(0, Y.sample - (inFocus ? 0 : 26)),
      leavesObjective,
      hitsMirror,
      afterMirror,
      // The pinhole lens brings the in-focus pair together on the hole; the
      // out-of-focus pair is still wide when it gets there.
      point(X.confocalArm - 28, afterMirror[1] * 0.5 + Y.dichroic * 0.5),
      inFocus
        ? point(X.confocalArm - 54, Y.dichroic)
        : point(X.confocalArm - 54, Y.dichroic + (halfWidth > 0 ? 11 : -11)),
      ...(inFocus ? [point(X.confocalArm - 84, Y.dichroic)] : []),
    ],
  };
}

/* -------------------------------------------------------------------------
 * The modalities.
 * ---------------------------------------------------------------------- */

const KOHLER_BANDS = [
  {
    band: 'illumination' as const,
    label: 'Illumination',
    description:
      'The Köhler set. Focused at the condenser aperture and at the objective back focal plane; collimated at the specimen, so every point of the lamp lights every point of the field.',
  },
  {
    band: 'imaging' as const,
    label: 'Imaging',
    description:
      'Light from the specimen. Focused at the specimen, the field diaphragm, the intermediate image and the retina — the field set, which never coincides with the aperture set.',
  },
];

const brightfield: Modality = {
  id: 'brightfield',
  name: 'Brightfield with Köhler illumination',
  shortName: 'Brightfield',
  group: 'Transmitted light',
  illumination: 'transmitted',
  summary:
    'The transmitted-light column, and the two sets of conjugate planes that run through it.',
  principle:
    'Contrast comes from absorption: stained structures take light out of the beam and appear dark. An unstained cell is almost invisible, which is the problem phase contrast and DIC exist to solve. Köhler illumination is not a technique so much as the correct way to set up any of them.',
  parts: [
    lamp(
      'Lamp',
      'A halogen or LED source. In Köhler illumination it is deliberately never imaged onto the specimen, only onto the aperture planes.',
    ),
    collector,
    fieldDiaphragm,
    apertureDiaphragm,
    condenser,
    specimen,
    objective(0.75, 'air'),
    backFocalPlane,
    tubeLens,
    intermediateImage,
    eyepiece,
    camera,
    ...TRANSMITTED_STAND,
  ],
  rays: [
    illuminationRay('illum-a', 9),
    illuminationRay('illum-b', -9),
    illuminationRay('illum-c', 4.5),
    imagingRay('image-a', 7, 11),
    imagingRay('image-b', -7, -11),
    imagingRay('image-c', 0, 13),
  ],
  bands: KOHLER_BANDS,
  optics: {
    numericalAperture: 0.75,
    refractiveIndex: 1,
    condenserNA: 0.9,
    wavelength: 550,
    gainKey: 'widefield',
  },
  caveats: [
    'The two sets of conjugate planes are the point of this diagram. Field planes — field diaphragm, specimen, intermediate image, camera — are in focus together; aperture planes — lamp filament, condenser diaphragm, objective back focal plane — are in focus together and never with the first set.',
    'The illumination rays are drawn for a single point of the filament, which is why they all cross the axis at the two aperture planes. Every other point of the source does the same thing at a different height, and between them they fill the condenser aperture — that filling is what makes the illumination even.',
    'Ray heights and lens spacings are schematic. No focal lengths are claimed and nothing is traced through a prescription.',
  ],
};

const epifluorescence: Modality = {
  id: 'epifluorescence',
  name: 'Widefield epifluorescence',
  shortName: 'Epifluorescence',
  group: 'Fluorescence',
  illumination: 'epi',
  summary: 'Excitation and emission share the objective, and a dichroic separates them.',
  principle:
    'The objective is both condenser and objective: excitation goes down it and emission comes back up it. That is what "epi" means, and it is why the separation of the two is done by a dichroic mirror rather than by geometry. Everything in the field is excited at once, so out-of-focus fluorescence lands on the detector along with the focal plane.',
  parts: [
    {
      ...lamp(
        'Arc or LED source',
        'A metal-halide, LED or mercury source. Broadband, so the excitation filter rather than the source picks the wavelength.',
      ),
      at: [X.lampArm, Y.dichroic, 0],
      axis: AXIS_X,
    },
    {
      id: 'excitation-filter',
      name: 'Excitation filter',
      kind: 'filter',
      at: [X.filterArm, Y.dichroic, 0],
      axis: AXIS_X,
      radius: 15,
      thickness: 4,
      role: 'Selects the excitation band from a broadband source. A bandpass, written as centre/width — 470/40 passes 450 to 490 nm.',
      ifWrong:
        'Too wide and it reaches into the dichroic transition, putting excitation light straight into the emission channel where it is indistinguishable from signal.',
    },
    {
      id: 'dichroic',
      name: 'Dichroic mirror',
      kind: 'dichroic',
      at: [0, Y.dichroic, 0],
      // AXIS_45_DOWN, not AXIS_45: this mirror has to turn the excitation
      // arriving along +X downwards into the objective. Facing it the other way
      // sends the excitation up to the camera, which is what it was doing.
      axis: AXIS_45_DOWN,
      radius: 20,
      thickness: 2,
      role: 'Reflects the short excitation wavelengths down into the objective and transmits the longer emission up to the detector. At 45°, so its edge wavelength shifts a little from the normal-incidence specification.',
      ifWrong:
        'An edge too close to the emission peak throws away signal; too close to the excitation band and the excitation leaks through. It is the part that makes epifluorescence possible and the part most often mismatched to the fluorophore.',
    },
    {
      id: 'emission-filter',
      name: 'Emission filter',
      kind: 'filter',
      at: [0, Y.emissionFilter, 0],
      radius: 18,
      thickness: 4,
      role: 'Passes the emission band and blocks everything else, including the excitation light the dichroic did not catch. It is the last defence, and its blocking depth sets the background.',
      ifWrong:
        'A bandpass wider than the emission gains little signal from the tail and admits the neighbouring channel in full.',
    },
    specimen,
    objective(1.4, 'oil'),
    backFocalPlane,
    tubeLens,
    intermediateImage,
    camera,
    ...EPI_STAND,
  ],
  rays: [
    // Focused at the back focal plane, collimated at the specimen: that is what
    // makes the whole field light up evenly rather than one spot. Drawing these
    // converging onto the specimen would have depicted a confocal.
    epiExcitationRay('ex-a', 9),
    epiExcitationRay('ex-b', -9),
    {
      id: 'em-a',
      band: 'emission',
      points: [
        point(0, Y.sample),
        point(11, Y.objective),
        point(11, Y.dichroic),
        point(11, Y.emissionFilter),
        point(11, Y.tubeLens),
        point(0, Y.intermediateImage),
        point(-4, Y.detector),
      ],
    },
    {
      id: 'em-b',
      band: 'emission',
      points: [
        point(0, Y.sample),
        point(-11, Y.objective),
        point(-11, Y.dichroic),
        point(-11, Y.emissionFilter),
        point(-11, Y.tubeLens),
        point(0, Y.intermediateImage),
        point(4, Y.detector),
      ],
    },
    {
      id: 'em-out-a',
      band: 'emission',
      points: [
        point(0, Y.sample - 30),
        point(17, Y.objective),
        point(17, Y.tubeLens),
        point(6, Y.intermediateImage),
        point(9, Y.detector),
      ],
    },
  ],
  bands: [
    {
      band: 'excitation',
      label: 'Excitation',
      description:
        'Down the objective, having been reflected by the dichroic. Fills the whole field, not just the focal plane.',
    },
    {
      band: 'emission',
      label: 'Emission',
      description:
        'Back up the same objective and through the dichroic. The pale path is fluorescence from outside the focal plane, which reaches the detector too.',
    },
  ],
  optics: {
    numericalAperture: 1.4,
    refractiveIndex: 1.515,
    wavelength: 520,
    gainKey: 'epifluorescence',
  },
  lightOrder: [
    'lamp',
    'excitation-filter',
    'dichroic',
    'objective',
    'specimen',
    'bfp',
    'emission-filter',
    'tube-lens',
    'intermediate-image',
    'camera',
  ],
  caveats: [
    'Out-of-focus fluorescence is the defining limitation and is drawn as the pale third emission path. Nothing in a widefield epi-fluorescence instrument removes it; that is what the confocal pinhole is for.',
    'The excitation comes to a focus at the objective back focal plane and leaves the objective parallel to the axis, which is why the whole field lights up at once rather than a spot. That is Köhler illumination again, arriving through the objective instead of a condenser.',
  ],
};

/**
 * Laser scanning confocal.
 *
 * DESCANNING is the point of this layout and the reason it is drawn the way it
 * is. The emission returns through the very same galvanometer mirrors that
 * swept the excitation out, which undoes the scan and holds the emission spot
 * stationary on a fixed pinhole. A drawing that routes the emission around the
 * mirrors — which this one did until it was checked — depicts an instrument
 * whose focused spot would sweep across the pinhole as the mirrors moved, so
 * only the middle of the field would ever get through. The dichroic therefore
 * sits upstream of the mirrors, on the laser side, and is passed twice.
 */
const confocal: Modality = {
  id: 'confocal',
  name: 'Laser scanning confocal',
  shortName: 'Confocal',
  group: 'Confocal and scanning',
  illumination: 'epi',
  summary:
    'A focused spot is scanned across the sample and a pinhole rejects everything out of focus.',
  principle:
    'Two changes from epifluorescence, and only the second matters optically. The field is ' +
    'illuminated one point at a time by a scanned laser focus, and the detector sits behind a ' +
    'pinhole in a plane conjugate with that focus. Light from above or below the focal plane ' +
    'arrives at the pinhole out of focus and is largely blocked, which is what produces optical ' +
    'sectioning. The emission comes back through the same scan mirrors, which undoes the scan and ' +
    'holds the spot still on the pinhole — without that the pinhole could not be fixed.',
  parts: [
    {
      id: 'laser',
      name: 'Laser',
      kind: 'source',
      at: [X.confocalArm, Y.sample + 52, 0],
      radius: 9,
      thickness: 26,
      conjugate: 'field',
      role: 'A single line rather than a band — 488 nm for GFP, 561 for red proteins. Delivered through a single-mode fibre whose core is the point source, which makes the laser itself the first of the three confocal planes.',
      ifWrong:
        'A line on the shoulder of the excitation spectrum costs signal in direct proportion, and no amount of detector gain gets it back — it amplifies the noise equally.',
    },
    {
      id: 'dichroic',
      name: 'Dichroic mirror',
      kind: 'dichroic',
      at: [X.confocalArm, Y.dichroic, 0],
      axis: AXIS_45,
      radius: 15,
      thickness: 2,
      role: 'Turns the laser into the scan head and lets the returning emission pass straight through to the pinhole. Passed twice, in opposite directions, and it is the only thing separating an excitation beam from an emission perhaps a millionth as bright.',
      ifWrong:
        'An edge too close to the emission peak throws away signal; too close to the laser line and the excitation leaks to the detector, where it is indistinguishable from an extremely bright sample.',
    },
    {
      id: 'scan-mirrors',
      name: 'Galvanometer scan mirrors',
      kind: 'mirror',
      at: [0, Y.dichroic, 0],
      axis: AXIS_45_DOWN,
      radius: 13,
      thickness: 2,
      conjugate: 'aperture',
      role: 'Two mirrors on galvanometers sweep the focused spot across the field in x and y, and the emission returns across the same mirrors — which undoes the sweep and holds the emission spot still on the pinhole. They sit in a plane conjugate with the objective back aperture, so the beam pivots there and the illumination cone keeps its shape as the spot moves.',
      ifWrong:
        'Scanning faster buys frame rate and spends photons per pixel: the signal falls with dwell time, so the image gets noisier rather than dimmer.',
    },
    specimen,
    objective(1.4, 'oil'),
    backFocalPlane,
    {
      id: 'pinhole-lens',
      name: 'Pinhole lens',
      kind: 'lens',
      at: [X.confocalArm - 28, Y.dichroic, 0],
      axis: AXIS_X,
      radius: 12,
      thickness: 6,
      role: 'Focuses the descanned emission onto the pinhole. It is this lens that makes the pinhole plane conjugate with the illuminated focus in the specimen.',
    },
    {
      id: 'pinhole',
      name: 'Confocal pinhole',
      kind: 'pinhole',
      at: [X.confocalArm - 54, Y.dichroic, 0],
      axis: AXIS_X,
      radius: 16,
      innerRadius: 3,
      thickness: 2,
      conjugate: 'field',
      role: 'The part that makes it confocal. In a plane conjugate with the illuminated focus, so in-focus light passes and out-of-focus light arrives spread out and is mostly blocked. Sized in Airy units — one Airy unit matches the Airy disc diameter.',
      ifWrong:
        'Closed below one Airy unit it buys a little lateral resolution, up to √2, at a steep cost in signal. Opened past about two it stops sectioning and the instrument becomes a slow widefield microscope.',
    },
    {
      id: 'pmt',
      name: 'PMT or GaAsP detector',
      kind: 'detector',
      at: [X.confocalArm - 84, Y.dichroic, 0],
      axis: AXIS_X,
      radius: 16,
      thickness: 20,
      role: 'A point detector, because at any instant there is only one illuminated point to measure. GaAsP has roughly twice the quantum efficiency of a classical PMT in the green, which is why it displaced it.',
      ifWrong:
        'Gain is not signal. Turning it up brightens the display and amplifies shot noise with it; more photons come only from more laser, longer dwell, or a better dye.',
    },
    ...CONFOCAL_STAND,
  ],
  rays: [
    {
      id: 'ex-a',
      band: 'excitation',
      points: [
        point(X.confocalArm, Y.sample + 52),
        point(X.confocalArm, Y.dichroic),
        point(0, Y.dichroic),
        point(0, Y.objective),
        point(0, Y.sample),
      ],
    },
    {
      // The same beam a moment later, with the mirrors turned: the focus has
      // moved across the field and the beam still fills the back aperture.
      id: 'ex-scan',
      band: 'excitation',
      mirrorMoved: true,
      points: [
        point(X.confocalArm, Y.dichroic),
        point(0, Y.dichroic),
        point(11, Y.objective),
        point(7, Y.sample),
      ],
    },
    confocalEmissionRay('em-focal-a', 12, 'emission'),
    confocalEmissionRay('em-focal-b', -12, 'emission'),
    // Out of focus: arrives at the pinhole plane still spread, and stops on the
    // stop around the hole rather than passing through it.
    confocalEmissionRay('em-out-a', 19, 'surround'),
    confocalEmissionRay('em-out-b', -19, 'surround'),
  ],
  bands: [
    {
      band: 'excitation',
      label: 'Excitation',
      description:
        'A laser focused to a diffraction-limited spot and swept across the field by the scan mirrors. Two positions of the same beam are drawn.',
    },
    {
      band: 'emission',
      label: 'In-focus emission',
      description:
        'Back through the same mirrors, which undoes the scan and holds the spot still on the pinhole, then through it to the detector.',
    },
    {
      band: 'surround',
      label: 'Out-of-focus emission',
      description:
        'Arrives at the pinhole plane spread out rather than focused, so most of it strikes the stop around the hole. That rejection is the optical sectioning.',
    },
  ],
  optics: {
    numericalAperture: 1.4,
    refractiveIndex: 1.515,
    wavelength: 520,
    gainKey: 'confocal',
  },
  lightOrder: [
    'laser',
    'dichroic',
    'scan-mirrors',
    'objective',
    'specimen',
    'bfp',
    'pinhole-lens',
    'pinhole',
    'pmt',
  ],
  caveats: [
    'The three confocal planes are the laser point source, the illuminated spot in the specimen and the pinhole. They are conjugate with one another, which is what the name means, and it is why the emission has to be descanned before it reaches the pinhole.',
    'A real scan head also carries a scan lens and a tube lens between the mirrors and the objective, kept out here so the pivot at the mirrors stays readable. The out-of-focus paths are drawn stopping at the pinhole plane; in an instrument a little of that light does get through, so sectioning is a strong suppression rather than a clean cut.',
  ],
};

const phaseContrast: Modality = {
  id: 'phase-contrast',
  name: 'Phase contrast',
  shortName: 'Phase contrast',
  group: 'Transmitted light',
  illumination: 'transmitted',
  summary:
    'A quarter-wave shift at the back focal plane turns an invisible phase object into a visible one.',
  principle:
    'A transparent cell retards light passing through it by a fraction of a wavelength but absorbs almost nothing, so it is invisible. Phase contrast splits the light at the back focal plane into the undiffracted surround, which passed the specimen untouched, and the diffracted light carrying the specimen information. Shifting one relative to the other by a quarter wave turns a phase difference the eye cannot see into an amplitude difference it can.',
  parts: [
    lamp(
      'Lamp',
      'An ordinary transmitted-light source. Phase contrast needs no special illumination beyond the annulus.',
    ),
    collector,
    fieldDiaphragm,
    {
      id: 'condenser-annulus',
      name: 'Condenser annulus',
      kind: 'aperture',
      at: [0, Y.apertureDiaphragm, 0],
      radius: 22,
      innerRadius: 15,
      thickness: 2,
      conjugate: 'aperture',
      role: 'A ring-shaped stop that lights the specimen with a hollow cone rather than a solid one. It must be matched to the phase plate in the objective — Ph1 with Ph1 — and the two are aligned by looking down the tube with a phase telescope.',
      ifWrong:
        'A mismatched or uncentred annulus puts the surround light onto the clear part of the phase plate, and the contrast simply disappears while everything still looks illuminated.',
    },
    condenser,
    specimen,
    objective(0.75, 'air'),
    {
      id: 'phase-plate',
      name: 'Phase plate',
      kind: 'filter',
      at: [0, Y.backFocalPlane, 0],
      radius: 15,
      innerRadius: 9.5,
      thickness: 2,
      conjugate: 'aperture',
      role: 'An etched ring at the back focal plane, conjugate with the condenser annulus, so the undiffracted surround falls exactly on it. It advances that surround by a quarter wave and attenuates it, typically to a few per cent, while the diffracted light passes through the clear part untouched.',
      ifWrong:
        'The attenuation is as important as the phase step: without it the surround is so much brighter than the diffracted light that the interference between them is negligible and nothing appears.',
    },
    tubeLens,
    intermediateImage,
    eyepiece,
    camera,
    ...TRANSMITTED_STAND,
  ],
  rays: [
    {
      id: 'surround-a',
      band: 'surround',
      points: [
        point(16, Y.apertureDiaphragm),
        point(9, Y.condenser),
        point(-4, Y.sample),
        point(-12, Y.objective),
        point(-12, Y.backFocalPlane),
        point(-6, Y.tubeLens),
        point(0, Y.intermediateImage),
        point(3, Y.detector),
      ],
    },
    {
      id: 'surround-b',
      band: 'surround',
      points: [
        point(-16, Y.apertureDiaphragm),
        point(-9, Y.condenser),
        point(4, Y.sample),
        point(12, Y.objective),
        point(12, Y.backFocalPlane),
        point(6, Y.tubeLens),
        point(0, Y.intermediateImage),
        point(-3, Y.detector),
      ],
    },
    {
      id: 'diffracted-a',
      band: 'diffracted',
      points: [
        point(0, Y.sample),
        point(4, Y.objective),
        point(2, Y.backFocalPlane),
        point(1, Y.tubeLens),
        point(0, Y.intermediateImage),
        point(-1, Y.detector),
      ],
    },
    {
      id: 'diffracted-b',
      band: 'diffracted',
      points: [
        point(0, Y.sample),
        point(-4, Y.objective),
        point(-2, Y.backFocalPlane),
        point(-1, Y.tubeLens),
        point(0, Y.intermediateImage),
        point(1, Y.detector),
      ],
    },
  ],
  bands: [
    {
      band: 'surround',
      label: 'Surround (S)',
      description:
        'Undiffracted light that missed the specimen. Travels the hollow cone from the annulus and lands exactly on the phase ring, where it is advanced a quarter wave and dimmed.',
    },
    {
      band: 'diffracted',
      label: 'Diffracted (D)',
      description:
        'Light scattered by the specimen, already retarded by about a quarter wave by the sample itself. Passes through the clear part of the plate, so the two arrive at the image half a wave apart and interfere destructively.',
    },
  ],
  optics: {
    numericalAperture: 0.75,
    refractiveIndex: 1,
    condenserNA: 0.55,
    wavelength: 550,
    gainKey: 'phase-contrast',
  },
  caveats: [
    'The annulus costs condenser NA, which is why the resolution figure below is worse than the same objective in brightfield. Contrast is bought with resolution here, explicitly.',
    'The halo around phase objects is not an artefact of alignment but a consequence of the method: the phase ring is finite, so some diffracted light passes through it and some surround misses it.',
  ],
};

const dic: Modality = {
  id: 'dic',
  name: 'Differential interference contrast',
  shortName: 'DIC',
  group: 'Transmitted light',
  illumination: 'transmitted',
  summary: 'Two sheared beams interfere, so the image reports the gradient of optical path.',
  principle:
    'Polarised light is split by a Wollaston prism into two beams a fraction of a micrometre apart at the specimen — less than the resolution limit, so they sample essentially the same point. Whatever difference in optical path they pick up between those two points is converted by a second prism and an analyser into intensity. The image therefore shows the rate of change of optical path along the shear direction, which is what gives DIC its shadowed, relief-like appearance.',
  parts: [
    lamp('Lamp', 'An ordinary transmitted-light source, polarised immediately after it.'),
    collector,
    fieldDiaphragm,
    {
      id: 'polariser',
      name: 'Polariser',
      kind: 'polariser',
      at: [0, (Y.fieldDiaphragm + Y.apertureDiaphragm) / 2, 0],
      radius: 21,
      thickness: 3,
      role: 'Linearly polarises the illumination at 45° to the shear direction, so the Wollaston splits it into two equal components.',
      ifWrong:
        'At any other angle the two sheared beams have unequal amplitude, they no longer cancel at the analyser, and the background never goes properly dark.',
    },
    {
      id: 'condenser-prism',
      name: 'Wollaston prism (condenser)',
      kind: 'prism',
      at: [0, Y.apertureDiaphragm, 0],
      radius: 20,
      thickness: 8,
      conjugate: 'aperture',
      role: 'Splits the polarised beam into ordinary and extraordinary rays travelling at a slight angle to one another. The condenser turns that angle into a small lateral separation — the shear — at the specimen.',
      ifWrong:
        'The shear must be below the resolution limit, or the image shows two displaced copies of the specimen rather than its gradient.',
    },
    condenser,
    specimen,
    objective(1.4, 'oil'),
    {
      id: 'objective-prism',
      name: 'Wollaston prism (objective)',
      kind: 'prism',
      at: [0, Y.backFocalPlane, 0],
      radius: 15,
      thickness: 8,
      conjugate: 'aperture',
      role: 'Recombines the two beams at the back focal plane. Sliding it along the shear direction adds a uniform bias retardation, which is the knob that sets DIC from dark background to the familiar grey relief.',
      ifWrong:
        'The two prisms must be matched to each other and to the objective. A mismatched pair cannot be nulled and the background stays bright whatever the bias.',
    },
    {
      id: 'analyser',
      name: 'Analyser',
      kind: 'polariser',
      at: [0, Y.emissionFilter, 0],
      radius: 18,
      thickness: 3,
      role: 'Crossed with the polariser. Where the two recombined beams are still in phase they reconstitute the original polarisation and are blocked; where the specimen retarded one of them, the recombination is elliptical and a component gets through.',
      ifWrong:
        'Anything birefringent between the polarisers — a plastic dish, a strained coverslip — rotates the polarisation and ruins the extinction. This is why DIC does not work through plastic.',
    },
    tubeLens,
    intermediateImage,
    eyepiece,
    camera,
    ...TRANSMITTED_STAND,
  ],
  rays: [
    {
      id: 'ordinary',
      band: 'ordinary',
      points: [
        point(0, (Y.fieldDiaphragm + Y.apertureDiaphragm) / 2),
        point(0, Y.apertureDiaphragm),
        point(-7, Y.condenser),
        point(-2.5, Y.sample),
        point(-7, Y.objective),
        point(0, Y.backFocalPlane),
        point(0, Y.emissionFilter),
        point(0, Y.tubeLens),
        point(0, Y.intermediateImage),
        point(0, Y.detector),
      ],
    },
    {
      id: 'extraordinary',
      band: 'extraordinary',
      points: [
        point(0, (Y.fieldDiaphragm + Y.apertureDiaphragm) / 2),
        point(0, Y.apertureDiaphragm),
        point(7, Y.condenser),
        point(2.5, Y.sample),
        point(7, Y.objective),
        point(0, Y.backFocalPlane),
        point(0, Y.emissionFilter),
        point(0, Y.tubeLens),
        point(0, Y.intermediateImage),
        point(0, Y.detector),
      ],
    },
    {
      id: 'imaging-a',
      band: 'imaging',
      points: [
        point(0, Y.emissionFilter),
        point(11, Y.tubeLens),
        point(-5, Y.intermediateImage),
        point(-3, Y.detector),
      ],
    },
    {
      id: 'imaging-b',
      band: 'imaging',
      points: [
        point(0, Y.emissionFilter),
        point(-11, Y.tubeLens),
        point(5, Y.intermediateImage),
        point(3, Y.detector),
      ],
    },
  ],
  bands: [
    {
      band: 'ordinary',
      label: 'Ordinary ray (O)',
      description:
        'One of the two polarisation components split by the first Wollaston. Travels through one point of the specimen.',
    },
    {
      band: 'extraordinary',
      label: 'Extraordinary ray (E)',
      description:
        'The orthogonal component, sheared by a fraction of a micrometre so it samples a neighbouring point. The path difference between the two is what forms the image.',
    },
    {
      band: 'imaging',
      label: 'After the analyser',
      description:
        'What survives the crossed analyser: only where O and E recombined out of phase.',
    },
  ],
  optics: {
    numericalAperture: 1.4,
    refractiveIndex: 1.515,
    condenserNA: 0.9,
    wavelength: 550,
    gainKey: 'dic',
  },
  caveats: [
    'The shear between the two rays is drawn far larger than life. In a real instrument it is a fraction of a micrometre — below the resolution limit, which is precisely the condition for the image to report a gradient rather than a double image.',
    'DIC is directional. Structures running along the shear axis show no contrast at all, which is why the stage or the prism is rotated rather than the specimen being blamed.',
  ],
};

/* -------------------------------------------------------------------------
 * TIRF.
 *
 * Checked against microscopyu's TIRF article, which settles the two things a
 * drawing of this can get wrong. First, the laser focus in the objective's rear
 * focal plane is OFF AXIS, and its radial distance is what sets the angle at
 * the coverslip — move it out and the angle steepens. Second, illumination is
 * confined to an annulus, because any light through the middle of the aperture
 * leaves at a sub-critical angle and simply epi-illuminates the specimen,
 * putting exactly the out-of-focus background TIRF exists to avoid back into
 * the image.
 * ---------------------------------------------------------------------- */

/**
 * One TIRF excitation ray, constructed backwards from where it must arrive.
 *
 * `bfpX` is the off-axis distance at the back focal plane — the quantity that
 * sets the incidence angle. The height of the ray in the arm is then SOLVED so
 * that it also passes through the open ring of the annular stop rather than
 * through its blocked centre. Both are computed for the same reason the epi
 * folds are: a diagram whose stop blocks the ray it is drawn passing is a
 * diagram disagreeing with itself, and nobody spots it by eye.
 */
function tirfExcitationRay(id: string, bfpX: number, stopHeight: number): Ray {
  // The mirror image of the real focus through the 45° plane x + y = Y.dichroic
  // is (c − y, c − x), so the arm aims here and the fold lands on the glass.
  const virtual = point(Y.dichroic - Y.backFocalPlane, Y.dichroic - bfpX);
  const f = (X.tirfStop - X.lampArm) / (virtual[0] - X.lampArm);
  const yArm = (Y.dichroic + stopHeight - f * virtual[1]) / (1 - f);
  const from = point(X.lampArm, yArm);
  return {
    id,
    band: 'excitation',
    points: [
      from,
      foldOn45(from, virtual, Y.dichroic),
      point(bfpX, Y.backFocalPlane),
      // Out to the rim of the aperture, then steeply down onto one spot: the
      // hollow cone that strikes the coverslip past the critical angle.
      point(Math.sign(bfpX) * 17, Y.objective),
      point(0, Y.sample),
    ],
  };
}

const tirf: Modality = {
  id: 'tirf',
  name: 'Total internal reflection fluorescence',
  shortName: 'TIRF',
  group: 'Fluorescence',
  illumination: 'epi',
  summary: 'Excitation past the critical angle, so only the first 100 nm of the specimen is lit.',
  principle:
    'The laser is brought into the objective off-axis and leaves it steeply enough to reflect ' +
    'totally off the coverslip–specimen interface rather than crossing it. No propagating light ' +
    'enters the specimen at all; what excites the fluorophores is the evanescent field, which ' +
    'decays exponentially and is spent within about a hundred nanometres. The optical section is ' +
    'therefore roughly a tenth of a confocal one, and it is obtained by not exciting the ' +
    'background rather than by rejecting it afterwards.',
  parts: [
    {
      ...lamp(
        'Laser',
        'A single line, delivered collimated. TIRF needs a source that can be focused to a small spot at a chosen radius in the back aperture, which an arc lamp cannot do without throwing nearly all of it away.',
      ),
      id: 'laser',
      at: [X.lampArm, Y.dichroic, 0],
      axis: AXIS_X,
    },
    {
      id: 'excitation-filter',
      name: 'Excitation filter',
      kind: 'filter',
      at: [X.filterArm, Y.dichroic, 0],
      axis: AXIS_X,
      radius: 14,
      thickness: 4,
      role: 'Cleans up the laser line. Even a single-line laser carries plasma emission and Raman light from the delivery fibre, and at the signal levels TIRF is used for that is not negligible.',
    },
    {
      id: 'tirf-stop',
      name: 'TIRF annulus',
      kind: 'aperture',
      at: [X.tirfStop, Y.dichroic, 0],
      axis: AXIS_X,
      radius: 16,
      innerRadius: 8,
      thickness: 2,
      conjugate: 'aperture',
      role: 'Blocks the middle of the beam so only a ring reaches the outer edge of the back aperture. Light through the centre would leave the objective below the critical angle and epi-illuminate the specimen, which is precisely the background TIRF exists to avoid. It sits in a plane conjugate with the back focal plane, because the real one is inside the objective and cannot be reached.',
      ifWrong:
        'On a slider in practice, so the same instrument switches between TIRF and widefield. Left half in, the image is a TIRF image with a widefield haze over it, and the contrast is blamed on the sample.',
    },
    {
      id: 'dichroic',
      name: 'Dichroic mirror',
      kind: 'dichroic',
      at: [0, Y.dichroic, 0],
      axis: AXIS_45_DOWN,
      radius: 20,
      thickness: 2,
      role: 'Turns the excitation down into the objective and passes the emission up to the camera. The same part as in any epifluorescence cube, doing the same job on a beam that happens to be off-axis.',
    },
    {
      id: 'emission-filter',
      name: 'Emission filter',
      kind: 'filter',
      at: [0, Y.emissionFilter, 0],
      radius: 18,
      thickness: 4,
      role: 'Passes the emission and blocks the excitation. Its blocking depth matters more here than in widefield, because single molecules are routinely the thing being counted and the laser is intense.',
    },
    specimen,
    // Above 1.45 by necessity, not ambition: the objective has to deliver an
    // angle whose sine exceeds the specimen's refractive index divided by the
    // glass's, and a 1.4 NA lens can only just do it.
    objective(1.49, 'oil'),
    backFocalPlane,
    tubeLens,
    intermediateImage,
    camera,
    ...EPI_STAND,
  ],
  rays: [
    tirfExcitationRay('ex-a', 12, 10),
    tirfExcitationRay('ex-b', -12, -10),
    {
      id: 'em-a',
      band: 'emission',
      points: [
        point(0, Y.sample),
        point(11, Y.objective),
        point(11, Y.dichroic),
        point(11, Y.emissionFilter),
        point(11, Y.tubeLens),
        point(0, Y.intermediateImage),
        point(-4, Y.detector),
      ],
    },
    {
      id: 'em-b',
      band: 'emission',
      points: [
        point(0, Y.sample),
        point(-11, Y.objective),
        point(-11, Y.dichroic),
        point(-11, Y.emissionFilter),
        point(-11, Y.tubeLens),
        point(0, Y.intermediateImage),
        point(4, Y.detector),
      ],
    },
  ],
  bands: [
    {
      band: 'excitation',
      label: 'Excitation',
      description:
        'A hollow cone, focused off-axis at the back focal plane and striking the coverslip past the critical angle. The further out the focus, the steeper the angle and the shallower the field.',
    },
    {
      band: 'emission',
      label: 'Emission',
      description:
        'Back up the objective as in any epi instrument. There is no out-of-focus path drawn because there is almost nothing out of focus to emit.',
    },
  ],
  optics: {
    numericalAperture: 1.49,
    refractiveIndex: 1.515,
    wavelength: 520,
    gainKey: 'tirf',
  },
  lightOrder: [
    'laser',
    'excitation-filter',
    'tirf-stop',
    'dichroic',
    'objective',
    'specimen',
    'bfp',
    'emission-filter',
    'tube-lens',
    'intermediate-image',
    'camera',
  ],
  caveats: [
    'The incidence angle is drawn far shallower than life. Total internal reflection at a glass–water interface needs about 61° from the normal and TIRF is usually run steeper still; at that angle on this scale the rays would leave the objective entirely. What is drawn faithfully is the thing that matters — that the focus is off-axis at the back focal plane, and that moving it further out steepens the angle.',
    'The totally internally reflected beam is not drawn. It returns down through the objective and out of the instrument, and following it would say nothing the interface does not: no propagating light crosses into the specimen at all.',
    'The evanescent field itself cannot be drawn as a ray, because it does not propagate. It is a standing disturbance at the interface whose intensity falls exponentially with distance, and its depth is set by the wavelength, the two refractive indices and the angle.',
  ],
};

/* -------------------------------------------------------------------------
 * Spinning disc.
 *
 * Two discs on one shaft with the dichroic between them, which is the Yokogawa
 * CSU arrangement described in Tanaami 2002. The microlens disc concentrates
 * the laser into each pinhole of the Nipkow disc below it — without it, the
 * pinholes pass a percent or two of the light and the technique is unusable on
 * anything dim. The emission returns through the SAME pinholes, so each one is
 * both illumination aperture and detection pinhole, which is what makes it
 * confocal rather than merely patterned.
 * ---------------------------------------------------------------------- */

const spinningDisc: Modality = {
  id: 'spinning-disc',
  name: 'Spinning disc confocal',
  shortName: 'Spinning disc',
  group: 'Confocal and scanning',
  illumination: 'epi',
  summary: 'Thousands of pinholes on a spinning disc, sectioning a whole field at camera speed.',
  principle:
    'A point-scanning confocal builds an image one pixel at a time, which sets a hard ceiling on ' +
    'speed and puts the entire dose into each point in turn. A spinning disc drills the same ' +
    'pinhole array into a rotating disc and uses thousands of them at once, so the field is ' +
    'covered in a fraction of a rotation and read out by a camera rather than a point detector. ' +
    'The sectioning comes from the same pinhole geometry; what changes is that it is parallel.',
  parts: [
    {
      ...lamp(
        'Laser',
        'Expanded to fill the microlens disc rather than focused to a point. Every microlens needs its own share of the beam, so the illumination is spread across the whole disc instead of concentrated.',
      ),
      id: 'laser',
      at: [X.lampArm, Y.dichroic, 0],
      axis: AXIS_X,
    },
    {
      id: 'microlens-disc',
      name: 'Microlens disc',
      kind: 'lens',
      at: [X.filterArm, Y.dichroic, 0],
      axis: AXIS_X,
      radius: 17,
      thickness: 5,
      role: 'About twenty thousand small lenses, one above each pinhole of the disc below, each concentrating its share of the beam into its own hole. Without it a Nipkow disc transmits a few per cent of the light and the technique is limited to bright specimens.',
      ifWrong:
        'The two discs are on one shaft and must stay registered. A microlens array out of alignment with its pinholes throws away the light it exists to save, and the symptom is simply a dim image.',
    },
    {
      id: 'dichroic',
      name: 'Dichroic mirror',
      kind: 'dichroic',
      at: [0, Y.dichroic, 0],
      axis: AXIS_45_DOWN,
      radius: 20,
      thickness: 2,
      role: 'Sits between the two discs, reflecting the focused excitation down onto the pinhole disc and transmitting the emission that comes back up through the same holes. Its position between the discs is what lets one pinhole array serve both directions.',
    },
    {
      id: 'pinhole-disc',
      name: 'Nipkow pinhole disc',
      kind: 'pinhole',
      at: [0, Y.backFocalPlane + 16, 0],
      radius: 20,
      innerRadius: 4,
      thickness: 2,
      conjugate: 'field',
      role: 'A disc of some twenty thousand pinholes laid out in interleaved spirals, so that one rotation sweeps every hole across the whole field evenly. Each hole illuminates one point and admits the light returning from that same point, which is what makes the arrangement confocal.',
      ifWrong:
        'Pinhole spacing is a compromise made at the factory and not adjustable. Too close together and light from one hole reaches its neighbours, which is the crosstalk that costs a spinning disc its sectioning in thick specimens; too far apart and the field is covered too slowly.',
    },
    {
      id: 'emission-filter',
      name: 'Emission filter',
      kind: 'filter',
      at: [0, Y.emissionFilter, 0],
      radius: 18,
      thickness: 4,
      role: 'Passes the emission and blocks the excitation, as in any fluorescence instrument. It sits above the dichroic, so everything reaching it has already been through the pinhole disc twice.',
    },
    specimen,
    objective(1.4, 'oil'),
    backFocalPlane,
    tubeLens,
    intermediateImage,
    {
      ...camera,
      role: 'A scientific CMOS or an EMCCD. The disc produces a whole sectioned image at once, so unlike a point-scanning confocal this instrument wants an imaging sensor — and that is where the speed comes from.',
    },
    ...EPI_STAND,
  ],
  rays: [
    // Three pinholes, three focused spots. The multipoint character is the
    // whole difference from a point-scanning instrument, so it is drawn.
    ...[-9, 0, 9].map((offset, index) => {
      const virtual = point(Y.dichroic - (Y.backFocalPlane + 16), Y.dichroic - offset);
      const from = point(X.lampArm, Y.dichroic + offset * 1.6);
      return {
        id: `ex-${index}`,
        band: 'excitation' as const,
        points: [
          from,
          foldOn45(from, virtual, Y.dichroic),
          point(offset, Y.backFocalPlane + 16),
          point(offset * 1.5, Y.objective),
          point(offset * 0.6, Y.sample),
        ],
      };
    }),
    {
      id: 'em-a',
      band: 'emission',
      points: [
        point(0, Y.sample),
        point(10, Y.objective),
        point(3, Y.backFocalPlane + 16),
        point(10, Y.dichroic),
        point(10, Y.emissionFilter),
        point(10, Y.tubeLens),
        point(0, Y.intermediateImage),
        point(-4, Y.detector),
      ],
    },
    {
      id: 'em-b',
      band: 'emission',
      points: [
        point(0, Y.sample),
        point(-10, Y.objective),
        point(-3, Y.backFocalPlane + 16),
        point(-10, Y.dichroic),
        point(-10, Y.emissionFilter),
        point(-10, Y.tubeLens),
        point(0, Y.intermediateImage),
        point(4, Y.detector),
      ],
    },
    // Out of focus: arrives at the disc spread across the stop between holes.
    {
      id: 'em-out-a',
      band: 'surround',
      points: [point(0, Y.sample - 28), point(16, Y.objective), point(14, Y.backFocalPlane + 16)],
    },
    {
      id: 'em-out-b',
      band: 'surround',
      points: [point(0, Y.sample - 28), point(-16, Y.objective), point(-14, Y.backFocalPlane + 16)],
    },
  ],
  bands: [
    {
      band: 'excitation',
      label: 'Excitation',
      description:
        'Concentrated by a microlens into each pinhole and focused to a spot in the specimen. Three of some twenty thousand are drawn.',
    },
    {
      band: 'emission',
      label: 'In-focus emission',
      description:
        'Back up through the same pinhole that lit the point, then through the dichroic to the camera. One hole serves as both illumination aperture and detection pinhole.',
    },
    {
      band: 'surround',
      label: 'Out-of-focus emission',
      description:
        'Arrives at the disc spread out and mostly lands on the metal between the holes. Some of it finds a neighbouring hole, which is the crosstalk a single pinhole cannot suffer.',
    },
  ],
  optics: {
    numericalAperture: 1.4,
    refractiveIndex: 1.515,
    wavelength: 520,
    gainKey: 'spinning-disc',
  },
  lightOrder: [
    'laser',
    'microlens-disc',
    'dichroic',
    'pinhole-disc',
    'objective',
    'specimen',
    'bfp',
    'emission-filter',
    'tube-lens',
    'intermediate-image',
    'camera',
  ],
  caveats: [
    'Three pinholes are drawn out of roughly twenty thousand, and the disc is drawn edge-on as a single aperture. The array is laid out in interleaved spirals so that a fraction of a rotation sweeps the holes evenly over the whole field, which is the part a static drawing cannot show at all.',
    'The relay optics between the disc and the objective are omitted, as they are for the point-scanning confocal. The pinhole disc is drawn just above the back focal plane for room; in the instrument it sits in a field plane properly conjugate with the specimen.',
  ],
};

/* -------------------------------------------------------------------------
 * Structured illumination.
 *
 * The distinguishing geometry is at the back focal plane: a grating splits the
 * beam and the orders are focused at SEPARATE points across the aperture, not
 * at one. They leave the objective as separate plane waves, and it is their
 * interference at the specimen that lays down the fringe pattern. Drawing a
 * single focus at the centre would be drawing widefield epifluorescence with a
 * grating drawn in for decoration.
 * ---------------------------------------------------------------------- */

const sim: Modality = {
  id: 'sim',
  name: 'Structured illumination microscopy',
  shortName: 'SIM',
  group: 'Super-resolution',
  illumination: 'epi',
  summary: 'A fringe pattern beats against the specimen, folding fine detail into the passband.',
  principle:
    'The objective cannot collect spatial frequencies above its cutoff, so that detail never ' +
    'reaches the image. Illuminating with a fine fringe pattern instead of evenly makes the ' +
    'specimen and the pattern beat together, and the resulting moiré is coarse enough to be ' +
    'collected — it carries the fine detail with it, disguised. Because the pattern is itself ' +
    'formed by the same objective it can be no finer than the cutoff, which is exactly why the ' +
    'method gains a factor of two and not more.',
  parts: [
    {
      ...lamp(
        'Laser',
        'Coherent by necessity rather than for brightness: the fringe pattern is an interference pattern, and an incoherent source cannot produce one with the contrast the reconstruction needs.',
      ),
      id: 'laser',
      at: [X.lampArm, Y.dichroic, 0],
      axis: AXIS_X,
    },
    {
      id: 'grating',
      name: 'Grating or SLM',
      kind: 'aperture',
      at: [X.filterArm, Y.dichroic, 0],
      axis: AXIS_X,
      radius: 15,
      innerRadius: 3,
      thickness: 3,
      role: 'Splits the beam into a zero order and a pair of first orders. A physical grating on a rotation stage in the first instruments, a ferroelectric spatial light modulator in current ones, because the pattern must be rotated and shifted between exposures faster than the specimen moves.',
      ifWrong:
        'The pattern must be recorded at three orientations and at least three phases each, so nine raw frames make one reconstructed image. Anything that moves between them — the specimen, the stage, the pattern itself — reconstructs as a periodic artefact that looks convincingly like structure.',
    },
    {
      id: 'dichroic',
      name: 'Dichroic mirror',
      kind: 'dichroic',
      at: [0, Y.dichroic, 0],
      axis: AXIS_45_DOWN,
      radius: 20,
      thickness: 2,
      role: 'Turns the diffracted orders down into the objective and passes the emission up. It has to be flat to a small fraction of a wavelength, because a phase error here distorts the fringe pattern and the reconstruction believes the distortion.',
    },
    {
      id: 'emission-filter',
      name: 'Emission filter',
      kind: 'filter',
      at: [0, Y.emissionFilter, 0],
      radius: 18,
      thickness: 4,
      role: 'Passes the emission and blocks the excitation. Standard for a fluorescence instrument, and unremarkable except that the reconstruction is sensitive to background, so its blocking matters.',
    },
    specimen,
    objective(1.49, 'oil'),
    backFocalPlane,
    tubeLens,
    intermediateImage,
    {
      ...camera,
      role: 'Records the raw frames the reconstruction consumes — nine for a plane in two dimensions, fifteen for three. What the eye is eventually shown is computed, not captured, and no single frame on this sensor looks like the result.',
    },
    ...EPI_STAND,
  ],
  rays: [
    // The three orders, focused at three separate points across the aperture.
    // They emerge as separate plane waves and interfere at the specimen; that
    // interference is the fringe pattern, and it is the whole technique.
    ...[
      { id: 'ex-plus', bfpX: 13 },
      { id: 'ex-zero', bfpX: 0 },
      { id: 'ex-minus', bfpX: -13 },
    ].map(({ id, bfpX }) => {
      const virtual = point(Y.dichroic - Y.backFocalPlane, Y.dichroic - bfpX);
      const from = point(X.lampArm, Y.dichroic + bfpX * 1.5);
      return {
        id,
        band: 'excitation' as const,
        points: [
          from,
          foldOn45(from, virtual, Y.dichroic),
          point(bfpX, Y.backFocalPlane),
          point(bfpX * 1.15, Y.objective),
          point(0, Y.sample),
        ],
      };
    }),
    {
      id: 'em-a',
      band: 'emission',
      points: [
        point(0, Y.sample),
        point(12, Y.objective),
        point(12, Y.dichroic),
        point(12, Y.emissionFilter),
        point(12, Y.tubeLens),
        point(0, Y.intermediateImage),
        point(-4, Y.detector),
      ],
    },
    {
      id: 'em-b',
      band: 'emission',
      points: [
        point(0, Y.sample),
        point(-12, Y.objective),
        point(-12, Y.dichroic),
        point(-12, Y.emissionFilter),
        point(-12, Y.tubeLens),
        point(0, Y.intermediateImage),
        point(4, Y.detector),
      ],
    },
  ],
  bands: [
    {
      band: 'excitation',
      label: 'Excitation orders',
      description:
        'Zero and ±1 orders from the grating, focused at separate points across the back focal plane. They leave the objective as separate plane waves and interfere at the specimen to lay down the fringes.',
    },
    {
      band: 'emission',
      label: 'Emission',
      description:
        'Ordinary widefield emission. Nothing about the collection side is special — the resolution is won in the illumination and recovered in the reconstruction.',
    },
  ],
  optics: {
    numericalAperture: 1.49,
    refractiveIndex: 1.515,
    wavelength: 520,
    gainKey: 'sim',
  },
  lightOrder: [
    'laser',
    'grating',
    'dichroic',
    'objective',
    'specimen',
    'bfp',
    'emission-filter',
    'tube-lens',
    'intermediate-image',
    'camera',
  ],
  caveats: [
    'The fringe pattern itself is not drawn. It exists only where the orders overlap at the specimen, it is finer than anything else on this diagram, and it has to be rotated and stepped between exposures — none of which a single static ray diagram carries.',
    'The factor of two is a ceiling, not a measurement. It follows from the pattern being formed by the same objective that collects the image, so the finest fringes available are already at the cutoff. Saturating the fluorophores breaks that limit and goes further, at a dose that rules out most living specimens.',
    'What the instrument records is nine or fifteen raw frames of fringed fluorescence. The image is computed from them, so a reconstruction artefact is a plausible-looking structure rather than obvious noise, and controls matter more here than in a technique that photographs what it sees.',
  ],
};

/* -------------------------------------------------------------------------
 * STED.
 *
 * A confocal with a second beam. The depletion laser is red-shifted from the
 * excitation, is shaped by a vortex phase plate into a doughnut with a true
 * zero on the axis, and is overlaid on the excitation focus. Everywhere the
 * doughnut is bright, stimulated emission drives molecules back down before
 * they can fluoresce spontaneously; only the molecules sitting in the zero
 * still emit at the wavelength the detector watches. The spot that fluoresces
 * is therefore smaller than the spot that is lit, and it shrinks as the
 * depletion power rises — which is why the resolution is a statement about
 * power rather than about the method.
 *
 * The two beams join on one axis at a combining dichroic and are then folded
 * together at the main dichroic, so both obey the reflection law against the
 * same drawn normals.
 * ---------------------------------------------------------------------- */

/** Where the depletion arm runs in, below the excitation laser. */
const STED = { combiner: Y.sample + 60, laserX: -120 } as const;

const sted: Modality = {
  id: 'sted',
  name: 'Stimulated emission depletion',
  shortName: 'STED',
  group: 'Super-resolution',
  illumination: 'epi',
  summary: 'A doughnut of red light switches off the edges of the spot before it can fluoresce.',
  principle:
    'The excitation spot cannot be made smaller than diffraction allows, so STED does not try. It ' +
    'lights the ordinary spot and then overlays a red-shifted doughnut whose intensity is zero ' +
    'only at the very centre. Stimulated emission returns the molecules under the bright part of ' +
    'the doughnut to the ground state before they fluoresce, so although the illuminated spot is ' +
    'diffraction-limited, the region still emitting at the detected wavelength is not. Raising the ' +
    'depletion power shrinks it further, and bleaches the specimen faster.',
  parts: [
    {
      id: 'laser',
      name: 'Excitation laser',
      kind: 'source',
      at: [X.confocalArm, Y.sample + 20, 0],
      radius: 9,
      thickness: 22,
      conjugate: 'field',
      role: 'A pulsed line, as in any confocal. In STED its timing matters as well as its wavelength: the depletion pulse has to arrive while the molecules are still in the excited state and before they have emitted.',
    },
    {
      id: 'sted-laser',
      name: 'Depletion laser',
      kind: 'source',
      at: [STED.laserX, STED.combiner, 0],
      axis: AXIS_X,
      radius: 11,
      thickness: 26,
      role: 'A high-power source red-shifted from the emission peak — 592 or 775 nm are the usual choices. It must fall on the tail of the emission spectrum, where it can stimulate emission down without exciting the dye in the first place.',
      ifWrong:
        'Orders of magnitude more power than the excitation, and it is the reason STED bleaches. A wavelength that still excites the fluorophore even weakly puts a bright ring into the image instead of a dark one.',
    },
    {
      id: 'vortex',
      name: 'Vortex phase plate',
      kind: 'aperture',
      at: [X.confocalArm - 30, STED.combiner, 0],
      axis: AXIS_X,
      radius: 14,
      innerRadius: 5,
      thickness: 3,
      conjugate: 'aperture',
      role: 'A spiral of increasing optical thickness, retarding the beam through a full turn of phase across the aperture. At the focus the contributions cancel exactly on the axis and add off it, which produces a doughnut with a genuine zero at its centre rather than merely a dim middle.',
      ifWrong:
        'The depth of that zero sets the resolution. Any aberration or polarisation error that fills it in leaves residual depletion at the centre, which switches off the very molecules the instrument is trying to detect and costs signal without buying sharpness.',
    },
    {
      id: 'combiner',
      name: 'Combining dichroic',
      kind: 'dichroic',
      at: [X.confocalArm, STED.combiner, 0],
      axis: AXIS_45,
      radius: 14,
      thickness: 2,
      role: 'Brings the depletion beam onto the same axis as the excitation, reflecting the long wavelength up the arm while the excitation passes through from below. From here the two travel together and must stay overlaid to within a few nanometres at the specimen.',
      ifWrong:
        'Any drift between the two beams moves the doughnut off the excitation spot. The image then loses signal on one side and keeps it on the other, which reads as a real asymmetry in the specimen.',
    },
    {
      id: 'dichroic',
      name: 'Main dichroic',
      kind: 'dichroic',
      at: [X.confocalArm, Y.dichroic, 0],
      axis: AXIS_45,
      radius: 15,
      thickness: 2,
      role: 'Turns both beams into the scan head and lets the returning emission pass straight through to the pinhole. It has to separate an emission band from an excitation line and a depletion line either side of it, which is a harder filtering problem than an ordinary confocal presents.',
    },
    {
      id: 'scan-mirrors',
      name: 'Galvanometer scan mirrors',
      kind: 'mirror',
      at: [0, Y.dichroic, 0],
      axis: AXIS_45_DOWN,
      radius: 13,
      thickness: 2,
      conjugate: 'aperture',
      role: 'Sweep the overlaid pair across the field and descan the emission on the way back, exactly as in a confocal. Both beams must be swept together, because a doughnut that lags the excitation spot depletes the wrong place.',
    },
    specimen,
    objective(1.4, 'oil'),
    backFocalPlane,
    {
      id: 'pinhole-lens',
      name: 'Pinhole lens',
      kind: 'lens',
      at: [X.confocalArm - 28, Y.dichroic, 0],
      axis: AXIS_X,
      radius: 12,
      thickness: 6,
      role: 'Focuses the descanned emission onto the pinhole, making the pinhole plane conjugate with the illuminated focus in the specimen. The same part, doing the same job, as in a plain confocal.',
    },
    {
      id: 'pinhole',
      name: 'Confocal pinhole',
      kind: 'pinhole',
      at: [X.confocalArm - 54, Y.dichroic, 0],
      axis: AXIS_X,
      radius: 16,
      innerRadius: 3,
      thickness: 2,
      conjugate: 'field',
      role: 'Still present, and still doing the confocal job of rejecting out-of-focus light. The lateral sharpening comes from the doughnut rather than from this, so the two mechanisms are independent and both are in use.',
    },
    {
      id: 'pmt',
      name: 'Gated detector',
      kind: 'detector',
      at: [X.confocalArm - 84, Y.dichroic, 0],
      axis: AXIS_X,
      radius: 16,
      thickness: 20,
      role: 'A point detector, usually time-gated. Molecules at the edge of the spot are depleted quickly and those at the centre survive longest, so discarding the earliest photons sharpens the image further at the cost of throwing signal away.',
    },
    ...CONFOCAL_STAND,
  ],
  rays: [
    // Excitation comes up the arm from below, passes through the combiner and
    // folds at the main dichroic. Both folds are solved, not placed.
    {
      id: 'ex-a',
      band: 'excitation',
      points: [
        point(X.confocalArm, Y.sample + 20),
        point(X.confocalArm, STED.combiner),
        point(X.confocalArm, Y.dichroic),
        point(0, Y.dichroic),
        point(0, Y.objective),
        point(0, Y.sample),
      ],
    },
    // Depletion arrives along +X, turns up at the combiner, joins the
    // excitation and folds again at the main dichroic and the scan mirrors.
    //
    // Separated from the excitation in Z, not in the plane of the diagram. The
    // two beams are collinear in the instrument — they have to be, or the
    // doughnut does not sit on the spot it is depleting — so displacing them
    // sideways would draw them arriving at different angles, which is the one
    // thing that must not be true of them. Displaced in depth they stay on
    // every mirror's plane and every fold remains an exact reflection.
    ...[14, -14].map((z, index) => ({
      id: `dep-${index}`,
      band: 'depletion' as const,
      points: [
        point(STED.laserX, STED.combiner, z),
        point(X.confocalArm, STED.combiner, z),
        point(X.confocalArm, Y.dichroic, z),
        point(0, Y.dichroic, z),
        point(0, Y.objective, z),
        point(0, Y.sample, 0),
      ],
    })),
    confocalEmissionRay('em-focal-a', 12, 'emission'),
    confocalEmissionRay('em-focal-b', -12, 'emission'),
  ],
  bands: [
    {
      band: 'excitation',
      label: 'Excitation',
      description:
        'An ordinary diffraction-limited confocal spot. STED does not make this any smaller — it makes most of it stop fluorescing.',
    },
    {
      band: 'depletion',
      label: 'Depletion',
      description:
        'The red-shifted beam, shaped by the vortex plate into a doughnut with a zero on the axis. Overlaid on the excitation spot and swept with it.',
    },
    {
      band: 'emission',
      label: 'Emission',
      description:
        'Only from the molecules sitting in the zero of the doughnut. Descanned and passed through the pinhole as in any confocal.',
    },
  ],
  optics: {
    numericalAperture: 1.4,
    refractiveIndex: 1.515,
    wavelength: 520,
    gainKey: 'sted',
  },
  lightOrder: [
    'sted-laser',
    'vortex',
    'laser',
    'combiner',
    'dichroic',
    'scan-mirrors',
    'objective',
    'specimen',
    'bfp',
    'pinhole-lens',
    'pinhole',
    'pmt',
  ],
  caveats: [
    'The doughnut is the one thing this diagram cannot draw. A ray diagram carries directions, and the depletion pattern is a shape in intensity produced by interference at the focus — the rays drawn as depletion show where the beam goes, not what it becomes when it gets there.',
    'The depletion and excitation beams are drawn separated in depth so that both can be seen. In the instrument they are collinear from the combining dichroic onwards, and have to be: a doughnut that does not sit exactly on the spot it is depleting takes the signal off centre. Turn the instrument and the two paths close together at the specimen.',
    'The resolution is not a property of the technique. It scales as the square root of one plus the depletion intensity in units of the dye’s saturation intensity, so a published STED number describes a particular power on a particular dye. The figure beside this drawing is computed at a stated ratio and moves if that ratio does.',
    'A plain vortex plate confines the spot laterally and does nothing axially. Axial gain needs a second, differently shaped depletion pattern, and combining the two costs power and signal in both directions at once.',
  ],
};

/* -------------------------------------------------------------------------
 * Airyscan.
 *
 * A confocal whose pinhole and point detector are replaced by an array of 32
 * small detectors, each of which acts as its own roughly 0.2 Airy unit pinhole
 * while the array as a whole subtends about 1.25. Nothing is thrown away at a
 * stop; instead each element's image is shifted back towards the centre before
 * the signals are summed. That reassignment is where the resolution comes from,
 * and it is the reason the technique is called image scanning microscopy in the
 * literature that predates the product name.
 * ---------------------------------------------------------------------- */

/** As the confocal emission ray, but arriving at an open array rather than a stop. */
function airyscanEmissionRay(id: string, halfWidth: number, band: RayBand): Ray {
  const leavesObjective = point(halfWidth, Y.objective);
  const hitsMirror = point(halfWidth * 0.75, Y.dichroic);
  const afterMirror = afterFold(leavesObjective, hitsMirror, AXIS_45_DOWN, X.confocalArm);
  const inFocus = band === 'emission';
  return {
    id,
    band,
    points: [
      point(0, Y.sample - (inFocus ? 0 : 26)),
      leavesObjective,
      hitsMirror,
      afterMirror,
      point(X.confocalArm - 28, afterMirror[1] * 0.5 + Y.dichroic * 0.5),
      // Both land ON the array. The out-of-focus light lands on the outer
      // elements rather than on a stop, which is the whole difference: it is
      // recorded and weighted rather than discarded.
      point(X.confocalArm - 62, Y.dichroic + (inFocus ? 0 : halfWidth > 0 ? 13 : -13)),
    ],
  };
}

const airyscan: Modality = {
  id: 'airyscan',
  name: 'Airyscan detection',
  shortName: 'Airyscan',
  group: 'Confocal and scanning',
  illumination: 'epi',
  summary: 'Thirty-two small pinholes instead of one, and their images shifted back together.',
  principle:
    'A confocal buys sectioning by throwing light away at the pinhole, and buys resolution only by ' +
    'closing it further and throwing away more. An array of small detectors covering the same ' +
    'Airy disc breaks that trade: each element is a small, off-axis pinhole and so sees a sharper ' +
    'image than the whole disc would, and shifting each element’s image back towards the centre ' +
    'before summing recovers the sharpness of a closed pinhole while keeping the light of an open ' +
    'one.',
  parts: [
    {
      id: 'laser',
      name: 'Laser',
      kind: 'source',
      at: [X.confocalArm, Y.sample + 52, 0],
      radius: 9,
      thickness: 26,
      conjugate: 'field',
      role: 'A single line delivered through a single-mode fibre, whose core is the point source. Identical to a plain confocal — nothing on the illumination side of this instrument is unusual.',
    },
    {
      id: 'dichroic',
      name: 'Dichroic mirror',
      kind: 'dichroic',
      at: [X.confocalArm, Y.dichroic, 0],
      axis: AXIS_45,
      radius: 15,
      thickness: 2,
      role: 'Turns the laser into the scan head and passes the returning emission through to the detector array. Passed twice in opposite directions, as in any confocal.',
    },
    {
      id: 'scan-mirrors',
      name: 'Galvanometer scan mirrors',
      kind: 'mirror',
      at: [0, Y.dichroic, 0],
      axis: AXIS_45_DOWN,
      radius: 13,
      thickness: 2,
      conjugate: 'aperture',
      role: 'Sweep the focus across the field and descan the emission on the way back, holding the returned spot still on the array. Descanning matters more here than usual: the reassignment assumes each element keeps a fixed offset from the spot.',
    },
    specimen,
    objective(1.4, 'oil'),
    backFocalPlane,
    {
      id: 'pinhole-lens',
      name: 'Collection lens',
      kind: 'lens',
      at: [X.confocalArm - 28, Y.dichroic, 0],
      axis: AXIS_X,
      radius: 12,
      thickness: 6,
      role: 'Focuses the descanned emission onto the detector array, making the array plane conjugate with the illuminated focus. It is the lens that decides how many Airy units the array subtends.',
    },
    {
      id: 'airyscan-array',
      name: 'Airyscan detector array',
      kind: 'detector',
      at: [X.confocalArm - 62, Y.dichroic, 0],
      axis: AXIS_X,
      radius: 17,
      thickness: 8,
      conjugate: 'field',
      role: 'Thirty-two GaAsP elements in a hexagonal arrangement, sitting where the pinhole would be. Each element subtends about 0.2 Airy units and so behaves as a small, off-axis pinhole; together they cover roughly 1.25, so essentially all of the light that a confocal would have discarded is recorded instead.',
      ifWrong:
        'The reassignment shifts each element’s image by an amount derived from its position, and then a deconvolution runs on top. Push that second step and the images sharpen indefinitely and stop being measurements — the optical gain is the square root of two, and everything past it is processing.',
    },
    ...CONFOCAL_STAND,
  ],
  rays: [
    {
      id: 'ex-a',
      band: 'excitation',
      points: [
        point(X.confocalArm, Y.sample + 52),
        point(X.confocalArm, Y.dichroic),
        point(0, Y.dichroic),
        point(0, Y.objective),
        point(0, Y.sample),
      ],
    },
    {
      id: 'ex-scan',
      band: 'excitation',
      mirrorMoved: true,
      points: [
        point(X.confocalArm, Y.dichroic),
        point(0, Y.dichroic),
        point(11, Y.objective),
        point(7, Y.sample),
      ],
    },
    airyscanEmissionRay('em-focal-a', 12, 'emission'),
    airyscanEmissionRay('em-focal-b', -12, 'emission'),
    airyscanEmissionRay('em-out-a', 19, 'surround'),
    airyscanEmissionRay('em-out-b', -19, 'surround'),
  ],
  bands: [
    {
      band: 'excitation',
      label: 'Excitation',
      description:
        'A scanned laser focus, exactly as in a confocal. Two positions of the same beam are drawn.',
    },
    {
      band: 'emission',
      label: 'Central emission',
      description:
        'Light from the illuminated focus, landing on the middle elements of the array. In a confocal this is the part that would have passed the pinhole.',
    },
    {
      band: 'surround',
      label: 'Outer elements',
      description:
        'Light a confocal pinhole would have blocked. Here it lands on the outer elements and is reassigned and kept, which is why the technique gains resolution without losing signal.',
    },
  ],
  optics: {
    numericalAperture: 1.4,
    refractiveIndex: 1.515,
    wavelength: 520,
    gainKey: 'airyscan',
  },
  lightOrder: [
    'laser',
    'dichroic',
    'scan-mirrors',
    'objective',
    'specimen',
    'bfp',
    'pinhole-lens',
    'airyscan-array',
  ],
  caveats: [
    'The array is drawn as a single disc. It is thirty-two hexagonally packed elements, and their arrangement is what makes the reassignment possible — each element’s offset from the centre is the shift applied to its signal.',
    'The figure beside the drawing uses the square root of two, which is the gain from reassignment alone and is derivable. Vendors quote about 1.7×, which includes a linear deconvolution applied afterwards; that is a processing step, and folding it into an optical resolution figure would overstate what the hardware does.',
  ],
};

/* -------------------------------------------------------------------------
 * Light sheet.
 *
 * The one instrument here whose illumination does not come through the imaging
 * objective at all. A second, low-NA objective at right angles projects a thin
 * sheet through the specimen, and only the plane being imaged is lit. The sheet
 * has a hyperbolic profile — thinnest at its waist and thickening either side —
 * and the distance over which it stays usably thin is the confocal parameter,
 * which is why a thinner sheet always means a narrower field.
 *
 * Geometry and the waist/confocal-parameter relationship follow microscopyu's
 * light-sheet article.
 * ---------------------------------------------------------------------- */

/** A light-sheet stand: a chamber on a breadboard, not an upright column. */
const SHEET_STAND: Part[] = [
  {
    id: 'base',
    name: 'Optical table',
    kind: 'body',
    structural: true,
    at: [0, -150, 10],
    box: [120, 14, 70],
    radius: 120,
    thickness: 28,
    role: 'A light sheet is built on a breadboard rather than bought as a stand. Two objectives have to be held at right angles and co-focused to within a fraction of a micrometre, which no conventional microscope frame is designed to do.',
  },
  {
    id: 'chamber',
    name: 'Specimen chamber',
    kind: 'body',
    structural: true,
    at: [0, -14, 0],
    box: [54, 40, 54],
    radius: 54,
    thickness: 80,
    role: 'A bath of index-matched medium with windows for both objectives. The specimen usually hangs into it in agarose or on a capillary, so it can be rotated between views rather than being lying on a slide.',
    ifWrong:
      'Index mismatch between the medium, the mounting gel and the immersion is the commonest source of a light sheet that will not stay thin across the field, and it appears as a field sharp on one side and soft on the other.',
  },
  {
    id: 'sample-positioner',
    name: 'Sample positioner',
    kind: 'body',
    structural: true,
    at: [0, 42, 34],
    box: [16, 30, 16],
    radius: 16,
    thickness: 60,
    role: 'A piezo stage that steps the specimen through the sheet, or sweeps the sheet and the detection focus together. A light sheet images one plane and cannot refocus, so the third dimension is built by moving something — and that motion is the acquisition rather than a preliminary to it.',
    ifWrong:
      'The step between planes has to match the sheet thickness. Stepping coarser undersamples the axis and stepping finer only adds dose, and neither is visible in any single frame.',
  },
  {
    id: 'illumination-arm',
    name: 'Illumination arm',
    kind: 'body',
    structural: true,
    at: [-96, 0, 0],
    box: [46, 16, 16],
    radius: 46,
    thickness: 32,
    role: 'Carries the sheet-forming optics at right angles to the detection axis. Its alignment is the whole calibration of the instrument: the sheet has to land exactly in the focal plane of the detection objective, and a micrometre out is a visibly soft image.',
  },
  head,
];

function sheetRay(id: string, edge: number, z = 0): Ray {
  return {
    id,
    band: 'excitation',
    points: [
      point(X.sheetArm, edge * 2.1, z),
      point(X.sheetArm / 2, edge * 1.5, z),
      // The waist, where the sheet is thinnest and where the detection
      // objective is focused.
      point(0, 0, z),
    ],
  };
}

const lightSheet: Modality = {
  id: 'light-sheet',
  name: 'Light sheet fluorescence microscopy',
  shortName: 'Light sheet',
  group: 'Light sheet',
  illumination: 'orthogonal',
  summary: 'A thin sheet lights one plane from the side, and only that plane is ever excited.',
  principle:
    'Every other fluorescence instrument here illuminates the whole depth of the specimen and then ' +
    'deals with the out-of-focus light it created — by rejecting it at a pinhole, or by living ' +
    'with it. A light sheet does not create it. A second objective at right angles projects a ' +
    'sheet only as thick as the plane being imaged, so nothing outside the focal plane is excited ' +
    'at all. The consequence is a reduction in photobleaching of orders of magnitude, which is ' +
    'what makes it the instrument for watching a developing embryo for days.',
  parts: [
    {
      id: 'laser',
      name: 'Laser',
      kind: 'source',
      at: [X.sheetArm, 0, 0],
      axis: AXIS_X,
      radius: 10,
      thickness: 24,
      role: 'Expanded into a wide, collimated beam. The sheet is formed from it by optics rather than by scanning in the simplest instruments, so the beam has to be broad before it reaches the cylindrical lens.',
    },
    {
      id: 'cylindrical-lens',
      name: 'Cylindrical lens',
      kind: 'lens',
      at: [X.sheetArm + 42, 0, 0],
      axis: AXIS_X,
      radius: 18,
      thickness: 6,
      role: 'Converges the beam along one axis only and leaves it alone along the other, which is what turns a round beam into a sheet. Scanned-beam instruments replace it with a galvanometer sweeping a pencil beam, which makes a sheet in time rather than in space.',
      ifWrong:
        'A sheet is a compromise nobody escapes: the beam waist and the distance over which it stays thin are tied together, so halving the thickness quarters the usable field. A sheet thin enough for a single cell will not cover an embryo.',
    },
    {
      id: 'illumination-objective',
      name: 'Illumination objective',
      kind: 'objective',
      at: [-52, 0, 0],
      axis: AXIS_X,
      radius: 14,
      thickness: 26,
      role: 'Low numerical aperture on purpose — around 0.3. A high-NA lens would make a thinner waist over a uselessly short range, and the sheet has to stay thin right across the field of the detection objective.',
    },
    specimen,
    {
      ...objective(1.0, 'water'),
      role: 'Water-dipping and at right angles to the illumination, collecting from the plane the sheet lights. It does all of the resolving; the illumination objective contributes nothing to the lateral resolution and only bounds the axial.',
    },
    backFocalPlane,
    {
      id: 'emission-filter',
      name: 'Emission filter',
      kind: 'filter',
      at: [0, Y.emissionFilter, 0],
      radius: 18,
      thickness: 4,
      role: 'Blocks the excitation wavelength, which arrives from the side rather than from below but scatters into the detection path all the same, particularly from the chamber windows.',
    },
    tubeLens,
    intermediateImage,
    {
      ...camera,
      role: 'A large fast sCMOS. The whole illuminated plane is imaged at once with no scanning at all, so the frame rate is limited by the sensor rather than by the optics — which is where light sheet gets its speed.',
    },
    ...SHEET_STAND,
  ],
  rays: [
    sheetRay('sheet-top', 9),
    sheetRay('sheet-mid', 0),
    sheetRay('sheet-bottom', -9),
    imagingRay('em-a', 7, 11),
    imagingRay('em-b', -7, -11),
  ],
  bands: [
    {
      band: 'excitation',
      label: 'Light sheet',
      description:
        'Converging to a waist at the specimen and diverging again — the hyperbolic profile is why a sheet is only usably thin over a limited stretch, and why field of view and thickness trade against each other.',
    },
    {
      band: 'imaging',
      label: 'Detection',
      description:
        'Up through the detection objective at right angles to the sheet. Ordinary widefield collection: everything special about this instrument happened on the illumination side.',
    },
  ],
  optics: {
    numericalAperture: 1.0,
    refractiveIndex: 1.33,
    wavelength: 520,
    gainKey: 'light-sheet',
  },
  lightOrder: [
    'laser',
    'cylindrical-lens',
    'illumination-objective',
    'specimen',
    'objective',
    'bfp',
    'emission-filter',
    'tube-lens',
    'intermediate-image',
    'camera',
  ],
  caveats: [
    'The sheet is drawn far thicker than its proportions. A typical waist is one to a few micrometres across a field hundreds of micrometres wide, which on this scale would be a hairline.',
    'The waist and the usable length are not independent. Halving the thickness of a sheet quarters the distance over which it stays that thin, so the choice of sheet is a choice of field of view — and it is made per specimen, not once for the instrument.',
    'The axial resolution is whichever is worse: the detection objective’s own depth of field, or the thickness of the sheet. With a high-NA detection objective the sheet is usually the worse of the two, so the resolution figure beside this drawing is an upper bound the instrument will not always reach.',
  ],
};

/* -------------------------------------------------------------------------
 * Lattice light sheet.
 *
 * The correction that matters and is easy to get wrong: a Bessel beam comes
 * from illuminating a COMPLETE thin ring at the back pupil of the illumination
 * objective; an optical lattice comes from illuminating DISCRETE POINTS around
 * that same annulus. They are not the same mask and they do not make the same
 * sheet — the lattice exists precisely because a single Bessel beam puts too
 * much of its energy into side lobes.
 * ---------------------------------------------------------------------- */

const latticeLightSheet: Modality = {
  id: 'lattice-light-sheet',
  name: 'Lattice light sheet microscopy',
  shortName: 'Lattice light sheet',
  group: 'Light sheet',
  illumination: 'orthogonal',
  summary: 'An interference lattice makes a sheet near a micrometre thick over a usable field.',
  principle:
    'A conventional light sheet trades thickness against field: the thinner the waist, the shorter ' +
    'the stretch over which it stays thin. A lattice breaks that trade by building the sheet from ' +
    'a periodic interference pattern of many beams rather than from one focused beam, giving an ' +
    'effective thickness near a micrometre over a field a Gaussian sheet could only cover at four ' +
    'or five times that. The sheet then matches the depth of field of a high-NA objective, which ' +
    'is what brings light sheet into the range of single molecules and organelles.',
  parts: [
    {
      id: 'laser',
      name: 'Laser',
      kind: 'source',
      at: [X.sheetArm, 0, 0],
      axis: AXIS_X,
      radius: 10,
      thickness: 24,
      role: 'Coherent and expanded. The lattice is an interference pattern between many plane waves, so coherence across the whole pupil is a requirement rather than a convenience.',
    },
    {
      id: 'slm',
      name: 'Spatial light modulator',
      kind: 'aperture',
      at: [X.sheetArm + 34, 0, 0],
      axis: AXIS_X,
      radius: 17,
      innerRadius: 4,
      thickness: 3,
      role: 'Writes the pattern that will become the lattice, as a phase hologram. Being programmable, it is what lets one instrument switch between lattice geometries and between the dithered and structured modes without changing any hardware.',
    },
    {
      id: 'annular-mask',
      name: 'Annular mask',
      kind: 'aperture',
      at: [-70, 0, 0],
      axis: AXIS_X,
      radius: 16,
      innerRadius: 11,
      thickness: 2,
      conjugate: 'aperture',
      role: 'Sits in a plane conjugate with the back pupil of the illumination objective and passes only a thin ring. A complete ring would give a Bessel beam; a lattice is made by passing discrete points spaced around that ring instead, and it is the discreteness that suppresses the side lobes a single Bessel beam wastes its energy in.',
      ifWrong:
        'Drawn here as a plain annulus because a ring is what the renderer can draw. The distinction matters: complete ring means Bessel, discrete points around the ring means lattice, and confusing the two describes a different instrument with a different point spread function.',
    },
    {
      id: 'illumination-objective',
      name: 'Illumination objective',
      kind: 'objective',
      at: [-46, 0, 0],
      axis: AXIS_X,
      radius: 13,
      thickness: 24,
      role: 'Higher numerical aperture than a conventional light sheet uses, because the lattice is formed by interference at the focus and needs the angular range. It sits close to the specimen, which is why both objectives and the chamber have to be designed together.',
    },
    specimen,
    {
      ...objective(1.1, 'water'),
      role: 'Water-dipping, at right angles to the illumination. Its depth of field is close to the thickness of a dithered lattice sheet, which is the match that makes the combination worth building.',
    },
    backFocalPlane,
    {
      id: 'emission-filter',
      name: 'Emission filter',
      kind: 'filter',
      at: [0, Y.emissionFilter, 0],
      radius: 18,
      thickness: 4,
      role: 'Blocks the excitation. At the exposure times used for single-molecule work the scattered excitation from the chamber is a real contribution to the background rather than a nominal one.',
    },
    tubeLens,
    intermediateImage,
    {
      ...camera,
      role: 'A fast sCMOS, run at hundreds of frames a second. The instrument is usually limited by how fast the specimen can be stepped through the sheet rather than by the sensor.',
    },
    ...SHEET_STAND,
  ],
  rays: [
    // The beamlets of the lattice, spread across z rather than y: the sheet is
    // thin in the detection direction and wide across it, so rotating the
    // instrument is what shows the lattice as a lattice.
    sheetRay('lat-a', 3, -16),
    sheetRay('lat-b', 3, 0),
    sheetRay('lat-c', 3, 16),
    sheetRay('lat-d', -3, -8),
    sheetRay('lat-e', -3, 8),
    imagingRay('em-a', 7, 11),
    imagingRay('em-b', -7, -11),
  ],
  bands: [
    {
      band: 'excitation',
      label: 'Lattice',
      description:
        'Several beamlets, spread across the width of the sheet rather than its thickness. Turn the instrument to see them separate — the lattice is a pattern across the plane, not down through it.',
    },
    {
      band: 'imaging',
      label: 'Detection',
      description:
        'Up through the detection objective at right angles, as in any light sheet. The lattice changes what is illuminated, not how it is collected.',
    },
  ],
  optics: {
    numericalAperture: 1.1,
    refractiveIndex: 1.33,
    wavelength: 520,
    gainKey: 'lattice-light-sheet',
  },
  lightOrder: [
    'laser',
    'slm',
    'annular-mask',
    'illumination-objective',
    'specimen',
    'objective',
    'bfp',
    'emission-filter',
    'tube-lens',
    'intermediate-image',
    'camera',
  ],
  caveats: [
    'The lattice itself is an interference pattern and is not drawn. What is drawn is where its beamlets travel; the periodic structure they produce at the specimen is finer than anything else on this diagram.',
    'The instrument is normally run with the lattice dithered — swept sideways fast enough that each exposure sees a smooth sheet. A structured-illumination mode uses the pattern as a pattern instead and reports roughly 1.3 to 1.5 times finer, at about 7.5 times the acquisition time.',
    'The annular mask is drawn as a continuous ring because that is what the renderer can express. A continuous ring is the Bessel case; a lattice illuminates discrete points around the same ring, which is what keeps the energy out of the side lobes.',
  ],
};

export const MODALITIES: readonly Modality[] = [
  brightfield,
  epifluorescence,
  tirf,
  confocal,
  spinningDisc,
  airyscan,
  phaseContrast,
  dic,
  sim,
  sted,
  lightSheet,
  latticeLightSheet,
];

export function getModality(id: string): Modality | undefined {
  return MODALITIES.find((m) => m.id === id);
}

/* -------------------------------------------------------------------------
 * Part geometry. A part's silhouette follows from its kind, so the data above
 * carries physics and prose rather than polygon soup.
 * ---------------------------------------------------------------------- */

/** The lens profile: a shallow biconvex bulge, so glass reads as glass. */
function lensProfile(radius: number, thickness: number): ProfileStation[] {
  const half = thickness / 2;
  return [
    { t: -half, r: radius * 0.72 },
    { t: -half * 0.4, r: radius },
    { t: half * 0.4, r: radius },
    { t: half, r: radius * 0.72 },
  ];
}

/** A truncated cone, nose down: how every objective looks on a turret. */
function objectiveProfile(radius: number, thickness: number): ProfileStation[] {
  const half = thickness / 2;
  return [
    { t: -half, r: radius * 0.3 },
    { t: -half * 0.55, r: radius * 0.42 },
    { t: half * 0.2, r: radius },
    { t: half, r: radius },
  ];
}

function discProfile(radius: number, thickness: number): ProfileStation[] {
  const half = thickness / 2;
  return [
    { t: -half, r: radius },
    { t: half, r: radius },
  ];
}

export function profileFor(part: Part): ProfileStation[] {
  switch (part.kind) {
    case 'lens':
      return lensProfile(part.radius, part.thickness);
    case 'objective':
      return objectiveProfile(part.radius, part.thickness);
    case 'source':
    case 'detector':
    case 'prism':
    case 'body':
      return discProfile(part.radius, part.thickness);
    default:
      return discProfile(part.radius, part.thickness);
  }
}

/** True when the part is a rectangular block rather than a surface of revolution. */
export function isBox(part: Part): boolean {
  return part.box !== undefined;
}

/** A block as the renderer wants it. Only valid when `isBox(part)`. */
export function boxFor(part: Part): BoxSolid {
  return { at: part.at, half: part.box ?? [part.radius, part.thickness / 2, part.radius] };
}

/** A part as the renderer wants it. */
export function solidFor(part: Part): Solid {
  return {
    at: part.at,
    axis: part.axis ?? AXIS_Y,
    profile: profileFor(part),
    innerRadius: part.innerRadius,
  };
}

/** Vertical extent of a modality, for framing the camera. */
export function extentOf(modality: Modality): { minY: number; maxY: number } {
  const ys = modality.parts.map((p) => p.at[1]);
  return { minY: Math.min(...ys), maxY: Math.max(...ys) };
}
