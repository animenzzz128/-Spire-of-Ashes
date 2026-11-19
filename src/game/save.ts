// Run save format: a versioned envelope with migrations and validation.
//
//   { version, savedAt, rngState, uidCounter, run }
//
// - version: bumped whenever the shape of RunState changes. Each bump adds one
//   entry to MIGRATIONS that upgrades the previous version, so old saves keep
//   loading instead of being thrown away.
// - rngState / uidCounter: restored on resume, so a resumed run continues the
//   exact same random sequence and never reuses an instance id.
// - Loading validates the run: a save that can't be used is reported (and
//   backed up by the caller), unknown content ids are removed, and relics and
//   potions are refreshed from the current definitions.
import { CARD_DEFS, getUidCounter, setUidCounter } from './cards';
import { EMBER_CAP } from './combat';
import { resolveEnemyTurn } from './engine';
import { HERO_CLASSES } from './heroes';
import { POTION_DEFS } from './potions';
import { RELIC_DEFS } from './relics';
import { getRngState, RNG_STREAMS, RngSnapshot, setRngState } from './rng';
import { CardInstance, GamePhase, PotionDef, RelicDef, RunState } from './types';

/** Same key as before versioning, so existing saves are found and migrated. */
export const RUN_SAVE_KEY = 'spire_ashes_active_run_v2';
/** Unreadable saves are copied here before being ignored, so nothing is silently lost. */
export const CORRUPT_SAVE_KEY = 'spire_ashes_run_corrupt';
export const SAVE_VERSION = 4;

export interface SaveEnvelope {
  version: number;
  savedAt: string;
  /** Every RNG stream's state (older saves stored a single number). */
  rngState?: RngSnapshot | number;
  uidCounter?: number;
  run: RunState;
}

export type LoadResult =
  | { status: 'none' }
  | { status: 'ok'; save: SaveEnvelope; repairs: string[] }
  | { status: 'corrupt'; reason: string }
  | { status: 'newer'; version: number };

const PHASES: GamePhase[] = ['TITLE', 'MAP', 'COMBAT', 'REWARD', 'REST', 'EVENT', 'SHOP', 'TREASURE', 'VICTORY', 'DEFEAT'];

export function serializeRun(run: RunState): string {
  const envelope: SaveEnvelope = {
    version: SAVE_VERSION,
    savedAt: new Date().toISOString(),
    rngState: getRngState(),
    uidCounter: getUidCounter(),
    run,
  };
  return JSON.stringify(envelope);
}

// ---------------------------------------------------------------------------
// Migrations: MIGRATIONS[v] upgrades a version-v envelope to version v + 1.
// ---------------------------------------------------------------------------
type Envelope = { version: number; run: Record<string, unknown>; [k: string]: unknown };

const MIGRATIONS: Record<number, (e: Envelope) => Envelope> = {
  // v2 -> v3: the envelope itself, plus the P2 Ember fields filled once here
  // instead of at every reader.
  2: (e) => {
    const run = e.run as unknown as RunState;
    if (run.combat) {
      run.combat = {
        ...run.combat,
        ember: run.combat.ember ?? 0,
        emberCap: run.combat.emberCap ?? EMBER_CAP,
        stokesThisTurn: run.combat.stokesThisTurn ?? 0,
        abilityUsesThisTurn: run.combat.abilityUsesThisTurn ?? 0,
        temperPending: run.combat.temperPending ?? 0,
        temperedThisTurn: run.combat.temperedThisTurn ?? false,
      };
    }
    return { ...e, version: 3 };
  },
  // v3 -> v4: the discard prompt became a general choice.
  3: (e) => {
    const run = e.run as unknown as RunState;
    const combat = run.combat as (RunState['combat'] & { pendingDiscard?: { sourceCardUid: string; remaining: number } }) | null;
    if (combat?.pendingDiscard) {
      const { pendingDiscard, ...rest } = combat;
      run.combat = {
        ...rest,
        pendingChoice: {
          sourceCardUid: pendingDiscard.sourceCardUid,
          sourceDefId: '',
          upgraded: false,
          from: 'hand',
          action: 'discard',
          remaining: pendingDiscard.remaining,
          chosen: [],
          then: [],
        },
      };
    }
    return { ...e, version: 4 };
  },
};

