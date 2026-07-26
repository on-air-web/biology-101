/**
 * Structure parsing, for PDB and mmCIF.
 *
 * Both formats are supported because the PDB has served mmCIF as its default
 * since 2019 and the fixed-column PDB format cannot represent large
 * structures at all — a file downloaded today is as likely to be one as the
 * other, and asking a user to convert is asking them to leave.
 *
 * Only the alpha carbon trace is kept. Structural alignment works on it, it is
 * what TM-score is defined over, and it is roughly an eighth of the atoms, so
 * a ribosome stays manageable in a browser tab.
 *
 * Nothing here touches the network. Files are read locally and parsed locally,
 * which for unpublished structures is the whole point.
 */

import { AMINO_ACIDS } from './amino-acids';

export class StructureError extends Error {}

export interface Residue {
  /** Author sequence number, as written in the file. */
  number: number;
  insertionCode: string;
  /** Three-letter residue name as written. */
  name: string;
  /** One-letter code, or 'X' for anything non-standard. */
  code: string;
  x: number;
  y: number;
  z: number;
}

export interface Chain {
  id: string;
  residues: Residue[];
}

export interface Structure {
  /** Identifier from the file, or the filename where it carries none. */
  id: string;
  format: 'pdb' | 'mmcif';
  chains: Chain[];
  /** Models beyond the first are ignored; this says whether there were any. */
  modelCount: number;
}

const THREE_TO_ONE = new Map<string, string>(
  AMINO_ACIDS.map((acid) => [acid.threeLetter.toUpperCase(), acid.code]),
);

/**
 * Modified residues common enough that dropping them would break real
 * structures. Selenomethionine in particular is routine in crystallography —
 * it is how the phase problem gets solved — and treating it as unknown would
 * put a gap through the middle of a great many entries.
 */
const MODIFIED = new Map<string, string>([
  ['MSE', 'M'],
  ['SEC', 'C'],
  ['PYL', 'K'],
  ['HYP', 'P'],
  ['CSO', 'C'],
  ['PTR', 'Y'],
  ['SEP', 'S'],
  ['TPO', 'T'],
  ['MLY', 'K'],
  ['KCX', 'K'],
  ['LLP', 'K'],
  ['CME', 'C'],
]);

function oneLetter(name: string): string | undefined {
  const upper = name.toUpperCase().trim();
  return THREE_TO_ONE.get(upper) ?? MODIFIED.get(upper);
}

export function detectFormat(text: string): 'pdb' | 'mmcif' {
  // An mmCIF file opens with a data block header; the loop_ keyword and the
  // _atom_site category are the reliable tells inside one.
  if (/^data_/m.test(text) || /_atom_site\./.test(text)) return 'mmcif';
  return 'pdb';
}

function parsePdb(text: string, fallbackId: string): Structure {
  const chains = new Map<string, Chain>();
  const seen = new Set<string>();
  let id = fallbackId;
  let modelCount = 0;
  let inLaterModel = false;

  for (const line of text.split(/\r?\n/)) {
    if (line.startsWith('HEADER') && line.length >= 66) {
      const code = line.slice(62, 66).trim();
      if (code) id = code;
      continue;
    }
    if (line.startsWith('MODEL')) {
      modelCount += 1;
      // Everything after the first model is a duplicate of the same chain.
      inLaterModel = modelCount > 1;
      continue;
    }
    if (inLaterModel) continue;

    const isAtom = line.startsWith('ATOM  ');
    const isHetatm = line.startsWith('HETATM');
    if (!isAtom && !isHetatm) continue;

    const atomName = line.slice(12, 16).trim();
    if (atomName !== 'CA') continue;

    const residueName = line.slice(17, 20).trim();
    const code = oneLetter(residueName);
    // A HETATM alpha carbon is only a residue if it is a modified amino acid;
    // calcium is also "CA" and would otherwise be read as a residue.
    if (!code) continue;
    if (isHetatm && !MODIFIED.has(residueName.toUpperCase())) continue;

    // Keep the first altLoc only, so a disordered side chain does not
    // duplicate its residue.
    const altLoc = line.slice(16, 17).trim();
    if (altLoc !== '' && altLoc !== 'A' && altLoc !== '1') continue;

    const chainId = line.slice(21, 22).trim() || 'A';
    const number = Number.parseInt(line.slice(22, 26).trim(), 10);
    const insertionCode = line.slice(26, 27).trim();
    const x = Number.parseFloat(line.slice(30, 38));
    const y = Number.parseFloat(line.slice(38, 46));
    const z = Number.parseFloat(line.slice(46, 54));

    if (
      !Number.isFinite(number) ||
      !Number.isFinite(x) ||
      !Number.isFinite(y) ||
      !Number.isFinite(z)
    ) {
      continue;
    }

    const key = `${chainId}|${number}|${insertionCode}`;
    if (seen.has(key)) continue;
    seen.add(key);

    let chain = chains.get(chainId);
    if (!chain) {
      chain = { id: chainId, residues: [] };
      chains.set(chainId, chain);
    }
    chain.residues.push({ number, insertionCode, name: residueName, code, x, y, z });
  }

  return { id, format: 'pdb', chains: [...chains.values()], modelCount: Math.max(modelCount, 1) };
}

