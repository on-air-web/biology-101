import { describe, expect, it } from 'vitest';
import { GRADES, GelError, gradeForSize, prepareGel } from './compute';

const mL = (value: number) => value * 1e-3;
/** 1% w/v is 10 g/L, so this converts a percentage to canonical units. */
const pct = (value: number) => value * 10;

describe('weighing the agarose', () => {
  /** 1% of 100 mL is 1 g, by the definition of per cent weight per volume. */
  it('follows the definition of per cent weight per volume', () => {
    const result = prepareGel({ concentration: pct(1), volume: mL(100) });
    expect(result.agaroseMass).toBeCloseTo(1, 12);
    expect(result.percent).toBeCloseTo(1, 12);
  });

  it('scales with both percentage and volume', () => {
    expect(prepareGel({ concentration: pct(2), volume: mL(100) }).agaroseMass).toBeCloseTo(2, 12);
    expect(prepareGel({ concentration: pct(1), volume: mL(50) }).agaroseMass).toBeCloseTo(0.5, 12);
    // A common preparative gel: 1.5% in 150 mL is 2.25 g.
    expect(prepareGel({ concentration: pct(1.5), volume: mL(150) }).agaroseMass).toBeCloseTo(
      2.25,
      12,
    );
  });

  it('refuses non-positive input', () => {
    expect(() => prepareGel({ concentration: 0, volume: mL(100) })).toThrow(GelError);
    expect(() => prepareGel({ concentration: pct(1), volume: 0 })).toThrow(GelError);
  });
});

describe('choosing a percentage', () => {
  it('picks a grade whose range covers the fragment', () => {
    const grade = gradeForSize(600)!;
    expect(600).toBeGreaterThanOrEqual(grade.range[0]);
    expect(600).toBeLessThanOrEqual(grade.range[1]);
  });

  /** Denser gels resolve smaller fragments; that ordering must hold. */
  it('suggests a denser gel for a smaller fragment', () => {
    expect(gradeForSize(300)!.percent).toBeGreaterThan(gradeForSize(8000)!.percent);
    expect(gradeForSize(100)!.percent).toBeGreaterThan(gradeForSize(1500)!.percent);
  });

  it('has nothing for fragments outside the standard range', () => {
    expect(gradeForSize(20)).toBeUndefined();
    expect(gradeForSize(60000)).toBeUndefined();
    expect(gradeForSize(0)).toBeUndefined();
    expect(gradeForSize(Number.NaN)).toBeUndefined();
  });

  it('says so when the percentage does not suit the fragment', () => {
    // 300 bp on a 0.5% gel: far too loose.
    const result = prepareGel({ concentration: pct(0.5), volume: mL(100), targetSize: 300 });
    expect(result.warnings.join(' ')).toMatch(/would resolve better/);
  });

  it('stays quiet when the percentage already suits the fragment', () => {
    const result = prepareGel({ concentration: pct(1.5), volume: mL(100), targetSize: 500 });
    expect(result.warnings).toHaveLength(0);
  });

  it('points elsewhere for fragments agarose cannot resolve', () => {
    expect(
      prepareGel({ concentration: pct(2), volume: mL(100), targetSize: 25 }).warnings.join(' '),
    ).toMatch(/polyacrylamide/);
    expect(
      prepareGel({ concentration: pct(0.5), volume: mL(100), targetSize: 50000 }).warnings.join(
        ' ',
      ),
    ).toMatch(/pulsed-field/);
  });
});

describe('percentage warnings', () => {
  it('flags a gel too soft to handle', () => {
    expect(prepareGel({ concentration: pct(0.3), volume: mL(100) }).warnings.join(' ')).toMatch(
      /too soft to handle/,
    );
  });

  it('flags a gel dense enough that polyacrylamide is the better tool', () => {
    expect(prepareGel({ concentration: pct(4), volume: mL(100) }).warnings.join(' ')).toMatch(
      /polyacrylamide is the honest answer/,
    );
  });
});

describe('the grade table', () => {
  it('is ordered by percentage, with ranges that shift downwards', () => {
    for (let i = 1; i < GRADES.length; i += 1) {
      expect(GRADES[i]!.percent).toBeGreaterThan(GRADES[i - 1]!.percent);
      // A denser gel resolves smaller fragments at both ends of its range.
      expect(GRADES[i]!.range[0]).toBeLessThanOrEqual(GRADES[i - 1]!.range[0]);
      expect(GRADES[i]!.range[1]).toBeLessThanOrEqual(GRADES[i - 1]!.range[1]);
    }
  });

  it('gives every grade a range in the right order', () => {
    for (const grade of GRADES) {
      expect(grade.range[0], `${grade.percent}%`).toBeLessThan(grade.range[1]);
    }
  });
});
