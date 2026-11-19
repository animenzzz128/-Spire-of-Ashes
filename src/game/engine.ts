// Public game engine: pure functions from RunState to RunState.
//
// Combat actions build a CombatCtx (combat.ts), run card effects (effects.ts)
// and relic/power triggers (hooks.ts) against it, then commit. Room actions
// (rewards, rest, shop, treasure, events) live in rooms.ts.
import { BALANCE } from './balance';
import { rng } from './rng';
import {
  CARD_DEFS,
  createCardInstance,
  getCardCost,
  getCardEffects,
  getPrimaryBlockEffect,
  getPrimaryDamageEffect,
  getRewardPool,
  getStarterDeck,
  RARE_PITY_CAP,
  RARE_PITY_STEP,
  rollCardChoices,
  setUidCounter,
} from './cards';
import {
  applyBossPhase2IfNeeded,
  applyChargeInterruptIfNeeded,
  CombatCtx,
  drawCardsIntoHand,
  EMBER_CAP,
  hasRelic,
  shuffleArray,
} from './combat';
import {
  applyChoiceAction,
  choiceOptions,
  computeCardBlock,
  conditionMet,
  computeHitDamage,
  newPlayInfo,
  playInfoForChoice,
  runEffects,
  temperPerHitFor,
} from './effects';
import { bossChargeThreshold, computeEnemyNextIntent, emptyStatusMap, spawnEncounter } from './enemies';
import { generateSpireEvent } from './events';
import { HERO_CLASSES } from './heroes';
import { runHooks } from './hooks';
import { generateSpireMap, TOTAL_FLOORS } from './map';
import { rollPotion } from './potions';
import { RELIC_DEFS, rollRelic } from './relics';
import {
  CardInstance,
  CombatState,
  EnemyInstance,
  FloatingText,
  HeroClassId,
  MapNode,
  PendingChoice,
  PotionDef,
  RunState,
  RunStats,
  ShopState,
} from './types';

export { hasRelic, shuffleArray } from './combat';

export interface CombatActionResult {
  state: RunState;
  events: FloatingText[];
  hitPlayer?: boolean;
  hitEnemyUids?: string[];
  playerBlocked?: boolean;
}

export function createNewRun(heroId: HeroClassId, ascension = 0): RunState {
  setUidCounter(0);
  const hero = HERO_CLASSES[heroId];
  const starterRelic = RELIC_DEFS[hero.starterRelicId];
  const map = generateSpireMap();

  return {
    phase: 'MAP',
    heroId,
    hp: hero.maxHp,
    maxHp: hero.maxHp,
    gold: hero.startingGold,
    ascension,
    floor: 0,
    deck: getStarterDeck(heroId),
    relics: [starterRelic],
    potions: [rollPotion(), null, null],
    map,
    currentNodeId: null,
    combat: null,
    reward: null,
    shop: null,
    event: null,
    treasure: null,
    stats: {
      floorsCleared: 0,
      enemiesDefeated: 0,
      elitesDefeated: 0,
      cardsPlayed: 0,
      totalDamageDealt: 0,
      attackDamageDealt: 0,
      poisonDamageDealt: 0,
      relicDamageDealt: 0,
      blockGained: 0,
      damageBlocked: 0,
      hpLost: 0,
      hpHealed: 0,
      cardsByType: { attack: 0, skill: 0, power: 0 },
      damageByCard: {},
      combatHistory: [],
      goldEarned: 0,
    },
  };
}

export function getAvailableNodeIds(state: RunState): Set<string> {
  if (state.floor === 0) {
    return new Set(state.map.filter((n) => n.floor === 1).map((n) => n.id));
  }
  const current = state.map.find((n) => n.id === state.currentNodeId);
  if (!current) return new Set();
  return new Set(current.nextIds);
}

