// Headless Monte Carlo balance simulator. Plays full runs with a rule-based bot
// on the real engine and reports win rates, death floors and per-encounter
// HP loss. The bot is weaker than a skilled human, so read absolute win rates
// as a lower bound and compare encounters/classes against each other.
//
//   npm run sim              # report (SIM_N runs per class, default 2000)
//   npm run sim:check        # also assert the balance target bands (CI)
//   SIM_ASC=2 npm run sim    # ascension level
//   SIM_SEED=1 npm run sim   # reproducible batch
import { CARD_DEFS, effVal, getCardCost, getCardEffects } from '../src/game/cards';
import { choiceOptions, computeHitDamage, conditionMet, temperPerHitFor } from '../src/game/effects';
import {
  calculateCardBlockPreview,
  calculateCardDamagePreview,
  calculateEnemyAttackPreview,
  canStoke,
  canUseAbility,
  CLASS_ABILITY,
  createNewRun,
  chooseCard,
  enterMapNode,
  getAvailableNodeIds,
  playCard,
  resolveEnemyTurn,
  stokeCard,
  useClassAbility,
  usePotion,
} from '../src/game/engine';
import { overrideBalance } from '../src/game/balance';
import { rng, seedRng } from '../src/game/rng';
import {
  buyShopRelic,
  chooseEventOption,
  claimCard,
  claimGold,
  claimPotion,
  claimRelic,
  openTreasure,
  removeShopCard,
  restHeal,
  restUpgrade,
  returnToMap,
} from '../src/game/rooms';
import { CardInstance, EnemyInstance, HeroClassId, RunState } from '../src/game/types';

const TURN_CAP = 60;
const POLICY: 'cautious' | 'aggressive' = process.env.SIM_POLICY === 'aggressive' ? 'aggressive' : 'cautious';
// SIM_SEED=<n> makes the whole batch reproducible (each run gets its own derived seed).
const SEED = process.env.SIM_SEED !== undefined ? Number(process.env.SIM_SEED) : undefined;
// SIM_EMBER=off|stoke|full limits what the bot does with Ember (ablation for tuning).
const EMBER_MODE = (process.env.SIM_EMBER || 'full') as 'off' | 'stoke' | 'full';
// SIM_TUNE='{"bossHp":260}' overrides src/game/balance.ts knobs for this run (experiments only).
if (process.env.SIM_TUNE) overrideBalance(JSON.parse(process.env.SIM_TUNE));

type EncType = 'monster' | 'elite' | 'boss';
interface Enc { key: string; type: EncType; hpLost: number; turns: number; won: boolean; capped: boolean }
interface RunResult {
  win: boolean;
  deathFloor?: number;
  deathType?: EncType;
  deathKey?: string;
  capped: boolean;
  hpEnterBoss?: number;
  maxHpEnterBoss?: number;
  bossTurns?: number;
  encounters: Enc[];
  elitesTaken: number;
  playerTurns: number;
  stokes: number;
  abilityUses: number;
  combats: number;
  chargesInterrupted: number;
  chargesFired: number;
}

const living = (s: RunState) => s.combat!.enemies.filter((e) => e.hp > 0);

function incoming(s: RunState): number {
  let total = 0;
  for (const e of living(s)) {
    if (e.intent.damage) {
      const p = calculateEnemyAttackPreview(e, s);
      total += p.perHit * p.hits;
    }
  }
  const burns = s.combat!.hand.filter((c) => CARD_DEFS[c.defId]?.endTurnBurn).length;
  return total + burns * 2;
}

const lowestHp = (s: RunState) => [...living(s)].sort((a, b) => a.hp + a.block - (b.hp + b.block))[0];

/** Rough value of 1 Ember: 2 Ember buy a Temper (+6 damage) or an Ash Veil (6 poison damage). */
const EMBER_VALUE = 2.5;

