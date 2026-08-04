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
    'An interactive cutaway of five microscopes — brightfield with Köhler illumination, widefield ' +
    'epifluorescence, laser scanning confocal, phase contrast and DIC. Drag to rotate, scroll to ' +
    'zoom, and select any part to read what it does and what goes wrong when it is wrong. The ray ' +
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