export function startCombat(
  state: RunState,
  type: 'monster' | 'elite' | 'boss',
  floor: number
): RunState {
  let enemies = spawnEncounter(floor, type);
  if (state.ascension >= 1 && type === 'elite') {
    enemies = enemies.map((e) => {
      const scaled = Math.round(e.maxHp * 1.15);
      return { ...e, hp: scaled, maxHp: scaled };
    });
  }
  if (state.ascension >= 2 && type === 'boss') {
    enemies = enemies.map((e) => {
      const scaled = Math.round(e.maxHp * 1.2);
      return {
        ...e,
        hp: scaled,
        maxHp: scaled,
        statuses: { ...e.statuses, strength: e.statuses.strength + 1 },
      };
    });
  }
  // Innate cards first, then shuffle rest
  const deckClone = state.deck.map((c) => ({ ...c }));
  const innate = deckClone.filter((c) => CARD_DEFS[c.defId]?.innate);
  const others = shuffleArray(deckClone.filter((c) => !CARD_DEFS[c.defId]?.innate));
  const drawPile = [...innate, ...others];

  const combat: CombatState = {
    turn: 1,
    energy: 3,
    maxEnergy: 3,
    playerBlock: 0,
    playerStatuses: emptyStatusMap(),
    doubleDamageActive: false,
    drawPile,
    hand: [],
    discardPile: [],
    exhaustPile: [],
    enemies,
    attacksPlayedThisTurn: 0,
    cardsPlayedThisTurn: 0,
    isBossFight: type === 'boss',
    isEliteFight: type === 'elite',
    enemyTurnInProgress: false,
    combatDamageDealt: 0,
    combatDamageBlocked: 0,
    combatDamageTaken: 0,
    log: [{ key: 'logEnterCombat', n: floor }],
    ember: 0,
    emberCap: EMBER_CAP,
    stokesThisTurn: 0,
    abilityUsesThisTurn: 0,
    temperPending: 0,
    temperedThisTurn: false,
    stokesThisCombat: 0,
    abilityUsesThisCombat: 0,
  };

  // Combat-start relics (Strength, Block, Energy, extra draw, turn-1 Hourglass)
  // are triggers in hooks.ts; then the opening draw.
  const ctx = new CombatCtx(state, combat);
  runHooks(ctx, 'combatStart');
  ctx.drawCards(5 + ctx.extraDraw);

  return {
    ...state,
    phase: 'COMBAT',
    combat: ctx.withCounters(),
    stats: ctx.commitStats(state.stats),
    reward: null,
    shop: null,
    event: null,
    treasure: null,
  };
}

function generateShop(state: RunState): ShopState {
  const pool = getRewardPool(state.heroId);
  const picked = shuffleArray(pool, 'reward').slice(0, 5);
  const cards = picked.map((def) => {
    const basePrice = def.rarity === 'rare' ? 145 : def.rarity === 'uncommon' ? 75 : 50;
    return {
      card: createCardInstance(def.id, false),
      price: basePrice + Math.floor(rng('reward') * 14) - 7,
      sold: false,
    };
  });

  const r1 = rollRelic(state.relics.map((r) => r.id));
  const r2 = rollRelic([...state.relics.map((r) => r.id), r1.id]);
  const relics = [r1, r2].map((relic) => ({
    relic,
    price: relic.rarity === 'rare' ? 240 : relic.rarity === 'uncommon' ? 185 : 145,
    sold: false,
  }));

  const potions = [rollPotion(), rollPotion()].map((potion) => ({
    potion,
    price: potion.rarity === 'rare' ? 85 : 52,
    sold: false,
  }));

  return {
    cards,
    relics,
    potions,
    removePrice: 75,
    removedThisVisit: false,
  };
}

export function enterMapNode(state: RunState, nodeId: string): RunState {
  const available = getAvailableNodeIds(state);
  if (!available.has(nodeId)) return state;
  const node = state.map.find((n) => n.id === nodeId);
  if (!node) return state;

  const updatedMap: MapNode[] = state.map.map((n) =>
    n.id === nodeId ? { ...n, visited: true } : n
  );

  const nextBase: RunState = {
    ...state,
    floor: node.floor,
    currentNodeId: nodeId,
    map: updatedMap,
    stats: { ...state.stats, floorsCleared: state.stats.floorsCleared + 1 },
  };

  if (node.type === 'monster' || node.type === 'elite' || node.type === 'boss') {
    return startCombat(nextBase, node.type, node.floor);
  }
  if (node.type === 'rest') {
    return { ...nextBase, phase: 'REST', combat: null };
  }
  if (node.type === 'shop') {
    return { ...nextBase, phase: 'SHOP', shop: generateShop(nextBase), combat: null };
  }
  if (node.type === 'treasure') {
    // Treasure never rolls rare relics (a floor-8 +1 Energy relic decided whole runs).
    const relic = rollRelic(nextBase.relics.map((r) => r.id), false);
    return {
      ...nextBase,
      phase: 'TREASURE',
      treasure: { relic, gold: 55 + Math.floor(rng('reward') * 25), opened: false },
      combat: null,
    };
  }
  // Event
  return {
    ...nextBase,
    phase: 'EVENT',
    event: generateSpireEvent(nextBase),
    combat: null,
  };
}

// ---------------------------------------------------------------------------
// Previews (UI numbers and bot decisions)
// ---------------------------------------------------------------------------

export function calculateCardDamagePreview(
  card: CardInstance,
  state: RunState,
  targetEnemy?: EnemyInstance
): { perHit: number; hits: number; boosted: boolean; reduced: boolean } {
  const def = CARD_DEFS[card.defId];
  const combat = state.combat;
  const effect = def ? getPrimaryDamageEffect(def) : undefined;
  if (!def || !combat || !effect) return { perHit: 0, hits: 1, boosted: false, reduced: false };

  const temper = temperPerHitFor(def, card.upgraded, combat);
  const calc = computeHitDamage(effect, card.upgraded, combat, targetEnemy, temper);
  return {
    perHit: calc.perHit,
    hits: calc.hits,
    boosted: calc.perHit > calc.base,
    reduced: calc.perHit < calc.base,
  };
}