function cardValue(s: RunState, card: CardInstance, target: EnemyInstance): number {
  const def = CARD_DEFS[card.defId];
  const c = s.combat!;
  const u = card.upgraded;
  let v = 0;
  const cardTargets = def.target === 'all_enemies' ? living(s) : def.target === 'enemy' ? [target] : [];
  const scope = (to?: 'all' | 'random') => (to === 'all' ? living(s) : to === 'random' ? living(s).slice(0, 1) : cardTargets);
  const temper = temperPerHitFor(def, u, c);
  let spend = 0;
  for (const e of getCardEffects(def)) {
    if (!conditionMet(c, e.when)) continue;
    switch (e.op) {
      case 'damage':
        for (const t of scope(e.to)) {
          const calc = computeHitDamage(e, u, c, t, temper);
          const hits = e.xHits ? c.energy : calc.hits;
          const raw = calc.perHit * hits;
          v += Math.min(Math.max(0, raw - t.block), t.hp) + (raw - t.block >= t.hp ? 8 : 0);
        }
        break;
      case 'debuff': {
        const n = effVal(e, u);
        for (const t of scope(e.to)) {
          if (e.status === 'poison') v += Math.min(t.hp, n * 2.2);
          if (e.status === 'vulnerable' && t.statuses.artifact === 0) v += 3 * n;
          if (e.status === 'weak' && t.intent.damage) v += 2 * n;
        }
        break;
      }
      case 'multiplyPoison':
        for (const t of cardTargets) v += Math.min(t.hp, t.statuses.poison * (effVal(e, u) - 1) * 1.8);
        break;
      case 'markRotburst':
        if (living(s).length > 1) v += 15;
        break;
      case 'block': {
        const need = Math.max(0, incoming(s) - c.playerBlock);
        const blk = calculateCardBlockPreview(card, s).block;
        if (blk) v += Math.min(blk, need) + Math.max(0, blk - need) * 0.25;
        break;
      }
      case 'draw':
        if (!c.playerStatuses.noDrawThisTurn) v += Math.min(effVal(e, u), c.drawPile.length + c.discardPile.length) * 3;
        break;
      case 'gainEnergy':
        v += effVal(e, u) * 5;
        break;
      case 'addCard': {
        const n = effVal(e, u);
        v += (e.perSpent ? Math.min(n, spend) : n) * 3.5;
        break;
      }
      case 'flag':
        if (e.flag === 'doubleDamageNextTurn') v += 4;
        break;
      case 'buff':
        if (e.status === 'artifact') v += 1;
        break;
      case 'loseHp':
        v -= effVal(e, u) * (s.hp < 20 ? 3 : 0.6);
        break;
      case 'upgradeAllInCombat':
        v += 12;
        break;
      case 'gainEmber': {
        const n = effVal(e, u);
        const amount = e.perEnemyHit ? Math.min(e.max ?? Infinity, n * cardTargets.length) : n;
        v += Math.min(amount, c.emberCap - c.ember) * EMBER_VALUE;
        break;
      }
      case 'spendEmber':
        spend = e.n === 'all' ? c.ember : Math.min(e.n, c.ember);
        v -= spend * 2;
        break;
    }
  }
  if (card.defId === 'caustic_residue') v = 0.5;
  return v;
}

const hasDamage = (defId: string) => getCardEffects(CARD_DEFS[defId]).some((e) => e.op === 'damage');

