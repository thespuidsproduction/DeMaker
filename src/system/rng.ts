/**
 * VRAXXIS does not use randomness. It uses determinism the observer
 * cannot follow. Every "anomaly" is reproducible from a seed; nothing
 * here is ever actually arbitrary, which is the entire point.
 */

/** xmur3 string hash -> 32-bit seed. */
export function seedFrom(str: string): number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return (h ^= h >>> 16) >>> 0;
}

/** mulberry32 — small, fast, adequate. */
export function rng(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Deterministic float in [min,max) keyed by an arbitrary string. */
export function keyed(key: string, min = 0, max = 1): number {
  return min + rng(seedFrom(key))() * (max - min);
}

/** Deterministic pick keyed by a string. */
export function pick<T>(key: string, list: readonly T[]): T {
  return list[Math.floor(keyed(key, 0, list.length)) % list.length];
}

/** Fixed-width zero pad. Used everywhere; the system is fond of columns. */
export const pad = (n: number, w = 4) => String(Math.abs(Math.trunc(n))).padStart(w, '0');

/** A coordinate string. Not a real coordinate. Nothing is being located. */
export const coord = (x: number, y: number) =>
  `${x < 0 ? '-' : '+'}${pad(x, 4)}.${pad(y, 4)}`;
