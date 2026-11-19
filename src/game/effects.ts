// Card effect interpreter. Every card (and every Echo) runs through runEffects,
// whether its effect list was written by hand or compiled from flat fields.
import { BALANCE } from './balance';
import { CARD_DEFS, createCardInstance, effVal, getCardEffects } from './cards';
import type { CombatCtx } from './combat';
import { runHooks } from './hooks';
import { rng } from './rng';
import {
  CardDef,
  CardEffect,
  CardFilter,
  CardInstance,
  ChoicePile,
  CombatState,
  EffectCondition,
  EffectPer,
  EffectScope,
  EnemyInstance,
  PendingChoice,
} from './types';

type DamageEffect = Extract<CardEffect, { op: 'damage' }>;
type BlockEffect = Extract<CardEffect, { op: 'block' }>;

/** Everything one card resolution needs to know and report. */
export interface PlayInfo {
  card: CardInstance;
  def: CardDef;
  upgraded: boolean;
  targetUid?: string;
  xValue: number; // energy spent on an X-cost card
  spent: number; // Ember spent so far by this card
  hitEnemyUids: string[];
  dealt: number; // HP damage dealt by this card's attacks
  lifesteal: number;
  playerBlocked: boolean;
  temperPerHit: number;
  /** Set when a choose step paused the card; the engine stores it on the combat. */
  pendingChoice?: PendingChoice;
  /** Cards picked by this card's choice (available to the effects after it). */
  chosen: CardInstance[];
  /** Cards discarded by this card (discardHand). */
  discarded: number;
}

export function newPlayInfo(card: CardInstance, def: CardDef, targetUid?: string, xValue = 0): PlayInfo {
  return {
    card,
    def,
    upgraded: card.upgraded,
    targetUid,
    xValue,
    spent: 0,
    hitEnemyUids: [],
    dealt: 0,
    lifesteal: 0,
    playerBlocked: false,
    temperPerHit: 0,
    chosen: [],
    discarded: 0,
  };
}

export function conditionMet(combat: CombatState, cond?: EffectCondition, chosen: CardInstance[] = []): boolean {
  if (!cond) return true;
  if ('emberAtLeast' in cond) return (combat.ember || 0) >= cond.emberAtLeast;
  if ('temperedThisTurn' in cond) return Boolean(combat.temperedThisTurn);
  if ('chosenType' in cond) return chosen.some((c) => CARD_DEFS[c.defId]?.type === cond.chosenType);
  return true;
}

/** n scaled by cards chosen / discarded earlier in the same card. */
function perCount(per: EffectPer | undefined, play: PlayInfo): number {
  if (per === 'chosen') return play.chosen.length;
  if (per === 'discarded') return play.discarded;
  return 1;
}

// ---------------------------------------------------------------------------
// Choices
// ---------------------------------------------------------------------------

export function pileCards(combat: CombatState, pile: ChoicePile): CardInstance[] {
  return combat[pile];
}

export function matchesFilter(card: CardInstance, filter?: CardFilter): boolean {
  if (!filter) return true;
  const def = CARD_DEFS[card.defId];
  if (!def) return false;
  if (filter.types && !filter.types.includes(def.type)) return false;
  if (filter.notUpgraded && card.upgraded) return false;
  return true;
}

/** Cards the player may pick for this choice right now (never the card that asked). */
export function choiceOptions(
  combat: CombatState,
  pc: Pick<PendingChoice, 'from' | 'filter' | 'sourceCardUid'>
): CardInstance[] {
  return pileCards(combat, pc.from).filter((c) => c.uid !== pc.sourceCardUid && matchesFilter(c, pc.filter));
}

/** Discard one card from hand: discard pile, then its Echo, then discard triggers. */
export function discardFromHand(ctx: CombatCtx, card: CardInstance): void {
  ctx.combat.hand = ctx.combat.hand.filter((x) => x.uid !== card.uid);
  ctx.combat.discardPile.push(card);
  const def = CARD_DEFS[card.defId];
  if (def?.echo) {
    ctx.emit('player', { key: 'echo', ref: def.id }, 'ember');
    runEffects(ctx, def.echo, newPlayInfo(card, def));
  }
  runHooks(ctx, 'discard', { card });
}

