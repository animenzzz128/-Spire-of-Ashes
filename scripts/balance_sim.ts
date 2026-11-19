// Headless Monte Carlo balance simulator. Plays full runs with a rule-based bot
// on the real engine and reports win rates, death floors and per-encounter
// HP loss. The bot is weaker than a skilled human, so read absolute win rates
// as a lower bound and compare encounters/classes against each other.
//
//   npm run sim              # report (SIM_N runs per class, default 2000)
//   npm run sim:check        # also assert the balance target bands (CI)
//   SIM_ASC=2 npm run sim    # ascension level
import { CARD_DEFS, getCardCost } from '../src/game/cards';
import {
  addPotionToSlot,
  calculateCardBlockPreview,
  calculateCardDamagePreview,
  calculateEnemyAttackPreview,
  createNewRun,
  discardSelectedCard,
  enterMapNode,
  getAvailableNodeIds,
  playCard,
  resolveEnemyTurn,
  usePotion,
} from '../src/game/engine';
import { resolveEventOption } from '../src/game/events';
import { CardInstance, EnemyInstance, HeroClassId, RunState } from '../src/game/types';

const TURN_CAP = 60;
const POLICY: 'cautious' | 'aggressive' = process.env.SIM_POLICY === 'aggressive' ? 'aggressive' : 'cautious';

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

function cardValue(s: RunState, card: CardInstance, target: EnemyInstance): number {
  const def = CARD_DEFS[card.defId];
  const c = s.combat!;
  const u = card.upgraded;
  const g = (b?: number, up?: number) => (u && up !== undefined ? up : b) || 0;
  let v = 0;
  const targets = def.target === 'all_enemies' ? living(s) : def.target === 'enemy' ? [target] : [];
  const cost = getCardCost(card);
  if (def.damage !== undefined || def.blockAsDamage) {
    for (const t of targets) {
      const p = calculateCardDamagePreview(card, s, t);
      const hits = cost === -1 ? c.energy : p.hits;
      const raw = p.perHit * hits;
      v += Math.min(Math.max(0, raw - t.block), t.hp) + (raw - t.block >= t.hp ? 8 : 0);
    }
  }
  const poison = g(def.applyPoison, def.upgradedApplyPoison);
  for (const t of targets) {
    if (poison) v += Math.min(t.hp, poison * 2.2);
    if (def.doublePoison) v += Math.min(t.hp, t.statuses.poison * (g(def.doublePoison, def.upgradedDoublePoison) - 1) * 1.8);
    if (def.corpseExplosion && living(s).length > 1) v += 15;
    const vul = g(def.applyVulnerable, def.upgradedApplyVulnerable);
    if (vul && t.statuses.artifact === 0) v += 3 * vul;
    const wk = g(def.applyWeak, def.upgradedApplyWeak);
    if (wk && t.intent.damage) v += 2 * wk;
  }
  const need = Math.max(0, incoming(s) - c.playerBlock);
  const blk = calculateCardBlockPreview(card, s).block;
  if (blk) v += Math.min(blk, need) + Math.max(0, blk - need) * 0.25;
  const draw = g(def.draw, def.upgradedDraw);
  if (draw && !c.playerStatuses.noDrawThisTurn) v += Math.min(draw, c.drawPile.length + c.discardPile.length) * 3;
  v += g(def.gainEnergy, def.upgradedGainEnergy) * 5;
  if (def.addShivs) v += g(def.addShivs, def.upgradedAddShivs) * 3.5;
  if (def.doubleNextTurn) v += 4;
  if (def.gainArtifact) v += 1;
  if (def.loseHp) v -= def.loseHp * (s.hp < 20 ? 3 : 0.6);
  if (def.apotheosis) v += 12;
  if (card.defId === 'slimed') v = 0.5;
  return v;
}

function choosePlay(s: RunState, skip: Set<string>): { uid: string; target?: string } | null {
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
      if (d.barricade && c.playerStatuses.barricade) continue;
      // Don't sink 2+ energy into a power while about to take a big hit.
      if (getCardCost(h) >= 2 && incoming(s) - c.playerBlock > 0.25 * s.hp) continue;
      return { uid: h.uid };
    }
  }
  for (const h of playable) {
    const d = CARD_DEFS[h.defId];
    if (d.apotheosis) return { uid: h.uid };
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
      if (d.target !== 'enemy' || getCardCost(h) === -1 || !(d.damage !== undefined || d.blockAsDamage)) continue;
      const p = calculateCardDamagePreview(h, s, e);
      if (p.perHit * p.hits - e.block >= e.hp) return { uid: h.uid, target: e.uid };
    }
  }
  // 2b. block if needed
  const blockNeeded = POLICY === 'cautious'
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
    const t = d.doublePoison ? [...living(s)].sort((a, b) => b.statuses.poison - a.statuses.poison)[0] : tgt;
    const v = cardValue(s, h, t);
    const r = v / (cost || 0.5);
    if (v > 0 && r > bestR) { bestR = r; best = { uid: h.uid, target: d.target === 'enemy' ? t.uid : undefined }; }
  }
  if (best) return best;
  const x = playable.find((h) => getCardCost(h) === -1);
  return x ? { uid: x.uid } : null;
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
    if (p.id === 'heal_potion' && s.hp < 0.3 * s.maxHp) { s = usePot(s, i); continue; }
    if (c.turn === 1 && (c.isBossFight || c.isEliteFight) &&
      ['fire_potion', 'poison_potion', 'strength_potion', 'energy_potion', 'swift_potion'].includes(p.id)) {
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
    if (p.id === 'block_potion' && after < 0.25 * s.maxHp) s = usePot(s, i);
    else if (p.id === 'heal_potion' && (s.hp < 0.3 * s.maxHp || after <= 0)) s = usePot(s, i);
    else if (after <= 0 && p.id === 'fire_potion') s = usePot(s, i); // desperation
  }
  return s;
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
    const skip = new Set<string>();
    let guard = 0;
    while (s.phase === 'COMBAT' && guard++ < 100) {
      if (s.combat!.pendingDiscard) { s = discardSelectedCard(s, worstCard(s).uid); continue; }
      const choice = choosePlay(s, skip);
      if (!choice) break;
      const res = playCard(s, choice.uid, choice.target);
      if (res.state === s) { skip.add(choice.uid); continue; }
      s = res.state;
    }
    if (s.phase !== 'COMBAT') break;
    s = endTurnPotions(s);
    if (s.phase !== 'COMBAT') break;
    s = resolveEnemyTurn(s).state;
  }
  const won = s.phase === 'REWARD' || s.phase === 'VICTORY';
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
  return nodes.map((n) => ({ n, sc: score(n.type) + Math.random() * 0.5 })).sort((a, b) => b.sc - a.sc)[0].n.id;
}

