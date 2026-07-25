/**
 * Delimited data.
 *
 * Turns whatever a spreadsheet produces into named columns a calculator can
 * use. Real exports are messier than the examples: mixed delimiters, quoted
 * fields containing commas, blank trailing rows, headers that are sometimes
 * there and sometimes not.
 *
 * Pure and framework-free. Nothing here reads a file — that is the UI's job,
 * and it does it with FileReader, so the data never leaves the browser.
 */

export class TableError extends Error {}

export interface Column {
  /** Header if the file had one, otherwise a positional name. */
  name: string;
  /** Zero-based position in the source. */
  index: number;
  /** Parsed values, with unparseable cells dropped. */
  values: number[];
  /** Cells that could not be read as numbers. */
  skipped: number;
  /** False when the column is text — a label column, typically. */
  numeric: boolean;
}

export interface ParsedTable {
  columns: Column[];
  rowCount: number;
  headerDetected: boolean;
  delimiter: string;
}

const DELIMITERS = [
  { name: 'tab', value: '\t' },
  { name: 'comma', value: ',' },
  { name: 'semicolon', value: ';' },
] as const;

/**
 * Picks the delimiter that yields the most consistent column count.
 *
 * Counting occurrences alone is misleading: a decimal comma or a quoted field
 * will win on frequency while producing ragged rows.
 */
function detectDelimiter(lines: string[]): string {
  let best = { delimiter: ',', score: -1 };

  for (const candidate of DELIMITERS) {
    const counts = lines.slice(0, 20).map((line) => splitRow(line, candidate.value).length);
    if (counts.length === 0) continue;
    const columns = counts[0]!;
    if (columns < 2) continue;
    const consistent = counts.filter((count) => count === columns).length / counts.length;
    const score = consistent * 100 + columns;
    if (score > best.score) best = { delimiter: candidate.value, score };
  }

  // A single column of numbers is a legitimate table with no delimiter at all.
  return best.score < 0 ? ',' : best.delimiter;
}

/** Splits one row, honouring double-quoted fields. */
function splitRow(line: string, delimiter: string): string[] {
  const cells: string[] = [];
  let current = '';
  let inQuotes = false;

  for (let index = 0; index < line.length; index += 1) {
    const character = line[index]!;

    if (character === '"') {
      // A doubled quote inside a quoted field is an escaped quote.
      if (inQuotes && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (character === delimiter && !inQuotes) {
      cells.push(current);
      current = '';
    } else {
      current += character;
    }
  }

  cells.push(current);
  return cells.map((cell) => cell.trim());
}

/**
 * Reads a cell as a number.
 *
 * Thousands separators are stripped only when the delimiter is not a comma.
 * In a comma-delimited file "1,200" is genuinely two cells, and there is no
 * way to tell it apart from one number — so we do not guess. Silently turning
 * two columns into one value is a worse failure than not supporting the
 * notation at all.
 */
function toNumber(cell: string, delimiter = ','): number | undefined {
  if (cell === '') return undefined;
  let cleaned = cell.replace(/\s/g, '');
  if (delimiter !== ',') cleaned = cleaned.replace(/,(?=\d{3}(\D|$))/g, '');
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : undefined;
}

export function parseTable(input: string): ParsedTable {
  const lines = input
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.trim() !== '');

  if (lines.length === 0) throw new TableError('No data found.');

  const delimiter = detectDelimiter(lines);
  const rows = lines.map((line) => splitRow(line, delimiter));
  const width = Math.max(...rows.map((row) => row.length));

  // A first row where no cell parses as a number is a header.
  const firstRow = rows[0]!;
  const headerDetected =
    rows.length > 1 &&
    firstRow.every((cell) => cell !== '' && toNumber(cell, delimiter) === undefined);

  const body = headerDetected ? rows.slice(1) : rows;
  if (body.length === 0) throw new TableError('The table has a header but no data.');

  const columns: Column[] = [];
  for (let index = 0; index < width; index += 1) {
    const cells = body.map((row) => row[index] ?? '');
    const values: number[] = [];
    let skipped = 0;

    for (const cell of cells) {
      if (cell === '') continue;
      const value = toNumber(cell, delimiter);
      if (value === undefined) skipped += 1;
      else values.push(value);
    }

    columns.push({
      name: headerDetected ? firstRow[index] || `Column ${index + 1}` : `Column ${index + 1}`,
      index,
      values,
      skipped,
      // Mostly-numeric is numeric; a stray "n/a" should not disqualify a column.
      numeric: values.length > 0 && values.length >= skipped,
    });
  }

  return { columns, rowCount: body.length, headerDetected, delimiter };
}

export function delimiterName(delimiter: string): string {
  return DELIMITERS.find((entry) => entry.value === delimiter)?.name ?? 'comma';
}
