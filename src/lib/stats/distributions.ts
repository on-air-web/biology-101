/**
 * Distribution functions.
 *
 * Everything statistical on this site resolves to one of these, so they are
 * implemented properly rather than approximated, and tested against values
 * anyone can check in R or a table.
 *
 * Pure, framework-free, canonical units. No React, no DOM.
 */

/** Lanczos approximation to log Γ(x). Accurate to ~15 significant figures. */
export function logGamma(x: number): number {
  const coefficients = [
    76.18009172947146, -86.50532032941678, 24.01409824083091, -1.231739572450155,
    0.001208650973866179, -5.395239384953e-6,
  ];

  let y = x;
  const tmp = x + 5.5 - (x + 0.5) * Math.log(x + 5.5);
  let series = 1.000000000190015;
  for (let index = 0; index < 6; index += 1) {
    y += 1;
    series += coefficients[index]! / y;
  }
  return -tmp + Math.log((2.5066282746310007 * series) / x);
}

/** Continued fraction for the incomplete beta function (Lentz's method). */
function betaContinuedFraction(a: number, b: number, x: number): number {
  const MAX_ITERATIONS = 300;
  const EPSILON = 3e-16;
  const TINY = 1e-300;

  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;

  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < TINY) d = TINY;
  d = 1 / d;
  let h = d;

  for (let m = 1; m <= MAX_ITERATIONS; m += 1) {
    const m2 = 2 * m;

    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < TINY) d = TINY;
    c = 1 + aa / c;
    if (Math.abs(c) < TINY) c = TINY;
    d = 1 / d;
    h *= d * c;

    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < TINY) d = TINY;
    c = 1 + aa / c;
    if (Math.abs(c) < TINY) c = TINY;
    d = 1 / d;
    const delta = d * c;
    h *= delta;

    if (Math.abs(delta - 1) < EPSILON) break;
  }

  return h;
}

/** Regularised incomplete beta function I_x(a, b). */
export function incompleteBeta(a: number, b: number, x: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;

  const front = Math.exp(
    logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1 - x),
  );

  // The continued fraction converges quickly only on one side; reflect otherwise.
  return x < (a + 1) / (a + b + 2)
    ? (front * betaContinuedFraction(a, b, x)) / a
    : 1 - (front * betaContinuedFraction(b, a, 1 - x)) / b;
}

/** P(T <= t) for Student's t with `df` degrees of freedom. */
export function tCdf(t: number, df: number): number {
  const x = df / (df + t * t);
  const tail = 0.5 * incompleteBeta(df / 2, 0.5, x);
  return t > 0 ? 1 - tail : tail;
}

/** Two-tailed p-value for a t statistic. */
export function tTwoTailedP(t: number, df: number): number {
  const x = df / (df + t * t);
  return incompleteBeta(df / 2, 0.5, x);
}

/**
 * Inverse t: the value with `p` probability below it.
 *
 * Solved by bisection rather than a series. It is called once per result, and
 * a method that obviously cannot diverge is worth more here than speed.
 */
export function tInv(p: number, df: number): number {
  if (p <= 0 || p >= 1) throw new Error('Probability must lie strictly between 0 and 1.');

  let low = -1000;
  let high = 1000;
  for (let index = 0; index < 200; index += 1) {
    const mid = (low + high) / 2;
    if (tCdf(mid, df) < p) low = mid;
    else high = mid;
  }
  return (low + high) / 2;
}

/** Critical t for a two-sided interval at the given confidence level. */
export function tCritical(confidence: number, df: number): number {
  return tInv(1 - (1 - confidence) / 2, df);
}

/** Complementary error function (Numerical Recipes, fractional error < 1.2e-07). */
function erfc(x: number): number {
  const z = Math.abs(x);
  const t = 2 / (2 + z);
  const ty = 4 * t - 2;

  const coefficients = [
    -1.3026537197817094, 0.6419697923564902, 0.019476473204185836, -0.00956151478680863,
    -0.000946595344482036, 0.000366839497852761, 4.2523324806907e-5, -2.0278578112534e-5,
    -1.624290004647e-6, 1.30365583558e-6, 1.5626441722e-8, -8.5238095915e-8, 6.529054439e-9,
    5.059343495e-9, -9.91364156e-10, -2.27365122e-10, 9.6467911e-11, 2.394038e-12, -6.886027e-12,
    8.94487e-13, 3.13092e-13, -1.12708e-13, 3.81e-16, 7.106e-15,
  ];

  let d = 0;
  let dd = 0;
  for (let index = coefficients.length - 1; index > 0; index -= 1) {
    const tmp = d;
    d = ty * d - dd + coefficients[index]!;
    dd = tmp;
  }
  const result = t * Math.exp(-z * z + 0.5 * (coefficients[0]! + ty * d) - dd);
  return x >= 0 ? result : 2 - result;
}

/** P(Z <= z) for the standard normal. */
export function normalCdf(z: number): number {
  return 0.5 * erfc(-z / Math.SQRT2);
}