/** Apply a choice's action to one picked card (already removed from its pile, except for discards). */
export function applyChoiceAction(ctx: CombatCtx, pc: PendingChoice, card: CardInstance): void {
  switch (pc.action) {
    case 'discard':
      discardFromHand(ctx, card);
      return;
    case 'exhaust':
      ctx.exhaustCard(card);
      return;
    case 'toHand':
      ctx.addToHand(card);
      return;
    case 'toHandUpgraded':
      ctx.addToHand({ ...card, upgraded: true });
      return;
    case 'upgrade':
      ctx.combat[pc.from].push({ ...card, upgraded: true });
      return;
  }
}

/** Rebuild the card context after the player finished choosing. */
export function playInfoForChoice(pc: PendingChoice): PlayInfo | null {
  const def = CARD_DEFS[pc.sourceDefId];
  if (!def) return null;
  const play = newPlayInfo({ uid: pc.sourceCardUid, defId: pc.sourceDefId, upgraded: pc.upgraded }, def, pc.targetUid, pc.xValue || 0);
  play.spent = pc.spent || 0;
  play.chosen = pc.chosen;
  return play;
}

/** Start a choice; returns false (and the card continues) when nothing can be picked. */
function startChoice(ctx: CombatCtx, e: Extract<CardEffect, { op: 'choose' | 'discard' }>, play: PlayInfo, rest: CardEffect[]): boolean {
  const spec =
    e.op === 'discard'
      ? { from: 'hand' as const, action: 'discard' as const, filter: undefined, optional: false, sourceCardUid: play.card.uid }
      : { from: e.from, action: e.action, filter: e.filter, optional: e.optional, sourceCardUid: play.card.uid };
  const options = choiceOptions(ctx.combat, spec);
  const count = Math.min(effVal(e, play.upgraded), options.length);
  if (count <= 0) return false;
  play.pendingChoice = {
    sourceCardUid: play.card.uid,
    sourceDefId: play.def.id,
    upgraded: play.upgraded,
    targetUid: play.targetUid,
    from: spec.from,
    action: spec.action,
    remaining: count,
    ...(spec.filter ? { filter: spec.filter } : {}),
    ...(spec.optional ? { optional: true } : {}),
    chosen: [],
    then: rest,
    spent: play.spent,
    xValue: play.xValue,
  };
  return true;
}

function hitsOf(e: DamageEffect, upgraded: boolean): number {
  return upgraded && e.upHits !== undefined ? e.upHits : e.hits || 1;
}

/** Temper bonus per hit the next Attack would get (0 when nothing is pending). */
export function temperPerHitFor(def: CardDef, upgraded: boolean, combat: CombatState): number {
  const pending = combat.temperPending || 0;
  if (def.type !== 'attack' || pending <= 0) return 0;
  const dmg = getCardEffects(def).filter(
    (e): e is DamageEffect => e.op === 'damage' && conditionMet(combat, e.when)
  );
  if (dmg.length === 0) return 0;
  const single =
    def.target === 'enemy' &&
    dmg.length === 1 &&
    !dmg[0].xHits &&
    !dmg[0].to &&
    hitsOf(dmg[0], upgraded) === 1;
  // Temper adds temperSingle to a single-hit, single-target attack, or
  // temperSplit per hit, per target, to multi-hit or multi-target attacks.
  return pending * (single ? BALANCE.temperSingle : BALANCE.temperSplit);
}

/** Per-hit damage of a damage effect against a target, after every modifier. */
export function computeHitDamage(
  e: DamageEffect,
  upgraded: boolean,
  combat: CombatState,
  target: EnemyInstance | undefined,
  temperPerHit: number
): { base: number; perHit: number; hits: number } {
  const base = e.fromBlock ? combat.playerBlock : effVal(e, upgraded);
  const perEmber = upgraded && e.upPerEmber !== undefined ? e.upPerEmber : e.perEmber || 0;
  const strMult = upgraded && e.upStrMult !== undefined ? e.upStrMult : e.strMult || 1;
  let dmg = base + perEmber * (combat.ember || 0) + temperPerHit + combat.playerStatuses.strength * strMult;
  if (combat.playerStatuses.weak > 0) dmg = Math.floor(dmg * 0.75);
  if (combat.doubleDamageActive) dmg = dmg * 2;
  if (target && target.statuses.vulnerable > 0) dmg = Math.floor(dmg * 1.5);
  return { base, perHit: Math.max(0, dmg), hits: hitsOf(e, upgraded) };
}

