/**
 * Image manifest.
 *
 * Every photographic asset records its creator, its source, its licence and
 * whether that licence permits commercial use — in the same spirit as the
 * citations under every calculation. If we cannot say where an image came from
 * and what we may do with it, it does not ship.
 *
 * Current source: the NIGMS Image and Video Gallery, which licenses its
 * collection under CC BY-NC-SA 3.0. That is explicit and per-image creditable,
 * unlike the general NIH Flickr gallery where grantee submissions can remain
 * under the submitting researcher's copyright.
 *
 * Note the two constraints that come with it:
 *   NonCommercial — fine while the site carries no advertising or paid tier,
 *                   and blocking the moment it does.
 *   ShareAlike    — we crop and overlay these images, which is an adaptation,
 *                   so the derived banners inherit the same licence.
 */
export interface ImageCredit {
  id: string;
  /** Path under /public. */
  src: string;
  /** Original file, for the fetch script and for anyone verifying provenance. */
  downloadUrl: string;
  alt: string;
  caption: string;
  /** Person and institution who made the image. */
  creator: string;
  /** Collection it came from. */
  collection: string;
  /** Page describing the image, for attribution. */
  sourceUrl: string;
  licence: string;
  licenceUrl: string;
  /** False for NonCommercial licences. Gates any future monetisation. */
  commercialUse: boolean;
  /** Cleared for publication on the current, non-commercial site. */
  cleared: boolean;
}

const NIGMS = {
  collection: 'NIGMS Image and Video Gallery',
  licence: 'CC BY-NC-SA 3.0',
  licenceUrl: 'https://creativecommons.org/licenses/by-nc-sa/3.0/',
  commercialUse: false,
  cleared: true,
} as const;

export const IMAGES = {
  zebrafish: {
    ...NIGMS,
    id: 'zebrafish',
    src: '/images/zebrafish-vasculature.jpg',
    downloadUrl:
      'https://nigms.nih.gov/sites/nigms/files/image-and-video-gallery/stiched_fish_blending_high_contrast.png',
    alt: 'Confocal fluorescence image of a zebrafish embryo showing blood vessels and cell bodies',
    caption:
      'Zebrafish embryo showing vasculature — cell bodies in blue, blood vessels in green, blood in red. Hyperspectral multipoint confocal fluorescence microscopy.',
    creator: 'Kevin Eliceiri, University of Wisconsin–Madison',
    sourceUrl: 'https://nigms.nih.gov/image-gallery/6661',
  },
  microtubules: {
    ...NIGMS,
    id: 'microtubules',
    src: '/images/microtubules-storm.jpg',
    downloadUrl:
      'https://nigms.nih.gov/sites/nigms/files/image-and-video-gallery/MicrotubulesinMonkeyCells.png',
    alt: 'Super-resolution image of microtubules colour-coded by depth, purple through yellow',
    caption:
      'Microtubules in African green monkey cells, colour-coded by distance from the lens. Stochastic Optical Reconstruction Microscopy (STORM).',
    creator: 'Melike Lakadamyali, Perelman School of Medicine, University of Pennsylvania',
    sourceUrl: 'https://nigms.nih.gov/image-gallery/6891',
  },
} as const satisfies Record<string, ImageCredit>;

export const ALL_IMAGES: readonly ImageCredit[] = Object.values(IMAGES);

/** True when every photographic asset is cleared for the current use. */
export function allImagesCleared(): boolean {
  return ALL_IMAGES.every((image) => image.cleared);
}

/** True when every image would survive the site becoming commercial. */
export function allImagesCommercialSafe(): boolean {
  return ALL_IMAGES.every((image) => image.commercialUse);
}