/**
 * Total damage a card would deal to one target right now: every damage effect
 * whose condition holds, every hit, with Temper, Strength, Weak and Vulnerable.
 * Returns null for cards that deal no damage. (Ignores the target's Block.)
 */
export function calculateCardTotalDamage(
  card: CardInstance,
  state: RunState,
  target: EnemyInstance
): number | null {
  const def = CARD_DEFS[card.defId];
  const combat = state.combat;
  if (!def || !combat) return null;
  const temper = temperPerHitFor(def, card.upgraded, combat);
  let total = 0;
  let any = false;
  for (const e of getCardEffects(def)) {
    if (e.op !== 'damage' || !conditionMet(combat, e.when)) continue;
    any = true;
    const calc = computeHitDamage(e, card.upgraded, combat, target, temper);
    total += calc.perHit * (e.xHits ? combat.energy : calc.hits);
  }
  return any ? total : null;
}

export function calculateCardBlockPreview(
  card: CardInstance,
  state: RunState
): { block: number; boosted: boolean; reduced: boolean } {
  const def = CARD_DEFS[card.defId];
  const combat = state.combat;
  const effect = def ? getPrimaryBlockEffect(def) : undefined;
  if (!def || !combat || !effect) return { block: 0, boosted: false, reduced: false };

  const { base, block } = computeCardBlock(effect, card.upgraded, combat);
  if (base <= 0) return { block: 0, boosted: false, reduced: false };
  return { block, boosted: block > base, reduced: block < base };
}

export function calculateEnemyAttackPreview(
  enemy: EnemyInstance,
  state: RunState
): { perHit: number; hits: number; boosted: boolean; reduced: boolean } {
  const combat = state.combat;
  if (!combat || enemy.intent.damage === undefined) {
    return { perHit: 0, hits: 1, boosted: false, reduced: false };
  }
  const base = enemy.intent.damage;
  const hits = enemy.intent.hits || 1;
  let dmg = base + enemy.statuses.strength;
  if (enemy.statuses.weak > 0) dmg = Math.floor(dmg * 0.75);
  if (combat.playerStatuses.vulnerable > 0) dmg = Math.floor(dmg * 1.5);
  dmg = Math.max(0, dmg);

  return {
    perHit: dmg,
    hits,
    boosted: dmg > base,
    reduced: dmg < base,
  };
}

// ---------------------------------------------------------------------------
// Combat resolution
// ---------------------------------------------------------------------------

function finalizeCombatIfWon(
  state: RunState,
  combat: CombatState,
  events: FloatingText[]
): CombatActionResult {
  const allDead = combat.enemies.every((e) => e.hp <= 0);
  if (!allDead) {
    return {
      state: { ...state, combat },
      events,
    };
  }

  // All enemies dead: victory triggers (end-of-combat heals) run first.
  const winCtx = new CombatCtx(state, combat);
  runHooks(winCtx, 'combatWon');
  const nextHp = winCtx.hp;
  const postHeal = winCtx.hpHealed;
  events.push(...winCtx.events);

  const defeatedCount = combat.enemies.length;
  const nextStats = {
    ...state.stats,
    enemiesDefeated: state.stats.enemiesDefeated + defeatedCount,
    elitesDefeated: state.stats.elitesDefeated + (combat.isEliteFight ? 1 : 0),
    hpHealed: state.stats.hpHealed + postHeal,
    combatHistory: [
      ...state.stats.combatHistory,
      {
        floor: state.floor,
        turns: combat.turn,
        damageDealt: combat.combatDamageDealt || 0,
        damageBlocked: combat.combatDamageBlocked || 0,
        damageTaken: combat.combatDamageTaken || 0,
      },
    ],
  };

  if (combat.isBossFight || state.floor >= TOTAL_FLOORS) {
    return {
      state: {
        ...state,
        hp: nextHp,
        phase: 'VICTORY',
        combat: null,
        stats: nextStats,
      },
      events,
    };
  }

  const gold = combat.isEliteFight
    ? 28 + Math.floor(rng('reward') * 12)
    : 12 + Math.floor(rng('reward') * 10);

  const cardChoices = rollCardChoices(state.heroId, 3, combat.isEliteFight, state.rarePity || 0);
  const offeredRare = cardChoices.some((c) => CARD_DEFS[c.defId]?.rarity === 'rare');
  const rarePity = offeredRare ? 0 : Math.min(RARE_PITY_CAP, (state.rarePity || 0) + RARE_PITY_STEP);

  const reward = {
    gold,
    goldClaimed: false,
    cardChoices,
    cardClaimed: false,
    relic: combat.isEliteFight ? rollRelic(state.relics.map((r) => r.id)) : undefined,
    relicClaimed: false,
    potion: rng('reward') < (combat.isEliteFight ? 0.6 : 0.38) ? rollPotion() : undefined,
    potionClaimed: false,
  };

  return {
    state: {
      ...state,
      hp: nextHp,
      phase: 'REWARD',
      combat: null,
      reward,
      rarePity,
      stats: nextStats,
    },
    events,
  };
}

