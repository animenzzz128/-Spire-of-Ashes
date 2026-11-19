// Card effect interpreter. Every card (and every Echo) runs through runEffects,
// whether its effect list was written by hand or compiled from flat fields.
import { BALANCE } from './balance';
import { createCardInstance, effVal, getCardEffects } from './cards';
import { CombatCtx } from './combat';
import {
  CardDef,
  CardEffect,
  CardInstance,
  CombatState,
  EffectCondition,
  EffectScope,
  EnemyInstance,
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
  pendingDiscard: number;
  temperPerHit: number;
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
    pendingDiscard: 0,
    temperPerHit: 0,
  };
}

export function conditionMet(combat: CombatState, cond?: EffectCondition): boolean {
  if (!cond) return true;
  if ('emberAtLeast' in cond) return (combat.ember || 0) >= cond.emberAtLeast;
  if ('temperedThisTurn' in cond) return Boolean(combat.temperedThisTurn);
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

/** Living enemy indices an effect hits: the card's own target, or everyone with to: 'all'. */
function targetsFor(ctx: CombatCtx, play: PlayInfo, to?: EffectScope): number[] {
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
      const count = e.perSpent ? Math.min(n, play.spent) : n;
      const upgradedCopy = Boolean(e.upgradedCopies && up);
      for (let i = 0; i < count; i++) {
        const copy = createCardInstance(e.card, upgradedCopy);
        if (ctx.combat.hand.length < 10) ctx.combat.hand.push(copy);
        else ctx.combat.discardPile.push(copy);
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
      const amount = e.perEnemyHit ? Math.min(e.max ?? Infinity, n * distinctHit) : n;
      ctx.gainEmber(amount);
      return;
    }
    case 'spendEmber': {
      const want = e.n === 'all' ? ctx.combat.ember : e.n;
      play.spent += ctx.spendEmber(want);
      return;
    }
    case 'discard':
      play.pendingDiscard = effVal(e, up);
      return;
  }
}

export function runEffects(ctx: CombatCtx, effects: CardEffect[], play: PlayInfo): void {
  for (const e of effects) {
    if (!conditionMet(ctx.combat, e.when)) continue;
    runEffect(ctx, e, play);
  }
}