function choosePlay(s: RunState, skip: Set<string>, goForInterrupt = false): { uid: string; target?: string } | null {
  const c = s.combat!;
  const playable = c.hand.filter((h) => {
    if (skip.has(h.uid)) return false;
    const cost = getCardCost(h);
    if (cost === -2) return false;
    if (cost === -1) return c.energy > 0;
    return cost <= c.energy;
  });
  if (!playable.length) return null;
  const tgt = lowestHp(s);
  // 1. powers + 0-cost draw/energy utility
  for (const h of playable) {
    const d = CARD_DEFS[h.defId];
    if (d.type === 'power') {
      if (d.bastion && c.playerStatuses.bastion) continue;
      // Don't sink 2+ energy into a power while about to take a big hit.
      if (getCardCost(h) >= 2 && incoming(s) - c.playerBlock > 0.25 * s.hp) continue;
      return { uid: h.uid };
    }
  }
  for (const h of playable) {
    const d = CARD_DEFS[h.defId];
    if (d.upgradeAllInCombat) return { uid: h.uid };
    if (getCardCost(h) === 0 && d.type === 'skill' && (d.gainEnergy || d.draw)) {
      if (d.loseHp && s.hp - d.loseHp < 15) continue;
      if (d.draw && !d.gainEnergy && c.playerStatuses.noDrawThisTurn) continue;
      return { uid: h.uid };
    }
  }
  // 2a. lethal first: a single playable attack that kills an enemy that is about to attack
  for (const e of living(s).filter((x) => x.intent.damage)) {
    for (const h of playable) {
      const d = CARD_DEFS[h.defId];
      if (d.target !== 'enemy' || getCardCost(h) === -1 || !hasDamage(h.defId)) continue;
      const p = calculateCardDamagePreview(h, s, e);
      if (p.perHit * p.hits - e.block >= e.hp) return { uid: h.uid, target: e.uid };
    }
  }
  // 2b. block if needed
  const blockNeeded = goForInterrupt
    ? false
    : POLICY === 'cautious'
    ? incoming(s) > c.playerBlock
    : incoming(s) - c.playerBlock > 0.15 * s.hp;
  if (blockNeeded) {
    let best: CardInstance | null = null;
    let bestR = 0;
    for (const h of playable) {
      const b = calculateCardBlockPreview(h, s).block;
      if (!b) continue;
      const r = b / (Math.max(getCardCost(h), 0) || 0.5);
      if (r > bestR) { bestR = r; best = h; }
    }
    if (best) return { uid: best.uid, target: CARD_DEFS[best.defId].target === 'enemy' ? tgt.uid : undefined };
  }
  // 3. best value / cost
  let best: { uid: string; target?: string } | null = null;
  let bestR = 0;
  for (const h of playable) {
    const d = CARD_DEFS[h.defId];
    const cost = getCardCost(h);
    if (cost === -1) continue;
    const charging = goForInterrupt ? living(s).find((e) => e.charge && !e.charge.interrupted) : undefined;
    const t = d.doublePoison ? [...living(s)].sort((a, b) => b.statuses.poison - a.statuses.poison)[0] : charging || tgt;
    let v = cardValue(s, h, t);
    // Going for an interrupt: raw damage into the charging enemy counts even if blocked.
    if (charging && hasDamage(h.defId) && d.target !== 'self') v += calculateCardDamagePreview(h, s, charging).perHit * 2;
    const r = v / (cost || 0.5);
    if (v > 0 && r > bestR) { bestR = r; best = { uid: h.uid, target: d.target === 'enemy' ? t.uid : undefined }; }
  }
  if (best) return best;
  const x = playable.find((h) => getCardCost(h) === -1);
  return x ? { uid: x.uid } : null;
}

/** Pick for a pending choice: discard / exhaust the least useful card, take back the most useful. */
function resolveChoice(s: RunState): RunState {
  const pc = s.combat!.pendingChoice!;
  const options = choiceOptions(s.combat!, pc);
  if (pc.from === 'hand' && (pc.action === 'discard' || pc.action === 'exhaust')) {
    const worst = worstCard(s);
    return chooseCard(s, (options.find((o) => o.uid === worst.uid) ?? options[0]).uid).state;
  }
  const best = [...options].sort((a, b) => cardValue(s, b, lowestHp(s)) - cardValue(s, a, lowestHp(s)))[0];
  return chooseCard(s, best.uid).state;
}

function worstCard(s: RunState): CardInstance {
  const c = s.combat!;
  const rank = (h: CardInstance) => {
    const d = CARD_DEFS[h.defId];
    if (d.type === 'status' || d.type === 'curse') return -100;
    if (d.rarity === 'starter' && d.block && incoming(s) <= c.playerBlock) return -10;
    if (d.rarity === 'starter') return -5;
    return cardValue(s, h, lowestHp(s));
  };
  return [...c.hand].sort((a, b) => rank(a) - rank(b))[0];
}

function usePot(s: RunState, i: number): RunState {
  const target = s.combat ? lowestHp(s)?.uid : undefined;
  const res = usePotion(s, i, target);
  return res.state;
}

function startTurnPotions(s: RunState): RunState {
  for (let i = 0; i < s.potions.length; i++) {
    if (s.phase !== 'COMBAT') return s;
    const p = s.potions[i];
    if (!p) continue;
    const c = s.combat!;
    if (p.id === 'heartblood_elixir' && s.hp < 0.3 * s.maxHp) { s = usePot(s, i); continue; }
    if (c.turn === 1 && (c.isBossFight || c.isEliteFight) &&
      ['wildfire_flask', 'nightshade_vial', 'berserker_draught', 'kindling_elixir', 'haste_tincture'].includes(p.id)) {
      s = usePot(s, i);
    }
  }
  return s;
}

