/**
 * Number presentation.
 *
 * Floating point arithmetic produces values like 4.383000000000001. Printing
 * that is a small thing that makes a calculator look untrustworthy, so display
 * formatting is centralised and never left to template interpolation.
 */

const DEFAULT_SIGNIFICANT_FIGURES = 4;

/**
 * Formats to a fixed number of significant figures, dropping trailing zeros,
 * and falls back to scientific notation only where a plain decimal would be
 * unreadable.
 */
export function formatNumber(
  value: number,
  significantFigures: number = DEFAULT_SIGNIFICANT_FIGURES,
): string {
  if (!Number.isFinite(value)) return '—';
  if (value === 0) return '0';

  const magnitude = Math.abs(value);

  if (magnitude >= 1e7 || magnitude < 1e-4) {
    // toExponential gives 5.800e-7; trim the padding zeros in the mantissa.
    const [mantissa = '', exponent = ''] = value.toExponential(significantFigures - 1).split('e');
    const trimmed = mantissa.includes('.') ? mantissa.replace(/\.?0+$/, '') : mantissa;
    return `${trimmed}e${exponent}`;
  }

  const rounded = Number(value.toPrecision(significantFigures));
  // Number() already removed float noise; toString keeps the shortest form.
  return rounded.toString();
}

/** Parses a user-typed number, tolerating spaces, commas and exponent syntax. */
export function parseNumber(input: string): number | undefined {
  const cleaned = input.trim().replace(/\s/g, '').replace(/,/g, '');
  if (cleaned === '') return undefined;
  const value = Number(cleaned);
  return Number.isFinite(value) ? value : undefined;
}
