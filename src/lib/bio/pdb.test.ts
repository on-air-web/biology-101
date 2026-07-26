import { describe, expect, it } from 'vitest';
import { StructureError, chainSequence, detectFormat, parseStructure } from './pdb';

/**
 * Fixtures are written by hand to exercise one hazard each, so the expected
 * result is exact by construction. PDB is a fixed-column format, so the column
 * positions below are load-bearing and the strings must not be reformatted.
 */

/** Builds a valid 80-column ATOM record, so tests state intent not padding. */
function atom(
  serial: number,
  atomName: string,
  resName: string,
  chain: string,
  resSeq: number,
  x: number,
  y: number,
  z: number,
  { record = 'ATOM  ', altLoc = ' ', iCode = ' ' } = {},
): string {
  return (
    record +
    String(serial).padStart(5) +
    ' ' +
    atomName.padEnd(4).slice(0, 4) +
    altLoc +
    resName.padStart(3) +
    ' ' +
    chain +
    String(resSeq).padStart(4) +
    iCode +
    '   ' +
    x.toFixed(3).padStart(8) +
    y.toFixed(3).padStart(8) +
    z.toFixed(3).padStart(8)
  );
}

const SIMPLE = [
  atom(1, 'N', 'MET', 'A', 1, 0, 0, 0),
  atom(2, 'CA', 'MET', 'A', 1, 1, 0, 0),
  atom(3, 'C', 'MET', 'A', 1, 2, 0, 0),
  atom(4, 'CA', 'LYS', 'A', 2, 4.8, 0, 0),
  atom(5, 'CA', 'TRP', 'A', 3, 9.6, 0, 0),
  atom(6, 'CA', 'GLY', 'B', 1, 0, 20, 0),
  atom(7, 'CA', 'ALA', 'B', 2, 3.8, 20, 0),
  'END',
].join('\n');

describe('format detection', () => {
  it('tells the two formats apart', () => {
    expect(detectFormat(SIMPLE)).toBe('pdb');
    expect(detectFormat('data_1ABC\nloop_\n_atom_site.id\n')).toBe('mmcif');
    expect(detectFormat('#\nloop_\n_atom_site.group_PDB\n')).toBe('mmcif');
  });
});

describe('PDB parsing', () => {
  it('keeps only alpha carbons, and groups them into chains', () => {
    const structure = parseStructure(SIMPLE);
    expect(structure.format).toBe('pdb');
    expect(structure.chains).toHaveLength(2);
    // Longest chain first.
    expect(structure.chains[0]!.id).toBe('A');
    expect(chainSequence(structure.chains[0]!)).toBe('MKW');
    expect(chainSequence(structure.chains[1]!)).toBe('GA');
  });

  it('reads coordinates from their fixed columns', () => {
    const first = parseStructure(SIMPLE).chains[0]!.residues[0]!;
    expect(first).toMatchObject({ number: 1, name: 'MET', code: 'M' });
    expect(first.x).toBeCloseTo(1, 6);
    expect(first.y).toBeCloseTo(0, 6);
  });

  /**
   * Coordinates are F8.3, so the widest values the format can hold are
   * -999.999 and 9999.999 — eight characters each, which run together with no
   * separating space. Splitting on whitespace would read this line as two
   * numbers instead of three, which is why the parser slices columns.
   */
  it('handles negative and tightly packed coordinates', () => {
    const line = atom(2, 'CA', 'ALA', 'A', 1, -123.456, -999.999, 9999.999);
    expect(line.slice(30, 54)).toBe('-123.456-999.9999999.999');

    const residue = parseStructure(line).chains[0]!.residues[0]!;
    expect(residue.x).toBeCloseTo(-123.456, 3);
    expect(residue.y).toBeCloseTo(-999.999, 3);
    expect(residue.z).toBeCloseTo(9999.999, 3);
  });

  /** Calcium is also called CA. Reading it as a residue would corrupt a trace. */
  it('does not mistake a calcium ion for an alpha carbon', () => {
    const withCalcium = [
      atom(1, 'CA', 'ALA', 'A', 1, 0, 0, 0),
      atom(2, 'CA', ' CA', 'A', 2, 5, 0, 0, { record: 'HETATM' }),
      atom(3, 'CA', 'GLY', 'A', 3, 10, 0, 0),
    ].join('\n');
    expect(chainSequence(parseStructure(withCalcium).chains[0]!)).toBe('AG');
  });

  /** Selenomethionine is routine in crystallography and must not become a gap. */
  it('accepts modified residues that stand in for standard ones', () => {
    const withMse = [
      atom(1, 'CA', 'ALA', 'A', 1, 0, 0, 0),
      atom(2, 'CA', 'MSE', 'A', 2, 4, 0, 0, { record: 'HETATM' }),
      atom(3, 'CA', 'GLY', 'A', 3, 8, 0, 0),
    ].join('\n');
    expect(chainSequence(parseStructure(withMse).chains[0]!)).toBe('AMG');
  });

  it('takes one alternate location, not both', () => {
    const disordered = [
      atom(1, 'CA', 'SER', 'A', 1, 0, 0, 0, { altLoc: 'A' }),
      atom(2, 'CA', 'SER', 'A', 1, 0.4, 0, 0, { altLoc: 'B' }),
      atom(3, 'CA', 'GLY', 'A', 2, 4, 0, 0),
    ].join('\n');
    const residues = parseStructure(disordered).chains[0]!.residues;
    expect(residues).toHaveLength(2);
    expect(residues[0]!.x).toBeCloseTo(0, 6);
  });

  it('keeps insertion codes apart rather than collapsing them', () => {
    const inserted = [
      atom(1, 'CA', 'ALA', 'A', 52, 0, 0, 0),
      atom(2, 'CA', 'GLY', 'A', 52, 4, 0, 0, { iCode: 'A' }),
      atom(3, 'CA', 'TRP', 'A', 53, 8, 0, 0),
    ].join('\n');
    const residues = parseStructure(inserted).chains[0]!.residues;
    expect(residues).toHaveLength(3);
    expect(residues[1]!.insertionCode).toBe('A');
  });

  /** An NMR ensemble holds the same chain many times over. */
  it('reads the first model only', () => {
    const ensemble = [
      'MODEL        1',
      atom(1, 'CA', 'ALA', 'A', 1, 0, 0, 0),
      atom(2, 'CA', 'GLY', 'A', 2, 4, 0, 0),
      'ENDMDL',
      'MODEL        2',
      atom(1, 'CA', 'ALA', 'A', 1, 99, 99, 99),
      atom(2, 'CA', 'GLY', 'A', 2, 99, 99, 99),
      'ENDMDL',
    ].join('\n');
    const structure = parseStructure(ensemble);
    expect(structure.modelCount).toBe(2);
    expect(structure.chains[0]!.residues).toHaveLength(2);
    expect(structure.chains[0]!.residues[0]!.x).toBeCloseTo(0, 6);
  });

  it('takes the entry code from the header when there is one', () => {
    const header = 'HEADER    HYDROLASE                               01-JAN-00   1ABC';
    expect(parseStructure(`${header}\n${SIMPLE}`).id).toBe('1ABC');
    expect(parseStructure(SIMPLE, 'my-model.pdb').id).toBe('my-model.pdb');
  });
});