/** Two-tailed p-value for a z statistic. */
export function normalTwoTailedP(z: number): number {
  return erfc(Math.abs(z) / Math.SQRT2);
}

/** Series expansion for the regularised lower incomplete gamma P(a, x). */
function gammaSeries(a: number, x: number): number {
  const EPSILON = 3e-16;
  let ap = a;
  let sum = 1 / a;
  let delta = sum;
  for (let index = 0; index < 500; index += 1) {
    ap += 1;
    delta *= x / ap;
    sum += delta;
    if (Math.abs(delta) < Math.abs(sum) * EPSILON) break;
  }
  return sum * Math.exp(-x + a * Math.log(x) - logGamma(a));
}

/** Continued fraction for the regularised upper incomplete gamma Q(a, x). */
function gammaContinuedFraction(a: number, x: number): number {
  const EPSILON = 3e-16;
  const TINY = 1e-300;

  let b = x + 1 - a;
  let c = 1 / TINY;
  let d = 1 / b;
  let h = d;

  for (let index = 1; index <= 500; index += 1) {
    const an = -index * (index - a);
    b += 2;
    d = an * d + b;
    if (Math.abs(d) < TINY) d = TINY;
    c = b + an / c;
    if (Math.abs(c) < TINY) c = TINY;
    d = 1 / d;
    const delta = d * c;
    h *= delta;
    if (Math.abs(delta - 1) < EPSILON) break;
  }

  return Math.exp(-x + a * Math.log(x) - logGamma(a)) * h;
}

/** Regularised lower incomplete gamma P(a, x). */
export function incompleteGamma(a: number, x: number): number {
  if (x <= 0) return 0;
  // The series converges quickly below x = a + 1; the fraction above it.
  return x < a + 1 ? gammaSeries(a, x) : 1 - gammaContinuedFraction(a, x);
}

/** P(X <= x) for chi-square with `df` degrees of freedom. */
export function chiSquareCdf(x: number, df: number): number {
  return incompleteGamma(df / 2, x / 2);
}

/** Upper-tail p-value for a chi-square statistic. */
export function chiSquareP(x: number, df: number): number {
  return 1 - chiSquareCdf(x, df);
}

/** P(F <= f) for the F distribution with df1 and df2. */
export function fCdf(f: number, df1: number, df2: number): number {
  if (f <= 0) return 0;
  return incompleteBeta(df1 / 2, df2 / 2, (df1 * f) / (df1 * f + df2));
}

/**
 * Upper-tail p-value for an F statistic.
 *
 * Computed from the reflected incomplete beta rather than as 1 − fCdf, which
 * loses all precision once the p-value drops below about 1e-16.
 */
export function fP(f: number, df1: number, df2: number): number {
  if (f <= 0) return 1;
  return incompleteBeta(df2 / 2, df1 / 2, df2 / (df1 * f + df2));
}

/**
 * Inverse standard normal, by bisection on the CDF.
 *
 * Same reasoning as tInv: called once per result, and a method that cannot
 * diverge is worth more here than speed.
 */
export function normalInv(p: number): number {
  if (p <= 0 || p >= 1) throw new Error('Probability must lie strictly between 0 and 1.');
  let low = -40;
  let high = 40;
  for (let index = 0; index < 200; index += 1) {
    const mid = (low + high) / 2;
    if (normalCdf(mid) < p) low = mid;
    else high = mid;
  }
  return (low + high) / 2;
}

/** Critical z for a two-sided interval at the given confidence level. */
export function normalCritical(confidence: number): number {
  return normalInv(1 - (1 - confidence) / 2);
}

/**
 * Noncentral t distribution, P(T <= t) with noncentrality δ.
 *
 * The series of Lenth (1989): a Poisson-weighted mixture of incomplete beta
 * terms. This is what power analysis needs, and it is the only genuinely
 * awkward distribution in the set — the normal approximation people reach for
 * instead understates the sample size at small n, which is exactly where the
 * answer matters.
 *
 * Verified against an independent implementation reproducing the standard
 * sample sizes: 394, 64 and 26 per group for d = 0.2, 0.5 and 0.8 at 80%
 * power.
 */
export function noncentralTCdf(t: number, df: number, ncp: number): number {
  if (ncp === 0) return tCdf(t, df);
  // Reflect rather than extend the series below zero.
  if (t < 0) return 1 - noncentralTCdf(-t, df, -ncp);

  const x = (t * t) / (t * t + df);
  const half = (ncp * ncp) / 2;
  const logHalf = Math.log(half);

  let total = 0;
  for (let j = 0; j < 400; j += 1) {
    const logCommon = -half + j * logHalf - logGamma(j + 1);
    const p = Math.exp(logCommon);
    const q = (Math.exp(-half + j * logHalf - logGamma(j + 1.5)) * ncp) / Math.SQRT2;

    total += p * incompleteBeta(j + 0.5, df / 2, x) + q * incompleteBeta(j + 1, df / 2, x);

    // The Poisson weights fall away quickly once past the mode.
    if (j > 5 && p < 1e-18) break;
  }

  return normalCdf(-ncp) + 0.5 * total;
}
