import assert from 'node:assert/strict';
import {
  createCardInstance,
  CARD_DEFS,
  effVal,
  getCardEffects,
  getPrimaryBlockEffect,
  getCardCost,
  getPrimaryDamageEffect,
  getStarterDeck,
} from '../src/game/cards';
import {
  addPotionToSlot,
  calculateCardBlockPreview,
  calculateCardTotalDamage,
  calculateCardDamagePreview,
  calculateEnemyAttackPreview,
  createNewRun,
  discardPotionSlot,
  discardCard,
  discardSelectedCard,
  enterMapNode,
  playCard,
  resolveEnemyTurn,
  startCombat,
  stokeCard,
  useClassAbility,
} from '../src/game/engine';
import { BALANCE } from '../src/game/balance';
import { computeEnemyNextIntent } from '../src/game/enemies';
import { seedRng } from '../src/game/rng';
import { claimGold, restHeal, returnToMap } from '../src/game/rooms';
import { LoadResult, parseSave, resumeRun, serializeRun } from '../src/game/save';
import {
  CARD_EN,
  ENEMY_EN,
  POTION_EN,
  RELIC_EN,
  tCard,
  tCombatLogEntry,
  tCombatMsg,
  tIntentLabel,
  tPotion,
  tRelic,
} from '../src/game/i18n';
import { resolveEventOption } from '../src/game/events';
import { CombatMsg, CombatMsgKey, RunState } from '../src/game/types';
import { POTION_DEFS } from '../src/game/potions';
import { RELIC_DEFS } from '../src/game/relics';
import { generateSpireMap, TOTAL_FLOORS } from '../src/game/map';

function testMapInvariants() {
  for (let trial = 0; trial < 20; trial++) {
    const map = generateSpireMap();
    const byId = new Map(map.map((n) => [n.id, n]));
    const f1 = map.filter((n) => n.floor === 1);
    assert.ok(f1.length >= 3, 'Floor 1 must have at least 3 starting nodes');
    f1.forEach((n) => assert.equal(n.type, 'monster', 'Floor 1 must be monster'));

    const f8 = map.filter((n) => n.floor === 8);
    f8.forEach((n) => assert.equal(n.type, 'treasure', 'Floor 8 must be treasure'));

    const f14 = map.filter((n) => n.floor === 14);
    f14.forEach((n) => assert.equal(n.type, 'rest', 'Floor 14 must be rest'));

    const f15 = map.filter((n) => n.floor === TOTAL_FLOORS);
    assert.equal(f15.length, 1, 'Floor 15 must have 1 boss node');
    assert.equal(f15[0].type, 'boss');

    const incoming = new Map<string, number>();
    for (const n of map) {
      if (n.floor < TOTAL_FLOORS) {
        assert.ok(n.nextIds.length >= 1, `Node ${n.id} must have >=1 outgoing edge`);
        for (const nid of n.nextIds) {
          const target = byId.get(nid);
          assert.ok(target && target.floor === n.floor + 1, `Invalid edge ${n.id} -> ${nid}`);
          incoming.set(nid, (incoming.get(nid) || 0) + 1);
        }
      }
    }
    for (const n of map) {
      if (n.floor > 1) {
        assert.ok((incoming.get(n.id) || 0) >= 1, `Orphan node ${n.id}`);
      }
    }
  }
  console.log('✓ Map connectivity & invariants passed (20 trials)');
}