/** Version-2 saves were a bare RunState; later versions wrap it. */
function toEnvelope(parsed: unknown): Envelope | null {
  if (!parsed || typeof parsed !== 'object') return null;
  const obj = parsed as Record<string, unknown>;
  if (typeof obj.version === 'number' && obj.run && typeof obj.run === 'object') {
    return obj as Envelope;
  }
  if (typeof obj.phase === 'string' && typeof obj.heroId === 'string') {
    return { version: 2, savedAt: '', run: obj };
  }
  return null;
}

// ---------------------------------------------------------------------------
// Validation and repair
// ---------------------------------------------------------------------------
const isNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v);

function validRngState(v: unknown): RngSnapshot | number | undefined {
  if (isNum(v)) return v;
  if (v && typeof v === 'object' && RNG_STREAMS.every((s) => isNum((v as Record<string, unknown>)[s]))) {
    return v as RngSnapshot;
  }
  return undefined;
}
const isArr = Array.isArray;

function validCards(list: unknown, where: string, repairs: string[]): CardInstance[] | null {
  if (!isArr(list)) return null;
  const kept = list.filter(
    (c): c is CardInstance =>
      !!c && typeof c === 'object' && typeof (c as CardInstance).uid === 'string' && !!CARD_DEFS[(c as CardInstance).defId]
  );
  if (kept.length !== list.length) repairs.push(`${where}: removed ${list.length - kept.length} unknown card(s)`);
  return kept.map((c) => ({ uid: c.uid, defId: c.defId, upgraded: Boolean(c.upgraded) }));
}

function freshRelic(r: unknown): RelicDef | undefined {
  const id = r && typeof r === 'object' ? (r as RelicDef).id : undefined;
  return id ? RELIC_DEFS[id] : undefined;
}

function freshPotion(p: unknown): PotionDef | undefined {
  const id = p && typeof p === 'object' ? (p as PotionDef).id : undefined;
  return id ? POTION_DEFS[id] : undefined;
}

/** Check a migrated run; returns the repaired run or the reason it can't be used. */
export function validateRun(raw: Record<string, unknown>): { run: RunState; repairs: string[] } | { error: string } {
  const repairs: string[] = [];
  const run = raw as unknown as RunState;
  if (!HERO_CLASSES[run.heroId]) return { error: `unknown hero "${String(run.heroId)}"` };
  if (!PHASES.includes(run.phase)) return { error: `unknown phase "${String(run.phase)}"` };
  for (const k of ['hp', 'maxHp', 'gold', 'floor', 'ascension'] as const) {
    if (!isNum(run[k])) return { error: `${k} is not a number` };
  }
  if (!isArr(run.map) || run.map.length === 0) return { error: 'map is missing' };
  if (!run.stats || typeof run.stats !== 'object') return { error: 'stats are missing' };

  const deck = validCards(run.deck, 'deck', repairs);
  if (!deck) return { error: 'deck is missing' };

  const relics = (isArr(run.relics) ? run.relics : []).map(freshRelic).filter((r): r is RelicDef => !!r);
  if (isArr(run.relics) && relics.length !== run.relics.length) repairs.push('relics: removed unknown relic(s)');
  const potions = (isArr(run.potions) ? run.potions : [null, null, null]).map((p) => (p ? freshPotion(p) ?? null : null));

  let combat = run.combat;
  if (run.phase === 'COMBAT') {
    if (!combat || typeof combat !== 'object' || !isArr(combat.enemies) || combat.enemies.length === 0) {
      return { error: 'combat state is missing' };
    }
    const hand = validCards(combat.hand, 'hand', repairs);
    const drawPile = validCards(combat.drawPile, 'draw pile', repairs);
    const discardPile = validCards(combat.discardPile, 'discard pile', repairs);
    const exhaustPile = validCards(combat.exhaustPile, 'exhaust pile', repairs);
    if (!hand || !drawPile || !discardPile || !exhaustPile) return { error: 'combat piles are missing' };
    combat = { ...combat, hand, drawPile, discardPile, exhaustPile };
    const pc = combat.pendingChoice;
    if (pc && !combat[pc.from]?.some((c) => c.uid !== pc.sourceCardUid)) combat = { ...combat, pendingChoice: undefined };
  } else {
    combat = null;
  }

  const reward = run.reward
    ? {
        ...run.reward,
        cardChoices: validCards(run.reward.cardChoices, 'reward', repairs) ?? [],
        relic: run.reward.relic ? freshRelic(run.reward.relic) : undefined,
        potion: run.reward.potion ? freshPotion(run.reward.potion) : undefined,
      }
    : null;
  const shop = run.shop
    ? {
        ...run.shop,
        cards: (run.shop.cards || []).filter((it) => it && CARD_DEFS[it.card?.defId]),
        relics: (run.shop.relics || []).flatMap((it) => {
          const relic = freshRelic(it?.relic);
          return relic ? [{ ...it, relic }] : [];
        }),
        potions: (run.shop.potions || []).flatMap((it) => {
          const potion = freshPotion(it?.potion);
          return potion ? [{ ...it, potion }] : [];
        }),
      }
    : null;
  const treasureRelic = run.treasure ? freshRelic(run.treasure.relic) : undefined;
  const treasure = run.treasure && treasureRelic ? { ...run.treasure, relic: treasureRelic } : null;
  if (run.phase === 'TREASURE' && !treasure) return { error: 'treasure state is missing' };
  if (run.phase === 'REWARD' && !reward) return { error: 'reward state is missing' };
  if (run.phase === 'SHOP' && !shop) return { error: 'shop state is missing' };
  if (run.phase === 'EVENT' && !run.event) return { error: 'event state is missing' };

  return {
    run: { ...run, deck, relics, potions, combat, reward, shop, treasure },
    repairs,
  };
}