function endTurnPotions(s: RunState): RunState {
  for (let i = 0; i < s.potions.length; i++) {
    if (s.phase !== 'COMBAT') return s;
    const p = s.potions[i];
    if (!p) continue;
    const c = s.combat!;
    const after = s.hp - Math.max(0, incoming(s) - c.playerBlock);
    if (p.id === 'stoneskin_tonic' && after < 0.25 * s.maxHp) s = usePot(s, i);
    else if (p.id === 'heartblood_elixir' && (s.hp < 0.3 * s.maxHp || after <= 0)) s = usePot(s, i);
    else if (after <= 0 && p.id === 'wildfire_flask') s = usePot(s, i); // desperation
  }
  return s;
}

// ---- Ember policy ----
// Stoke: statuses and curses first, then surplus starter cards; never powers.
// Keep enough damage and Block in the combat deck: burning every leftover
// Strike used to leave the bot unable to kill high-pressure enemies at all.
const MIN_ATTACKS_KEPT = 4;
const MIN_BLOCKS_KEPT = 3;
const MIN_DECK_KEPT = 7;

function stokeRank(s: RunState, h: CardInstance): number {
  const d = CARD_DEFS[h.defId];
  if (d.type === 'status' || d.type === 'curse') return -100;
  if (d.type === 'power') return 100;
  const c = s.combat!;
  const pile = [...c.hand, ...c.drawPile, ...c.discardPile].filter((x) => {
    const t = CARD_DEFS[x.defId].type;
    return t !== 'status' && t !== 'curse';
  });
  if (pile.length <= MIN_DECK_KEPT) return 100;
  const fx = getCardEffects(d);
  const isAttack = fx.some((e) => e.op === 'damage');
  const isBlock = fx.some((e) => e.op === 'block');
  const count = (pred: (x: CardInstance) => boolean) => pile.filter(pred).length;
  if (isAttack && count((x) => hasDamage(x.defId)) <= MIN_ATTACKS_KEPT) return 100;
  if (isBlock && count((x) => getCardEffects(CARD_DEFS[x.defId]).some((e) => e.op === 'block')) <= MIN_BLOCKS_KEPT) return 100;
  if (d.rarity === 'starter' && isBlock && incoming(s) <= c.playerBlock) return -20;
  if (d.rarity === 'starter') return -10;
  return cardValue(s, h, lowestHp(s));
}

function bestStoke(s: RunState, onlyJunk: boolean): CardInstance | null {
  if (EMBER_MODE === 'off' || !canStoke(s)) return null;
  const ranked = [...s.combat!.hand].sort((a, b) => stokeRank(s, a) - stokeRank(s, b));
  const pick = ranked[0];
  if (!pick) return null;
  const r = stokeRank(s, pick);
  if (onlyJunk ? r > -100 : r >= 100) return null;
  return pick;
}

/** The charging enemy, if any, and whether this turn's damage can plausibly reach its threshold. */
function interruptPlan(s: RunState): { go: boolean } {
  const c = s.combat!;
  const boss = living(s).find((e) => e.charge && !e.charge.interrupted);
  if (!boss || !boss.charge) return { go: false };
  const need = boss.charge.threshold - boss.charge.progress - boss.statuses.poison; // the tick before it acts counts
  if (need <= 0) return { go: true };
  // Greedy estimate: best damage per energy among playable attacks.
  const attacks = c.hand
    .filter((h) => hasDamage(h.defId) && getCardCost(h) >= 0 && CARD_DEFS[h.defId].target !== 'self')
    .map((h) => ({ cost: getCardCost(h), dmg: calculateCardDamagePreview(h, s, boss).perHit * calculateCardDamagePreview(h, s, boss).hits }))
    .sort((a, b) => b.dmg / (b.cost || 0.5) - a.dmg / (a.cost || 0.5));
  let energy = c.energy;
  let total = 0;
  for (const a of attacks) {
    if (a.cost <= energy) {
      energy -= a.cost;
      total += a.dmg;
    }
  }
  const abilityBonus = canUseAbility(s) ? (CLASS_ABILITY[s.heroId].id === 'temper' ? 6 : 3) : 0;
  return { go: total + abilityBonus >= need };
}