function testCombatMechanicsAndStats() {
  // 1. Ironwarden Shield Ram + Armor Breaker Vulnerable + Crushing Maul + Blade Cyclone + Stats
  let run = createNewRun('ironwarden', 2);
  run.relics.push(RELIC_DEFS.ashen_fang, RELIC_DEFS.notched_blade, RELIC_DEFS.cinderglass_ward);
  run = startCombat(run, 'boss', 15);
  assert.ok(run.combat, 'Combat should initialize');
  const boss = run.combat.enemies[0];
  assert.equal(boss.maxHp, Math.round(BALANCE.bossHp * 1.2), 'Ascension 2 boss HP should scale +20%');
  assert.equal(boss.statuses.strength, 1, 'Ascension 2 boss starts with +1 strength');

  const breaker = createCardInstance('armor_breaker', true);
  const maul = createCardInstance('crushing_maul', true);
  const defend = createCardInstance('iron_defend', true);
  const ram = createCardInstance('shield_ram', true);
  const cyclone = createCardInstance('blade_cyclone', true);
  run.combat.hand = [breaker, defend, ram, maul, cyclone];
  run.combat.energy = 6;

  // Play Armor Breaker+ (10 dmg + 3 vuln)
  let res = playCard(run, breaker.uid, boss.uid);
  run = res.state;
  assert.equal(run.combat!.enemies[0].statuses.artifact, 1, 'Boss artifact absorbs 1st debuff');

  // Play Defend+ (9 block), Shield Ram+ (9 + 1 str = 10 dmg)
  res = playCard(run, defend.uid);
  run = res.state;
  assert.equal(run.combat!.playerBlock, 9);
  assert.ok(run.stats.blockGained >= 9, 'Stats must track blockGained');

  const ramPreview = calculateCardDamagePreview(ram, run, run.combat!.enemies[0]);
  assert.equal(ramPreview.perHit, 10, 'Shield Ram should deal block(9) + str(1) = 10');
  res = playCard(run, ram.uid, boss.uid);
  run = res.state;

  // Play Crushing Maul+ (14 + 5*1 str = 19)
  const maulPreview = calculateCardDamagePreview(maul, run, run.combat!.enemies[0]);
  assert.equal(maulPreview.perHit, 19);
  res = playCard(run, maul.uid, boss.uid);
  run = res.state;
  assert.equal(run.combat!.playerStatuses.strength, 2, '3rd attack triggers Notched Blade');

  // Verify card damage stats recorded (Armor Breaker+ 10 + 1 Ashen Fang Str = 11, Shield Ram = 10, Crushing Maul+ = 19)
  assert.equal(run.stats.cardsByType.attack, 3);
  assert.equal(run.stats.cardsByType.skill, 1);
  assert.equal(run.stats.damageByCard.crushing_maul.damage, 19);
  assert.equal(run.stats.damageByCard.armor_breaker.damage, 11);
  assert.equal(run.stats.attackDamageDealt, 11 + 10 + 19);

  // Play Blade Cyclone+ (X=1 energy left -> 8 + 2 = 10 dmg)
  res = playCard(run, cyclone.uid);
  run = res.state;
  assert.equal(run.combat!.energy, 0);
  assert.equal(run.stats.attackDamageDealt, 11 + 10 + 19 + 10);

  // End turn & verify Boss Turn resolves cleanly + tracks block/hpLost
  res = resolveEnemyTurn(run);
  run = res.state;
  assert.equal(run.combat!.turn, 2);
  assert.ok(run.stats.damageBlocked + run.stats.hpLost > 0, 'Enemy turn stats must update');
  console.log('✓ Ironwarden combat, Artifact, Shield Ram, Crushing Maul, Notched Blade, Blade Cyclone & Stats passed');

  // 2. Shadowweaver Poison + Toxic Bloom + Rotburst + Last Refuge discard + combatHistory
  let sw = createNewRun('shadowweaver', 0);
  const f1 = sw.map.find((n) => n.floor === 1)!;
  sw = enterMapNode(sw, f1.id);
  assert.equal(sw.phase, 'COMBAT');

  sw = startCombat(sw, 'elite', 8);
  if (sw.combat!.enemies.length < 2) {
    sw.combat!.enemies.push({
      ...sw.combat!.enemies[0],
      uid: 'enemy_clone_2',
      hp: 30,
      maxHp: 30,
      statuses: { ...sw.combat!.enemies[0].statuses, artifact: 0 },
    });
  }
  // Exactly two enemies (the Glyph Totem elite spawns three).
  sw.combat!.enemies = sw.combat!.enemies.slice(0, 2);
  sw.combat!.enemies[0].statuses.artifact = 0;
  sw.combat!.enemies[0].hp = 5;
  sw.combat!.enemies[0].maxHp = 40;
  sw.combat!.enemies[0].block = 0;
  sw.combat!.enemies[1].hp = 30;
  sw.combat!.enemies[1].maxHp = 30;
  // A cloned Slumbering Gargoyle would inherit its 8 starting block and make
  // this check fail whenever the random elite roll is the Gargoyle.
  sw.combat!.enemies[1].block = 0;

  const rot = createCardInstance('rotburst', false);
  const bloom = createCardInstance('toxic_bloom', true);
  const refuge = createCardInstance('last_refuge', false);
  const strike = createCardInstance('shadow_strike', false);
  sw.combat!.hand = [rot, bloom, refuge, strike];
  sw.combat!.energy = 4;

  let swRes = playCard(sw, refuge.uid);
  sw = swRes.state;
  assert.ok(sw.combat!.pendingDiscard, 'Last Refuge must trigger pendingDiscard');
  sw = discardSelectedCard(sw, strike.uid);
  assert.equal(sw.combat!.pendingDiscard, undefined, 'Discarding clears pendingDiscard');

  swRes = playCard(sw, rot.uid, sw.combat!.enemies[0].uid);
  sw = swRes.state;
  assert.equal(sw.combat!.enemies[0].statuses.poison, 6);
  assert.equal(sw.combat!.enemies[0].statuses.rotburst, true);

  swRes = resolveEnemyTurn(sw);
  sw = swRes.state;
  assert.equal(sw.phase, 'REWARD', 'Rotburst kills enemy 1 -> transitions to REWARD');
  // 5 poison (enemy 1 had 5 HP) + 30 explosion (capped at enemy 2's 30 HP; no overkill)
  assert.equal(sw.stats.poisonDamageDealt, 35, 'Poison + Rotburst damage must be recorded without overkill');
  assert.ok(sw.stats.combatHistory.length >= 1, 'Combat victory must append combatHistory entry');
  console.log('✓ Shadowweaver Poison, Last Refuge, Rotburst & combatHistory passed');

  // 3. Potion slot management
  let pots: (typeof POTION_DEFS[keyof typeof POTION_DEFS] | null)[] = [
    POTION_DEFS.wildfire_flask,
    POTION_DEFS.stoneskin_tonic,
    POTION_DEFS.kindling_elixir,
  ];
  const fullTry = addPotionToSlot(pots, POTION_DEFS.heartblood_elixir);
  assert.equal(fullTry.added, false);
  pots = discardPotionSlot(pots, 1);
  const afterDiscard = addPotionToSlot(pots, POTION_DEFS.heartblood_elixir);
  assert.equal(afterDiscard.added, true);
  assert.equal(afterDiscard.potions[1]?.id, 'heartblood_elixir');
  console.log('✓ Potion slot add/discard passed');

  // 4. Block preview under Frail
  let frailRun = createNewRun('ironwarden');
  frailRun = startCombat(frailRun, 'monster', 1);
  frailRun.combat!.playerStatuses.frail = 2;
  const defCard = createCardInstance('iron_defend', false);
  const blkPrev = calculateCardBlockPreview(defCard, frailRun);
  assert.equal(blkPrev.block, 4, '6 * 0.75 floored = 4 under Frail');
  assert.equal(blkPrev.reduced, true);
  console.log('✓ Frail block calculation passed');
}

