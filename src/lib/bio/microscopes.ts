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
  | 'emission'
  | 'surround'
  | 'diffracted'
  | 'ordinary'
  | 'extraordinary';

export interface Ray {
  id: string;
  band: RayBand;
  points: Vec3[];
}

export interface Modality {
  id: string;
  name: string;
  shortName: string;
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
const X = { lampArm: -118, filterArm: -84, scanArm: -52 } as const;

const AXIS_Y: Vec3 = [0, 1, 0];
/** A dichroic at 45° in the XY plane: normal halfway between +Y and −X. */
const AXIS_45: Vec3 = [-Math.SQRT1_2, Math.SQRT1_2, 0];
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
    'The two sets of conjugate planes are the point of this diagram. Field planes — field diaphragm, specimen, intermediate image — are in focus together; aperture planes — lamp filament, condenser diaphragm, objective back focal plane — are in focus together and never with the first set.',
    'Ray heights and lens spacings are schematic. No focal lengths are claimed and nothing is traced through a prescription.',
  ],
};

const epifluorescence: Modality = {
  id: 'epifluorescence',
  name: 'Widefield epifluorescence',
  shortName: 'Epifluorescence',
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
      axis: AXIS_45,
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
    {
      id: 'ex-a',
      band: 'excitation',
      points: [
        point(X.lampArm, Y.dichroic + 6),
        point(0, Y.dichroic + 6),
        point(6, Y.objective),
        point(0, Y.sample),
      ],
    },
    {
      id: 'ex-b',
      band: 'excitation',
      points: [
        point(X.lampArm, Y.dichroic - 6),
        point(0, Y.dichroic - 6),
        point(-6, Y.objective),
        point(0, Y.sample),
      ],
    },
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
  caveats: [
    'Out-of-focus fluorescence is the defining limitation and is drawn as the pale third emission path. Nothing in a widefield epi-fluorescence instrument removes it; that is what the confocal pinhole is for.',
    'The excitation cone is drawn narrow for legibility. In a real instrument it fills the back aperture, which is what gives even illumination across the field.',
  ],
};

