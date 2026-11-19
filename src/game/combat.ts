// Combat primitives shared by every combat action (playing a card, Stoke,
// class abilities, potions, the enemy turn) plus CombatCtx, the mutable working
// copy one action runs against. Actions clone the combat once, mutate the copy
// through these helpers, then commit stats and return a new RunState, so the
// public engine API stays pure (RunState in, RunState out).
import { computeEnemyNextIntent } from './enemies';
import { runHooks } from './hooks';
import { rng } from './rng';
import {
  CombatLogEntry,
  CombatMsg,
  CombatState,
  EnemyDebuffKey,
  EnemyInstance,
  FloatingText,
  HeroClassId,
  RelicDef,
  RunState,
  RunStats,
  StatusMap,
} from './types';

export const EMBER_CAP = 10;

export function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function hasRelic(relics: RelicDef[], id: string): boolean {
  return relics.some((r) => r.id === id);
}

/** Cosmetic id for floating text. Uses Math.random so it never touches the gameplay RNG. */
export function fxId(tag: string): string {
  return `${Date.now()}_${tag}_${Math.random().toString(36).slice(2, 8)}`;
}

/** Deep-enough copy for one action, filling Ember fields missing from pre-P2 saves. */
export function cloneCombat(c: CombatState): CombatState {
  return {
    ...c,
    playerStatuses: { ...c.playerStatuses },
    drawPile: [...c.drawPile],
    hand: [...c.hand],
    discardPile: [...c.discardPile],
    exhaustPile: [...c.exhaustPile],
    enemies: c.enemies.map((e) => ({
      ...e,
      statuses: { ...e.statuses },
      ...(e.charge ? { charge: { ...e.charge } } : {}),
    })),
    log: [...c.log],
    ember: c.ember ?? 0,
    emberCap: c.emberCap ?? EMBER_CAP,
    stokesThisTurn: c.stokesThisTurn ?? 0,
    abilityUsesThisTurn: c.abilityUsesThisTurn ?? 0,
    temperPending: c.temperPending ?? 0,
    temperedThisTurn: c.temperedThisTurn ?? false,
  };
}

export function drawCardsIntoHand(combat: CombatState, count: number): CombatState {
  if (combat.playerStatuses.noDrawThisTurn) return combat;
  let drawPile = [...combat.drawPile];
  let discardPile = [...combat.discardPile];
  const hand = [...combat.hand];

  for (let i = 0; i < count; i++) {
    if (hand.length >= 10) break;
    if (drawPile.length === 0) {
      if (discardPile.length === 0) break;
      drawPile = shuffleArray(discardPile);
      discardPile = [];
    }
    const top = drawPile.shift();
    if (top) hand.push(top);
  }

  return { ...combat, drawPile, discardPile, hand };
}

export function applyDebuffToStatuses(
  statuses: StatusMap,
  key: EnemyDebuffKey | 'frail',
  amount: number
): { statuses: StatusMap; blockedByArtifact: boolean } {
  if (amount <= 0) return { statuses, blockedByArtifact: false };
  if (statuses.artifact > 0) {
    return {
      statuses: { ...statuses, artifact: statuses.artifact - 1 },
      blockedByArtifact: true,
    };
  }
  return {
    statuses: { ...statuses, [key]: statuses[key] + amount },
    blockedByArtifact: false,
  };
}

/** Add damage toward interrupting a charged attack (blocked damage counts too). */
export function addChargeProgress(enemy: EnemyInstance, amount: number): EnemyInstance {
  if (!enemy.charge || enemy.charge.interrupted || amount <= 0) return enemy;
  return { ...enemy, charge: { ...enemy.charge, progress: enemy.charge.progress + amount } };
}

