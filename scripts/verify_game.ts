import assert from 'node:assert/strict';
import { createCardInstance, CARD_DEFS } from '../src/game/cards';
import {
  addPotionToSlot,
  calculateCardBlockPreview,
  calculateCardDamagePreview,
  calculateEnemyAttackPreview,
  createNewRun,
  discardPotionSlot,
  discardSelectedCard,
  enterMapNode,
  playCard,
  resolveEnemyTurn,
  startCombat,
} from '../src/game/engine';
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
import { CombatMsg, CombatMsgKey } from '../src/game/types';
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
  assert.equal(boss.maxHp, Math.round(220 * 1.2), 'Ascension 2 boss HP should scale +20%');
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
    if (def.blockAsDamage || def.cost === -1) continue;
    for (const upgraded of [false, true]) {
      const zh = upgraded ? def.upgradedDescription || def.description : def.description;
      const en = upgraded ? tCard(id, 'en').upgDesc : tCard(id, 'en').desc;
      const dmg = upgraded && def.upgradedDamage !== undefined ? def.upgradedDamage : def.damage;
      const blk = upgraded && def.upgradedBlock !== undefined ? def.upgradedBlock : def.block;
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

testMapInvariants();
testCombatMechanicsAndStats();
testBilingualCoverage();
testP0Regressions();
console.log('ALL VERIFICATION CHECKS PASSED');