/** Commit a player action: stats, then death or victory checks. */
function finishPlayerAction(
  state: RunState,
  ctx: CombatCtx,
  extraStats?: (s: RunStats) => RunStats
): CombatActionResult {
  let stats = ctx.commitStats(state.stats);
  if (extraStats) stats = extraStats(stats);
  if (ctx.hp <= 0) {
    return {
      state: { ...state, hp: 0, phase: 'DEFEAT', combat: null, stats },
      events: ctx.events,
    };
  }
  return finalizeCombatIfWon({ ...state, hp: ctx.hp, stats }, ctx.withCounters(), ctx.events);
}

/** True when the player may act (their turn, nothing pending). */
function canAct(combat: CombatState | null): combat is CombatState {
  return Boolean(combat && !combat.pendingChoice && !combat.enemyTurnInProgress);
}

export function playCard(
  state: RunState,
  cardUid: string,
  targetEnemyUid?: string
): CombatActionResult {
  const combat = state.combat;
  if (!canAct(combat)) return { state, events: [] };

  const card = combat.hand.find((c) => c.uid === cardUid);
  if (!card) return { state, events: [] };
  const def = CARD_DEFS[card.defId];
  if (!def) return { state, events: [] };

  const cost = getCardCost(card);
  if (cost === -2) return { state, events: [] }; // Unplayable
  const actualCost = cost === -1 ? combat.energy : cost;
  if (combat.energy < actualCost) return { state, events: [] };

  if (def.target === 'enemy') {
    const living = combat.enemies.filter((e) => e.hp > 0);
    const target = living.find((e) => e.uid === targetEnemyUid) || (living.length === 1 ? living[0] : undefined);
    if (!target) return { state, events: [] };
    targetEnemyUid = target.uid;
  }

  const ctx = new CombatCtx(state);
  const c = ctx.combat;
  c.energy -= actualCost;
  c.hand = c.hand.filter((x) => x.uid !== cardUid);
  c.cardsPlayedThisTurn += 1;
  if (def.type === 'attack') c.attacksPlayedThisTurn += 1;

  // Marrow Ache in hand, Cinderhorn enrage on Skills, ... (hooks.ts)
  runHooks(ctx, 'cardPlayed', { card });

  const play = newPlayInfo(card, def, targetEnemyUid, actualCost);
  play.temperPerHit = temperPerHitFor(def, card.upgraded, ctx.combat);
  runEffects(ctx, getCardEffects(def), play);

  if (def.type === 'attack') {
    if (play.temperPerHit > 0) ctx.combat.temperPending = 0;
    runHooks(ctx, 'attackPlayed', { card });
  }

  ctx.dmgPoison += ctx.rotburstChain();
  ctx.checkBossStates();

  if (play.lifesteal > 0) {
    const healed = ctx.heal(play.lifesteal);
    if (healed > 0) ctx.emit('player', { key: 'heal', n: healed }, 'heal');
  }

  // Where the played card goes: powers leave combat, Exhaust cards are removed.
  const shouldExhaust = card.upgraded && def.upgradedExhaust !== undefined ? def.upgradedExhaust : def.exhaust;
  if (def.type === 'power') {
    // Powers leave combat cleanly
  } else if (shouldExhaust) {
    ctx.exhaustCard(card);
  } else {
    ctx.combat.discardPile.push(card);
  }

  // A choose / discard step paused the card (Last Refuge, Sleight of Hand, ...):
  // the player picks next, then the rest of the card runs (chooseCard).
  if (play.pendingChoice && !ctx.combat.enemies.every((e) => e.hp <= 0)) {
    ctx.combat.pendingChoice = play.pendingChoice;
  }

  ctx.log({ key: 'logPlayCard', ref: def.id, upgraded: card.upgraded });
  ctx.dmgAttack += play.dealt;

  const result = finishPlayerAction(state, ctx, (stats) => {
    const prev = stats.damageByCard[def.id] || { defId: def.id, name: def.name, damage: 0, plays: 0 };
    return {
      ...stats,
      cardsPlayed: stats.cardsPlayed + 1,
      cardsByType: {
        attack: stats.cardsByType.attack + (def.type === 'attack' ? 1 : 0),
        skill: stats.cardsByType.skill + (def.type === 'skill' ? 1 : 0),
        power: stats.cardsByType.power + (def.type === 'power' ? 1 : 0),
      },
      damageByCard: {
        ...stats.damageByCard,
        [def.id]: { ...prev, damage: prev.damage + play.dealt, plays: prev.plays + 1 },
      },
    };
  });
  return { ...result, hitEnemyUids: play.hitEnemyUids, playerBlocked: play.playerBlocked };
}

