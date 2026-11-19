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
  // 1. Ironwarden Body Slam + Bash Vulnerable + Heavy Blade + Whirlwind + Stats
  let run = createNewRun('ironwarden', 2);
  run.relics.push(RELIC_DEFS.vajra, RELIC_DEFS.shuriken, RELIC_DEFS.orichalcum);
  run = startCombat(run, 'boss', 15);
  assert.ok(run.combat, 'Combat should initialize');
  const boss = run.combat.enemies[0];
  assert.equal(boss.maxHp, 288, 'Ascension 2 boss HP should scale +20%');
  assert.equal(boss.statuses.strength, 1, 'Ascension 2 boss starts with +1 strength');

  const bash = createCardInstance('bash', true);
  const heavy = createCardInstance('heavy_blade', true);
  const defend = createCardInstance('iron_defend', true);
  const slam = createCardInstance('body_slam', true);
  const whirl = createCardInstance('whirlwind', true);
  run.combat.hand = [bash, defend, slam, heavy, whirl];
  run.combat.energy = 6;

  // Play Bash+ (10 dmg + 3 vuln)
  let res = playCard(run, bash.uid, boss.uid);
  run = res.state;
  assert.equal(run.combat!.enemies[0].statuses.artifact, 1, 'Boss artifact absorbs 1st debuff');

  // Play Defend+ (8 block), Body Slam+ (8 + 1 str = 9 dmg)
  res = playCard(run, defend.uid);
  run = res.state;
  assert.equal(run.combat!.playerBlock, 8);
  assert.ok(run.stats.blockGained >= 8, 'Stats must track blockGained');

  const slamPreview = calculateCardDamagePreview(slam, run, run.combat!.enemies[0]);
  assert.equal(slamPreview.perHit, 9, 'Body Slam should deal block(8) + str(1) = 9');
  res = playCard(run, slam.uid, boss.uid);
  run = res.state;

  // Play Heavy Blade+ (14 + 5*1 str = 19)
  const heavyPreview = calculateCardDamagePreview(heavy, run, run.combat!.enemies[0]);
  assert.equal(heavyPreview.perHit, 19);
  res = playCard(run, heavy.uid, boss.uid);
  run = res.state;
  assert.equal(run.combat!.playerStatuses.strength, 2, '3rd attack triggers Shuriken');

  // Verify card damage stats recorded (Bash+ 10 + 1 Vajra Str = 11, Body Slam = 9, Heavy Blade+ = 19)
  assert.equal(run.stats.cardsByType.attack, 3);
  assert.equal(run.stats.cardsByType.skill, 1);
  assert.equal(run.stats.damageByCard.heavy_blade.damage, 19);
  assert.equal(run.stats.damageByCard.bash.damage, 11);
  assert.equal(run.stats.attackDamageDealt, 11 + 9 + 19);

  // Play Whirlwind+ (X=1 energy left -> 8 + 2 = 10 dmg)
  res = playCard(run, whirl.uid);
  run = res.state;
  assert.equal(run.combat!.energy, 0);
  assert.equal(run.stats.attackDamageDealt, 11 + 9 + 19 + 10);

  // End turn & verify Boss Turn resolves cleanly + tracks block/hpLost
  res = resolveEnemyTurn(run);
  run = res.state;
  assert.equal(run.combat!.turn, 2);
  assert.ok(run.stats.damageBlocked + run.stats.hpLost > 0, 'Enemy turn stats must update');
  console.log('✓ Ironwarden combat, Artifact, Body Slam, Heavy Blade, Shuriken, Whirlwind & Stats passed');

  // 2. Shadowweaver Poison + Catalyst + Corpse Explosion + Survivor discard + combatHistory
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
  sw.combat!.enemies[0].statuses.artifact = 0;
  sw.combat!.enemies[0].hp = 5;
  sw.combat!.enemies[0].maxHp = 40;
  sw.combat!.enemies[0].block = 0;
  sw.combat!.enemies[1].hp = 30;
  sw.combat!.enemies[1].maxHp = 30;
  // A cloned sleeping Lagavulin would inherit its 8 starting block and make
  // this check fail whenever the random elite roll is Lagavulin.
  sw.combat!.enemies[1].block = 0;

  const ce = createCardInstance('corpse_explosion', false);
  const cat = createCardInstance('catalyst', true);
  const surv = createCardInstance('survivor', false);
  const strike = createCardInstance('shadow_strike', false);
  sw.combat!.hand = [ce, cat, surv, strike];
  sw.combat!.energy = 4;

  let swRes = playCard(sw, surv.uid);
  sw = swRes.state;
  assert.ok(sw.combat!.pendingDiscard, 'Survivor must trigger pendingDiscard');
  sw = discardSelectedCard(sw, strike.uid);
  assert.equal(sw.combat!.pendingDiscard, undefined, 'Discarding clears pendingDiscard');

  swRes = playCard(sw, ce.uid, sw.combat!.enemies[0].uid);
  sw = swRes.state;
  assert.equal(sw.combat!.enemies[0].statuses.poison, 6);
  assert.equal(sw.combat!.enemies[0].statuses.corpseExplosion, true);

  swRes = resolveEnemyTurn(sw);
  sw = swRes.state;
  assert.equal(sw.phase, 'REWARD', 'Corpse Explosion kills enemy 1 -> transitions to REWARD');
  assert.ok(sw.stats.poisonDamageDealt >= 45, 'Poison + Corpse Explosion damage must be recorded');
  assert.ok(sw.stats.combatHistory.length >= 1, 'Combat victory must append combatHistory entry');
  console.log('✓ Shadowweaver Poison, Survivor, Corpse Explosion & combatHistory passed');

  // 3. Potion slot management
  let pots: (typeof POTION_DEFS[keyof typeof POTION_DEFS] | null)[] = [
    POTION_DEFS.fire_potion,
    POTION_DEFS.block_potion,
    POTION_DEFS.energy_potion,
  ];
  const fullTry = addPotionToSlot(pots, POTION_DEFS.heal_potion);
  assert.equal(fullTry.added, false);
  pots = discardPotionSlot(pots, 1);
  const afterDiscard = addPotionToSlot(pots, POTION_DEFS.heal_potion);
  assert.equal(afterDiscard.added, true);
  assert.equal(afterDiscard.potions[1]?.id, 'heal_potion');
  console.log('✓ Potion slot add/discard passed');

  // 4. Block preview under Frail
  let frailRun = createNewRun('ironwarden');
  frailRun = startCombat(frailRun, 'monster', 1);
  frailRun.combat!.playerStatuses.frail = 2;
  const defCard = createCardInstance('iron_defend', false);
  const blkPrev = calculateCardBlockPreview(defCard, frailRun);
  assert.equal(blkPrev.block, 3, '5 * 0.75 floored = 3 under Frail');
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
  // 1. Battle Trance draws its cards, then locks further draws this turn
  let bt = createNewRun('ironwarden', 0);
  bt = startCombat(bt, 'monster', 1);
  const trance = createCardInstance('battle_trance', false);
  const pommel = createCardInstance('pommel_strike', false);
  bt.combat!.hand = [trance, pommel];
  bt.combat!.drawPile = Array.from({ length: 8 }, () => createCardInstance('iron_strike'));
  bt.combat!.discardPile = [];
  bt.combat!.energy = 3;
  bt = playCard(bt, trance.uid).state;
  assert.equal(bt.combat!.hand.length, 4, 'Battle Trance must draw 3 cards');
  assert.equal(bt.combat!.playerStatuses.noDrawThisTurn, true);
  bt = playCard(bt, pommel.uid, bt.combat!.enemies[0].uid).state;
  assert.equal(bt.combat!.hand.length, 3, 'No further draws after Battle Trance');
  console.log('✓ Battle Trance draw order passed');

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
      statuses: { ...base.statuses, strength: 0, thorns: 0, metallicize: 0, ritual: 0, weak: 0 },
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
  boss.hp = 125;
  boss.statuses.artifact = 0;
  boss.statuses.poison = 10;
  bp.combat!.hand = [];
  const bpAfter = resolveEnemyTurn(bp).state.combat!.enemies[0];
  assert.equal(bpAfter.hp, 115);
  assert.equal(bpAfter.bossPhase2Triggered, true, 'Poison crossing 50% HP must trigger boss phase 2');
  assert.ok(bpAfter.block >= 16, 'Phase 2 block must survive into the player turn');
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
    gainMetallicize: { n: 3 },
    gainArtifact: { n: 1 },
    gainEnergy: { n: 2 },
    gainRitual: { n: 3 },
    pain: { n: 1 },
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
    corpseMark: {},
    shuriken: { n: 1 },
    kunai: { n: 1 },
    orichalcum: { n: 6 },
    hornCleat: { n: 14 },
    phantasmal: {},
    demonForm: { n: 2 },
    apotheosis: {},
    bossPhase2: {},
    statusCards: { n: 2, ref: 'wound' },
    logEnterCombat: { n: 3 },
    logMercury: { n: 3 },
    logPlayCard: { ref: 'bash', upgraded: true },
    logUsePotion: { ref: 'fire_potion' },
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