function testBilingualCoverage() {
  for (const id of Object.keys(CARD_DEFS)) {
    assert.ok(CARD_EN[id], `Missing CARD_EN translation for: ${id}`);
    const en = tCard(id, 'en');
    assert.ok(en.name.length > 0 && en.desc.length > 0, `Empty EN card translation: ${id}`);
  }
  for (const id of Object.keys(RELIC_DEFS)) {
    assert.ok(RELIC_EN[id], `Missing RELIC_EN translation for: ${id}`);
    const en = tRelic(id, 'en');
    assert.ok(en.name.length > 0 && en.desc.length > 0, `Empty EN relic translation: ${id}`);
  }
  for (const id of Object.keys(POTION_DEFS)) {
    assert.ok(POTION_EN[id], `Missing POTION_EN translation for: ${id}`);
    const en = tPotion(id, 'en');
    assert.ok(en.name.length > 0 && en.desc.length > 0, `Empty EN potion translation: ${id}`);
  }
  assert.ok(Object.keys(ENEMY_EN).length >= 9, 'All enemies localized');

  // Card text must state the same numbers as the card data in both languages;
  // CardView's live damage/block preview finds them by these exact phrases.
  for (const [id, def] of Object.entries(CARD_DEFS)) {
    const dmgFx = getPrimaryDamageEffect(def);
    const blkFx = getPrimaryBlockEffect(def);
    if (dmgFx?.fromBlock || dmgFx?.xHits) continue;
    for (const upgraded of [false, true]) {
      const zh = upgraded ? def.upgradedDescription || def.description : def.description;
      const en = upgraded ? tCard(id, 'en').upgDesc : tCard(id, 'en').desc;
      const dmg = dmgFx ? effVal(dmgFx, upgraded) : undefined;
      const blk = blkFx ? effVal(blkFx, upgraded) : undefined;
      if (dmg !== undefined) {
        assert.ok(zh.includes(`造成 ${dmg} 点伤害`), `${id}${upgraded ? '+' : ''} zh text must say ${dmg} damage: ${zh}`);
        assert.ok(en.includes(`Deal ${dmg} damage`), `${id}${upgraded ? '+' : ''} en text must say ${dmg} damage: ${en}`);
      }
      if (blk !== undefined) {
        assert.ok(zh.includes(`获得 ${blk} 点格挡`), `${id}${upgraded ? '+' : ''} zh text must say ${blk} block: ${zh}`);
        assert.ok(en.includes(`Gain ${blk} Block`), `${id}${upgraded ? '+' : ''} en text must say ${blk} block: ${en}`);
      }
    }
  }
  const intentEn = tIntentLabel(
    { type: 'attack_debuff', damage: 8, hits: 1, applyVulnerable: 2, label: '碎颅重锤' },
    'en'
  );
  assert.ok(intentEn.includes('Attack 8') && intentEn.includes('Vulnerable 2'));
  console.log(
    `✓ 100% Bilingual coverage passed (${Object.keys(CARD_DEFS).length} cards, ${Object.keys(RELIC_DEFS).length} relics, ${Object.keys(POTION_DEFS).length} potions)`
  );
}