/** Run the rest of a paused card once its choice is complete. */
function finishChoice(ctx: CombatCtx, pc: PendingChoice): void {
  if (pc.then.length === 0) return;
  const play = playInfoForChoice(pc);
  if (!play) return;
  runEffects(ctx, pc.then, play);
  ctx.dmgPoison += ctx.rotburstChain();
  ctx.checkBossStates();
  ctx.dmgAttack += play.dealt;
  if (play.lifesteal > 0) {
    const healed = ctx.heal(play.lifesteal);
    if (healed > 0) ctx.emit('player', { key: 'heal', n: healed }, 'heal');
  }
  if (play.pendingChoice && !ctx.combat.enemies.every((e) => e.hp <= 0)) {
    ctx.combat.pendingChoice = play.pendingChoice;
  }
}

/**
 * Pick one card for the pending choice (discard from hand, take back from the
 * exhaust pile, ...). Discarded Echo cards trigger their Echo here (the
 * end-of-turn discard does not count). After the last pick the rest of the
 * card runs.
 */
export function chooseCard(state: RunState, cardUid: string): CombatActionResult {
  const combat = state.combat;
  const pc = combat?.pendingChoice;
  if (!combat || !pc || combat.enemyTurnInProgress) return { state, events: [] };
  const card = choiceOptions(combat, pc).find((c) => c.uid === cardUid);
  if (!card) return { state, events: [] };

  const ctx = new CombatCtx(state);
  if (pc.action !== 'discard') {
    ctx.combat[pc.from] = ctx.combat[pc.from].filter((x) => x.uid !== cardUid);
  }
  applyChoiceAction(ctx, pc, card);
  ctx.checkBossStates();

  const next: PendingChoice = { ...pc, remaining: pc.remaining - 1, chosen: [...pc.chosen, card] };
  if (next.remaining > 0 && choiceOptions(ctx.combat, next).length > 0) {
    ctx.combat.pendingChoice = next;
  } else {
    ctx.combat.pendingChoice = undefined;
    finishChoice(ctx, next);
  }
  return finishPlayerAction(state, ctx);
}

/** Decline an optional choice; the rest of the card still runs. */
export function skipChoice(state: RunState): CombatActionResult {
  const combat = state.combat;
  const pc = combat?.pendingChoice;
  if (!combat || !pc || !pc.optional || combat.enemyTurnInProgress) return { state, events: [] };
  const ctx = new CombatCtx(state);
  ctx.combat.pendingChoice = undefined;
  finishChoice(ctx, pc);
  return finishPlayerAction(state, ctx);
}

/** Older name for chooseCard (discard choices). */
export const discardCard = chooseCard;

/** Legacy wrapper: resolve a discard choice and return only the new state. */
export function discardSelectedCard(state: RunState, cardUid: string): RunState {
  return discardCard(state, cardUid).state;
}

// ---------------------------------------------------------------------------
// Ember: Stoke and class abilities
// ---------------------------------------------------------------------------

export const ABILITY_USES_PER_TURN = 1;

export const CLASS_ABILITY: Record<HeroClassId, { id: 'temper' | 'ash_veil' }> = {
  ironwarden: { id: 'temper' },
  shadowweaver: { id: 'ash_veil' },
};

/** Ember cost of the class ability (tuned in balance.ts). */
export function abilityCost(): number {
  return BALANCE.abilityCost;
}

export function stokesPerTurn(): number {
  return BALANCE.stokesPerTurn;
}

export function canStoke(state: RunState): boolean {
  const c = state.combat;
  return canAct(c) && (c.stokesThisTurn || 0) < stokesPerTurn() && c.hand.length > 0;
}

export function canUseAbility(state: RunState): boolean {
  const c = state.combat;
  return (
    canAct(c) &&
    (c.abilityUsesThisTurn || 0) < ABILITY_USES_PER_TURN &&
    (c.ember || 0) >= abilityCost() &&
    c.enemies.some((e) => e.hp > 0)
  );
}

/**
 * Stoke: once per turn, Exhaust a card from your hand to gain 1 Ember. Any card
 * works, including unplayable statuses and curses. Stoking is not playing, so
 * Marrow Ache does not trigger.
 */