/** Spend Ember on the class ability now? */
function wantAbility(s: RunState, aboutToAttack: boolean): boolean {
  if (EMBER_MODE !== 'full' || !canUseAbility(s)) return false;
  const c = s.combat!;
  // Save Ember when the boss will start charging at the end of this turn.
  const chargeNext = living(s).some((e) => e.intent.startsCharge);
  if (chargeNext && c.ember < 4) return false;
  if (CLASS_ABILITY[s.heroId].id === 'temper') return aboutToAttack;
  return true; // Ash Veil: poison early ticks more often
}

function runCombat(s: RunState, rec: RunResult): RunState {
  const c0 = s.combat!;
  const type: EncType = c0.isBossFight ? 'boss' : c0.isEliteFight ? 'elite' : 'monster';
  const key = `${type}:${c0.enemies.map((e) => e.defId).sort().join('+')}`;
  const startLost = s.stats.hpLost;
  if (type === 'boss') { rec.hpEnterBoss = s.hp; rec.maxHpEnterBoss = s.maxHp; }
  let lastTurn = 1;
  let capped = false;
  while (s.phase === 'COMBAT') {
    lastTurn = s.combat!.turn;
    if (lastTurn > TURN_CAP) { capped = true; break; }
    s = startTurnPotions(s);
    if (s.phase !== 'COMBAT') break;
    rec.playerTurns++;
    const junk = bestStoke(s, true);
    if (junk) s = stokeCard(s, junk.uid).state;
    if (s.phase !== 'COMBAT') break;
    const goForInterrupt = interruptPlan(s).go;
    if (goForInterrupt && EMBER_MODE === 'full' && canUseAbility(s)) s = useClassAbility(s).state;
    if (wantAbility(s, false)) s = useClassAbility(s).state;
    const skip = new Set<string>();
    let guard = 0;
    while (s.phase === 'COMBAT' && guard++ < 100) {
      if (s.combat!.pendingChoice) { s = resolveChoice(s); continue; }
      const choice = choosePlay(s, skip, goForInterrupt);
      if (!choice) break;
      if (hasDamage(s.combat!.hand.find((h) => h.uid === choice.uid)!.defId) && wantAbility(s, true)) {
        s = useClassAbility(s).state;
        if (s.phase !== 'COMBAT') break;
      }
      const res = playCard(s, choice.uid, choice.target);
      if (res.state === s) { skip.add(choice.uid); continue; }
      s = res.state;
    }
    if (s.phase !== 'COMBAT') break;
    const leftover = bestStoke(s, false);
    if (leftover) s = stokeCard(s, leftover.uid).state;
    if (s.phase !== 'COMBAT') break;
    s = endTurnPotions(s);
    if (s.phase !== 'COMBAT') break;
    s = resolveEnemyTurn(s).state;
  }
  const won = s.phase === 'REWARD' || s.phase === 'VICTORY';
  rec.combats++;
  rec.encounters.push({ key, type, hpLost: s.stats.hpLost - startLost, turns: lastTurn, won, capped });
  if (type === 'boss') rec.bossTurns = lastTurn;
  if (!won) {
    rec.deathFloor = s.floor;
    rec.deathType = type;
    rec.deathKey = key;
    rec.capped = capped;
    if (capped) s = { ...s, phase: 'DEFEAT', combat: null };
  }
  return s;
}

function chooseNode(s: RunState): string {
  const nodes = [...getAvailableNodeIds(s)].map((id) => s.map.find((n) => n.id === id)!);
  const hpPct = s.hp / s.maxHp;
  const score = (t: string) => {
    switch (t) {
      case 'boss': return 100;
      case 'rest': return hpPct < 0.5 ? 10 : 2;
      case 'monster': return 5;
      case 'event': return 5;
      case 'treasure': return 6;
      case 'shop': return s.gold >= 75 ? 4.5 : 1.5;
      case 'elite': return hpPct > 0.65 ? 5 : -5;
      default: return 0;
    }
  };
  return nodes.map((n) => ({ n, sc: score(n.type) + rng('bot') * 0.5 })).sort((a, b) => b.sc - a.sc)[0].n.id;
}

const RAR: Record<string, number> = { rare: 3, uncommon: 2, common: 1 };

