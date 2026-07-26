/**
 * Draws the brand assets that cannot be React components.
 *
 * The favicon, the touch icon and the link card are files on disk, but their
 * geometry comes from src/lib/brand/geometry.ts — the same module the nav mark
 * and the section banners render from. That is the point: the favicon cannot
 * drift away from the logo, because there is only one description of the
 * shape.
 *
 * Run with `npm run brand`. Output is committed, so a normal build needs
 * neither this script nor a rasteriser. Unlike `npm run images` this is not
 * fetching anything, so it is safe to fail loudly.
 */
import sharp from 'sharp';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  MARK_NODE,
  MARK_SIZE,
  MARK_STROKE,
  buildMolecularField,
  ringPoints,
} from '../src/lib/brand/geometry.ts';

const APP = 'src/app';
const GREEN = '#4ade80';
const BLACK = '#000000';
const INK = '#fafafa';
const MUTED = '#a3a3a3';

/**
 * The link card is the one asset that needs real type and cannot get it for
 * free. sharp rasterises SVG through the operating system's font database, so
 * it sees installed fonts only — it ignores FONTCONFIG_FILE, FONTCONFIG_PATH
 * and an @font-face with a base64 payload, all three of which were measured
 * to produce output byte-identical to the fallback. next/font self-hosts Plex
 * as woff2 inside .next, which is no help here.
 *
 * So the stack asks for Plex and degrades to a neutral grotesque. The card is
 * committed, so this only matters on the machine that regenerates it, and the
 * warning below says which one was actually used rather than leaving someone
 * to spot it by eye.
 */
const SANS = 'IBM Plex Sans, Helvetica Neue, Helvetica, Arial, sans-serif';
const MONO = 'IBM Plex Mono, Menlo, Consolas, monospace';

async function hasFont(family) {
  const probe = (f) =>
    Buffer.from(
      `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="80"><text x="4" y="56" font-family="${f}" font-size="44">Biology 101 gQ</text></svg>`,
    );
  const [named, missing] = await Promise.all([
    sharp(probe(family)).png().toBuffer(),
    sharp(probe('__DefinitelyNotAFont__')).png().toBuffer(),
  ]);
  return !named.equals(missing);
}

/** The mark on its own tile, for contexts that cannot inherit a background. */
function markTile(size, { rounded = true } = {}) {
  const radius = rounded ? MARK_SIZE * 0.22 : 0;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${MARK_SIZE} ${MARK_SIZE}" width="${size}" height="${size}">
  <rect width="${MARK_SIZE}" height="${MARK_SIZE}" rx="${radius}" fill="${BLACK}"/>
  <polygon points="${ringPoints()}" fill="none" stroke="${GREEN}" stroke-width="${MARK_STROKE}" stroke-linejoin="round"/>
  <circle cx="${MARK_NODE.x}" cy="${MARK_NODE.y}" r="${MARK_NODE.haloRadius}" fill="${BLACK}"/>
  <circle cx="${MARK_NODE.x}" cy="${MARK_NODE.y}" r="${MARK_NODE.radius}" fill="${GREEN}"/>
</svg>`;
}

const OG_W = 1200;
const OG_H = 630;

function linkCard() {
  const { rings, bonds, nodes } = buildMolecularField(20260725, OG_W, OG_H, 30, 90);

  // Dimmed hard against the artwork's normal strength: this sits behind type
  // at thumbnail size, where a busy field reads as noise rather than texture.
  const field = [
    ...rings.map(
      (r) =>
        `<polygon points="${r.points}" fill="none" stroke="${r.colour}" stroke-width="${r.width.toFixed(2)}" opacity="${(r.opacity * 0.55).toFixed(3)}"/>`,
    ),
    ...bonds.map(
      (b) =>
        `<line x1="${b.x1.toFixed(1)}" y1="${b.y1.toFixed(1)}" x2="${b.x2.toFixed(1)}" y2="${b.y2.toFixed(1)}" stroke="#7fb6e8" stroke-width="${b.width.toFixed(2)}" opacity="${(b.opacity * 0.55).toFixed(3)}"/>`,
    ),
    ...nodes.map(
      (n) =>
        `<circle cx="${n.x.toFixed(1)}" cy="${n.y.toFixed(1)}" r="${n.radius.toFixed(2)}" fill="${n.colour}" opacity="${(n.opacity * 0.55).toFixed(3)}"/>`,
    ),
  ].join('');

  const markScale = 108 / MARK_SIZE;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${OG_W}" height="${OG_H}" viewBox="0 0 ${OG_W} ${OG_H}">
  <rect width="${OG_W}" height="${OG_H}" fill="${BLACK}"/>
  <g>${field}</g>
  <rect width="${OG_W}" height="${OG_H}" fill="${BLACK}" opacity="0.5"/>

  <g transform="translate(96 232) scale(${markScale})">
    <polygon points="${ringPoints()}" fill="none" stroke="${GREEN}" stroke-width="${MARK_STROKE}" stroke-linejoin="round"/>
    <circle cx="${MARK_NODE.x}" cy="${MARK_NODE.y}" r="${MARK_NODE.haloRadius}" fill="${BLACK}"/>
    <circle cx="${MARK_NODE.x}" cy="${MARK_NODE.y}" r="${MARK_NODE.radius}" fill="${GREEN}"/>
  </g>

  <text x="232" y="322" font-family="${SANS}"
        font-size="86" font-weight="700" letter-spacing="-2" fill="${INK}">Biology<tspan fill="${GREEN}"> 101</tspan></text>

  <text x="98" y="392" font-family="${SANS}"
        font-size="31" font-weight="400" fill="${MUTED}">Your one stop shop for biology.</text>

  <line x1="98" y1="440" x2="322" y2="440" stroke="${GREEN}" stroke-width="3"/>

  <text x="98" y="492" font-family="${MONO}"
        font-size="25" fill="${MUTED}">Calculators · sequence tools · statistics</text>
  <text x="98" y="534" font-family="${MONO}"
        font-size="25" fill="${MUTED}">Runs in your browser. Nothing is uploaded.</text>
</svg>`;
}

// The favicon stays vector: it is the one asset browsers scale to arbitrary
// sizes, and 900 bytes of SVG beats a pile of PNG rungs.
writeFileSync(join(APP, 'icon.svg'), markTile(MARK_SIZE));

await sharp(Buffer.from(markTile(180)))
  .png()
  .toFile(join(APP, 'apple-icon.png'));
await sharp(Buffer.from(linkCard())).png().toFile(join(APP, 'opengraph-image.png'));

if (!(await hasFont('IBM Plex Sans'))) {
  console.warn(
    '! IBM Plex is not installed, so the link card fell back to a system sans.\n' +
      '  The site itself is unaffected — next/font self-hosts Plex for the browser.\n' +
      '  For exact brand type on the card, install IBM Plex Sans and Mono into\n' +
      '  ~/Library/Fonts and run this again.',
  );
}

console.log('brand assets written:');
console.log('  src/app/icon.svg              favicon, vector');
console.log('  src/app/apple-icon.png        180x180 touch icon');
console.log(`  src/app/opengraph-image.png   ${OG_W}x${OG_H} link card`);
