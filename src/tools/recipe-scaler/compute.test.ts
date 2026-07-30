import { describe, expect, it } from 'vitest';
import { ScaleError, impliedStockConcentration, scaleRecipe } from './compute';

const mL = (value: number) => value * 1e-3;
const uL = (value: number) => value * 1e-6;

const volume = (id: string, name: string, amount: number) => ({
  id,
  name,
  kind: 'volume' as const,
  amount,
});

describe('scaling a batch', () => {
  /**
   * The case this tool was asked for: 230 µL of an additive in a 10 mL batch,
   * scaled to 25 mL. The factor is 2.5, so the answer is 575 µL — hand
   * checkable, and the reason the tool exists.
   */
  it('scales the worked example', () => {
    const result = scaleRecipe({
      referenceBatch: mL(10),
      targetBatch: mL(25),
      components: [volume('a', 'Additive', uL(230))],
    });
    expect(result.factor).toBeCloseTo(2.5, 12);
    expect(result.components[0]!.scaled).toBeCloseTo(uL(575), 15);
    expect(result.diluent).toBeCloseTo(mL(25) - uL(575), 15);
  });

  it('scales down as readily as up', () => {
    const result = scaleRecipe({
      referenceBatch: mL(10),
      targetBatch: mL(2),
      components: [volume('a', 'Additive', uL(230))],
    });
    expect(result.factor).toBeCloseTo(0.2, 12);
    expect(result.components[0]!.scaled).toBeCloseTo(uL(46), 15);
  });

  it('applies one factor to every component', () => {
    const result = scaleRecipe({
      referenceBatch: mL(50),
      targetBatch: mL(500),
      components: [
        volume('fbs', 'FBS', mL(5)),
        volume('pen', 'Pen/Strep', uL(500)),
        volume('glu', 'L-glutamine', uL(500)),
      ],
    });
    expect(result.factor).toBeCloseTo(10, 12);
    expect(result.components.map((c) => c.scaled)).toEqual([
      expect.closeTo(mL(50), 15),
      expect.closeTo(mL(5), 15),
      expect.closeTo(mL(5), 15),
    ]);
  });

  /** Masses scale by the same factor but do not displace medium. */
  it('scales masses without counting them towards the volume', () => {
    const result = scaleRecipe({
      referenceBatch: mL(100),
      targetBatch: mL(300),
      components: [
        volume('a', 'Additive', mL(1)),
        { id: 'p', name: 'Powder', kind: 'mass', amount: 0.5 },
      ],
    });
    expect(result.components[1]!.scaled).toBeCloseTo(1.5, 12);
    expect(result.addedVolume).toBeCloseTo(mL(3), 15);
    expect(result.diluent).toBeCloseTo(mL(297), 15);
  });

  /** Scaling preserves proportions, which is the whole point. */
  it('leaves every component at the same fraction of the batch', () => {
    const components = [volume('a', 'A', uL(230)), volume('b', 'B', mL(2))];
    const small = scaleRecipe({ referenceBatch: mL(10), targetBatch: mL(10), components });
    const large = scaleRecipe({ referenceBatch: mL(10), targetBatch: mL(250), components });
    for (let i = 0; i < components.length; i += 1) {
      expect(large.components[i]!.fractionOfBatch).toBeCloseTo(
        small.components[i]!.fractionOfBatch!,
        12,
      );
    }
  });

  it('is the identity when the batch does not change', () => {
    const result = scaleRecipe({
      referenceBatch: mL(10),
      targetBatch: mL(10),
      components: [volume('a', 'Additive', uL(230))],
    });
    expect(result.factor).toBe(1);
    expect(result.components[0]!.scaled).toBeCloseTo(uL(230), 15);
  });
});

describe('warnings', () => {
  it('says when the components will not fit in the batch', () => {
    const result = scaleRecipe({
      referenceBatch: mL(10),
      targetBatch: mL(10),
      components: [volume('a', 'A', mL(8)), volume('b', 'B', mL(4))],
    });
    expect(result.diluent).toBe(0);
    expect(result.warnings.join(' ')).toMatch(/more than the batch volume/);
  });

  it('notes when there is barely any medium left', () => {
    const result = scaleRecipe({
      referenceBatch: mL(10),
      targetBatch: mL(10),
      components: [volume('a', 'A', mL(9.5))],
    });
    expect(result.warnings.join(' ')).toMatch(/nine tenths/);
  });

  it('flags a component that scales below a pipettable volume', () => {
    const result = scaleRecipe({
      referenceBatch: mL(100),
      targetBatch: mL(1),
      components: [volume('a', 'Antibiotic', uL(50))],
    });
    // 50 µL scaled by 1/100 is 500 nL.
    expect(result.components[0]!.scaled).toBeCloseTo(uL(0.5), 15);
    expect(result.warnings.join(' ')).toMatch(/under a microlitre/);
  });

  it('stays quiet on an ordinary scale-up', () => {
    const result = scaleRecipe({
      referenceBatch: mL(10),
      targetBatch: mL(25),
      components: [volume('a', 'Additive', uL(230))],
    });
    expect(result.warnings).toHaveLength(0);
  });
});

describe('implied stock concentration', () => {
  /**
   * 230 µL reaching 250 µg/mL in 10 mL means the stock is
   * 250 × 10 / 0.230 = 10,870 µg/mL, or about 10.9 mg/mL. Checkable by hand.
   */
  it('inverts C·V = C·V', () => {
    const stock = impliedStockConcentration(uL(230), mL(10), 250);
    expect(stock).toBeCloseTo(10869.565, 2);
  });

  it('round-trips back to the final concentration', () => {
    const stock = impliedStockConcentration(uL(230), mL(10), 250);
    expect((stock * uL(230)) / mL(10)).toBeCloseTo(250, 9);
  });

  it('refuses impossible input rather than dividing by zero', () => {
    expect(() => impliedStockConcentration(0, mL(10), 250)).toThrow(ScaleError);
    expect(() => impliedStockConcentration(uL(230), 0, 250)).toThrow(ScaleError);
    expect(() => impliedStockConcentration(uL(230), mL(10), 0)).toThrow(ScaleError);
  });
});

describe('input handling', () => {
  it('refuses non-positive batches and empty recipes', () => {
    const components = [volume('a', 'A', uL(230))];
    expect(() => scaleRecipe({ referenceBatch: 0, targetBatch: mL(25), components })).toThrow(
      ScaleError,
    );
    expect(() => scaleRecipe({ referenceBatch: mL(10), targetBatch: -1, components })).toThrow(
      ScaleError,
    );
    expect(() =>
      scaleRecipe({ referenceBatch: mL(10), targetBatch: mL(25), components: [] }),
    ).toThrow(ScaleError);
  });

  it('allows a zero component without treating it as an error', () => {
    const result = scaleRecipe({
      referenceBatch: mL(10),
      targetBatch: mL(25),
      components: [volume('a', 'Not used this time', 0)],
    });
    expect(result.components[0]!.scaled).toBe(0);
    expect(result.warnings).toHaveLength(0);
  });

  it('refuses a negative amount', () => {
    expect(() =>
      scaleRecipe({
        referenceBatch: mL(10),
        targetBatch: mL(25),
        components: [volume('a', 'A', -1)],
      }),
    ).toThrow(ScaleError);
  });
});
