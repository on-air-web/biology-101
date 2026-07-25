/**
 * Buffer reference data.
 *
 * Every entry carries a temperature coefficient, because pKa is not a
 * constant and a buffer calculator that treats it as one gives the wrong
 * answer for anything prepared at the bench and used in the cold room. Tris
 * moves by 0.028 pH units per degree: a pH 8.0 Tris buffer adjusted at 25 °C
 * sits near pH 8.6 at 4 °C, which is enough to change an enzyme assay.
 *
 * Formulae rather than molecular weights are stored, so the mass is derived by
 * the same parser the molecular weight calculator uses. One fewer number to
 * mistype, and hydrates are handled for free.
 *
 * Values are the conventional ones from Good et al. (1966) and standard
 * supplier tables. Marked drafted until someone with a pH meter checks them.
 */

export interface BufferSpecies {
  /** What you would order or weigh out. */
  name: string;
  /** Chemical formula, parsed for molar mass. */
  formula: string;
}

export interface BufferSpec {
  id: string;
  name: string;
  /** pKa at 25 °C. */
  pKa25: number;
  /** Change in pKa per degree Celsius. Negative for most amine buffers. */
  dpKadT: number;
  /** Range over which the buffer actually buffers, conventionally pKa ± 1. */
  usefulRange: [number, number];
  /** Protonated form — the acid. */
  acid: BufferSpecies;
  /** Deprotonated form — the conjugate base. */
  base: BufferSpecies;
  /** Practical warning worth knowing before you choose it. */
  note?: string;
}

export const BUFFERS: readonly BufferSpec[] = [
  {
    id: 'tris',
    name: 'Tris',
    pKa25: 8.06,
    dpKadT: -0.028,
    usefulRange: [7.0, 9.0],
    acid: { name: 'Tris·HCl', formula: 'C4H12ClNO3' },
    base: { name: 'Tris base', formula: 'C4H11NO3' },
    note:
      'The largest temperature coefficient in common use. Adjust the pH at the temperature you ' +
      'will work at, not on the bench. Tris also binds some metal ions and interferes with ' +
      'protein assays that use the Bradford reagent.',
  },
  {
    id: 'hepes',
    name: 'HEPES',
    pKa25: 7.48,
    dpKadT: -0.014,
    usefulRange: [6.8, 8.2],
    acid: { name: 'HEPES free acid', formula: 'C8H18N2O4S' },
    base: { name: 'HEPES sodium salt', formula: 'C8H17N2NaO4S' },
    note:
      'The usual choice for cell culture at physiological pH. Forms radicals under illumination, ' +
      'so it is a poor match for live imaging over long periods.',
  },
  {
    id: 'phosphate',
    name: 'Sodium phosphate',
    pKa25: 7.2,
    dpKadT: -0.0028,
    usefulRange: [5.8, 8.0],
    acid: { name: 'Sodium phosphate monobasic (NaH₂PO₄)', formula: 'NaH2PO4' },
    base: { name: 'Sodium phosphate dibasic (Na₂HPO₄)', formula: 'Na2HPO4' },
    note:
      'Almost temperature independent, which is its main advantage. It precipitates with calcium ' +
      'and magnesium, inhibits many enzymes, and is a poor choice above pH 8.',
  },
  {
    id: 'mes',
    name: 'MES',
    pKa25: 6.15,
    dpKadT: -0.011,
    usefulRange: [5.5, 6.7],
    acid: { name: 'MES free acid', formula: 'C6H13NO4S' },
    base: { name: 'MES sodium salt', formula: 'C6H12NNaO4S' },
    note: 'A Good\u2019s buffer for the acidic end, with little metal binding.',
  },
  {
    id: 'mops',
    name: 'MOPS',
    pKa25: 7.2,
    dpKadT: -0.013,
    usefulRange: [6.5, 7.9],
    acid: { name: 'MOPS free acid', formula: 'C7H15NO4S' },
    base: { name: 'MOPS sodium salt', formula: 'C7H14NNaO4S' },
    note: 'Common in RNA work and bacterial media. Absorbs in the UV below about 230 nm.',
  },
  {
    id: 'pipes',
    name: 'PIPES',
    pKa25: 6.76,
    dpKadT: -0.0085,
    usefulRange: [6.1, 7.5],
    acid: { name: 'PIPES free acid', formula: 'C8H18N2O6S2' },
    base: { name: 'PIPES disodium salt', formula: 'C8H16N2Na2O6S2' },
    note: 'Poorly soluble as the free acid; dissolve by adding base first.',
  },
  {
    id: 'acetate',
    name: 'Sodium acetate',
    pKa25: 4.76,
    dpKadT: 0.0002,
    usefulRange: [3.8, 5.8],
    acid: { name: 'Acetic acid', formula: 'C2H4O2' },
    base: { name: 'Sodium acetate (anhydrous)', formula: 'C2H3NaO2' },
    note: 'Effectively temperature independent. Volatile as the acid, so it smells.',
  },
  {
    id: 'bicine',
    name: 'Bicine',
    pKa25: 8.35,
    dpKadT: -0.018,
    usefulRange: [7.6, 9.0],
    acid: { name: 'Bicine free acid', formula: 'C6H13NO4' },
    base: { name: 'Bicine sodium salt', formula: 'C6H12NNaO4' },
  },
  {
    id: 'tricine',
    name: 'Tricine',
    pKa25: 8.15,
    dpKadT: -0.021,
    usefulRange: [7.4, 8.8],
    acid: { name: 'Tricine free acid', formula: 'C6H13NO5' },
    base: { name: 'Tricine sodium salt', formula: 'C6H12NNaO5' },
    note: 'Used in the cathode buffer for Tricine-SDS-PAGE, which resolves small peptides.',
  },
  {
    id: 'imidazole',
    name: 'Imidazole',
    pKa25: 6.95,
    dpKadT: -0.02,
    usefulRange: [6.2, 7.8],
    acid: { name: 'Imidazole hydrochloride', formula: 'C3H5ClN2' },
    base: { name: 'Imidazole', formula: 'C3H4N2' },
    note:
      'Binds divalent metals strongly, which is why it elutes His-tagged protein from nickel ' +
      'resin \u2014 and why it is a poor buffer for anything metal dependent.',
  },
  {
    id: 'glycine',
    name: 'Glycine (amino group)',
    pKa25: 9.78,
    dpKadT: -0.025,
    usefulRange: [8.8, 10.6],
    acid: { name: 'Glycine', formula: 'C2H5NO2' },
    base: { name: 'Glycine sodium salt', formula: 'C2H4NNaO2' },
    note: 'The alkaline pKa. Glycine also buffers near pH 2.35 through its carboxyl group.',
  },
  {
    id: 'caps',
    name: 'CAPS',
    pKa25: 10.4,
    dpKadT: -0.032,
    usefulRange: [9.7, 11.1],
    acid: { name: 'CAPS free acid', formula: 'C9H19NO3S' },
    base: { name: 'CAPS sodium salt', formula: 'C9H18NNaO3S' },
    note: 'The usual transfer buffer for blotting proteins that need alkaline conditions.',
  },
] as const;

export function getBuffer(id: string): BufferSpec | undefined {
  return BUFFERS.find((buffer) => buffer.id === id);
}

/** Buffers whose useful range covers a given pH, best-centred first. */
export function buffersForPh(ph: number): BufferSpec[] {
  return BUFFERS.filter(
    (buffer) => ph >= buffer.usefulRange[0] && ph <= buffer.usefulRange[1],
  ).sort((a, b) => Math.abs(a.pKa25 - ph) - Math.abs(b.pKa25 - ph));
}