function testP0Regressions() {
  // 1. Tunnel Vision draws its cards, then locks further draws this turn
  let bt = createNewRun('ironwarden', 0);
  bt = startCombat(bt, 'monster', 1);
  const vision = createCardInstance('tunnel_vision', false);
  const jab = createCardInstance('hilt_jab', false);
  bt.combat!.hand = [vision, jab];
  bt.combat!.drawPile = Array.from({ length: 8 }, () => createCardInstance('iron_strike'));
  bt.combat!.discardPile = [];
  bt.combat!.energy = 3;
  bt = playCard(bt, vision.uid).state;
  assert.equal(bt.combat!.hand.length, 4, 'Tunnel Vision must draw 3 cards');
  assert.equal(bt.combat!.playerStatuses.noDrawThisTurn, true);
  bt = playCard(bt, jab.uid, bt.combat!.enemies[0].uid).state;
  assert.equal(bt.combat!.hand.length, 3, 'No further draws after Tunnel Vision');
  console.log('✓ Tunnel Vision draw order passed');

  // 2. A 1-stack Vulnerable applied by an enemy must survive to its next attack
  let vr = createNewRun('ironwarden', 0);
  vr = startCombat(vr, 'monster', 8);
  const base = vr.combat!.enemies[0];
  vr.combat!.enemies = [
    {
      ...base,
      defId: 'bone_knight',
      hp: 999,
      maxHp: 999,
      block: 0,
      asleep: false,
      turnCount: 3,
      statuses: { ...base.statuses, strength: 0, thorns: 0, ironhide: 0, zeal: 0, weak: 0 },
      intent: { type: 'debuff', applyFrail: 2, applyVulnerable: 1, label: 'test' },
    },
  ];
  vr.combat!.hand = [];
  vr.combat!.playerBlock = 0;
  const afterDebuff = resolveEnemyTurn(vr).state;
  assert.equal(afterDebuff.combat!.playerStatuses.vulnerable, 1, 'Vulnerable 1 must still be active on the player turn');
  assert.equal(afterDebuff.combat!.playerStatuses.frail, 2);
  const knight = afterDebuff.combat!.enemies[0];
  assert.equal(knight.intent.damage, 9);
  assert.equal(calculateEnemyAttackPreview(knight, afterDebuff).perHit, 13, '9 x 1.5 Vulnerable = 13');
  afterDebuff.combat!.hand = [];
  afterDebuff.combat!.playerBlock = 0;
  const afterHit = resolveEnemyTurn(afterDebuff).state;
  assert.equal(afterDebuff.hp - afterHit.hp, 13, 'Next enemy attack must be boosted by Vulnerable');
  assert.equal(afterHit.combat!.playerStatuses.vulnerable, 0, 'Vulnerable 1 expires after one full round');
  assert.equal(afterHit.combat!.playerStatuses.frail, 1);
  console.log('✓ Enemy-applied debuff duration passed');

  // 3. Boss phase 2 must trigger from poison, not only from card hits
  let bp = createNewRun('shadowweaver', 0);
  bp = startCombat(bp, 'boss', 15);
  const boss = bp.combat!.enemies[0];
  const bossStartHp = Math.floor(boss.maxHp / 2) + 5; // 10 poison takes it below half
  boss.hp = bossStartHp;
  boss.statuses.artifact = 0;
  boss.statuses.poison = 10;
  bp.combat!.hand = [];
  const bpAfter = resolveEnemyTurn(bp).state.combat!.enemies[0];
  assert.equal(bpAfter.hp, bossStartHp - 10);
  assert.equal(bpAfter.bossPhase2Triggered, true, 'Poison crossing 50% HP must trigger boss phase 2');
  assert.ok(bpAfter.block >= 10, 'Phase 2 block must survive into the player turn');
  console.log('✓ Boss phase 2 from poison passed');

  // 4. Wandering smith upgrades 2 random cards, not always the first two
  const upgradedSlots = new Set<string>();
  for (let t = 0; t < 60; t++) {
    let s = createNewRun('ironwarden', 0);
    s = { ...s, gold: 200, event: { id: 'wandering_smith', title: '', body: '', options: [], resolved: false } };
    const out = resolveEventOption(s, 'forge_random');
    const idx = out.deck.map((c, i) => (c.upgraded ? i : -1)).filter((i) => i >= 0);
    assert.equal(idx.length, 2, 'Smith upgrades exactly 2 cards');
    upgradedSlots.add(idx.join(','));
  }
  assert.ok(upgradedSlots.size > 1, 'Smith must not always upgrade the same deck slots');
  console.log('✓ Smith random upgrade passed');

  // 5. Every combat message translates in both locales; English has no CJK
  const samples = {
    damage: { n: 5 },
    blocked: {},
    gainBlock: { n: 5 },
    gainStrength: { n: 2 },
    gainDexterity: { n: 1 },
    gainIronhide: { n: 3 },
    gainArtifact: { n: 1 },
    gainEnergy: { n: 2 },
    gainZeal: { n: 3 },
    curseAche: { n: 1 },
    thorns: { n: 2 },
    burn: { n: 4 },
    poisonTick: { n: 6 },
    heal: { n: 6 },
    draw: { n: 3 },
    enrage: { n: 2 },
    artifactBlocked: {},
    applyVulnerable: { n: 2 },
    applyWeak: { n: 1 },
    applyFrail: { n: 2 },
    applyPoison: { n: 5 },
    rotburstMark: {},
    notchedBlade: { n: 1 },
    fleetRibbon: { n: 1 },
    cinderglassWard: { n: 6 },
    watchmanHorn: { n: 14 },
    nightTerror: {},
    infernalAvatar: { n: 2 },
    upgradeAll: {},
    bossPhase2: {},
    statusCards: { n: 2, ref: 'wound' },
    statusCardsDraw: { n: 2, ref: 'wound' },
    logEnterCombat: { n: 3 },
    logCinderHourglass: { n: 3 },
    logPlayCard: { ref: 'armor_breaker', upgraded: true },
    logUsePotion: { ref: 'wildfire_flask' },
    logBossPhase2: { ref: 'obsidian_warden', name: '黑曜守望者' },
    gainEmber: { n: 1 },
    spendEmber: { n: 2 },
    temper: {},
    chargeStart: { n: 30 },
    interrupted: {},
    stunned: {},
    echo: { ref: 'ash_dart' },
    logStoke: { ref: 'wound' },
    logAbility: { ref: 'temper' },
    logInterrupt: { ref: 'obsidian_warden', name: '黑曜守望者' },
  } satisfies Record<CombatMsgKey, Omit<CombatMsg, 'key'>>;
  const cjk = /[一-鿿]/;
  for (const [key, rest] of Object.entries(samples)) {
    const msg = { key, ...rest } as CombatMsg;
    const en = tCombatMsg(msg, 'en');
    const zh = tCombatMsg(msg, 'zh');
    assert.ok(en.length > 0 && !cjk.test(en), `English combat message for ${key} must be non-empty and CJK-free: ${en}`);
    assert.ok(zh.length > 0, `Chinese combat message for ${key} must be non-empty`);
  }
  assert.equal(tCombatLogEntry('旧存档日志', 'en'), '旧存档日志', 'Plain-string log entries from old saves still render');
  console.log(`✓ Combat message i18n passed (${Object.keys(samples).length} message keys)`);
}

