/**
 * Downloads and optimises the photographic assets listed in src/lib/images.ts.
 *
 * The originals are multi-megabyte PNGs. Shipping those to a static site would
 * undo every performance decision in this project, so they are cropped to band
 * proportions and re-encoded as progressive JPEG.
 *
 * Run once after cloning, or whenever the manifest changes:
 *   npm run images
 */
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import sharp from 'sharp';

// Kept in step with src/lib/images.ts by hand. Deliberately duplicated rather
// than imported: this script runs in plain Node, outside the TypeScript build.
const ASSETS = [
  {
    out: 'zebrafish-vasculature.jpg',
    url: 'https://nigms.nih.gov/sites/nigms/files/image-and-video-gallery/stiched_fish_blending_high_contrast.png',
    width: 1600,
    /** Fraction of source height to keep, centred. Crops empty black margins
     *  without cropping the organism itself. */
    keep: 0.62,
  },
  {
    out: 'microtubules-storm.jpg',
    url: 'https://nigms.nih.gov/sites/nigms/files/image-and-video-gallery/MicrotubulesinMonkeyCells.png',
    width: 1400,
    keep: 0.55,
  },
];

const OUT_DIR = join('public', 'images');

await mkdir(OUT_DIR, { recursive: true });

for (const asset of ASSETS) {
  process.stdout.write(`Fetching ${asset.out}… `);

  const response = await fetch(asset.url);
  if (!response.ok) {
    console.error(`failed (${response.status})`);
    process.exitCode = 1;
    continue;
  }

  const input = Buffer.from(await response.arrayBuffer());
  const image = sharp(input);
  const { width = 0, height = 0 } = await image.metadata();

  const keepHeight = Math.round(height * asset.keep);
  const top = Math.round((height - keepHeight) / 2);

  const output = await image
    .extract({ left: 0, top, width, height: keepHeight })
    .resize({ width: asset.width })
    .jpeg({ quality: 78, progressive: true, mozjpeg: true })
    .toBuffer();

  await writeFile(join(OUT_DIR, asset.out), output);
  console.log(`${Math.round(output.length / 1024)} kB`);
}

console.log('Done. Commit the files in public/images.');