const confocal: Modality = {
  id: 'confocal',
  name: 'Laser scanning confocal',
  shortName: 'Confocal',
  summary:
    'A focused spot is scanned across the sample and a pinhole rejects everything out of focus.',
  principle:
    'Two changes from epifluorescence, and only the second matters optically. The field is illuminated one point at a time by a scanned laser focus, and the detector sits behind a pinhole in a plane conjugate with that focus. Light from above or below the focal plane arrives at the pinhole out of focus and is largely blocked, which is what produces optical sectioning.',
  parts: [
    {
      id: 'laser',
      name: 'Laser',
      kind: 'source',
      at: [X.lampArm, Y.dichroic, 0],
      axis: AXIS_X,
      radius: 9,
      thickness: 22,
      role: 'A single line rather than a band — 488 nm for GFP, 561 for red proteins. Monochromatic, so no excitation filter is strictly needed, though one is usually fitted to clean up plasma lines.',
      ifWrong:
        'A line on the shoulder of the excitation spectrum costs signal in direct proportion, and no amount of detector gain gets it back — it amplifies the noise equally.',
    },
    {
      id: 'scan-mirrors',
      name: 'Galvanometer scan mirrors',
      kind: 'mirror',
      at: [X.scanArm, Y.dichroic, 0],
      axis: AXIS_45,
      radius: 12,
      thickness: 2,
      role: 'Two mirrors on galvanometers sweep the focused spot across the field in x and y. They sit in a plane conjugate with the objective back aperture, so the beam pivots there and the focus moves across the field without the illumination cone changing shape.',
      ifWrong:
        'Scanning faster buys frame rate and spends photons per pixel: the signal falls with dwell time, and the image gets noisier rather than dimmer.',
    },
    {
      id: 'dichroic',
      name: 'Dichroic mirror',
      kind: 'dichroic',
      at: [0, Y.dichroic, 0],
      axis: AXIS_45,
      radius: 20,
      thickness: 2,
      role: 'Separates the excitation going down from the emission coming back up, exactly as in epifluorescence.',
    },
    specimen,
    objective(1.4, 'oil'),
    backFocalPlane,
    {
      ...tubeLens,
      role: 'Focuses the returning emission onto the pinhole, which is why the pinhole plane is conjugate with the focal plane in the sample.',
    },
    {
      id: 'pinhole',
      name: 'Confocal pinhole',
      kind: 'pinhole',
      at: [0, Y.intermediateImage, 0],
      radius: 18,
      innerRadius: 3.2,
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
      at: [0, Y.detector, 0],
      radius: 18,
      thickness: 18,
      role: 'A point detector, because at any instant there is only one illuminated point to measure. GaAsP has roughly twice the quantum efficiency of a classical PMT in the green, which is why it displaced it.',
      ifWrong:
        'Gain is not signal. Turning it up brightens the display and amplifies shot noise with it; more photons come only from more laser, longer dwell, or a better dye.',
    },
    ...EPI_STAND,
  ],
  rays: [
    {
      id: 'ex-a',
      band: 'excitation',
      points: [
        point(X.lampArm, Y.dichroic),
        point(X.scanArm, Y.dichroic),
        point(0, Y.dichroic),
        point(0, Y.objective),
        point(0, Y.sample),
      ],
    },
    {
      id: 'ex-scan',
      band: 'excitation',
      points: [
        point(X.scanArm, Y.dichroic),
        point(0, Y.dichroic + 9),
        point(9, Y.objective),
        point(0, Y.sample),
      ],
    },
    {
      id: 'em-focal-a',
      band: 'emission',
      points: [
        point(0, Y.sample),
        point(12, Y.objective),
        point(12, Y.dichroic),
        point(12, Y.tubeLens),
        point(0, Y.intermediateImage),
        point(-7, Y.detector),
      ],
    },
    {
      id: 'em-focal-b',
      band: 'emission',
      points: [
        point(0, Y.sample),
        point(-12, Y.objective),
        point(-12, Y.dichroic),
        point(-12, Y.tubeLens),
        point(0, Y.intermediateImage),
        point(7, Y.detector),
      ],
    },
    {
      id: 'em-out-a',
      band: 'surround',
      points: [
        point(0, Y.sample - 26),
        point(16, Y.objective),
        point(16, Y.tubeLens),
        point(9, Y.intermediateImage),
      ],
    },
    {
      id: 'em-out-b',
      band: 'surround',
      points: [
        point(0, Y.sample - 26),
        point(-16, Y.objective),
        point(-16, Y.tubeLens),
        point(-9, Y.intermediateImage),
      ],
    },
  ],
  bands: [
    {
      band: 'excitation',
      label: 'Excitation',
      description:
        'A laser focused to a diffraction-limited spot and swept across the field by the scan mirrors.',
    },
    {
      band: 'emission',
      label: 'In-focus emission',
      description: 'Comes to a focus at the pinhole and passes through to the detector.',
    },
    {
      band: 'surround',
      label: 'Out-of-focus emission',
      description:
        'Arrives at the pinhole plane spread out rather than focused, so most of it strikes the surrounding stop. This rejection is the optical sectioning.',
    },
  ],
  optics: {
    numericalAperture: 1.4,
    refractiveIndex: 1.515,
    wavelength: 520,
    gainKey: 'confocal',
  },
  caveats: [
    'The out-of-focus paths are drawn stopping at the pinhole plane. In a real instrument a little of that light does get through, which is why sectioning is a strong suppression rather than a clean cut.',
    'A real scan head has a scan lens and a tube lens either side of the mirrors to keep the beam collimated at the back aperture. They are left out here so the pivot at the mirrors stays readable.',
  ],
};

const phaseContrast: Modality = {
  id: 'phase-contrast',
  name: 'Phase contrast',
  shortName: 'Phase contrast',
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
  summary: 'Two sheared beams interfere, so the image reports the gradient of optical path.',
  principle:
    'Polarised light is split by a Wollaston prism into two beams a fraction of a micrometre apart at the specimen — less than the resolution limit, so they sample essentially the same point. Whatever difference in optical path they pick up between those two points is converted by a second prism and an analyser into intensity. The image therefore shows the rate of change of optical path along the shear direction, which is what gives DIC its shadowed, relief-like appearance.',
  parts: [
    lamp('Lamp', 'An ordinary transmitted-light source, polarised immediately after it.'),
    collector,
    {
      id: 'polariser',
      name: 'Polariser',
      kind: 'polariser',
      at: [0, Y.fieldDiaphragm, 0],
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
        point(0, Y.fieldDiaphragm),
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
        point(0, Y.fieldDiaphragm),
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

export const MODALITIES: readonly Modality[] = [
  brightfield,
  epifluorescence,
  confocal,
  phaseContrast,
  dic,
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
