/**
 * Culture vessel geometry.
 *
 * Nominal figures for standard SBS plates and common flasks and dishes. They
 * are starting values in editable fields, not specifications: growth areas
 * differ a little between manufacturers, and treated surfaces differ more.
 *
 * Two numbers are stored per plate that are not independent — the growth area
 * and the well diameter. Keeping both is deliberate: they come from different
 * places in a supplier's catalogue, and `vessels.test.ts` checks the area
 * against πr² from the diameter. A typo in either shows up as a disagreement
 * rather than as a quietly wrong seeding density.
 *
 * Working volume doubles as the fill volume when reading optical density in a
 * plate, which is the same physical quantity and one fewer number to keep
 * consistent.
 */

export type VesselKind = 'plate' | 'flask' | 'dish';

export interface Vessel {
  id: string;
  name: string;
  kind: VesselKind;
  /** Growth area per well, or per vessel where there are no wells, cm². */
  growthAreaCm2: number;
  /** Typical working volume of medium per well or vessel, mL. */
  workingVolumeMl: number;
  /** Wells per plate. Absent for flasks and dishes. */
  wells?: number;
  /**
   * Flat-bottom well diameter, mm. Plates only, and the reason it is here is
   * optical path length: a plate reader looks down through the liquid, so the
   * depth depends on this and the fill volume.
   */
  wellDiameterMm?: number;
}

export const VESSELS: readonly Vessel[] = [
  {
    id: '96-well',
    name: '96-well plate',
    kind: 'plate',
    growthAreaCm2: 0.32,
    workingVolumeMl: 0.2,
    wells: 96,
    wellDiameterMm: 6.4,
  },
  {
    id: '48-well',
    name: '48-well plate',
    kind: 'plate',
    growthAreaCm2: 0.95,
    workingVolumeMl: 0.5,
    wells: 48,
    wellDiameterMm: 11.1,
  },
  {
    id: '24-well',
    name: '24-well plate',
    kind: 'plate',
    growthAreaCm2: 1.9,
    workingVolumeMl: 1,
    wells: 24,
    wellDiameterMm: 15.6,
  },
  {
    id: '12-well',
    name: '12-well plate',
    kind: 'plate',
    growthAreaCm2: 3.8,
    workingVolumeMl: 2,
    wells: 12,
    wellDiameterMm: 22.1,
  },
  {
    id: '6-well',
    name: '6-well plate',
    kind: 'plate',
    growthAreaCm2: 9.6,
    workingVolumeMl: 2.5,
    wells: 6,
    wellDiameterMm: 34.8,
  },
  { id: 'dish-35', name: '35 mm dish', kind: 'dish', growthAreaCm2: 9.6, workingVolumeMl: 2 },
  { id: 'dish-60', name: '60 mm dish', kind: 'dish', growthAreaCm2: 21, workingVolumeMl: 5 },
  { id: 'dish-100', name: '100 mm dish', kind: 'dish', growthAreaCm2: 56.7, workingVolumeMl: 10 },
  { id: 't25', name: 'T25 flask', kind: 'flask', growthAreaCm2: 25, workingVolumeMl: 5 },
  { id: 't75', name: 'T75 flask', kind: 'flask', growthAreaCm2: 75, workingVolumeMl: 15 },
  { id: 't175', name: 'T175 flask', kind: 'flask', growthAreaCm2: 175, workingVolumeMl: 35 },
] as const;

export function getVessel(id: string): Vessel | undefined {
  return VESSELS.find((vessel) => vessel.id === id);
}

/** Plates only — the vessels whose optical path length can be derived. */
export function getPlates(): Vessel[] {
  return VESSELS.filter((vessel) => vessel.wellDiameterMm !== undefined);
}
