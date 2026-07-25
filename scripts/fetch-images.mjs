/**
 * Downloads and optimises the photographic assets listed in src/lib/images.ts.
 *
 * The originals are multi-megabyte PNGs. Shipping those to a static site would
 * undo every performance decision in this project, so they are cropped to band
 * proportions and re-encoded as progressive JPEG.
 *
 * Safe to run in a deploy pipeline: a network failure, a missing file or an
 * unreachable host leaves the existing placeholder in place and exits zero.
 * A banner that has not refreshed is a cosmetic problem; a build that will not
 * ship because a third-party host is down is not.
 *
 *   npm run images
 */
import { access, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

// Kept in step with src/lib/images.ts by hand. Deliberately duplicated rather
// than imported: this script runs in plain Node, outside the TypeScript build.
const ASSETS = [
  {
    out: 'zebrafish-vasculature.jpg',
    url: 'https://nigms.nih.gov/sites/nigms/files/image-and-video-gallery/stiched_fish_blending_high_contrast.png',
    width: 2000,
    /** Fraction of source height to keep, centred. Crops the empty black
     *  margins without cropping the organism, and lands near the proportions
     *  of a wide band so `cover` loses almost nothing. */
    keep: 0.44,
  },
  {
    out: 'microtubules-storm.jpg',
    url: 'https://nigms.nih.gov/sites/nigms/files/image-and-video-gallery/MicrotubulesinMonkeyCells.png',
    width: 1800,
    keep: 0.42,
  },
];

const OUT_DIR = join('public', 'images');
const TIMEOUT_MS = 30_000;

let sharp;
try {
  ({ default: sharp } = await import('sharp'));
} catch {
  console.warn('! sharp is not installed — keeping existing images.');
  process.exit(0);
}

await mkdir(OUT_DIR, { recursive: true });

let refreshed = 0;

for (const asset of ASSETS) {
  const target = join(OUT_DIR, asset.out);

  try {
    const response = await fetch(asset.url, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);

    const input = Buffer.from(await response.arrayBuffer());
    const image = sharp(input);
    const { width = 0, height = 0 } = await image.metadata();
    if (!width || !height) throw new Error('could not read image dimensions');

    const keepHeight = Math.round(height * asset.keep);
    const top = Math.round((height - keepHeight) / 2);

    const output = await image
      .extract({ left: 0, top, width, height: keepHeight })
      .resize({ width: asset.width })
      .jpeg({ quality: 78, progressive: true, mozjpeg: true })
      .toBuffer();

    await writeFile(target, output);
    console.log(`✓ ${asset.out} — ${Math.round(output.length / 1024)} kB`);
    refreshed += 1;
  } catch (error) {
    const reason = error instanceof Error ? error.message : String(error);
    let existing = false;
    try {
      await access(target);
      existing = true;
    } catch {
      // No file at all; the build will render an empty band.
    }
    console.warn(
      `! ${asset.out} not refreshed (${reason}). ` +
        (existing ? 'Keeping the existing file.' : 'No local copy exists.'),
    );
  }
}

console.log(`Images: ${refreshed}/${ASSETS.length} refreshed.`);