// ---------------------------------------------------------------------------
// P2: effect lists, Ember, Stoke, class abilities, Echo, boss charge
// ---------------------------------------------------------------------------
function freshCombat(hero: 'ironwarden' | 'shadowweaver', type: 'monster' | 'elite' | 'boss' = 'monster'): RunState {
  const run = startCombat(createNewRun(hero), type, type === 'boss' ? 15 : 1);
  const c = run.combat!;
  c.enemies = c.enemies.map((e) => ({ ...e, block: 0, hp: 200, maxHp: 200, statuses: { ...e.statuses, artifact: 0 } }));
  c.energy = 10;
  c.hand = [];
  return run;
}
const ids = (cards: { defId: string }[]) => cards.map((c) => c.defId);

function testEmberMechanics() {
  // Legacy cards compile to effect lists in the old resolution order.
  assert.deepEqual(getCardEffects(CARD_DEFS.armor_breaker).map((e) => e.op), ['damage', 'debuff']);
  assert.deepEqual(getCardEffects(CARD_DEFS.blood_covenant).map((e) => e.op), ['loseHp', 'gainEnergy', 'draw']);
  assert.ok(ids(getStarterDeck('ironwarden')).includes('kindling_chop'), 'IW starter deck has Kindling Chop');
  assert.ok(ids(getStarterDeck('shadowweaver')).includes('ash_dart'), 'SW starter deck has Ash Dart');

  // Stoke: burn a status card for 1 Ember, once per turn, never triggers Marrow Ache.
  let run = freshCombat('ironwarden');
  const wound = createCardInstance('wound');
  const ache = createCardInstance('marrow_ache');
  const spare = createCardInstance('iron_defend');
  run.combat!.hand = [wound, ache, spare];
  const hp0 = run.hp;
  run = stokeCard(run, wound.uid).state;
  assert.equal(run.combat!.ember, 1, 'Stoke grants 1 Ember');
  assert.equal(run.hp, hp0, 'Stoking is not playing: Marrow Ache does not trigger');
  assert.ok(ids(run.combat!.exhaustPile).includes('wound'), 'Stoked card is exhausted');
  assert.equal(stokeCard(run, spare.uid).state, run, 'Only one Stoke per turn');
  assert.equal(run.stats.stokes, 1);

  // Temper: +6 to a single-hit attack, consumed by it; once per turn.
  run = freshCombat('ironwarden');
  run.combat!.ember = 4;
  const strike = createCardInstance('iron_strike');
  const hew = createCardInstance('double_hew');
  run.combat!.hand = [strike, hew];
  run = useClassAbility(run).state;
  assert.equal(run.combat!.ember, 2, 'Temper costs 2 Ember');
  assert.equal(useClassAbility(run).state, run, 'Class ability is once per turn');
  const target = run.combat!.enemies[0];
  assert.equal(calculateCardDamagePreview(strike, run, target).perHit, 12, 'Preview shows 6 + 6 Temper');
  assert.equal(calculateCardDamagePreview(hew, run, target).perHit, 9, 'Multi-hit attacks get +3 per hit');
  run = playCard(run, strike.uid, target.uid).state;
  assert.equal(run.combat!.enemies[0].hp, 200 - 12, 'Tempered Iron Strike deals 12');
  assert.equal(run.combat!.temperPending, 0, 'Temper is consumed by the next attack');
  assert.equal(calculateCardDamagePreview(hew, run, run.combat!.enemies[0]).perHit, 6, 'Temper does not carry over');

  // Aftershock hits twice after Temper (split bonus +3 each).
  run = freshCombat('ironwarden');
  run.combat!.ember = 2;
  const after1 = createCardInstance('aftershock');
  const after2 = createCardInstance('aftershock');
  run.combat!.hand = [after1, after2];
  run = playCard(run, after1.uid, run.combat!.enemies[0].uid).state;
  assert.equal(run.combat!.enemies[0].hp, 195, 'Aftershock without Temper: one hit of 5');
  run = useClassAbility(run).state;
  run = playCard(run, after2.uid, run.combat!.enemies[0].uid).state;
  assert.equal(run.combat!.enemies[0].hp, 195 - 16, 'Tempered Aftershock: two hits of 5 + 3');

  // Molten Edge scales with Ember held; Spark Spray caps at 2 Ember; Forge Heart blocks on Stoke.
  run = freshCombat('ironwarden');
  run.combat!.ember = 4;
  const edge = createCardInstance('molten_edge');
  run.combat!.hand = [edge];
  assert.equal(calculateCardDamagePreview(edge, run, run.combat!.enemies[0]).perHit, 6 + 4 * 3);
  run = freshCombat('ironwarden');
  const e0 = run.combat!.enemies[0];
  run.combat!.enemies = [e0, { ...e0, uid: 'e2' }, { ...e0, uid: 'e3' }];
  const spray = createCardInstance('spark_spray');
  const heart = createCardInstance('forge_heart');
  const fuel = createCardInstance('wound');
  run.combat!.hand = [spray, heart, fuel];
  run = playCard(run, spray.uid).state;
  assert.equal(run.combat!.ember, 2, 'Spark Spray: 1 Ember per enemy hit, max 2');
  run = playCard(run, heart.uid).state;
  run = stokeCard(run, fuel.uid).state;
  assert.equal(run.combat!.playerBlock, 4, 'Forge Heart: +4 Block per Stoke');
  run.combat!.ember = 9;
  const chop = createCardInstance('kindling_chop');
  run.combat!.hand = [chop];
  run = playCard(run, chop.uid, run.combat!.enemies[0].uid).state;
  assert.equal(run.combat!.ember, 10, 'Ember caps at 10');

  // Ash Veil + Smoldering Haze: 3 Poison + 2 more for the 2 Ember spent.
  run = freshCombat('shadowweaver');
  run.combat!.ember = 2;
  const haze = createCardInstance('smoldering_haze');
  run.combat!.hand = [haze];
  run = playCard(run, haze.uid).state;
  run = useClassAbility(run).state;
  assert.ok(run.combat!.enemies.every((e) => e.statuses.poison === 5), 'Ash Veil 3 + Smoldering Haze 2');

  // Echo triggers on a card-effect discard, not on the end-of-turn discard.
  run = freshCombat('shadowweaver');
  const refuge = createCardInstance('last_refuge');
  const dart = createCardInstance('ash_dart');
  const blade = createCardInstance('echo_blade');
  run.combat!.hand = [refuge, dart, blade];
  run = playCard(run, refuge.uid).state;
  const echoRes = discardCard(run, dart.uid);
  run = echoRes.state;
  assert.equal(run.combat!.ember, 1, 'Ash Dart Echo: +1 Ember');
  assert.ok(echoRes.events.some((e) => e.msg.key === 'echo'), 'Echo shows feedback');
  run = resolveEnemyTurn(run).state;
  assert.equal(run.combat!.ember, 1, 'End-of-turn discard does not trigger Echo');
  const step = createCardInstance('smoke_step');
  run.combat!.hand = [step, blade];
  run.combat!.energy = 3;
  run = playCard(run, step.uid).state;
  run = discardCard(run, blade.uid).state;
  assert.ok(ids(run.combat!.hand).includes('throwing_knife'), 'Echo Blade adds a Throwing Knife');

  // Blade Rain: up to 5 Ember -> that many knives.
  run = freshCombat('shadowweaver');
  run.combat!.ember = 3;
  const rain = createCardInstance('blade_rain', true);
  run.combat!.hand = [rain];
  run = playCard(run, rain.uid).state;
  assert.equal(run.combat!.ember, 0);
  assert.equal(run.combat!.hand.filter((c) => c.defId === 'throwing_knife' && c.upgraded).length, 3);

  // Saves from before P2 have no Ember fields; actions fill the defaults.
  run = freshCombat('ironwarden');
  const legacy = run.combat as unknown as Record<string, unknown>;
  for (const k of ['ember', 'emberCap', 'stokesThisTurn', 'abilityUsesThisTurn', 'temperPending', 'temperedThisTurn']) delete legacy[k];
  const s1 = createCardInstance('iron_strike');
  run.combat!.hand = [s1];
  run = playCard(run, s1.uid, run.combat!.enemies[0].uid).state;
  assert.equal(run.combat!.ember, 0, 'Old saves load with 0 Ember');
  assert.equal(run.combat!.emberCap, 10);
  console.log('✓ Ember: Stoke, Temper, Ash Veil, Echo, Ember cards & old-save defaults passed');
}

