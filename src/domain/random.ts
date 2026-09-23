/**
 * Randomness is injected rather than called directly so the generators can
 * be driven by a seeded source in tests and in the golden comparison against
 * the previous implementation. Every default resolves to `Math.random` at
 * call time (not at import time) so a test can still stub the global.
 */
import { roundTo } from "./math";

export type Rng = () => number;

export const defaultRng: Rng = () => Math.random();

/** Uniform pick from a non-empty array. */
export function pick<T>(arr: readonly T[], rng: Rng = defaultRng): T {
  return arr[Math.floor(rng() * arr.length)];
}

/** Uniform float in [min, max), rounded to `precision` decimals. */
export function randRange(min: number, max: number, precision = 2, rng: Rng = defaultRng): number {
  return roundTo(rng() * (max - min) + min, precision);
}

/** Fisher-Yates shuffle that returns a new array and leaves the input alone. */
export function shuffle<T>(arr: readonly T[], rng: Rng = defaultRng): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Deterministic PRNG (mulberry32) for tests. Not used by the app itself; it
 * lives here so tests and scripts share one implementation.
 */
export function seededRng(seed: number): Rng {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
