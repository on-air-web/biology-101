import type { ToolMeta } from '@/lib/tools/types';
import { CRITERIA } from '@/lib/bio/resolution';

const ABBE = {
  label: 'The diffraction limit and the resolving power of the microscope',
  authors: 'Abbe E',
  source: 'Archiv für Mikroskopische Anatomie',
  year: 1873,
  doi: '10.1007/BF02956173',
};

export const microscopeExplorerMeta: ToolMeta = {
  id: 'microscope-explorer',
  name: 'Microscope explorer',
  shortName: 'Microscope',
  category: 'imaging',
  summary: 'Turn a microscope in 3D, follow the light path, and see what each part is for.',
  description:
    'An interactive cutaway of twelve microscopes — brightfield with Köhler illumination, widefield ' +
    'epifluorescence, TIRF, laser scanning confocal, spinning disc, Airyscan, phase contrast, DIC, ' +
    'SIM, STED, light sheet and lattice light sheet. Drag to rotate, pinch to ' +
    'zoom, and click any part to read what it does and what goes wrong when it is wrong. The ray ' +
    'paths are drawn through the same geometry as the hardware, the conjugate planes are grouped, ' +
    'and the resolution is computed from the objective actually fitted.',
  keywords: [
    'microscope',
    'microscope parts',
    'light path',
    'ray diagram',
    'optical train',
    'kohler',
    'köhler illumination',
    'conjugate planes',
    'brightfield',
    'epifluorescence',
    'confocal',
    'phase contrast',
    'dic',
    'nomarski',
    'tirf',
    'total internal reflection',
    'evanescent field',
    'spinning disc',
    'nipkow',
    'yokogawa',
    'airyscan',
    'image scanning microscopy',
    'sim',
    'structured illumination',
    'sted',
    'stimulated emission depletion',
    'super-resolution',
    'superresolution',
    'light sheet',
    'lightsheet',
    'spim',
    'lattice light sheet',
    'llsm',
    'selective plane illumination',
    'differential interference contrast',
    'objective',
    'condenser',
    'dichroic',
    'numerical aperture',
    'resolution',
    'abbe',
    'rayleigh',
    'diffraction limit',
    'pinhole',
    'back focal plane',
    'how a microscope works',
  ],
  kind: 'builtin',
  tier: 'pick',
  reviewStatus: 'drafted',
  status: 'stable',
  computeLocation: 'client',
  citations: [
    ABBE,
    {
      label: 'Köhler illumination and the alignment procedure',
      source: 'Nikon MicroscopyU, Köhler Illumination',
      url: 'https://www.microscopyu.com/tutorials/kohler',
    },
    {
      label: 'The two sets of conjugate planes in a transmitted-light column',
      source: 'Nikon MicroscopyU, Conjugate Planes in Optical Microscopy',
      url: 'https://www.microscopyu.com/microscopy-basics/conjugate-planes-in-optical-microscopy',
    },
    {
      label: 'Phase contrast: the annulus, the phase plate and the surround wave',
      source: 'Nikon MicroscopyU, Phase Contrast',
      url: 'https://www.microscopyu.com/techniques/phase-contrast',
    },
    {
      label: 'Differential interference contrast: shear, bias and the Wollaston pair',
      source: 'Nikon MicroscopyU, DIC',
      url: 'https://www.microscopyu.com/techniques/dic',
    },
    {
      label: 'Confocal light path and the role of the pinhole',
      source: 'Nikon MicroscopyU, Introductory Confocal Concepts',
      url: 'https://www.microscopyu.com/techniques/confocal/introductory-confocal-concepts',
    },
    {
      label:
        'TIRF: the off-axis focus at the rear aperture, the annulus that blocks sub-critical rays, and the penetration depth',
      source: 'Nikon MicroscopyU, Total Internal Reflection Fluorescence Microscopy',
      url: 'https://www.microscopyu.com/techniques/fluorescence/total-internal-reflection-fluorescence-tirf-microscopy',
    },
    {
      label:
        'Light sheet geometry, the hyperbolic sheet profile, and the waist against confocal-parameter trade',
      source: 'Nikon MicroscopyU, Light Sheet Fluorescence Microscopy',
      url: 'https://www.microscopyu.com/techniques/light-sheet/light-sheet-fluorescence-microscopy',
    },
    {
      label: 'Cell-substrate contacts illuminated by total internal reflection fluorescence',
      authors: 'Axelrod D',
      source: 'The Journal of Cell Biology',
      year: 1981,
      doi: '10.1083/jcb.89.1.141',
    },
    {
      label: 'High-speed 1-frame/ms scanning confocal microscope with a microlens and Nipkow disks',
      authors: 'Tanaami T, Otsuki S, Tomosada N, Kosugi Y, Shimizu M, Ishida H',
      source: 'Applied Optics',
      year: 2002,
      doi: '10.1364/AO.41.004704',
    },
    {
      label:
        'Surpassing the lateral resolution limit by a factor of two using structured illumination microscopy',
      authors: 'Gustafsson MGL',
      source: 'Journal of Microscopy',
      year: 2000,
      doi: '10.1046/j.1365-2818.2000.00710.x',
    },
    {
      label:
        'Breaking the diffraction resolution limit by stimulated emission: stimulated-emission-depletion fluorescence microscopy',
      authors: 'Hell SW, Wichmann J',
      source: 'Optics Letters',
      year: 1994,
      doi: '10.1364/OL.19.000780',
    },
    {
      label: 'Resolution scaling in STED microscopy — the square-root saturation form',
      authors: 'Harke B, Keller J, Ullal CK, Westphal V, Schönle A, Hell SW',
      source: 'Optics Express',
      year: 2008,
      doi: '10.1364/OE.16.004154',
    },
    {
      label: 'Image scanning microscopy — the pixel-reassignment gain Airyscan is built on',
      authors: 'Müller CB, Enderlein J',
      source: 'Physical Review Letters',
      year: 2010,
      doi: '10.1103/PhysRevLett.104.198101',
    },
    {
      label:
        'Optical sectioning deep inside live embryos by selective plane illumination microscopy',
      authors: 'Huisken J, Swoger J, Del Bene F, Wittbrodt J, Stelzer EHK',
      source: 'Science',
      year: 2004,
      doi: '10.1126/science.1100035',
    },
    {
      label:
        'Lattice light-sheet microscopy: imaging molecules to embryos at high spatiotemporal resolution',
      authors: 'Chen BC, Legant WR, Wang K, Shao L, Milkie DE, Davidson MW, et al.',
      source: 'Science',
      year: 2014,
      doi: '10.1126/science.1257998',
    },
  ],
  /**
   * The resolution criterion is the model here: three are in common use, they
   * disagree by up to 20%, and papers quote one while naming another.
   */
  models: CRITERIA.map((criterion) => ({
    id: criterion.id,
    name: `${criterion.name} criterion`,
    guidance: criterion.guidance,
    citation: ABBE,
    isDefault: criterion.id === 'abbe',
  })),
  relatedToolIds: ['spectra-viewer', 'filter-compatibility', 'fret-pair', 'fluorophore-brightness'],
  reviewedAt: '2026-08-04',
};
