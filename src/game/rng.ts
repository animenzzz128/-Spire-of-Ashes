// Seedable random source for all gameplay rolls (map, encounters, rewards,
// shuffles, events). The simulator and tests seed it so a run, and any bug
// found in it, can be replayed exactly. In the browser it starts from a random
// seed, so normal play is unchanged.
//
// Cosmetic randomness (floating-text ids, VFX ids) deliberately keeps using
// Math.random so it never shifts the gameplay sequence.

let state = (Math.random() * 0x100000000) >>> 0;

/** Re-seed the gameplay RNG (mulberry32). */
export function seedRng(seed: number): void {
  state = seed >>> 0;
}

/** Uniform float in [0, 1), like Math.random. */
export function rng(): number {
  state = (state + 0x6d2b79f5) >>> 0;
  let t = state;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** Integer in [min, max], inclusive. */
export function rngInt(min: number, max: number): number {
  return Math.floor(rng() * (max - min + 1)) + min;
}
