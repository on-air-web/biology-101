/**
 * Chemical formula parsing.
 *
 * Lives in `lib` rather than in a tool folder because more than one tool needs
 * it: molecular weight today, and solution and buffer preparation next.
 *
 * Handles nested groups, hydrate dots in all the notations people paste
 * (·, *, .), and leading multipliers such as the 5 in CuSO4·5H2O.
 */

import { getAtomicMass } from './atomic-masses';

export class FormulaError extends Error {}

export interface FormulaResult {
  /** Element symbol to total atom count. */
  composition: Record<string, number>;
  /** Molar mass in g/mol. */
  molarMass: number;
}

interface Token {
  kind: 'element' | 'open' | 'close' | 'number' | 'dot';
  value: string;
}

function tokenize(formula: string): Token[] {
  const tokens: Token[] = [];
  let index = 0;

  while (index < formula.length) {
    const character = formula[index]!;

    if (/\s/.test(character)) {
      index += 1;
      continue;
    }

    if (character === '(' || character === '[' || character === '{') {
      tokens.push({ kind: 'open', value: character });
      index += 1;
      continue;
    }

    if (character === ')' || character === ']' || character === '}') {
      tokens.push({ kind: 'close', value: character });
      index += 1;
      continue;
    }

    // Hydrate separators. All three notations appear in supplier catalogues.
    if (character === '·' || character === '*' || character === '.' || character === '•') {
      tokens.push({ kind: 'dot', value: '·' });
      index += 1;
      continue;
    }

    if (/[0-9]/.test(character)) {
      let digits = '';
      while (index < formula.length && /[0-9]/.test(formula[index]!)) {
        digits += formula[index];
        index += 1;
      }
      tokens.push({ kind: 'number', value: digits });
      continue;
    }

    if (/[A-Z]/.test(character)) {
      let symbol = character;
      index += 1;
      while (index < formula.length && /[a-z]/.test(formula[index]!)) {
        symbol += formula[index];
        index += 1;
      }
      tokens.push({ kind: 'element', value: symbol });
      continue;
    }

    throw new FormulaError(`Unexpected character “${character}” in the formula.`);
  }

  return tokens;
}

function merge(target: Record<string, number>, source: Record<string, number>, factor: number) {
  for (const [symbol, count] of Object.entries(source)) {
    target[symbol] = (target[symbol] ?? 0) + count * factor;
  }
}

/**
 * Parses a formula into element counts.
 *
 * A hydrate dot starts a new segment whose multiplier applies to everything
 * after it, which is why segments are parsed separately and merged.
 */
export function parseFormula(input: string): FormulaResult {
  const trimmed = input.trim();
  if (trimmed === '') throw new FormulaError('Enter a chemical formula.');

  const tokens = tokenize(trimmed);
  const composition: Record<string, number> = {};

  // Split on hydrate dots first: CuSO4·5H2O is two segments, the second
  // multiplied by five.
  const segments: Token[][] = [[]];
  for (const token of tokens) {
    if (token.kind === 'dot') segments.push([]);
    else segments[segments.length - 1]!.push(token);
  }

  for (const segment of segments) {
    if (segment.length === 0) continue;

    let multiplier = 1;
    let body = segment;
    if (segment[0]!.kind === 'number') {
      multiplier = Number(segment[0]!.value);
      body = segment.slice(1);
      if (multiplier === 0) throw new FormulaError('A hydrate multiplier cannot be zero.');
    }

    merge(composition, parseSegment(body), multiplier);
  }

  if (Object.keys(composition).length === 0) {
    throw new FormulaError('No elements found in the formula.');
  }

  let molarMass = 0;
  for (const [symbol, count] of Object.entries(composition)) {
    const mass = getAtomicMass(symbol);
    if (mass === undefined) {
      throw new FormulaError(`Unknown element symbol “${symbol}”.`);
    }
    molarMass += mass * count;
  }

  return { composition, molarMass };
}

function parseSegment(tokens: Token[]): Record<string, number> {
  const stack: Record<string, number>[] = [{}];
  let index = 0;

  while (index < tokens.length) {
    const token = tokens[index]!;

    if (token.kind === 'open') {
      stack.push({});
      index += 1;
      continue;
    }

    if (token.kind === 'close') {
      const group = stack.pop();
      if (!group || stack.length === 0) {
        throw new FormulaError('Unbalanced brackets in the formula.');
      }
      index += 1;
      let count = 1;
      if (tokens[index]?.kind === 'number') {
        count = Number(tokens[index]!.value);
        index += 1;
      }
      merge(stack[stack.length - 1]!, group, count);
      continue;
    }

    if (token.kind === 'element') {
      index += 1;
      let count = 1;
      if (tokens[index]?.kind === 'number') {
        count = Number(tokens[index]!.value);
        index += 1;
      }
      if (count === 0) throw new FormulaError('An element count cannot be zero.');
      merge(stack[stack.length - 1]!, { [token.value]: 1 }, count);
      continue;
    }

    throw new FormulaError('A number must follow an element or a closing bracket.');
  }

  if (stack.length !== 1) throw new FormulaError('Unbalanced brackets in the formula.');
  return stack[0]!;
}

/**
 * Element symbols in Hill order: carbon, then hydrogen, then alphabetical.
 *
 * Used to order the composition table only. Deliberately not used to re-render
 * the formula itself — Hill order is alphabetical for inorganic compounds, so
 * NaCl would come back as "ClNa", which is correct notation and looks broken
 * to every chemist who sees it. The user's own formula is echoed instead.
 */
export function orderElements(composition: Record<string, number>): string[] {
  const symbols = Object.keys(composition);
  if (!symbols.includes('C')) return [...symbols].sort();

  return [
    'C',
    ...(symbols.includes('H') ? ['H'] : []),
    ...symbols.filter((symbol) => symbol !== 'C' && symbol !== 'H').sort(),
  ];
}