/** Splits an mmCIF value line, honouring single and double quoted fields. */
function splitCifRow(line: string): string[] {
  const out: string[] = [];
  let index = 0;
  while (index < line.length) {
    while (index < line.length && /\s/.test(line[index]!)) index += 1;
    if (index >= line.length) break;
    const quote = line[index];
    if (quote === "'" || quote === '"') {
      index += 1;
      let value = '';
      while (index < line.length && line[index] !== quote) {
        value += line[index];
        index += 1;
      }
      index += 1;
      out.push(value);
    } else {
      let value = '';
      while (index < line.length && !/\s/.test(line[index]!)) {
        value += line[index];
        index += 1;
      }
      out.push(value);
    }
  }
  return out;
}

function parseMmcif(text: string, fallbackId: string): Structure {
  const lines = text.split(/\r?\n/);
  let id = fallbackId;

  const dataBlock = lines.find((line) => line.startsWith('data_'));
  if (dataBlock) id = dataBlock.slice(5).trim() || fallbackId;

  // Locate the _atom_site loop and record the column order, which is declared
  // rather than fixed — the reason mmCIF can be read at all without a schema.
  let start = -1;
  const columns: string[] = [];
  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i]!.trim();
    if (line.startsWith('_atom_site.')) {
      if (columns.length === 0) {
        // Walk back to confirm this is inside a loop_.
        let j = i - 1;
        while (j >= 0 && lines[j]!.trim() === '') j -= 1;
        if (j < 0 || lines[j]!.trim() !== 'loop_') continue;
      }
      columns.push(line.slice('_atom_site.'.length).trim());
      start = i + 1;
    } else if (columns.length > 0) {
      break;
    }
  }

  if (columns.length === 0) {
    throw new StructureError(
      'No _atom_site records found. This does not look like a structure file.',
    );
  }

  const index = (name: string) => columns.indexOf(name);
  const iGroup = index('group_PDB');
  const iAtom = index('label_atom_id');
  const iAlt = index('label_alt_id');
  const iComp = index('label_comp_id');
  const iChain = index('auth_asym_id') >= 0 ? index('auth_asym_id') : index('label_asym_id');
  const iSeq = index('auth_seq_id') >= 0 ? index('auth_seq_id') : index('label_seq_id');
  const iIns = index('pdbx_PDB_ins_code');
  const iX = index('Cartn_x');
  const iY = index('Cartn_y');
  const iZ = index('Cartn_z');
  const iModel = index('pdbx_PDB_model_num');

  if (iAtom < 0 || iComp < 0 || iX < 0 || iY < 0 || iZ < 0) {
    throw new StructureError('The _atom_site loop is missing the columns needed for coordinates.');
  }

  const chains = new Map<string, Chain>();
  const seen = new Set<string>();
  const models = new Set<string>();
  let firstModel: string | undefined;

  for (let i = start; i < lines.length; i += 1) {
    const raw = lines[i]!;
    const trimmed = raw.trim();
    if (trimmed === '' || trimmed === '#') break;
    if (trimmed.startsWith('_') || trimmed.startsWith('loop_')) break;

    const fields = splitCifRow(raw);
    if (fields.length < columns.length) continue;

    if (iModel >= 0) {
      const model = fields[iModel]!;
      models.add(model);
      firstModel ??= model;
      if (model !== firstModel) continue;
    }

    if (fields[iAtom]!.replace(/"/g, '') !== 'CA') continue;

    const residueName = fields[iComp]!;
    const code = oneLetter(residueName);
    if (!code) continue;
    if (iGroup >= 0 && fields[iGroup] === 'HETATM' && !MODIFIED.has(residueName.toUpperCase())) {
      continue;
    }

    const alt = iAlt >= 0 ? fields[iAlt]! : '.';
    if (alt !== '.' && alt !== '?' && alt !== 'A' && alt !== '1') continue;

    const chainId = iChain >= 0 ? fields[iChain]! : 'A';
    const number = Number.parseInt(iSeq >= 0 ? fields[iSeq]! : '0', 10);
    const insertionRaw = iIns >= 0 ? fields[iIns]! : '';
    const insertionCode = insertionRaw === '?' || insertionRaw === '.' ? '' : insertionRaw;
    const x = Number.parseFloat(fields[iX]!);
    const y = Number.parseFloat(fields[iY]!);
    const z = Number.parseFloat(fields[iZ]!);

    if (
      !Number.isFinite(number) ||
      !Number.isFinite(x) ||
      !Number.isFinite(y) ||
      !Number.isFinite(z)
    ) {
      continue;
    }

    const key = `${chainId}|${number}|${insertionCode}`;
    if (seen.has(key)) continue;
    seen.add(key);

    let chain = chains.get(chainId);
    if (!chain) {
      chain = { id: chainId, residues: [] };
      chains.set(chainId, chain);
    }
    chain.residues.push({ number, insertionCode, name: residueName, code, x, y, z });
  }

  return {
    id,
    format: 'mmcif',
    chains: [...chains.values()],
    modelCount: Math.max(models.size, 1),
  };
}

export function parseStructure(text: string, fallbackId = 'structure'): Structure {
  if (text.trim() === '') throw new StructureError('The file is empty.');

  const format = detectFormat(text);
  const structure = format === 'mmcif' ? parseMmcif(text, fallbackId) : parsePdb(text, fallbackId);

  const total = structure.chains.reduce((sum, chain) => sum + chain.residues.length, 0);
  if (total === 0) {
    throw new StructureError(
      'No alpha carbons were found. This file may contain only ligands or nucleic acids, which this tool does not align.',
    );
  }

  // Longest first: the chain someone means is almost always the biggest one.
  structure.chains.sort((a, b) => b.residues.length - a.residues.length);
  return structure;
}

export function chainSequence(chain: Chain): string {
  return chain.residues.map((residue) => residue.code).join('');
}
