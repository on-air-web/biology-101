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

describe('mass concentration', () => {
  /**
   * The identities that make the duplicate factors correct rather than sloppy:
   * a nanogram per microlitre is a microgram per millilitre, and one per cent
   * weight per volume is ten grams per litre.
   */
  it('holds the equivalences people rely on', () => {
    expect(toCanonical(1, 'ng_uL')).toBeCloseTo(toCanonical(1, 'ug_mL'), 15);
    expect(toCanonical(1, 'ug_uL')).toBeCloseTo(toCanonical(1, 'mg_mL'), 15);
    expect(toCanonical(1, 'pct_wv')).toBeCloseTo(10, 12);
    expect(toCanonical(1, 'mg_mL')).toBeCloseTo(1, 12);
    // 50 ng/µL, a routine DNA prep, is 50 µg/mL.
    expect(fromCanonical(toCanonical(50, 'ng_uL'), 'ug_mL')).toBeCloseTo(50, 9);
  });

  it('round-trips every unit', () => {
    for (const unit of unitsFor('mass-concentration')) {
      expect(fromCanonical(toCanonical(2.5, unit.id), unit.id), unit.id).toBeCloseTo(2.5, 9);
    }
  });

  it('orders the selector smallest to largest', () => {
    const factors = unitsFor('mass-concentration').map((unit) => unit.factor);
    expect(factors).toEqual([...factors].sort((a, b) => a - b));
  });

  /** Where two units share a factor, the per-millilitre form wins on display. */
  it('displays a result in the form people read', () => {
    expect(autoScale(toCanonical(50, 'ng_uL'), 'mass-concentration').unit.label).toBe('µg/mL');
    expect(autoScale(toCanonical(2, 'mg_mL'), 'mass-concentration').unit.label).toBe('mg/mL');
    expect(autoScale(toCanonical(200, 'ng_mL'), 'mass-concentration').unit.label).toBe('ng/mL');
    // Per cent is ten times mg/mL, so autoScale would otherwise reach for it
    // on anything above 10 g/L and report a protein stock as a percentage.
    expect(autoScale(toCanonical(1.5, 'pct_wv'), 'mass-concentration').unit.label).toBe('mg/mL');
    expect(autoScale(toCanonical(58.44, 'mg_mL'), 'mass-concentration').unit.label).toBe('mg/mL');
    // ...but it stays selectable, which is what the gel tool needs.
    expect(unitsFor('mass-concentration').map((u) => u.label)).toContain('% (w/v)');
  });

  /** Molar and mass concentration must not be interconvertible without a mass. */
  it('keeps molar and mass concentration in separate dimensions', () => {
    const molar = unitsFor('concentration').map((unit) => unit.id);
    const byMass = unitsFor('mass-concentration').map((unit) => unit.id);
    expect(molar.some((id) => byMass.includes(id))).toBe(false);
    expect(getUnit('mg_mL').dimension).toBe('mass-concentration');
    expect(getUnit('mM').dimension).toBe('concentration');
  });
});
