/**
 * Counting chamber geometry.
 *
 * A chamber is fully described for this purpose by the area of one counting
 * square and the depth of the ruled space beneath the coverslip. Their product
 * is the volume the count refers to, and it is the only chamber property the
 * arithmetic needs.
 *
 * Storing area and depth rather than the familiar 10⁴ multiplier is the point:
 * that factor is specific to a Neubauer improved chamber counted on its large
 * squares, and applying it to a Fuchs–Rosenthal — twice the depth — overstates
 * the count by a factor of two. The multiplier is derived here instead.
 */

export interface ChamberSpec {
  id: string;
  name: string;
  /** Area of one counting square, mm². */
  squareAreaMm2: number;
  /** Depth between the ruled floor and the coverslip, mm. */
  depthMm: number;
  note: string;
}

export const CHAMBERS: readonly ChamberSpec[] = [
  {
    id: 'neubauer-improved',
    name: 'Neubauer improved',
    squareAreaMm2: 1,
    depthMm: 0.1,
    note: 'The default in most laboratories. Count the four 1 mm² corner squares; each holds 0.1 µL, which is where the familiar × 10⁴ comes from.',
  },
  {
    id: 'fuchs-rosenthal',
    name: 'Fuchs–Rosenthal',
    squareAreaMm2: 1,
    depthMm: 0.2,
    note: 'Twice the depth of a Neubauer, so each square holds twice the volume. Used for sparse samples such as cerebrospinal fluid, where the extra volume is what makes a count possible.',
  },
  {
    id: 'burker-turk',
    name: 'Bürker–Türk',
    squareAreaMm2: 1,
    depthMm: 0.1,
    note: 'Same geometry as a Neubauer improved, with a different ruling pattern.',
  },
] as const;

export function getChamber(id: string): ChamberSpec | undefined {
  return CHAMBERS.find((chamber) => chamber.id === id);
}

/** Volume above one counting square, in millilitres. 1 mm³ is 1 µL. */
export function squareVolumeMl(chamber: Pick<ChamberSpec, 'squareAreaMm2' | 'depthMm'>): number {
  return (chamber.squareAreaMm2 * chamber.depthMm) / 1000;
}