export function stokeCard(state: RunState, cardUid: string): CombatActionResult {
  if (!canStoke(state)) return { state, events: [] };
  const card = state.combat!.hand.find((c) => c.uid === cardUid);
  if (!card) return { state, events: [] };

  const ctx = new CombatCtx(state);
  const c = ctx.combat;
  c.hand = c.hand.filter((x) => x.uid !== cardUid);
  ctx.exhaustCard(card);
  c.stokesThisTurn += 1;
  ctx.stokes += 1;
  ctx.log({ key: 'logStoke', ref: card.defId, upgraded: card.upgraded });
  ctx.gainEmber(1);
  runHooks(ctx, 'stoke', { card });
  ctx.checkBossStates();
  return finishPlayerAction(state, ctx);
}

/** Use the hero's class ability (Temper / Ash Veil) by spending Ember. */
export function useClassAbility(state: RunState): CombatActionResult {
  if (!canUseAbility(state)) return { state, events: [] };
  const ability = CLASS_ABILITY[state.heroId];

  const ctx = new CombatCtx(state);
  const c = ctx.combat;
  ctx.spendEmber(abilityCost());
  c.abilityUsesThisTurn += 1;
  ctx.abilityUses += 1;

  if (ability.id === 'temper') {
    c.temperPending += 1;
    c.temperedThisTurn = true;
    ctx.emit('player', { key: 'temper' }, 'ember');
  } else {
    for (const idx of ctx.livingIndices()) ctx.debuffEnemy(idx, 'poison', BALANCE.ashVeilPoison);
  }
  ctx.log({ key: 'logAbility', ref: ability.id });
  ctx.checkBossStates();
  return finishPlayerAction(state, ctx);
}

// ---------------------------------------------------------------------------
// Potions
// ---------------------------------------------------------------------------

export function usePotion(
  state: RunState,
  slotIndex: number,
  targetEnemyUid?: string
): CombatActionResult {
  const potion = state.potions[slotIndex];
  if (!potion) return { state, events: [] };

  const nextPotions = [...state.potions];

  if (potion.id === 'heartblood_elixir') {
    const healed = Math.min(15, state.maxHp - state.hp);
    nextPotions[slotIndex] = null;
    return {
      state: {
        ...state,
        hp: state.hp + healed,
        potions: nextPotions,
        stats: { ...state.stats, hpHealed: state.stats.hpHealed + healed },
      },
      events: [{ id: `${Date.now()}_hp_pot`, targetUid: 'player', msg: { key: 'heal', n: healed }, tone: 'heal' }],
    };
  }

  const combat = state.combat;
  if (!combat || combat.enemyTurnInProgress) return { state, events: [] };

  const ctx = new CombatCtx(state);
  if (potion.target === 'enemy') {
    const living = ctx.combat.enemies.filter((e) => e.hp > 0);
    const target = living.find((e) => e.uid === targetEnemyUid) || living[0];
    if (!target) return { state, events: [] };
    const idx = ctx.combat.enemies.findIndex((e) => e.uid === target.uid);

    if (potion.id === 'wildfire_flask') {
      const res = ctx.damageEnemyAt(idx, 20);
      ctx.dmgRelic += res.hpDamage;
      ctx.emit(target.uid, { key: 'damage', n: res.hpDamage }, 'damage');
      ctx.dmgRelic += ctx.rotburstChain();
    } else if (potion.id === 'nightshade_vial') {
      ctx.debuffEnemy(idx, 'poison', 6);
    }
  } else if (potion.id === 'stoneskin_tonic') {
    ctx.gainBlock(12);
  } else if (potion.id === 'berserker_draught') {
    ctx.combat.playerStatuses.strength += 2;
    ctx.emit('player', { key: 'gainStrength', n: 2 }, 'buff');
  } else if (potion.id === 'kindling_elixir') {
    ctx.combat.energy += 2;
    ctx.emit('player', { key: 'gainEnergy', n: 2 }, 'buff');
  } else if (potion.id === 'haste_tincture') {
    ctx.drawCards(3);
    ctx.emit('player', { key: 'draw', n: 3 }, 'buff');
  }

  ctx.checkBossStates();
  nextPotions[slotIndex] = null;
  ctx.log({ key: 'logUsePotion', ref: potion.id });
  return finishPlayerAction({ ...state, potions: nextPotions }, ctx);
}

// ---------------------------------------------------------------------------
// Enemy turn
// ---------------------------------------------------------------------------