export function damageEnemy(
  enemy: EnemyInstance,
  rawDamage: number,
  playerVenomEdge: number
): { enemy: EnemyInstance; hpDamage: number; blocked: boolean } {
  if (enemy.hp <= 0) return { enemy, hpDamage: 0, blocked: false };
  let block = enemy.block;
  let hp = enemy.hp;
  let hpDamage = 0;
  let blocked = false;

  if (block >= rawDamage) {
    block -= rawDamage;
    blocked = rawDamage > 0;
  } else {
    // Only damage that actually removes HP counts (no overkill in stats / lifesteal).
    hpDamage = Math.min(hp, rawDamage - block);
    block = 0;
    hp = hp - hpDamage;
  }

  let statuses = { ...enemy.statuses };
  if (hpDamage > 0 && playerVenomEdge > 0) {
    const res = applyDebuffToStatuses(statuses, 'poison', playerVenomEdge);
    statuses = res.statuses;
  }

  let asleep = enemy.asleep;
  if (hpDamage > 0 && asleep) {
    asleep = false;
  }

  let updated: EnemyInstance = {
    ...enemy,
    hp,
    block,
    statuses,
    asleep,
  };
  updated = addChargeProgress(updated, rawDamage);

  if (asleep === false && enemy.asleep === true && hp > 0) {
    updated.intent = computeEnemyNextIntent(updated, updated.turnCount);
  }

  return { enemy: updated, hpDamage, blocked };
}

export function triggerRotburstIfNeeded(
  enemies: EnemyInstance[],
  alreadyExploded: Set<string>,
  events: FloatingText[]
): { enemies: EnemyInstance[]; explosionDamage: number } {
  let updated = [...enemies];
  let changed = true;
  let explosionDamage = 0;

  while (changed) {
    changed = false;
    for (const dead of updated) {
      if (dead.hp <= 0 && dead.statuses.rotburst && !alreadyExploded.has(dead.uid)) {
        alreadyExploded.add(dead.uid);
        changed = true;
        const boomDmg = dead.maxHp;
        updated = updated.map((other) => {
          // Clear the mark so the corpse cannot explode again on a later action
          // (it used to re-explode every time any card was played).
          if (other.uid === dead.uid) return { ...other, statuses: { ...other.statuses, rotburst: false } };
          if (other.hp <= 0) return other;
          const res = damageEnemy(other, boomDmg, 0);
          explosionDamage += res.hpDamage;
          events.push({ id: fxId('boom'), targetUid: other.uid, msg: { key: 'damage', n: boomDmg }, tone: 'poison' });
          return res.enemy;
        });
      }
    }
  }
  return { enemies: updated, explosionDamage };
}

// Boss Phase 2 awakens at <= 50% HP. Checked after every damage source
// (cards, Rotburst, potions, poison ticks, Cinder Hourglass) so no
// damage type can skip the transition.
export function applyBossPhase2IfNeeded(
  enemy: EnemyInstance,
  events: FloatingText[],
  log: CombatLogEntry[]
): EnemyInstance {
  if (
    !enemy.isBoss ||
    enemy.bossPhase2Triggered ||
    enemy.hp <= 0 ||
    enemy.hp > Math.floor(enemy.maxHp / 2)
  ) {
    return enemy;
  }
  log.push({ key: 'logBossPhase2', ref: enemy.defId, name: enemy.name });
  events.push({ id: fxId('boss_p2'), targetUid: enemy.uid, msg: { key: 'bossPhase2' }, tone: 'buff' });
  return {
    ...enemy,
    bossPhase2Triggered: true,
    block: enemy.block + 10,
    statuses: {
      ...enemy.statuses,
      strength: enemy.statuses.strength + 2,
      thorns: enemy.statuses.thorns + 1,
    },
  };
}

/** Vulnerable a charging enemy takes when it is interrupted (bypasses Artifact: it is a stagger, not a debuff). */
export const INTERRUPT_VULNERABLE = 2;