function handleReward(s: RunState): RunState {
  const r = s.reward!;
  let next = claimPotion(claimRelic(claimGold(s)));
  if (next.deck.length <= 25 && r.cardChoices.length) {
    const pick = [...r.cardChoices].sort(
      (a, b) => (RAR[CARD_DEFS[b.defId].rarity] || 0) + (b.upgraded ? 0.5 : 0) - ((RAR[CARD_DEFS[a.defId].rarity] || 0) + (a.upgraded ? 0.5 : 0)) + (rng('bot') - 0.5) * 0.2
    )[0];
    next = claimCard(next, pick);
  }
  return returnToMap(next);
}

function handleRest(s: RunState): RunState {
  if (s.hp < 0.55 * s.maxHp) return restHeal(s);
  const order = [
    (c: CardInstance) => CARD_DEFS[c.defId].rarity !== 'starter',
    (c: CardInstance) => c.defId === 'armor_breaker' || c.defId === 'sapping_cut' || c.defId === 'last_refuge',
    (c: CardInstance) => c.defId.endsWith('_strike'),
    (c: CardInstance) => true,
  ];
  for (const f of order) {
    const t = s.deck.find((c) => !c.upgraded && f(c) && CARD_DEFS[c.defId].type !== 'status' && CARD_DEFS[c.defId].type !== 'curse');
    if (t) return restUpgrade(s, t.uid);
  }
  return restHeal(s);
}

function handleShop(s: RunState): RunState {
  let next = s;
  const strike = next.deck.find((c) => c.defId === 'iron_strike' || c.defId === 'shadow_strike');
  if (strike) next = removeShopCard(next, strike.uid);
  const byPrice = next.shop!.relics.map((item, idx) => ({ item, idx })).sort((a, b) => b.item.price - a.item.price);
  for (const { idx } of byPrice) next = buyShopRelic(next, idx);
  return returnToMap(next);
}

function handleEvent(s: RunState): RunState {
  const ev = s.event!;
  const enabled = (id: string) => ev.options.some((o) => o.id === id && !o.disabled);
  let choice: string;
  switch (ev.id) {
    case 'ember_shrine': choice = s.hp - 10 > 0.4 * s.maxHp ? 'take_gold' : 'leave'; break;
    case 'wandering_smith': choice = enabled('buy_relic') ? 'buy_relic' : 'remove_weak'; break;
    case 'whispering_fountain': choice = s.hp < 0.5 * s.maxHp ? 'drink_deep' : 'wash_blades'; break;
    case 'abyssal_altar': choice = s.hp - 12 > 0.45 * s.maxHp ? 'claim_relic' : 'walk_away'; break;
    default: choice = ev.options.find((o) => !o.disabled)!.id;
  }
  if (!enabled(choice)) choice = ev.options.find((o) => !o.disabled)!.id;
  return returnToMap(chooseEventOption(s, choice));
}

function handleTreasure(s: RunState): RunState {
  return returnToMap(openTreasure(s));
}

function simulateRun(hero: HeroClassId, asc: number): RunResult {
  let s = createNewRun(hero, asc);
  const rec: RunResult = {
    win: false, capped: false, encounters: [], elitesTaken: 0,
    playerTurns: 0, stokes: 0, abilityUses: 0, combats: 0, chargesInterrupted: 0, chargesFired: 0,
  };
  const finish = (r: RunResult) => {
    r.stokes = s.stats.stokes || 0;
    r.abilityUses = s.stats.abilityUses || 0;
    r.chargesInterrupted = s.stats.chargesInterrupted || 0;
    r.chargesFired = s.stats.chargesFired || 0;
    return r;
  };
  let guard = 0;
  while (guard++ < 500) {
    switch (s.phase) {
      case 'MAP': {
        const id = chooseNode(s);
        if (s.map.find((n) => n.id === id)?.type === 'elite') rec.elitesTaken++;
        s = enterMapNode(s, id);
        break;
      }
      case 'COMBAT': s = runCombat(s, rec); break;
      case 'REWARD': s = handleReward(s); break;
      case 'REST': s = handleRest(s); break;
      case 'SHOP': s = handleShop(s); break;
      case 'EVENT': s = handleEvent(s); break;
      case 'TREASURE': s = handleTreasure(s); break;
      case 'VICTORY':
        rec.win = true;
        return finish(rec);
      case 'DEFEAT':
        return finish(rec);
      default: throw new Error('phase ' + s.phase);
    }
  }
  throw new Error('run guard exceeded');
}