/** Boss fight with the Warden about to use its cycle-3 charge move. */
function wardenAboutToCharge(): RunState {
  let run = freshCombat('ironwarden', 'boss');
  const boss = run.combat!.enemies[0];
  boss.turnCount = 3;
  boss.intent = computeEnemyNextIntent(boss, 3);
  assert.ok(boss.intent.startsCharge, 'Warden cycle 3 starts a charge');
  run.combat!.playerBlock = 0;
  run = resolveEnemyTurn(run).state;
  const charging = run.combat!.enemies[0];
  assert.deepEqual(charging.charge, { threshold: BALANCE.chargeThreshold, progress: 0, interrupted: false });
  assert.equal(charging.intent.damage, BALANCE.bossLaser, 'Next intent is the laser');
  run.combat!.hand = [];
  run.combat!.energy = 10;
  run.combat!.playerBlock = 0;
  return run;
}

function testBossCharge() {
  // Interrupt: threshold damage (blocked damage counts) cancels the laser.
  // Iron Strikes deal 6 each into the Warden's Block.
  const needed = Math.ceil(BALANCE.chargeThreshold / 6);
  let run = wardenAboutToCharge();
  const strikes = Array.from({ length: needed }, () => createCardInstance('iron_strike'));
  run.combat!.hand = strikes;
  for (let i = 0; i < needed - 1; i++) run = playCard(run, strikes[i].uid, run.combat!.enemies[0].uid).state;
  assert.equal(run.combat!.enemies[0].charge!.progress, 6 * (needed - 1), 'Progress counts blocked damage too');
  assert.equal(run.combat!.enemies[0].charge!.interrupted, false);
  const hit = playCard(run, strikes[needed - 1].uid, run.combat!.enemies[0].uid);
  run = hit.state;
  const boss = run.combat!.enemies[0];
  assert.equal(boss.charge!.interrupted, true, 'Reaching the threshold interrupts');
  assert.equal(boss.intent.type, 'stunned');
  assert.equal(boss.statuses.vulnerable, 2, 'Interrupt applies 2 Vulnerable through Artifact');
  assert.ok(hit.events.some((e) => e.msg.key === 'interrupted'));
  const hpBefore = run.hp;
  run = resolveEnemyTurn(run).state;
  assert.equal(run.hp, hpBefore, 'Interrupted laser deals no damage');
  assert.equal(run.combat!.enemies[0].charge, undefined, 'Charge resolves');
  assert.equal(run.combat!.enemies[0].intent.type, 'attack_defend', 'Cycle restarts at 1');
  assert.equal(run.stats.chargesInterrupted, 1);

  // Not interrupted: the laser fires, with the Strength gained while charging.
  run = wardenAboutToCharge();
  const hp0 = run.hp;
  run = resolveEnemyTurn(run).state;
  assert.equal(hp0 - run.hp, BALANCE.bossLaser + BALANCE.bossCycleStrength, 'Laser hits for laser + charge Strength');
  assert.equal(run.stats.chargesFired, 1);

  // The poison tick right before the laser counts toward the interrupt.
  run = wardenAboutToCharge();
  run.combat!.enemies[0].charge!.progress = BALANCE.chargeThreshold - 4;
  run.combat!.enemies[0].statuses.poison = 5;
  const hp1 = run.hp;
  run = resolveEnemyTurn(run).state;
  assert.equal(run.hp, hp1, 'Poison tick pushed it over the threshold before it acted');
  assert.equal(run.stats.chargesInterrupted, 1);
  console.log('✓ Boss charge: interrupt, fire, poison-tick interrupt passed');
}