/** Interrupt a charged attack once enough damage has landed. Returns null if nothing happened. */
export function applyChargeInterruptIfNeeded(
  enemy: EnemyInstance,
  events: FloatingText[],
  log: CombatLogEntry[]
): EnemyInstance | null {
  const ch = enemy.charge;
  if (!ch || ch.interrupted || enemy.hp <= 0 || ch.progress < ch.threshold) return null;
  log.push({ key: 'logInterrupt', ref: enemy.defId, name: enemy.name });
  events.push({ id: fxId('interrupt'), targetUid: enemy.uid, msg: { key: 'interrupted' }, tone: 'debuff' });
  return {
    ...enemy,
    charge: { ...ch, interrupted: true },
    statuses: { ...enemy.statuses, vulnerable: enemy.statuses.vulnerable + INTERRUPT_VULNERABLE },
    intent: { type: 'stunned', label: '过载失衡 · 跳过行动' },
  };
}

/**
 * Working copy for one combat action. Accumulates the stats the action
 * produced so they can be committed in one place.
 */
export class CombatCtx {
  combat: CombatState;
  hp: number;
  readonly maxHp: number;
  readonly relics: RelicDef[];
  readonly heroId: HeroClassId;
  readonly ascension: number;
  readonly events: FloatingText[] = [];
  /** Rotburst victims that already exploded during this action. */
  exploded = new Set<string>();

  dmgAttack = 0;
  dmgPoison = 0;
  dmgRelic = 0;
  blockGained = 0;
  blocked = 0;
  hpLost = 0;
  hpHealed = 0;
  hitPlayer = false;
  stokes = 0;
  abilityUses = 0;
  interrupts = 0;
  chargesFired = 0;

  constructor(state: RunState, combat: CombatState = state.combat as CombatState) {
    this.combat = cloneCombat(combat);
    this.hp = state.hp;
    this.maxHp = state.maxHp;
    this.relics = state.relics;
    this.heroId = state.heroId;
    this.ascension = state.ascension;
  }

  hasRelic(id: string): boolean {
    return hasRelic(this.relics, id);
  }

  emit(targetUid: string, msg: CombatMsg, tone: FloatingText['tone']): void {
    this.events.push({ id: fxId(msg.key), targetUid, msg, tone });
  }

  log(entry: CombatLogEntry): void {
    this.combat.log.push(entry);
  }

  livingIndices(): number[] {
    return this.combat.enemies.map((e, i) => (e.hp > 0 ? i : -1)).filter((i) => i >= 0);
  }

  /** Flat Block (relics, powers). Card Block goes through dexterity/frail first. */
  gainBlock(n: number, msg?: CombatMsg): void {
    if (n <= 0) return;
    this.combat.playerBlock += n;
    this.blockGained += n;
    this.emit('player', msg ?? { key: 'gainBlock', n }, 'block');
  }

  /** HP loss that ignores Block (self-damage, curses). */
  loseHp(n: number): void {
    if (n <= 0) return;
    this.hpLost += Math.min(this.hp, n);
    this.hp = Math.max(0, this.hp - n);
  }

  heal(n: number): number {
    const healed = Math.max(0, Math.min(n, this.maxHp - this.hp));
    this.hp += healed;
    this.hpHealed += healed;
    return healed;
  }

  /** Damage to the player that Block absorbs first (enemy attacks, Thorns, Burn). */
  damagePlayer(raw: number): { hpDamage: number; fullyBlocked: boolean } {
    const c = this.combat;
    if (c.playerBlock >= raw) {
      c.playerBlock -= raw;
      this.blocked += raw;
      return { hpDamage: 0, fullyBlocked: true };
    }
    this.blocked += c.playerBlock;
    const rem = raw - c.playerBlock;
    c.playerBlock = 0;
    this.hpLost += Math.min(this.hp, rem);
    this.hp = Math.max(0, this.hp - rem);
    return { hpDamage: rem, fullyBlocked: false };
  }

  damageEnemyAt(idx: number, raw: number, venomEdge = 0): { hpDamage: number; blocked: boolean } {
    const res = damageEnemy(this.combat.enemies[idx], raw, venomEdge);
    this.combat.enemies[idx] = res.enemy;
    return { hpDamage: res.hpDamage, blocked: res.blocked };
  }