const mean = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN);
const pct = (n: number, d: number) => `${((100 * n) / d).toFixed(1)}%`;

function batch(hero: HeroClassId, asc: number, n: number, label: string) {
  const runs: RunResult[] = [];
  for (let i = 0; i < n; i++) {
    if (SEED !== undefined) seedRng(SEED + i * 2 + (hero === 'ironwarden' ? 0 : 1));
    runs.push(simulateRun(hero, asc));
  }
  const wins = runs.filter((r) => r.win).length;
  console.log(`\n=== ${label}: ${hero} A${asc}, n=${n} ===`);
  console.log(`win rate: ${pct(wins, n)}  | avg elites taken: ${mean(runs.map((r) => r.elitesTaken)).toFixed(2)}`);
  const deaths = runs.filter((r) => !r.win);
  const buckets: Record<string, number> = { 'F1-4': 0, 'F5-7': 0, 'F8-10': 0, 'F11-14': 0, 'F15 boss': 0 };
  for (const d of deaths) {
    const f = d.deathFloor!;
    const b = f <= 4 ? 'F1-4' : f <= 7 ? 'F5-7' : f <= 10 ? 'F8-10' : f <= 14 ? 'F11-14' : 'F15 boss';
    buckets[b]++;
  }
  console.log('death floor (share of all runs):', Object.entries(buckets).map(([k, v]) => `${k} ${pct(v, n)}`).join(' | '));
  const byType: Record<string, number> = {};
  const byKey: Record<string, number> = {};
  for (const d of deaths) { byType[d.deathType!] = (byType[d.deathType!] || 0) + 1; byKey[d.deathKey!] = (byKey[d.deathKey!] || 0) + 1; }
  console.log('killer type (share of deaths):', Object.entries(byType).map(([k, v]) => `${k} ${pct(v, deaths.length)}`).join(' | '));
  console.log('killer encounter (share of deaths):', Object.entries(byKey).sort((a, b) => b[1] - a[1]).map(([k, v]) => `${k} ${pct(v, deaths.length)}`).join(' | '));
  const reachedBoss = runs.filter((r) => r.hpEnterBoss !== undefined);
  console.log(`reached boss: ${pct(reachedBoss.length, n)} | avg HP entering boss: ${mean(reachedBoss.map((r) => r.hpEnterBoss!)).toFixed(1)} / ${mean(reachedBoss.map((r) => r.maxHpEnterBoss!)).toFixed(1)} | boss win rate given reached: ${pct(wins, reachedBoss.length)}`);
  console.log(`boss fight turns: all ${mean(reachedBoss.map((r) => r.bossTurns!)).toFixed(1)} | wins ${mean(runs.filter((r) => r.win).map((r) => r.bossTurns!)).toFixed(1)} | losses ${mean(reachedBoss.filter((r) => !r.win).map((r) => r.bossTurns!)).toFixed(1)}`);
  const allEnc = runs.flatMap((r) => r.encounters);
  const capped = allEnc.filter((e) => e.capped).length;
  console.log(`fights hitting ${TURN_CAP}-turn cap: ${capped} of ${allEnc.length} fights (${runs.filter((r) => r.capped).length} runs ended by cap)`);
  const encKeys: Record<string, Enc[]> = {};
  for (const e of allEnc) (encKeys[e.key] ||= []).push(e);
  console.log('HP lost per encounter (mean | n | loss rate | mean turns):');
  for (const [k, es] of Object.entries(encKeys).sort((a, b) => a[0].localeCompare(b[0]))) {
    console.log(`  ${k.padEnd(36)} ${mean(es.map((e) => e.hpLost)).toFixed(1).padStart(5)} | ${String(es.length).padStart(5)} | ${pct(es.filter((e) => !e.won).length, es.length).padStart(6)} | ${mean(es.map((e) => e.turns)).toFixed(1)}`);
  }
  const sum = (f: (r: RunResult) => number) => runs.reduce((a, r) => a + f(r), 0);
  const stokeRate = sum((r) => r.stokes) / Math.max(1, sum((r) => r.playerTurns));
  const abilityPerCombat = sum((r) => r.abilityUses) / Math.max(1, sum((r) => r.combats));
  const charges = sum((r) => r.chargesInterrupted + r.chargesFired);
  const interruptRate = charges ? sum((r) => r.chargesInterrupted) / charges : NaN;
  console.log(
    `ember: Stoke on ${pct(sum((r) => r.stokes), Math.max(1, sum((r) => r.playerTurns)))} of turns | ability uses per combat ${abilityPerCombat.toFixed(2)} | boss charges interrupted ${charges ? pct(sum((r) => r.chargesInterrupted), charges) : 'n/a'} (${charges} charges)`
  );
  const deathShare = (lo: number, hi: number) =>
    deaths.filter((d) => d.deathFloor! >= lo && d.deathFloor! <= hi).length / n;
  const eliteLoss: Record<string, number> = {};
  for (const [k, es] of Object.entries(encKeys)) {
    if (k.startsWith('elite:')) eliteLoss[k] = es.filter((e) => !e.won).length / es.length;
  }
  return {
    hero,
    winRate: wins / n,
    deathShareF5to7: deathShare(5, 7),
    bossWinGivenReached: reachedBoss.length ? wins / reachedBoss.length : 0,
    eliteLoss,
    stokeRate,
    abilityPerCombat,
    interruptRate,
  };
}