const RAR: Record<string, number> = { rare: 3, uncommon: 2, common: 1 };

function handleReward(s: RunState): RunState {
  const r = s.reward!;
  let next: RunState = { ...s, gold: s.gold + r.gold, stats: { ...s.stats, goldEarned: s.stats.goldEarned + r.gold } };
  if (r.relic) next.relics = [...next.relics, r.relic];
  if (r.potion) next.potions = addPotionToSlot(next.potions, r.potion).potions;
  if (next.deck.length <= 25 && r.cardChoices.length) {
    const pick = [...r.cardChoices].sort(
      (a, b) => (RAR[CARD_DEFS[b.defId].rarity] || 0) + (b.upgraded ? 0.5 : 0) - ((RAR[CARD_DEFS[a.defId].rarity] || 0) + (a.upgraded ? 0.5 : 0)) + (Math.random() - 0.5) * 0.2
    )[0];
    next.deck = [...next.deck, pick];
  }
  return { ...next, phase: 'MAP', reward: null };
}

function handleRest(s: RunState): RunState {
  if (s.hp < 0.55 * s.maxHp) {
    return { ...s, hp: Math.min(s.maxHp, s.hp + Math.floor(s.maxHp * 0.3)), phase: 'MAP' };
  }
  const order = [
    (c: CardInstance) => CARD_DEFS[c.defId].rarity !== 'starter',
    (c: CardInstance) => c.defId === 'bash' || c.defId === 'neutralize' || c.defId === 'survivor',
    (c: CardInstance) => c.defId.endsWith('_strike'),
    (c: CardInstance) => true,
  ];
  for (const f of order) {
    const t = s.deck.find((c) => !c.upgraded && f(c) && CARD_DEFS[c.defId].type !== 'status' && CARD_DEFS[c.defId].type !== 'curse');
    if (t) return { ...s, deck: s.deck.map((c) => (c.uid === t.uid ? { ...c, upgraded: true } : c)), phase: 'MAP' };
  }
  return { ...s, hp: Math.min(s.maxHp, s.hp + Math.floor(s.maxHp * 0.3)), phase: 'MAP' };
}

function handleShop(s: RunState): RunState {
  const shop = s.shop!;
  let next = { ...s };
  const strike = next.deck.find((c) => c.defId === 'iron_strike' || c.defId === 'shadow_strike');
  if (strike && next.gold >= shop.removePrice) {
    next.gold -= shop.removePrice;
    next.deck = next.deck.filter((c) => c.uid !== strike.uid);
  }
  for (const item of [...shop.relics].sort((a, b) => b.price - a.price)) {
    if (next.gold >= item.price) { next.gold -= item.price; next.relics = [...next.relics, item.relic]; }
  }
  return { ...next, phase: 'MAP', shop: null };
}

function handleEvent(s: RunState): RunState {
  const ev = s.event!;
  const enabled = (id: string) => ev.options.some((o) => o.id === id && !o.disabled);
  let choice: string;
  switch (ev.id) {
    case 'golden_idol': choice = s.hp - 10 > 0.4 * s.maxHp ? 'take_gold' : 'leave'; break;
    case 'wandering_smith': choice = enabled('buy_relic') ? 'buy_relic' : 'remove_weak'; break;
    case 'whispering_fountain': choice = s.hp < 0.5 * s.maxHp ? 'drink_deep' : 'wash_blades'; break;
    case 'abyssal_altar': choice = s.hp - 12 > 0.45 * s.maxHp ? 'claim_relic' : 'walk_away'; break;
    default: choice = ev.options.find((o) => !o.disabled)!.id;
  }
  if (!enabled(choice)) choice = ev.options.find((o) => !o.disabled)!.id;
  const r = resolveEventOption(s, choice);
  return { ...r, phase: 'MAP', event: null };
}

function handleTreasure(s: RunState): RunState {
  const t = s.treasure!;
  return { ...s, gold: s.gold + t.gold, relics: [...s.relics, t.relic], phase: 'MAP', treasure: null };
}

function simulateRun(hero: HeroClassId, asc: number): RunResult {
  let s = createNewRun(hero, asc);
  const rec: RunResult = { win: false, capped: false, encounters: [], elitesTaken: 0 };
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
        return rec;
      case 'DEFEAT':
        return rec;
      default: throw new Error('phase ' + s.phase);
    }
  }
  throw new Error('run guard exceeded');
}

const mean = (a: number[]) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : NaN);
const pct = (n: number, d: number) => `${((100 * n) / d).toFixed(1)}%`;

function batch(hero: HeroClassId, asc: number, n: number, label: string) {
  const runs: RunResult[] = [];
  for (let i = 0; i < n; i++) runs.push(simulateRun(hero, asc));
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