  debuffEnemy(idx: number, key: EnemyDebuffKey, n: number): void {
    if (n <= 0) return;
    const enemy = this.combat.enemies[idx];
    const res = applyDebuffToStatuses(enemy.statuses, key, n);
    this.combat.enemies[idx] = { ...enemy, statuses: res.statuses };
    const msgKey = key === 'vulnerable' ? 'applyVulnerable' : key === 'weak' ? 'applyWeak' : 'applyPoison';
    this.emit(
      enemy.uid,
      res.blockedByArtifact ? { key: 'artifactBlocked' } : { key: msgKey, n },
      key === 'poison' ? 'poison' : 'debuff'
    );
  }

  drawCards(n: number): void {
    if (n > 0) this.combat = drawCardsIntoHand(this.combat, n);
  }

  /** Explode any dead Rotburst-marked enemies (chains). Returns HP damage dealt. */
  rotburstChain(): number {
    const res = triggerRotburstIfNeeded(this.combat.enemies, this.exploded, this.events);
    this.combat.enemies = res.enemies;
    return res.explosionDamage;
  }

  /** Boss phase 2 and charge interrupts; call after any damage. */
  checkBossStates(): void {
    this.combat.enemies = this.combat.enemies.map((e) => {
      let next = applyBossPhase2IfNeeded(e, this.events, this.combat.log);
      const interrupted = applyChargeInterruptIfNeeded(next, this.events, this.combat.log);
      if (interrupted) {
        this.interrupts += 1;
        next = interrupted;
      }
      return next;
    });
  }

  gainEmber(n: number): number {
    const c = this.combat;
    const gained = Math.max(0, Math.min(n, c.emberCap - c.ember));
    if (gained > 0) {
      c.ember += gained;
      this.emit('player', { key: 'gainEmber', n: gained }, 'ember');
    }
    return gained;
  }

  /** Spend up to n Ember. Returns the amount spent and fires spendEmber triggers. */
  spendEmber(n: number): number {
    const spent = Math.max(0, Math.min(n, this.combat.ember));
    if (spent <= 0) return 0;
    this.combat.ember -= spent;
    this.emit('player', { key: 'spendEmber', n: spent }, 'ember');
    runHooks(this, 'spendEmber', { amount: spent });
    return spent;
  }

  /** Combat with this action's damage/block counters added (for history and the next action). */
  withCounters(): CombatState {
    const c = this.combat;
    return {
      ...c,
      combatDamageDealt: (c.combatDamageDealt || 0) + this.dmgAttack + this.dmgPoison + this.dmgRelic,
      combatDamageBlocked: (c.combatDamageBlocked || 0) + this.blocked,
      combatDamageTaken: (c.combatDamageTaken || 0) + this.hpLost,
      stokesThisCombat: (c.stokesThisCombat || 0) + this.stokes,
      abilityUsesThisCombat: (c.abilityUsesThisCombat || 0) + this.abilityUses,
    };
  }

  /** Run stats with this action's totals added. */
  commitStats(stats: RunStats): RunStats {
    const dealt = this.dmgAttack + this.dmgPoison + this.dmgRelic;
    return {
      ...stats,
      totalDamageDealt: stats.totalDamageDealt + dealt,
      attackDamageDealt: stats.attackDamageDealt + this.dmgAttack,
      poisonDamageDealt: stats.poisonDamageDealt + this.dmgPoison,
      relicDamageDealt: stats.relicDamageDealt + this.dmgRelic,
      blockGained: stats.blockGained + this.blockGained,
      damageBlocked: stats.damageBlocked + this.blocked,
      hpLost: stats.hpLost + this.hpLost,
      hpHealed: stats.hpHealed + this.hpHealed,
      stokes: (stats.stokes || 0) + this.stokes,
      abilityUses: (stats.abilityUses || 0) + this.abilityUses,
      chargesInterrupted: (stats.chargesInterrupted || 0) + this.interrupts,
      chargesFired: (stats.chargesFired || 0) + this.chargesFired,
    };
  }
}