/** Parse, migrate and validate a stored save. Pure: never touches storage. */
export function parseSave(raw: string | null): LoadResult {
  if (!raw) return { status: 'none' };
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return { status: 'corrupt', reason: 'not valid JSON' };
  }
  const first = toEnvelope(parsed);
  if (!first) return { status: 'corrupt', reason: 'unrecognized save format' };
  let env: Envelope = first;
  if (env.version > SAVE_VERSION) return { status: 'newer', version: env.version };
  while (env.version < SAVE_VERSION) {
    const migrate: ((e: Envelope) => Envelope) | undefined = MIGRATIONS[env.version];
    if (!migrate) return { status: 'corrupt', reason: `no migration from version ${env.version}` };
    env = migrate(env);
  }
  const checked = validateRun(env.run);
  if ('error' in checked) return { status: 'corrupt', reason: checked.error };
  const run = checked.run;
  // Finished runs are not resumable (permadeath).
  if (run.phase === 'VICTORY' || run.phase === 'DEFEAT' || run.hp <= 0) return { status: 'none' };
  return {
    status: 'ok',
    repairs: checked.repairs,
    save: {
      version: SAVE_VERSION,
      savedAt: typeof env.savedAt === 'string' ? env.savedAt : '',
      rngState: validRngState(env.rngState),
      uidCounter: isNum(env.uidCounter) ? env.uidCounter : undefined,
      run,
    },
  };
}

/**
 * Turn a loaded save back into a live run: restore the random sequence and the
 * id counter, and finish an enemy turn that was interrupted by a reload (the
 * save is written while the enemy-turn animation plays; without this the run
 * stayed locked forever).
 */
export function resumeRun(save: SaveEnvelope): RunState {
  if (save.rngState !== undefined) setRngState(save.rngState);
  if (save.uidCounter !== undefined) setUidCounter(save.uidCounter);
  const run = save.run;
  if (run.phase === 'COMBAT' && run.combat?.enemyTurnInProgress) {
    const next = resolveEnemyTurn(run).state;
    return next.combat ? { ...next, combat: { ...next.combat, enemyTurnInProgress: false } } : next;
  }
  return run;
}

// ---------------------------------------------------------------------------
// Storage (browser). Errors are reported, never thrown.
// ---------------------------------------------------------------------------
type StorageLike = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>;

export function readSave(storage: StorageLike): LoadResult {
  try {
    return parseSave(storage.getItem(RUN_SAVE_KEY));
  } catch {
    return { status: 'none' };
  }
}

/** Write the run. Returns false if storage refused (private mode, quota). */
export function writeSave(storage: StorageLike, run: RunState): boolean {
  try {
    storage.setItem(RUN_SAVE_KEY, serializeRun(run));
    return true;
  } catch {
    return false;
  }
}

export function clearSave(storage: StorageLike): void {
  try {
    storage.removeItem(RUN_SAVE_KEY);
  } catch {
    // storage unavailable: nothing to clear
  }
}

/** Keep a copy of an unreadable save, then stop offering it. */
export function quarantineSave(storage: StorageLike): void {
  try {
    const raw = storage.getItem(RUN_SAVE_KEY);
    if (raw) storage.setItem(CORRUPT_SAVE_KEY, raw);
    storage.removeItem(RUN_SAVE_KEY);
  } catch {
    // storage unavailable
  }
}
