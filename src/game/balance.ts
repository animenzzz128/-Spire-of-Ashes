// Tuning knobs for the Ember system and enemy strength, in one place.
// The game reads these at call time, so the simulator can override them
// (SIM_TUNE='{"bossHp":260}' npm run sim) to try a calibration before
// committing it here. Values here are the shipped ones.
export const BALANCE = {
  /** Ember cost of Temper / Ash Veil. */
  abilityCost: 2,
  /** Temper bonus on a single-hit, single-target attack, and per hit/target otherwise. */
  temperSingle: 6,
  temperSplit: 3,
  /** Ash Veil poison applied to every enemy. */
  ashVeilPoison: 3,
  /** Stokes allowed per turn. */
  stokesPerTurn: 1,
  /** Multiplier on normal and elite enemy HP (bosses use bossHp). */
  enemyHpScale: 1.2,
  /** Obsidian Warden laser damage when its charge is not interrupted. */
  bossLaser: 38,
  /** Strength the Warden gains each time it starts charging (every 4 turns). */
  bossCycleStrength: 3,
  /** Ironhide the Warden gains when it starts charging (capped at 8; 0 = none). */
  bossCycleIronhide: 2,
  /** Obsidian Warden base HP (before ascension scaling). */
  bossHp: 320,
  /** Damage that interrupts the Warden's charged laser (Ascension 9+ uses the A9 value). */
  chargeThreshold: 32,
  chargeThresholdA9: 42,
};

export type BalanceKey = keyof typeof BALANCE;

/** Apply overrides (simulator / experiments only). Unknown keys throw so typos are caught. */
export function overrideBalance(overrides: Partial<Record<string, number>>): void {
  for (const [k, v] of Object.entries(overrides)) {
    if (!(k in BALANCE)) throw new Error(`Unknown balance key: ${k}`);
    if (typeof v !== 'number' || !Number.isFinite(v)) throw new Error(`Balance value for ${k} must be a number`);
    (BALANCE as Record<string, number>)[k] = v;
  }
}