describe('mmCIF parsing', () => {
  const MMCIF = `data_1XYZ
#
loop_
_atom_site.group_PDB
_atom_site.id
_atom_site.label_atom_id
_atom_site.label_alt_id
_atom_site.label_comp_id
_atom_site.auth_asym_id
_atom_site.auth_seq_id
_atom_site.pdbx_PDB_ins_code
_atom_site.Cartn_x
_atom_site.Cartn_y
_atom_site.Cartn_z
_atom_site.pdbx_PDB_model_num
ATOM 1 N . MET A 1 ? 0.000 0.000 0.000 1
ATOM 2 CA . MET A 1 ? 1.000 0.000 0.000 1
ATOM 3 CA . LYS A 2 ? 4.800 0.000 0.000 1
HETATM 4 CA . MSE A 3 ? 9.600 0.000 0.000 1
HETATM 5 CA . CA B 9 ? 30.000 0.000 0.000 1
ATOM 6 CA . GLY C 1 ? 0.000 20.000 0.000 1
ATOM 7 CA . MET A 1 ? 99.000 99.000 99.000 2
#
`;

  it('reads the declared column order rather than fixed positions', () => {
    const structure = parseStructure(MMCIF);
    expect(structure.format).toBe('mmcif');
    expect(structure.id).toBe('1XYZ');
    expect(chainSequence(structure.chains[0]!)).toBe('MKM');
  });

  it('ignores the calcium HETATM but keeps the selenomethionine', () => {
    const structure = parseStructure(MMCIF);
    expect(structure.chains.map((chain) => chain.id)).toEqual(['A', 'C']);
  });

  it('reads the first model only', () => {
    const structure = parseStructure(MMCIF);
    expect(structure.modelCount).toBe(2);
    expect(structure.chains[0]!.residues[0]!.x).toBeCloseTo(1, 6);
  });

  it('honours quoted fields, which chain ids sometimes need', () => {
    const quoted = MMCIF.replace('ATOM 6 CA . GLY C 1', "ATOM 6 CA . GLY 'C D' 1");
    expect(parseStructure(quoted).chains.map((c) => c.id)).toContain('C D');
  });

  it('refuses a file with no atom_site loop', () => {
    expect(() => parseStructure('data_1ABC\n_cell.length_a 1.0\n')).toThrow(StructureError);
  });
});

describe('refusing rather than guessing', () => {
  it('rejects an empty file', () => {
    expect(() => parseStructure('   \n')).toThrow(StructureError);
  });

  it('explains a file with no alpha carbons instead of returning nothing', () => {
    const dna = [
      'ATOM      1  P    DA A   1       0.000   0.000   0.000',
      "ATOM      2  C1'  DA A   1       1.000   0.000   0.000",
    ].join('\n');
    expect(() => parseStructure(dna)).toThrow(/No alpha carbons/);
  });
});