export function resolveEnemyTurn(state: RunState): CombatActionResult {
  if (!state.combat) return { state, events: [] };

  const ctx = new CombatCtx(state);
  const c = ctx.combat;

  // 1. End of the player's turn: end-of-turn triggers (Burn, Ironhide, ...), discard.
  runHooks(ctx, 'turnEnd');

  // Discard hand (Ethereal cards exhaust)
  for (const card of c.hand) {
    if (CARD_DEFS[card.defId]?.ethereal) ctx.exhaustCard(card);
    else c.discardPile.push(card);
  }
  c.hand = [];
  c.pendingChoice = undefined;

  if (ctx.hp <= 0) {
    return {
      state: { ...state, hp: 0, phase: 'DEFEAT', combat: null, stats: ctx.commitStats(state.stats) },
      events: ctx.events,
      hitPlayer: true,
    };
  }

  // Player debuffs that existed before the enemies act. Only these tick down at
  // the start of the next player turn; stacks applied during this enemy turn
  // are "just applied" and last a full round (otherwise 1-stack debuffs from
  // enemies would expire before ever mattering).
  const debuffsBeforeEnemyTurn = {
    vulnerable: c.playerStatuses.vulnerable,
    weak: c.playerStatuses.weak,
    frail: c.playerStatuses.frail,
  };

  // 2. Enemies act in order.
  for (let i = 0; i < ctx.combat.enemies.length; i++) {
    let enemy = ctx.combat.enemies[i];
    if (enemy.hp <= 0) continue;

    // Poison ticks at start of enemy turn (ignores block!)
    if (enemy.statuses.poison > 0) {
      const pDmg = Math.min(enemy.hp, enemy.statuses.poison);
      ctx.dmgPoison += pDmg;
      enemy.hp = Math.max(0, enemy.hp - pDmg);
      enemy.statuses.poison = Math.max(0, enemy.statuses.poison - 1);
      if (enemy.charge && !enemy.charge.interrupted) {
        enemy.charge = { ...enemy.charge, progress: enemy.charge.progress + pDmg };
      }
      ctx.emit(enemy.uid, { key: 'poisonTick', n: pDmg }, 'poison');
      if (enemy.hp <= 0) {
        ctx.combat.enemies[i] = enemy;
        ctx.dmgPoison += ctx.rotburstChain();
        continue;
      }
    }

    // Enemy clears previous block (unless asleep) and applies Ironhide
    if (!enemy.asleep) {
      enemy.block = 0;
    }
    if (enemy.statuses.ironhide > 0) {
      enemy.block += enemy.statuses.ironhide;
    }
    // A poison tick may have pushed the boss to half HP; check after the block
    // reset so the phase-2 block survives into the player's next turn.
    enemy = applyBossPhase2IfNeeded(enemy, ctx.events, ctx.combat.log);
    // The poison tick right before a charged attack counts toward interrupting it.
    const interrupted = applyChargeInterruptIfNeeded(enemy, ctx.events, ctx.combat.log);
    if (interrupted) {
      enemy = interrupted;
      ctx.interrupts += 1;
    }

    const intent = enemy.intent;
    const wasCharging = Boolean(enemy.charge);
    if (intent.type === 'stunned') {
      ctx.emit(enemy.uid, { key: 'stunned' }, 'debuff');
    }

    // Attack
    if (intent.damage !== undefined && intent.damage > 0) {
      const preview = calculateEnemyAttackPreview(enemy, { ...state, combat: ctx.combat });
      for (let h = 0; h < preview.hits; h++) {
        if (ctx.hp <= 0) break;
        const res = ctx.damagePlayer(preview.perHit);
        if (res.fullyBlocked) {
          ctx.emit('player', { key: 'blocked' }, 'block');
        } else {
          ctx.hitPlayer = true;
          ctx.emit('player', { key: 'damage', n: res.hpDamage }, 'damage');
        }
      }
    }

    // Enemy Block
    if (intent.block) {
      enemy.block += intent.block;
      ctx.emit(enemy.uid, { key: 'gainBlock', n: intent.block }, 'block');
    }

    // Enemy Buffs
    if (intent.gainStrength) {
      enemy.statuses.strength += intent.gainStrength;
      ctx.emit(enemy.uid, { key: 'gainStrength', n: intent.gainStrength }, 'buff');
    }
    if (intent.gainZeal) {
      enemy.statuses.zeal += intent.gainZeal;
      ctx.emit(enemy.uid, { key: 'gainZeal', n: intent.gainZeal }, 'buff');
    }
    if (intent.gainIronhide) {
      enemy.statuses.ironhide += intent.gainIronhide;
      enemy.block += intent.gainIronhide;
    }

    // Enemy Debuffs on Player
    for (const [key, amount, msgKey] of [
      ['vulnerable', intent.applyVulnerable, 'applyVulnerable'],
      ['weak', intent.applyWeak, 'applyWeak'],
      ['frail', intent.applyFrail, 'applyFrail'],
    ] as const) {
      if (!amount) continue;
      const ps = ctx.combat.playerStatuses;
      if (ps.artifact > 0) {
        ps.artifact -= 1;
        ctx.emit('player', { key: 'artifactBlocked' }, 'debuff');
      } else {
        ps[key] += amount;
        ctx.emit('player', { key: msgKey, n: amount }, 'debuff');
      }
    }
    if (intent.addStatusCardId && intent.addStatusCount) {
      for (let k = 0; k < intent.addStatusCount; k++) {
        const statusCard = createCardInstance(intent.addStatusCardId, false);
        if (intent.statusToDrawPile) {
          const pos = Math.floor(rng('combat') * (ctx.combat.drawPile.length + 1));
          ctx.combat.drawPile.splice(pos, 0, statusCard);
        } else {
          ctx.combat.discardPile.push(statusCard);
        }
      }
      ctx.emit(
        'player',
        {
          key: intent.statusToDrawPile ? 'statusCardsDraw' : 'statusCards',
          n: intent.addStatusCount,
          ref: intent.addStatusCardId,
        },
        'debuff'
      );
    }
    if (intent.grantsEnrage) {
      enemy.enraged = true;
    }

    // A charge resolves on the action after it started: fired or interrupted.
    if (wasCharging) {
      if (!enemy.charge!.interrupted) ctx.chargesFired += 1;
      enemy.charge = undefined;
    }
    if (intent.startsCharge) {
      enemy.charge = { threshold: bossChargeThreshold(state.ascension), progress: 0, interrupted: false };
      ctx.emit(enemy.uid, { key: 'chargeStart', n: enemy.charge.threshold }, 'buff');
    }

    // End of enemy turn: Zeal grants Strength, decrement enemy Vulnerable/Weak
    if (enemy.statuses.zeal > 0) {
      enemy.statuses.strength += enemy.statuses.zeal;
    }
    if (enemy.statuses.vulnerable > 0) enemy.statuses.vulnerable -= 1;
    if (enemy.statuses.weak > 0) enemy.statuses.weak -= 1;

    // Advance enemy turn counter & wake up the Slumbering Gargoyle on Turn 3
    enemy.turnCount += 1;
    if (enemy.defId === 'slumbering_gargoyle' && enemy.turnCount >= 3) {
      enemy.asleep = false;
    }
    enemy.intent = computeEnemyNextIntent(enemy, enemy.turnCount);
    ctx.combat.enemies[i] = enemy;
  }

  // Enemies may have died to Poison or Rotburst during their own turn.
  ctx.noteDeaths();
  const wonCheck = finalizeCombatIfWon(
    { ...state, hp: ctx.hp, stats: ctx.commitStats(state.stats) },
    ctx.withCounters(),
    ctx.events
  );
  if (wonCheck.state.phase !== 'COMBAT') {
    return { ...wonCheck, hitPlayer: ctx.hitPlayer };
  }

  if (ctx.hp <= 0) {
    return {
      state: { ...state, hp: 0, phase: 'DEFEAT', combat: null, stats: ctx.commitStats(state.stats) },
      events: ctx.events,
      hitPlayer: true,
    };
  }

  // 3. Start of the player's next turn.
  const n = ctx.combat;
  n.turn += 1;
  n.energy = n.maxEnergy;
  n.attacksPlayedThisTurn = 0;
  n.cardsPlayedThisTurn = 0;
  n.playerStatuses.noDrawThisTurn = false;
  n.stokesThisTurn = 0;
  n.abilityUsesThisTurn = 0;
  n.temperPending = 0;
  n.temperedThisTurn = false;

  // Player Block preservation check (Bastion or Shade)
  if (!n.playerStatuses.bastion) {
    if (n.playerStatuses.shade > 0) {
      n.playerStatuses.shade -= 1;
    } else {
      n.playerBlock = 0;
    }
  }

  runHooks(ctx, 'turnStart');

  // Decrement player debuffs that were already active before this enemy turn
  const ps = ctx.combat.playerStatuses;
  if (debuffsBeforeEnemyTurn.vulnerable > 0) ps.vulnerable -= 1;
  if (debuffsBeforeEnemyTurn.weak > 0) ps.weak -= 1;
  if (debuffsBeforeEnemyTurn.frail > 0) ps.frail -= 1;

  ctx.drawCards(5);

  // Cinder Hourglass may have killed the remaining enemies.
  const finalCheck = finalizeCombatIfWon(
    { ...state, hp: ctx.hp, stats: ctx.commitStats(state.stats) },
    ctx.withCounters(),
    ctx.events
  );
  return { ...finalCheck, hitPlayer: ctx.hitPlayer };
}

export function addPotionToSlot(
  potions: (PotionDef | null)[],
  potion: PotionDef
): { potions: (PotionDef | null)[]; added: boolean } {
  const idx = potions.findIndex((p) => p === null);
  if (idx === -1) return { potions, added: false };
  const copy = [...potions];
  copy[idx] = potion;
  return { potions: copy, added: true };
}

export function discardPotionSlot(
  potions: (PotionDef | null)[],
  slotIndex: number
): (PotionDef | null)[] {
  const copy = [...potions];
  if (slotIndex >= 0 && slotIndex < copy.length) {
    copy[slotIndex] = null;
  }
  return copy;
}
