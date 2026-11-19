// Seedable random sources for all gameplay rolls. Each kind of roll has its own
// stream, all derived from one seed, so changing how often one system rolls
// (say, a bigger card pool) does not shift the map, encounters or shuffles.
// The simulator and tests seed them so a run, and any bug found in it, can be
// replayed exactly; saves store every stream's state. In the browser they start
// from a random seed, so normal play is unchanged.
//
// Cosmetic randomness (floating-text ids, VFX ids) deliberately keeps using
// Math.random so it never shifts the gameplay sequence.

export type RngStream =
  | 'map' // map layout
  | 'encounter' // which enemies, their HP
  | 'reward' // card/relic/potion rolls, gold, shop stock and prices
  | 'event' // event choice and outcomes
  | 'shuffle' // draw-pile shuffles
  | 'combat' // in-combat randomness (random targets, status card placement)
  | 'bot'; // simulator / test decisions, kept apart from the game's own rolls

export const RNG_STREAMS: RngStream[] = ['map', 'encounter', 'reward', 'event', 'shuffle', 'combat', 'bot'];

export type RngSnapshot = Record<RngStream, number>;

/** Derive an independent 32-bit start state per stream from one seed. */
function mix(seed: number, i: number): number {
  let z = (seed + Math.imul(0x9e3779b9, i + 1)) >>> 0;
  z = Math.imul(z ^ (z >>> 16), 0x85ebca6b) >>> 0;
  z = Math.imul(z ^ (z >>> 13), 0xc2b2ae35) >>> 0;
  return (z ^ (z >>> 16)) >>> 0;
}

function fromSeed(seed: number): RngSnapshot {
  const out = {} as RngSnapshot;
  RNG_STREAMS.forEach((s, i) => {
    out[s] = mix(seed >>> 0, i);
  });
  return out;
}

let states: RngSnapshot = fromSeed((Math.random() * 0x100000000) >>> 0);

/** Re-seed every gameplay stream from one number. */
export function seedRng(seed: number): void {
  states = fromSeed(seed);
}

/** Every stream's state, saved with the run so a resume continues the same sequences. */
export function getRngState(): RngSnapshot {
  return { ...states };
}

/** Restore saved stream states (a plain number is an older single-stream save: reseed from it). */
export function setRngState(snapshot: RngSnapshot | number): void {
  if (typeof snapshot === 'number') {
    seedRng(snapshot);
    return;
  }
  const next = { ...states };
  for (const s of RNG_STREAMS) {
    const v = snapshot[s];
    if (typeof v === 'number' && Number.isFinite(v)) next[s] = v >>> 0;
  }
  states = next;
}

/** Uniform float in [0, 1) from the given stream (mulberry32). */
export function rng(stream: RngStream): number {
  const st = (states[stream] + 0x6d2b79f5) >>> 0;
  states[stream] = st;
  let t = st;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** Integer in [min, max], inclusive. */
export function rngInt(min: number, max: number, stream: RngStream): number {
  return Math.floor(rng(stream) * (max - min + 1)) + min;
}