function testDeterminismAndRooms() {
  seedRng(42);
  const a = createNewRun('ironwarden');
  seedRng(42);
  const b = createNewRun('ironwarden');
  assert.deepEqual(a.map, b.map, 'Same seed -> same map');
  assert.deepEqual(a.potions, b.potions, 'Same seed -> same starting potion');

  // Rotburst corpses explode once, not on every later action.
  let run = freshCombat('shadowweaver');
  const c = run.combat!;
  c.enemies = [
    { ...c.enemies[0], uid: 'victim', hp: 1, maxHp: 30 },
    { ...c.enemies[0], uid: 'bystander', hp: 200, maxHp: 200 },
  ];
  const rot = createCardInstance('rotburst');
  const strike = createCardInstance('shadow_strike');
  const d1 = createCardInstance('shadow_defend');
  c.hand = [rot, strike, d1];
  run = playCard(run, rot.uid, 'victim').state;
  run = playCard(run, strike.uid, 'victim').state;
  assert.equal(run.combat!.enemies[1].hp, 170, 'Explosion deals the victim max HP once');
  run = playCard(run, d1.uid).state;
  assert.equal(run.combat!.enemies[1].hp, 170, 'No second explosion on a later card');

  // Room actions live in the engine now.
  let rest: RunState = { ...createNewRun('ironwarden'), phase: 'REST', hp: 10 };
  rest = restHeal(rest);
  assert.equal(rest.phase, 'MAP');
  assert.equal(rest.hp, 10 + Math.floor(rest.maxHp * 0.3));
  assert.equal(rest.stats.hpHealed, Math.floor(rest.maxHp * 0.3));
  let reward: RunState = {
    ...createNewRun('ironwarden'),
    phase: 'REWARD',
    reward: { gold: 20, goldClaimed: false, cardChoices: [], cardClaimed: false, relicClaimed: false, potionClaimed: false },
  };
  const gold0 = reward.gold;
  reward = claimGold(reward);
  assert.equal(reward.gold, gold0 + 20);
  assert.equal(claimGold(reward), reward, 'Gold cannot be claimed twice');
  assert.equal(returnToMap(reward).phase, 'MAP');
  console.log('✓ Seeded RNG, Rotburst single explosion & engine room actions passed');
}

// ---------------------------------------------------------------------------
// P3.0: versioned saves, resume determinism, stuck enemy turn, damage badge
// ---------------------------------------------------------------------------
function firstCombat(hero: 'ironwarden' | 'shadowweaver', seed: number): RunState {
  seedRng(seed);
  const run = createNewRun(hero);
  const node = run.map.find((n) => n.floor === 1)!;
  return enterMapNode(run, node.id);
}

/** Play every affordable card left to right, then end the turn; repeat. */
function autoplay(run: RunState, turns: number): RunState {
  for (let t = 0; t < turns && run.phase === 'COMBAT'; t++) {
    for (const card of [...run.combat!.hand]) {
      if (run.phase !== 'COMBAT') break;
      const target = run.combat!.enemies.find((e) => e.hp > 0)?.uid;
      run = playCard(run, card.uid, target).state;
      if (run.combat?.pendingDiscard) run = discardSelectedCard(run, run.combat.hand[0].uid);
    }
    if (run.phase === 'COMBAT') run = resolveEnemyTurn(run).state;
  }
  return run;
}