type Summary = ReturnType<typeof batch>;

// ---------- main ----------
const CHECK = process.argv.includes('--check');
const N = Number(process.env.SIM_N || 2000);
const ASC = Number(process.env.SIM_ASC || 0);
const t0 = Date.now();
const summaries: Summary[] = [
  batch('ironwarden', ASC, N, `policy=${POLICY}`),
  batch('shadowweaver', ASC, N, `policy=${POLICY}`),
];
console.log(`\nelapsed ${((Date.now() - t0) / 1000).toFixed(1)}s`);

if (CHECK) {
  // Regression guardrails (bot-relative, Ascension 0). Tuning targets were:
  // floor 5-7 deaths < 25%, boss win|reached 25-45%, elite loss 5-35%, class
  // win-rate ratio < 1.5. The bands below add margin so Monte Carlo noise at
  // N=2000 does not flip CI; a failure means balance genuinely moved.
  const failures: string[] = [];
  const check = (ok: boolean, msg: string) => {
    if (!ok) failures.push(msg);
  };
  const f = (x: number) => `${(100 * x).toFixed(1)}%`;
  for (const s of summaries) {
    check(s.deathShareF5to7 < 0.25, `${s.hero}: deaths on floors 5-7 ${f(s.deathShareF5to7)} (guardrail < 25%)`);
    check(
      s.bossWinGivenReached >= 0.18 && s.bossWinGivenReached <= 0.6,
      `${s.hero}: boss win rate given reached ${f(s.bossWinGivenReached)} (guardrail 18-60%)`
    );
    for (const [k, v] of Object.entries(s.eliteLoss)) {
      check(v >= 0.02 && v <= 0.45, `${s.hero}: ${k} loss rate ${f(v)} (guardrail 2-45%)`);
    }
    // Ember targets (design doc section 1.2): the mechanic is actually used,
    // and interrupting the boss is a real coin flip rather than automatic.
    check(s.stokeRate >= 0.5 && s.stokeRate <= 0.8, `${s.hero}: Stoke used on ${f(s.stokeRate)} of turns (guardrail 50-80%)`);
    check(s.abilityPerCombat >= 1.5, `${s.hero}: ${s.abilityPerCombat.toFixed(2)} class abilities per combat (guardrail >= 1.5)`);
    check(
      s.interruptRate >= 0.35 && s.interruptRate <= 0.6,
      `${s.hero}: boss charges interrupted ${f(s.interruptRate)} (guardrail 35-60%)`
    );
  }
  const [a, b] = summaries.map((s) => s.winRate);
  const ratio = Math.max(a, b) / Math.max(Math.min(a, b), 1e-9);
  check(ratio < 2, `class win-rate ratio ${ratio.toFixed(2)} (guardrail < 2)`);
  if (ASC !== 0) failures.push('--check bands are defined for Ascension 0 only');
  if (failures.length) {
    console.error('\nBALANCE CHECK FAILED:\n  ' + failures.join('\n  '));
    process.exit(1);
  }
  console.log('\nBALANCE CHECK PASSED');
}
