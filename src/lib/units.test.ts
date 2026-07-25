import { describe, expect, it } from 'vitest';
import { autoScale, fromCanonical, getUnit, toCanonical, unitsFor } from './units';
import { formatNumber } from './format';

describe('unit conversion', () => {
  it('converts to canonical units', () => {
    expect(toCanonical(500, 'mL')).toBeCloseTo(0.5, 12);
    expect(toCanonical(250, 'mg')).toBeCloseTo(0.25, 12);
    expect(toCanonical(50, 'uM')).toBeCloseTo(5e-5, 15);
  });

  it('round-trips without drift', () => {
    for (const unitId of ['ng', 'ug', 'mg', 'g', 'kg']) {
      expect(fromCanonical(toCanonical(3.7, unitId), unitId)).toBeCloseTo(3.7, 10);
    }
  });

  it('rejects unknown units loudly rather than defaulting', () => {
    expect(() => getUnit('furlong')).toThrow();
  });

  it('orders selector units smallest to largest', () => {
    const factors = unitsFor('volume').map((unit) => unit.factor);
    expect(factors).toEqual([...factors].sort((a, b) => a - b));
  });
});

describe('autoScale', () => {
  it('picks the unit a scientist would write', () => {
    // Division by a prefix reintroduces float noise (5.8e-6 / 1e-6 is not
    // exactly 5.8), which is precisely why display formatting is a separate
    // concern. autoScale picks the unit; formatNumber makes it presentable.
    const amount = autoScale(5.8e-6, 'amount');
    expect(amount.unit.label).toBe('\u00b5mol');
    expect(amount.value).toBeCloseTo(5.8, 9);
    expect(formatNumber(amount.value)).toBe('5.8');

    expect(autoScale(0.0005, 'volume').unit.label).toBe('\u00b5L');
    expect(autoScale(0.5, 'volume')).toMatchObject({ unit: { label: 'mL' } });
    expect(autoScale(0.5, 'volume').value).toBeCloseTo(500, 9);
    expect(autoScale(4.383, 'mass')).toMatchObject({ unit: { label: 'g' } });
  });

  it('keeps the displayed number at or above one where possible', () => {
    for (const canonical of [1e-8, 1e-5, 0.002, 0.5, 7, 1200]) {
      const { value } = autoScale(canonical, 'mass');
      expect(Math.abs(value)).toBeGreaterThanOrEqual(1);
    }
  });

  it('handles zero without dividing by a prefix', () => {
    expect(autoScale(0, 'mass').value).toBe(0);
  });
});