function testSaves() {
  // Same seed -> identical run, ids included (uids no longer use the clock).
  seedRng(42);
  const a = createNewRun('ironwarden');
  seedRng(42);
  const b = createNewRun('ironwarden');
  assert.equal(JSON.stringify(a), JSON.stringify(b), 'Same seed gives a byte-identical new run');

  // Resuming a save continues the exact same random sequence and id counter.
  const mid = autoplay(firstCombat('shadowweaver', 9), 1);
  assert.equal(mid.phase, 'COMBAT');
  const raw = serializeRun(mid);
  const straight = autoplay(mid, 3);
  const loaded = parseSave(raw);
  assert.equal(loaded.status, 'ok');
  const resumed = autoplay(resumeRun((loaded as Extract<LoadResult, { status: 'ok' }>).save), 3);
  assert.equal(JSON.stringify(resumed), JSON.stringify(straight), 'A resumed run plays out exactly like the original');

  // A save taken during the enemy-turn animation no longer locks the run.
  const stuck = firstCombat('ironwarden', 3);
  stuck.combat!.enemyTurnInProgress = true;
  const stuckLoad = parseSave(serializeRun(stuck));
  assert.equal(stuckLoad.status, 'ok');
  const unstuck = resumeRun((stuckLoad as Extract<LoadResult, { status: 'ok' }>).save);
  assert.equal(unstuck.combat!.enemyTurnInProgress, false, 'Resume finishes the interrupted enemy turn');
  assert.equal(unstuck.combat!.turn, 2, 'The enemy turn was resolved');
  const card = unstuck.combat!.hand.find((c) => getCardCost(c) >= 0 && getCardCost(c) <= unstuck.combat!.energy)!;
  assert.notEqual(playCard(unstuck, card.uid, unstuck.combat!.enemies[0].uid).state, unstuck, 'Cards can be played again');

  // Version-2 saves (a bare RunState from before P2) migrate.
  const legacy = firstCombat('ironwarden', 5) as unknown as Record<string, unknown>;
  const legacyCombat = legacy.combat as Record<string, unknown>;
  for (const k of ['ember', 'emberCap', 'stokesThisTurn', 'abilityUsesThisTurn', 'temperPending', 'temperedThisTurn']) delete legacyCombat[k];
  const migrated = parseSave(JSON.stringify(legacy));
  assert.equal(migrated.status, 'ok', 'A v2 save loads');
  const mRun = (migrated as Extract<LoadResult, { status: 'ok' }>).save.run;
  assert.equal(mRun.combat!.ember, 0, 'Migration fills Ember fields');
  assert.equal(mRun.combat!.emberCap, 10);

  // Repairs: unknown cards are dropped, stale relic copies refreshed from current data.
  const repair = firstCombat('ironwarden', 6);
  repair.deck.push({ uid: 'ghost', defId: 'no_such_card', upgraded: false });
  repair.combat!.hand.push({ uid: 'ghost2', defId: 'no_such_card', upgraded: false });
  repair.relics = [{ ...repair.relics[0], description: 'stale text from an old version' }];
  const repaired = parseSave(serializeRun(repair));
  assert.equal(repaired.status, 'ok');
  const rRes = repaired as Extract<LoadResult, { status: 'ok' }>;
  assert.ok(!rRes.save.run.deck.some((c) => c.defId === 'no_such_card'), 'Unknown deck cards are removed');
  assert.ok(!rRes.save.run.combat!.hand.some((c) => c.defId === 'no_such_card'), 'Unknown hand cards are removed');
  assert.ok(rRes.repairs.length >= 2, 'Repairs are reported');
  assert.equal(rRes.save.run.relics[0].description, RELIC_DEFS[repair.relics[0].id].description, 'Relics come from current data');

  // Unusable saves are reported, never loaded.
  assert.equal(parseSave('{not json').status, 'corrupt');
  assert.equal(parseSave(JSON.stringify({ ...repair, heroId: 'no_such_hero' })).status, 'corrupt', 'Unknown hero is rejected');
  assert.equal(parseSave(JSON.stringify({ ...repair, phase: 'COMBAT', combat: null })).status, 'corrupt');
  assert.equal(parseSave(JSON.stringify({ version: 99, run: repair })).status, 'newer', 'Saves from newer versions are not touched');
  assert.equal(parseSave(serializeRun({ ...repair, phase: 'DEFEAT', combat: null })).status, 'none', 'Finished runs are not resumable');
  assert.equal(parseSave(null).status, 'none');
  console.log('✓ Saves: versioning, migration, repair, resume determinism & stuck-turn recovery passed');
}

function testDamageBadge() {
  let run = freshCombat('ironwarden');
  const target = run.combat!.enemies[0];
  const chop = createCardInstance('kindling_chop');
  const after = createCardInstance('aftershock');
  const edge = createCardInstance('molten_edge');
  const guard = createCardInstance('anvil_guard');
  run.combat!.hand = [chop, after, edge, guard];
  assert.equal(calculateCardTotalDamage(chop, run, target), 7, 'Effect-list cards get a damage total');
  assert.equal(calculateCardTotalDamage(guard, run, target), null, 'Non-damage cards get none');
  run.combat!.ember = 4;
  assert.equal(calculateCardTotalDamage(edge, run, target), 6 + 4 * 3, 'Ember scaling is included');
  run = useClassAbility(run).state;
  assert.equal(calculateCardTotalDamage(chop, run, target), 13, 'Temper is included');
  assert.equal(calculateCardTotalDamage(after, run, target), 16, 'Tempered Aftershock counts both hits');
  console.log('✓ Damage badge totals (effect cards, Ember, Temper, multi-effect) passed');
}

testMapInvariants();
testCombatMechanicsAndStats();
testBilingualCoverage();
testP0Regressions();
testEmberMechanics();
testBossCharge();
testDeterminismAndRooms();
testSaves();
testDamageBadge();
console.log('ALL VERIFICATION CHECKS PASSED');