export function computeCardBlock(e: BlockEffect, upgraded: boolean, combat: CombatState): { base: number; block: number } {
  const base = effVal(e, upgraded);
  if (base <= 0) return { base: 0, block: 0 };
  let blk = base + combat.playerStatuses.dexterity;
  if (combat.playerStatuses.frail > 0) blk = Math.floor(blk * 0.75);
  return { base, block: Math.max(0, blk) };
}

/** Living enemy indices an effect hits: the card's own target, everyone ('all') or one at random ('random'). */
function targetsFor(ctx: CombatCtx, play: PlayInfo, to?: EffectScope): number[] {
  if (to === 'random') {
    const living = ctx.livingIndices();
    return living.length ? [living[Math.floor(rng('combat') * living.length)]] : [];
  }
  const scope = to === 'all' ? 'all_enemies' : play.def.target;
  if (scope === 'all_enemies') return ctx.livingIndices();
  if (scope === 'enemy') {
    const idx = ctx.combat.enemies.findIndex((e) => e.uid === play.targetUid);
    return idx >= 0 && ctx.combat.enemies[idx].hp > 0 ? [idx] : [];
  }
  return [];
}

function runEffect(ctx: CombatCtx, e: CardEffect, play: PlayInfo): void {
  const c = ctx.combat;
  const up = play.upgraded;
  switch (e.op) {
    case 'damage': {
      for (const idx of targetsFor(ctx, play, e.to)) {
        const target = c.enemies[idx];
        const calc = computeHitDamage(e, up, ctx.combat, target, play.temperPerHit);
        const hits = e.xHits ? play.xValue : calc.hits;
        if (hits <= 0) continue;
        play.hitEnemyUids.push(target.uid);
        for (let h = 0; h < hits; h++) {
          if (ctx.combat.enemies[idx].hp <= 0) break;
          const res = ctx.damageEnemyAt(idx, calc.perHit, ctx.combat.playerStatuses.venomEdge);
          play.dealt += res.hpDamage;
          if (e.lifesteal) play.lifesteal += res.hpDamage;
          ctx.emit(
            target.uid,
            res.blocked ? { key: 'blocked' } : { key: 'damage', n: res.hpDamage },
            res.blocked ? 'block' : 'damage'
          );
          const thorns = ctx.combat.enemies[idx].statuses.thorns;
          if (thorns > 0) {
            ctx.damagePlayer(thorns);
            ctx.emit('player', { key: 'thorns', n: thorns }, 'damage');
          }
        }
      }
      return;
    }
    case 'block': {
      const { block } = computeCardBlock(e, up, ctx.combat);
      if (block > 0) {
        ctx.combat.playerBlock += block;
        ctx.blockGained += block;
        play.playerBlocked = true;
        ctx.emit('player', { key: 'gainBlock', n: block }, 'block');
      }
      return;
    }
    case 'debuff': {
      const n = effVal(e, up);
      for (const idx of targetsFor(ctx, play, e.to)) ctx.debuffEnemy(idx, e.status, n);
      return;
    }
    case 'multiplyPoison': {
      const mult = effVal(e, up);
      for (const idx of targetsFor(ctx, play)) {
        const enemy = ctx.combat.enemies[idx];
        if (mult > 1 && enemy.statuses.poison > 0) {
          const added = enemy.statuses.poison * (mult - 1);
          ctx.combat.enemies[idx] = { ...enemy, statuses: { ...enemy.statuses, poison: enemy.statuses.poison * mult } };
          ctx.emit(enemy.uid, { key: 'applyPoison', n: added }, 'poison');
        }
      }
      return;
    }
    case 'markRotburst': {
      for (const idx of targetsFor(ctx, play)) {
        const enemy = ctx.combat.enemies[idx];
        ctx.combat.enemies[idx] = { ...enemy, statuses: { ...enemy.statuses, rotburst: true } };
        ctx.emit(enemy.uid, { key: 'rotburstMark' }, 'poison');
      }
      return;
    }
    case 'gainEnergy': {
      const n = effVal(e, up);
      if (n > 0) {
        ctx.combat.energy += n;
        ctx.emit('player', { key: 'gainEnergy', n }, 'buff');
      }
      return;
    }
    case 'loseHp': {
      const n = effVal(e, up);
      if (n > 0) {
        ctx.loseHp(n);
        ctx.emit('player', { key: 'damage', n }, 'damage');
      }
      return;
    }
    case 'draw':
      ctx.drawCards(effVal(e, up));
      return;
    case 'lockDraw':
      ctx.combat.playerStatuses.noDrawThisTurn = true;
      return;
    case 'addCard': {
      const n = effVal(e, up);
      const count = e.perSpent ? Math.min(n, play.spent) : e.per ? n * perCount(e.per, play) : n;
      const upgradedCopy = Boolean(e.upgradedCopies && up);
      for (let i = 0; i < count; i++) {
        ctx.addToHand(createCardInstance(e.card, upgradedCopy));
      }
      return;
    }
    case 'upgradeAllInCombat': {
      const cc = ctx.combat;
      cc.hand = cc.hand.map((x) => ({ ...x, upgraded: true }));
      cc.drawPile = cc.drawPile.map((x) => ({ ...x, upgraded: true }));
      cc.discardPile = cc.discardPile.map((x) => ({ ...x, upgraded: true }));
      ctx.emit('player', { key: 'upgradeAll' }, 'buff');
      return;
    }
    case 'buff': {
      const n = effVal(e, up);
      if (n <= 0) return;
      const ps = ctx.combat.playerStatuses;
      ps[e.status] = (ps[e.status] || 0) + n;
      const msgKey =
        e.status === 'strength'
          ? 'gainStrength'
          : e.status === 'dexterity'
          ? 'gainDexterity'
          : e.status === 'ironhide'
          ? 'gainIronhide'
          : e.status === 'artifact'
          ? 'gainArtifact'
          : undefined;
      if (msgKey) ctx.emit('player', { key: msgKey, n }, 'buff');
      return;
    }
    case 'flag':
      ctx.combat.playerStatuses[e.flag] = true;
      return;
    case 'gainEmber': {
      const n = effVal(e, up);
      const distinctHit = new Set(play.hitEnemyUids).size;
      const amount = e.perEnemyHit
        ? Math.min(e.max ?? Infinity, n * distinctHit)
        : e.per
        ? Math.min(e.max ?? Infinity, n * perCount(e.per, play))
        : n;
      ctx.gainEmber(amount);
      return;
    }
    case 'spendEmber': {
      const want = e.n === 'all' ? ctx.combat.ember : e.n;
      play.spent += ctx.spendEmber(want);
      return;
    }
    case 'discardHand': {
      for (const card of [...ctx.combat.hand]) {
        discardFromHand(ctx, card);
        play.discarded += 1;
      }
      return;
    }
    case 'removeBlock': {
      const n = effVal(e, up);
      for (const idx of targetsFor(ctx, play, e.to)) {
        const enemy = ctx.combat.enemies[idx];
        const removed = Math.min(enemy.block, n);
        if (removed > 0) {
          ctx.combat.enemies[idx] = { ...enemy, block: enemy.block - removed };
          ctx.emit(enemy.uid, { key: 'blockRemoved', n: removed }, 'debuff');
        }
      }
      return;
    }
    case 'heal': {
      const healed = ctx.heal(effVal(e, up));
      if (healed > 0) ctx.emit('player', { key: 'heal', n: healed }, 'heal');
      return;
    }
    case 'discard':
    case 'choose':
      // Handled by runEffects (they pause the card).
      return;
  }
}

/**
 * Run a card's effects in order. A choose / discard step with something to pick
 * pauses the card: the rest of the list is stored on play.pendingChoice and
 * runs after the player picks (engine.chooseCard).
 */
export function runEffects(ctx: CombatCtx, effects: CardEffect[], play: PlayInfo): void {
  for (let i = 0; i < effects.length; i++) {
    const e = effects[i];
    if (!conditionMet(ctx.combat, e.when, play.chosen)) continue;
    if (e.op === 'choose' || e.op === 'discard') {
      if (startChoice(ctx, e, play, effects.slice(i + 1))) return;
      continue;
    }
    runEffect(ctx, e, play);
  }
}
