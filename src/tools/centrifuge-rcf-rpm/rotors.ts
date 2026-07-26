/**
 * Rotor geometry by class, not by part number.
 *
 * Every figure here is nominal — a round number typical of the class, not a
 * specification. Real rotors within a class vary by roughly ±10%, which is
 * ±10% in RCF, and the interface says so next to the selector.
 *
 * Naming classes rather than models is deliberate. A table of named rotors
 * (JA-20, SW 41 Ti, F-45-30-11) would be more useful and is worth building,
 * but the numbers would have to come from manufacturer specification sheets
 * whose terms need checking first, and a half-remembered part number is worse
 * than an honest approximation: it invites the precision it cannot support.
 *
 * The radii are the starting point, not the answer. Both fields stay editable
 * and anyone with the manual to hand should use it.
 */

export interface RotorClass {
  id: string;
  name: string;
  /** Axis to the bottom of the tube, centimetres. */
  maxRadiusCm: number;
  /** Axis to the top of the liquid column, centimetres. */
  minRadiusCm: number;
}

export const ROTOR_CLASSES: readonly RotorClass[] = [
  {
    id: 'microfuge',
    name: 'Microcentrifuge, 1.5–2 mL fixed-angle',
    maxRadiusCm: 8.5,
    minRadiusCm: 4,
  },
  {
    id: 'benchtop-fixed',
    name: 'Benchtop fixed-angle, 15–50 mL',
    maxRadiusCm: 10.8,
    minRadiusCm: 4.5,
  },
  {
    id: 'benchtop-swing',
    name: 'Benchtop swing-out, 15–50 mL',
    maxRadiusCm: 16,
    minRadiusCm: 7,
  },
  {
    id: 'floor-fixed',
    name: 'High-speed floor fixed-angle',
    maxRadiusCm: 10.8,
    minRadiusCm: 4,
  },
  {
    id: 'ultra-swing',
    name: 'Ultracentrifuge swinging bucket',
    maxRadiusCm: 15.3,
    minRadiusCm: 6.7,
  },
] as const;

export function getRotorClass(id: string): RotorClass | undefined {
  return ROTOR_CLASSES.find((rotor) => rotor.id === id);
}
