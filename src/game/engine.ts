import {
  CARD_DEFS,
  createCardInstance,
  getCardCost,
  getRewardPool,
  getStarterDeck,
  rollCardChoices,
} from './cards';
import { computeEnemyNextIntent, emptyStatusMap, spawnEncounter } from './enemies';
import { generateSpireEvent } from './events';
import { HERO_CLASSES } from './heroes';
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
  PotionDef,
  RelicDef,
  RunState,
  ShopState,
  StatusMap,
} from './types';

export interface CombatActionResult {
  state: RunState;
  events: FloatingText[];
  hitPlayer?: boolean;
  hitEnemyUids?: string[];
  playerBlocked?: boolean;
}

export function shuffleArray<T>(arr: T[]): T[] {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

export function hasRelic(relics: RelicDef[], id: string): boolean {
  return relics.some((r) => r.id === id);
}

export function createNewRun(heroId: HeroClassId, ascension = 0): RunState {
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

function drawCardsIntoHand(combat: CombatState, count: number): CombatState {
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
  const playerStatuses = emptyStatusMap();

  if (hasRelic(state.relics, 'vajra')) playerStatuses.strength += 1;
  if (hasRelic(state.relics, 'smooth_stone')) playerStatuses.dexterity += 1;

  let playerBlock = 0;
  if (hasRelic(state.relics, 'anchor')) playerBlock += 10;

  let maxEnergy = 3;
  if (hasRelic(state.relics, 'runic_capacitor')) maxEnergy += 1;

  let turn1Energy = maxEnergy;
  if (hasRelic(state.relics, 'lantern')) turn1Energy += 1;

  // Innate cards first, then shuffle rest
  const deckClone = state.deck.map((c) => ({ ...c }));
  const innate = deckClone.filter((c) => CARD_DEFS[c.defId]?.innate);
  const others = shuffleArray(deckClone.filter((c) => !CARD_DEFS[c.defId]?.innate));
  const drawPile = [...innate, ...others];

  let combat: CombatState = {
    turn: 1,
    energy: turn1Energy,
    maxEnergy,
    playerBlock,
    playerStatuses,
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
    log: [`进入第 ${floor} 层战斗`],
  };

  let initialDraw = 5;
  if (hasRelic(state.relics, 'ring_of_snake')) initialDraw += 2;
  if (hasRelic(state.relics, 'bag_of_prep')) initialDraw += 2;

  let relicDmgStart = 0;
  // Mercury Hourglass triggers at start of each turn (including turn 1)
  if (hasRelic(state.relics, 'mercury_hourglass')) {
    combat.enemies = combat.enemies.map((e) => {
      const dmg = Math.min(e.hp, 3);
      relicDmgStart += dmg;
      return { ...e, hp: Math.max(0, e.hp - 3) };
    });
    combat.combatDamageDealt = (combat.combatDamageDealt || 0) + relicDmgStart;
    combat.log.push('水银沙漏：对所有敌人造成 3 点伤害。');
  }

  combat = drawCardsIntoHand(combat, initialDraw);

  return {
    ...state,
    phase: 'COMBAT',
    combat,
    stats: {
      ...state.stats,
      blockGained: state.stats.blockGained + playerBlock,
      totalDamageDealt: state.stats.totalDamageDealt + relicDmgStart,
      relicDamageDealt: state.stats.relicDamageDealt + relicDmgStart,
    },
    reward: null,
    shop: null,
    event: null,
    treasure: null,
  };
}

function generateShop(state: RunState): ShopState {
  const pool = getRewardPool(state.heroId);
  const picked = shuffleArray(pool).slice(0, 5);
  const cards = picked.map((def) => {
    const basePrice = def.rarity === 'rare' ? 145 : def.rarity === 'uncommon' ? 75 : 50;
    return {
      card: createCardInstance(def.id, false),
      price: basePrice + Math.floor(Math.random() * 14) - 7,
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
    const relic = rollRelic(nextBase.relics.map((r) => r.id));
    return {
      ...nextBase,
      phase: 'TREASURE',
      treasure: { relic, gold: 55 + Math.floor(Math.random() * 25), opened: false },
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

export function calculateCardDamagePreview(
  card: CardInstance,
  state: RunState,
  targetEnemy?: EnemyInstance
): { perHit: number; hits: number; boosted: boolean; reduced: boolean } {
  const def = CARD_DEFS[card.defId];
  const combat = state.combat;
  if (!def || !combat) return { perHit: 0, hits: 1, boosted: false, reduced: false };

  let base = card.upgraded && def.upgradedDamage !== undefined ? def.upgradedDamage : def.damage || 0;
  if (def.blockAsDamage) {
    base = combat.playerBlock;
  }
  const hits = card.upgraded && def.upgradedHits !== undefined ? def.upgradedHits : def.hits || 1;
  const strMult =
    card.upgraded && def.upgradedStrengthMult !== undefined
      ? def.upgradedStrengthMult
      : def.strengthMult || 1;

  let dmg = base + combat.playerStatuses.strength * strMult;
  if (combat.playerStatuses.weak > 0) dmg = Math.floor(dmg * 0.75);
  if (combat.doubleDamageActive) dmg = dmg * 2;
  if (targetEnemy && targetEnemy.statuses.vulnerable > 0) dmg = Math.floor(dmg * 1.5);
  dmg = Math.max(0, dmg);

  return {
    perHit: dmg,
    hits,
    boosted: dmg > base,
    reduced: dmg < base,
  };
}

export function calculateCardBlockPreview(
  card: CardInstance,
  state: RunState
): { block: number; boosted: boolean; reduced: boolean } {
  const def = CARD_DEFS[card.defId];
  const combat = state.combat;
  if (!def || !combat) return { block: 0, boosted: false, reduced: false };

  const base = card.upgraded && def.upgradedBlock !== undefined ? def.upgradedBlock : def.block || 0;
  if (base <= 0) return { block: 0, boosted: false, reduced: false };

  let blk = base + combat.playerStatuses.dexterity;
  if (combat.playerStatuses.frail > 0) blk = Math.floor(blk * 0.75);
  blk = Math.max(0, blk);

  return { block: blk, boosted: blk > base, reduced: blk < base };
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

function applyDebuffToStatuses(
  statuses: StatusMap,
  key: 'vulnerable' | 'weak' | 'frail' | 'poison',
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

function damageEnemy(
  enemy: EnemyInstance,
  rawDamage: number,
  playerEnvenom: number
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
    hpDamage = rawDamage - block;
    block = 0;
    hp = Math.max(0, hp - hpDamage);
  }

  let statuses = { ...enemy.statuses };
  if (hpDamage > 0 && playerEnvenom > 0) {
    const res = applyDebuffToStatuses(statuses, 'poison', playerEnvenom);
    statuses = res.statuses;
  }

  let asleep = enemy.asleep;
  if (hpDamage > 0 && asleep) {
    asleep = false;
  }

  const updated: EnemyInstance = {
    ...enemy,
    hp,
    block,
    statuses,
    asleep,
  };

  if (asleep === false && enemy.asleep === true && hp > 0) {
    updated.intent = computeEnemyNextIntent(updated, updated.turnCount);
  }

  return { enemy: updated, hpDamage, blocked };
}

function triggerCorpseExplosionIfNeeded(
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
      if (dead.hp <= 0 && dead.statuses.corpseExplosion && !alreadyExploded.has(dead.uid)) {
        alreadyExploded.add(dead.uid);
        changed = true;
        const boomDmg = dead.maxHp;
        updated = updated.map((other) => {
          if (other.uid === dead.uid || other.hp <= 0) return other;
          const res = damageEnemy(other, boomDmg, 0);
          explosionDamage += res.hpDamage;
          events.push({
            id: `${Date.now()}_${Math.random()}`,
            targetUid: other.uid,
            text: `-${boomDmg}`,
            tone: 'poison',
          });
          return res.enemy;
        });
      }
    }
  }
  return { enemies: updated, explosionDamage };
}

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

  // Boss defeated -> Victory!
  let nextHp = state.hp;
  let postHeal = 0;
  if (hasRelic(state.relics, 'burning_blood')) {
    const h = Math.min(6, state.maxHp - nextHp);
    nextHp += h;
    postHeal += h;
  }
  if (hasRelic(state.relics, 'meat_on_bone') && nextHp <= Math.floor(state.maxHp / 2)) {
    const h = Math.min(12, state.maxHp - nextHp);
    nextHp += h;
    postHeal += h;
  }

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
    ? 28 + Math.floor(Math.random() * 12)
    : 12 + Math.floor(Math.random() * 10);

  const reward = {
    gold,
    goldClaimed: false,
    cardChoices: rollCardChoices(state.heroId, 3, combat.isEliteFight),
    cardClaimed: false,
    relic: combat.isEliteFight ? rollRelic(state.relics.map((r) => r.id)) : undefined,
    relicClaimed: false,
    potion: Math.random() < (combat.isEliteFight ? 0.6 : 0.38) ? rollPotion() : undefined,
    potionClaimed: false,
  };

  return {
    state: {
      ...state,
      hp: nextHp,
      phase: 'REWARD',
      combat: null,
      reward,
      stats: nextStats,
    },
    events,
  };
}

export function playCard(
  state: RunState,
  cardUid: string,
  targetEnemyUid?: string
): CombatActionResult {
  const combat = state.combat;
  if (!combat || combat.pendingDiscard || combat.enemyTurnInProgress) {
    return { state, events: [] };
  }

  const cardIdx = combat.hand.findIndex((c) => c.uid === cardUid);
  if (cardIdx === -1) return { state, events: [] };
  const card = combat.hand[cardIdx];
  const def = CARD_DEFS[card.defId];
  if (!def) return { state, events: [] };

  const cost = getCardCost(card);
  if (cost === -2) return { state, events: [] }; // Unplayable
  const actualCost = cost === -1 ? combat.energy : cost;
  if (combat.energy < actualCost) return { state, events: [] };

  const livingEnemies = combat.enemies.filter((e) => e.hp > 0);
  if (def.target === 'enemy') {
    const target = livingEnemies.find((e) => e.uid === targetEnemyUid) || (livingEnemies.length === 1 ? livingEnemies[0] : undefined);
    if (!target) return { state, events: [] };
    targetEnemyUid = target.uid;
  }

  const events: FloatingText[] = [];
  let nextHp = state.hp;
  let nextCombat: CombatState = {
    ...combat,
    energy: combat.energy - actualCost,
    hand: combat.hand.filter((c) => c.uid !== cardUid),
    discardPile: [...combat.discardPile],
    exhaustPile: [...combat.exhaustPile],
    playerStatuses: { ...combat.playerStatuses },
    enemies: combat.enemies.map((e) => ({ ...e, statuses: { ...e.statuses } })),
    cardsPlayedThisTurn: combat.cardsPlayedThisTurn + 1,
    attacksPlayedThisTurn:
      def.type === 'attack' ? combat.attacksPlayedThisTurn + 1 : combat.attacksPlayedThisTurn,
    log: [...combat.log],
  };

  // Pain curse check in remaining hand
  let hpLostThisAction = 0;
  let hpHealedThisAction = 0;
  let blockGainedThisAction = 0;
  let blockedThisAction = 0;
  const painCount = nextCombat.hand.filter((c) => CARD_DEFS[c.defId]?.painCurse).length;
  if (painCount > 0) {
    const loss = Math.min(nextHp, painCount);
    nextHp = Math.max(0, nextHp - painCount);
    hpLostThisAction += loss;
    events.push({ id: `${Date.now()}_pain`, targetUid: 'player', text: `-${painCount} 痛楚`, tone: 'damage' });
  }

  // Self HP loss (Bloodletting / Offering)
  if (def.loseHp) {
    const loss = Math.min(nextHp, def.loseHp);
    nextHp = Math.max(0, nextHp - def.loseHp);
    hpLostThisAction += loss;
    events.push({ id: `${Date.now()}_hp`, targetUid: 'player', text: `-${def.loseHp}`, tone: 'damage' });
  }

  // Gain Energy
  const gainE = card.upgraded && def.upgradedGainEnergy !== undefined ? def.upgradedGainEnergy : def.gainEnergy || 0;
  if (gainE > 0) {
    nextCombat.energy += gainE;
    events.push({ id: `${Date.now()}_eng`, targetUid: 'player', text: `+${gainE} 能量`, tone: 'buff' });
  }

  // Gain Block
  const blkPreview = calculateCardBlockPreview(card, state);
  let playerBlocked = false;
  if (blkPreview.block > 0) {
    nextCombat.playerBlock += blkPreview.block;
    blockGainedThisAction += blkPreview.block;
    playerBlocked = true;
    events.push({ id: `${Date.now()}_blk`, targetUid: 'player', text: `+${blkPreview.block} 格挡`, tone: 'block' });
  }

  // Self Status Gains
  const gainStr = card.upgraded && def.upgradedGainStrength !== undefined ? def.upgradedGainStrength : def.gainStrength || 0;
  if (gainStr > 0) {
    nextCombat.playerStatuses.strength += gainStr;
    events.push({ id: `${Date.now()}_str`, targetUid: 'player', text: `力量 +${gainStr}`, tone: 'buff' });
  }
  const gainDex = card.upgraded && def.upgradedGainDexterity !== undefined ? def.upgradedGainDexterity : def.gainDexterity || 0;
  if (gainDex > 0) {
    nextCombat.playerStatuses.dexterity += gainDex;
    events.push({ id: `${Date.now()}_dex`, targetUid: 'player', text: `敏捷 +${gainDex}`, tone: 'buff' });
  }
  const gainMet = card.upgraded && def.upgradedGainMetallicize !== undefined ? def.upgradedGainMetallicize : def.gainMetallicize || 0;
  if (gainMet > 0) {
    nextCombat.playerStatuses.metallicize += gainMet;
    events.push({ id: `${Date.now()}_met`, targetUid: 'player', text: `金属化 +${gainMet}`, tone: 'buff' });
  }
  const gainArt = card.upgraded && def.upgradedGainArtifact !== undefined ? def.upgradedGainArtifact : def.gainArtifact || 0;
  if (gainArt > 0) {
    nextCombat.playerStatuses.artifact += gainArt;
    events.push({ id: `${Date.now()}_art`, targetUid: 'player', text: `人工制品 +${gainArt}`, tone: 'buff' });
  }
  if (def.gainBlur) nextCombat.playerStatuses.blur += def.gainBlur;
  if (def.barricade) nextCombat.playerStatuses.barricade = true;
  if (def.doubleNextTurn) nextCombat.playerStatuses.doubleDamageNextTurn = true;
  if (def.noMoreDraw) nextCombat.playerStatuses.noDrawThisTurn = true;

  const demon = card.upgraded && def.upgradedDemonForm !== undefined ? def.upgradedDemonForm : def.demonForm || 0;
  if (demon > 0) nextCombat.playerStatuses.demonForm += demon;

  const fumes = card.upgraded && def.upgradedNoxiousFumes !== undefined ? def.upgradedNoxiousFumes : def.noxiousFumes || 0;
  if (fumes > 0) nextCombat.playerStatuses.noxiousFumes += fumes;

  if (def.envenom) nextCombat.playerStatuses.envenom += def.envenom;

  // Gremlin Nob Enrage trigger when playing a Skill card
  if (def.type === 'skill') {
    nextCombat.enemies = nextCombat.enemies.map((e) => {
      if (e.hp > 0 && e.enraged) {
        events.push({ id: `${Date.now()}_nob`, targetUid: e.uid, text: '狂怒: 力量+2', tone: 'buff' });
        return { ...e, statuses: { ...e.statuses, strength: e.statuses.strength + 2 } };
      }
      return e;
    });
  }

  // Damage & Debuffs to Enemies
  let totalDealtThisCard = 0;
  let totalLifesteal = 0;
  const hitEnemyUids: string[] = [];

  const targetIndices =
    def.target === 'all_enemies'
      ? nextCombat.enemies.map((e, idx) => (e.hp > 0 ? idx : -1)).filter((i) => i >= 0)
      : def.target === 'enemy'
      ? [nextCombat.enemies.findIndex((e) => e.uid === targetEnemyUid)].filter((i) => i >= 0)
      : [];

  for (const idx of targetIndices) {
    let enemy = nextCombat.enemies[idx];
    const targetPreview = calculateCardDamagePreview(card, state, enemy);
    const hits = def.cost === -1 ? actualCost : targetPreview.hits;

    if ((def.damage !== undefined || def.blockAsDamage) && hits > 0) {
      hitEnemyUids.push(enemy.uid);
      for (let h = 0; h < hits; h++) {
        if (enemy.hp <= 0) break;
        const dmgRes = damageEnemy(enemy, targetPreview.perHit, nextCombat.playerStatuses.envenom);
        enemy = dmgRes.enemy;
        totalDealtThisCard += dmgRes.hpDamage;
        if (def.lifesteal) totalLifesteal += dmgRes.hpDamage;
        events.push({
          id: `${Date.now()}_d_${idx}_${h}`,
          targetUid: enemy.uid,
          text: dmgRes.blocked ? '格挡' : `-${dmgRes.hpDamage}`,
          tone: dmgRes.blocked ? 'block' : 'damage',
        });

        // Thorns reflection
        if (enemy.statuses.thorns > 0) {
          const thornDmg = enemy.statuses.thorns;
          if (nextCombat.playerBlock >= thornDmg) {
            nextCombat.playerBlock -= thornDmg;
            blockedThisAction += thornDmg;
          } else {
            blockedThisAction += nextCombat.playerBlock;
            const rem = thornDmg - nextCombat.playerBlock;
            nextCombat.playerBlock = 0;
            hpLostThisAction += Math.min(nextHp, rem);
            nextHp = Math.max(0, nextHp - rem);
          }
          events.push({ id: `${Date.now()}_th_${h}`, targetUid: 'player', text: `-${thornDmg} 荆棘`, tone: 'damage' });
        }
      }
    }

    // Boss Phase 2 Awakening at <= 50% HP
    if (enemy.isBoss && !enemy.bossPhase2Triggered && enemy.hp > 0 && enemy.hp <= Math.floor(enemy.maxHp / 2)) {
      enemy.bossPhase2Triggered = true;
      enemy.statuses = {
        ...enemy.statuses,
        strength: enemy.statuses.strength + 2,
        thorns: enemy.statuses.thorns + 2,
      };
      enemy.block += 16;
      nextCombat.log.push('黑曜守望者：熔炉核心超频觉醒！（力量+2、荆棘+2、格挡+16）');
      events.push({
        id: `${Date.now()}_boss_p2`,
        targetUid: enemy.uid,
        text: '二阶段觉醒!',
        tone: 'buff',
      });
    }

    // Apply debuffs if enemy still alive
    if (enemy.hp > 0) {
      const vuln = card.upgraded && def.upgradedApplyVulnerable !== undefined ? def.upgradedApplyVulnerable : def.applyVulnerable || 0;
      if (vuln > 0) {
        const res = applyDebuffToStatuses(enemy.statuses, 'vulnerable', vuln);
        enemy.statuses = res.statuses;
        events.push({
          id: `${Date.now()}_v_${idx}`,
          targetUid: enemy.uid,
          text: res.blockedByArtifact ? '被人工制品抵消' : `易伤 +${vuln}`,
          tone: 'debuff',
        });
      }

      const weak = card.upgraded && def.upgradedApplyWeak !== undefined ? def.upgradedApplyWeak : def.applyWeak || 0;
      if (weak > 0) {
        const res = applyDebuffToStatuses(enemy.statuses, 'weak', weak);
        enemy.statuses = res.statuses;
        events.push({
          id: `${Date.now()}_w_${idx}`,
          targetUid: enemy.uid,
          text: res.blockedByArtifact ? '被人工制品抵消' : `虚弱 +${weak}`,
          tone: 'debuff',
        });
      }

      const poison = card.upgraded && def.upgradedApplyPoison !== undefined ? def.upgradedApplyPoison : def.applyPoison || 0;
      if (poison > 0) {
        const res = applyDebuffToStatuses(enemy.statuses, 'poison', poison);
        enemy.statuses = res.statuses;
        events.push({
          id: `${Date.now()}_p_${idx}`,
          targetUid: enemy.uid,
          text: res.blockedByArtifact ? '被人工制品抵消' : `中毒 +${poison}`,
          tone: 'poison',
        });
      }

      const dblPoison = card.upgraded && def.upgradedDoublePoison !== undefined ? def.upgradedDoublePoison : def.doublePoison || 0;
      if (dblPoison > 0 && enemy.statuses.poison > 0) {
        const added = enemy.statuses.poison * (dblPoison - 1);
        enemy.statuses = { ...enemy.statuses, poison: enemy.statuses.poison * dblPoison };
        events.push({ id: `${Date.now()}_dp_${idx}`, targetUid: enemy.uid, text: `中毒 +${added}`, tone: 'poison' });
      }

      if (def.corpseExplosion) {
        enemy.statuses = { ...enemy.statuses, corpseExplosion: true };
        events.push({ id: `${Date.now()}_ce_${idx}`, targetUid: enemy.uid, text: '尸爆标记', tone: 'poison' });
      }
    }

    nextCombat.enemies[idx] = enemy;
  }

  // Shuriken & Kunai relic triggers after every 3rd attack resolves
  if (def.type === 'attack' && nextCombat.attacksPlayedThisTurn % 3 === 0) {
    if (hasRelic(state.relics, 'shuriken')) {
      nextCombat.playerStatuses.strength += 1;
      events.push({ id: `${Date.now()}_shur`, targetUid: 'player', text: '手里剑: 力量+1', tone: 'buff' });
    }
    if (hasRelic(state.relics, 'kunai')) {
      nextCombat.playerStatuses.dexterity += 1;
      events.push({ id: `${Date.now()}_kuna`, targetUid: 'player', text: '苦无: 敏捷+1', tone: 'buff' });
    }
  }

  // Trigger Corpse Explosion chain if any marked enemy died
  const ceRes = triggerCorpseExplosionIfNeeded(nextCombat.enemies, new Set(), events);
  nextCombat.enemies = ceRes.enemies;

  // Lifesteal heal
  if (totalLifesteal > 0) {
    const healed = Math.min(totalLifesteal, state.maxHp - nextHp);
    nextHp += healed;
    hpHealedThisAction += healed;
    if (healed > 0) {
      events.push({ id: `${Date.now()}_ls`, targetUid: 'player', text: `+${healed} 生命`, tone: 'heal' });
    }
  }

  // Draw cards
  const drawCount = card.upgraded && def.upgradedDraw !== undefined ? def.upgradedDraw : def.draw || 0;
  if (drawCount > 0) {
    nextCombat = drawCardsIntoHand(nextCombat, drawCount);
  }

  // Add Shivs
  const shivCount = card.upgraded && def.upgradedAddShivs !== undefined ? def.upgradedAddShivs : def.addShivs || 0;
  for (let i = 0; i < shivCount; i++) {
    if (nextCombat.hand.length < 10) {
      nextCombat.hand.push(createCardInstance('shiv', false));
    } else {
      nextCombat.discardPile.push(createCardInstance('shiv', false));
    }
  }

  // Apotheosis: upgrade all cards in combat
  if (def.apotheosis) {
    nextCombat.hand = nextCombat.hand.map((c) => ({ ...c, upgraded: true }));
    nextCombat.drawPile = nextCombat.drawPile.map((c) => ({ ...c, upgraded: true }));
    nextCombat.discardPile = nextCombat.discardPile.map((c) => ({ ...c, upgraded: true }));
    events.push({ id: `${Date.now()}_apo`, targetUid: 'player', text: '全牌升华 (+)', tone: 'buff' });
  }

  // Exhaust vs Discard vs Power
  const shouldExhaust = card.upgraded && def.upgradedExhaust !== undefined ? def.upgradedExhaust : def.exhaust;
  if (def.type === 'power') {
    // Powers leave combat cleanly
  } else if (shouldExhaust) {
    nextCombat.exhaustPile.push(card);
  } else {
    nextCombat.discardPile.push(card);
  }

  // Check Pending Discard (Survivor / Acrobatics)
  if (def.discardCount && def.discardCount > 0 && nextCombat.hand.length > 0 && !nextCombat.enemies.every((e) => e.hp <= 0)) {
    nextCombat.pendingDiscard = {
      sourceCardUid: card.uid,
      remaining: Math.min(def.discardCount, nextCombat.hand.length),
    };
  }

  nextCombat.log.push(`打出【${def.name}${card.upgraded ? '+' : ''}】`);
  nextCombat.combatDamageDealt = (nextCombat.combatDamageDealt || 0) + totalDealtThisCard + ceRes.explosionDamage;
  nextCombat.combatDamageBlocked = (nextCombat.combatDamageBlocked || 0) + blockedThisAction;
  nextCombat.combatDamageTaken = (nextCombat.combatDamageTaken || 0) + hpLostThisAction;

  const prevCardStat = state.stats.damageByCard[def.id] || {
    defId: def.id,
    name: def.name,
    damage: 0,
    plays: 0,
  };
  const updatedCardStats = {
    ...state.stats.damageByCard,
    [def.id]: {
      ...prevCardStat,
      damage: prevCardStat.damage + totalDealtThisCard,
      plays: prevCardStat.plays + 1,
    },
  };

  const nextCardsByType = {
    attack: state.stats.cardsByType.attack + (def.type === 'attack' ? 1 : 0),
    skill: state.stats.cardsByType.skill + (def.type === 'skill' ? 1 : 0),
    power: state.stats.cardsByType.power + (def.type === 'power' ? 1 : 0),
  };

  const nextStats = {
    ...state.stats,
    cardsPlayed: state.stats.cardsPlayed + 1,
    totalDamageDealt: state.stats.totalDamageDealt + totalDealtThisCard + ceRes.explosionDamage,
    attackDamageDealt: state.stats.attackDamageDealt + totalDealtThisCard,
    poisonDamageDealt: state.stats.poisonDamageDealt + ceRes.explosionDamage,
    blockGained: state.stats.blockGained + blockGainedThisAction,
    damageBlocked: state.stats.damageBlocked + blockedThisAction,
    hpLost: state.stats.hpLost + hpLostThisAction,
    hpHealed: state.stats.hpHealed + hpHealedThisAction,
    cardsByType: nextCardsByType,
    damageByCard: updatedCardStats,
  };

  // Check Player Death (from Bloodletting / Offering / Thorns / Pain)
  if (nextHp <= 0) {
    return {
      state: {
        ...state,
        hp: 0,
        phase: 'DEFEAT',
        combat: null,
        stats: nextStats,
      },
      events,
      hitEnemyUids,
      playerBlocked,
    };
  }

  const updatedState: RunState = {
    ...state,
    hp: nextHp,
    stats: nextStats,
  };

  const result = finalizeCombatIfWon(updatedState, nextCombat, events);
  return {
    ...result,
    hitEnemyUids,
    playerBlocked,
  };
}

export function discardSelectedCard(state: RunState, cardUid: string): RunState {
  const combat = state.combat;
  if (!combat || !combat.pendingDiscard) return state;

  const idx = combat.hand.findIndex((c) => c.uid === cardUid);
  if (idx === -1) return state;

  const card = combat.hand[idx];
  const newHand = combat.hand.filter((c) => c.uid !== cardUid);
  const newDiscard = [...combat.discardPile, card];
  const remaining = combat.pendingDiscard.remaining - 1;

  return {
    ...state,
    combat: {
      ...combat,
      hand: newHand,
      discardPile: newDiscard,
      pendingDiscard: remaining > 0 && newHand.length > 0 ? { ...combat.pendingDiscard, remaining } : undefined,
    },
  };
}

export function usePotion(
  state: RunState,
  slotIndex: number,
  targetEnemyUid?: string
): CombatActionResult {
  const potion = state.potions[slotIndex];
  if (!potion) return { state, events: [] };

  const nextPotions = [...state.potions];
  const events: FloatingText[] = [];

  let potionDmg = 0;
  let potionBlock = 0;

  if (potion.id === 'heal_potion') {
    const healed = Math.min(15, state.maxHp - state.hp);
    nextPotions[slotIndex] = null;
    events.push({ id: `${Date.now()}_hp_pot`, targetUid: 'player', text: `+${healed} 生命`, tone: 'heal' });
    return {
      state: {
        ...state,
        hp: state.hp + healed,
        potions: nextPotions,
        stats: { ...state.stats, hpHealed: state.stats.hpHealed + healed },
      },
      events,
    };
  }

  const combat = state.combat;
  if (!combat || combat.enemyTurnInProgress) return { state, events: [] };

  let nextCombat: CombatState = {
    ...combat,
    playerStatuses: { ...combat.playerStatuses },
    enemies: combat.enemies.map((e) => ({ ...e, statuses: { ...e.statuses } })),
    log: [...combat.log],
  };

  if (potion.target === 'enemy') {
    const living = nextCombat.enemies.filter((e) => e.hp > 0);
    const target = living.find((e) => e.uid === targetEnemyUid) || living[0];
    if (!target) return { state, events: [] };
    const idx = nextCombat.enemies.findIndex((e) => e.uid === target.uid);

    if (potion.id === 'fire_potion') {
      const dmgRes = damageEnemy(target, 20, 0);
      potionDmg += dmgRes.hpDamage;
      nextCombat.enemies[idx] = dmgRes.enemy;
      events.push({ id: `${Date.now()}_fp`, targetUid: target.uid, text: `-${dmgRes.hpDamage}`, tone: 'damage' });
      const ceRes = triggerCorpseExplosionIfNeeded(nextCombat.enemies, new Set(), events);
      nextCombat.enemies = ceRes.enemies;
      potionDmg += ceRes.explosionDamage;
    } else if (potion.id === 'poison_potion') {
      const res = applyDebuffToStatuses(target.statuses, 'poison', 6);
      nextCombat.enemies[idx] = { ...target, statuses: res.statuses };
      events.push({
        id: `${Date.now()}_pp`,
        targetUid: target.uid,
        text: res.blockedByArtifact ? '被人工制品抵消' : '中毒 +6',
        tone: 'poison',
      });
    }
  } else {
    if (potion.id === 'block_potion') {
      nextCombat.playerBlock += 12;
      potionBlock += 12;
      events.push({ id: `${Date.now()}_bp`, targetUid: 'player', text: '+12 格挡', tone: 'block' });
    } else if (potion.id === 'strength_potion') {
      nextCombat.playerStatuses.strength += 2;
      events.push({ id: `${Date.now()}_sp`, targetUid: 'player', text: '力量 +2', tone: 'buff' });
    } else if (potion.id === 'energy_potion') {
      nextCombat.energy += 2;
      events.push({ id: `${Date.now()}_ep`, targetUid: 'player', text: '+2 能量', tone: 'buff' });
    } else if (potion.id === 'swift_potion') {
      nextCombat = drawCardsIntoHand(nextCombat, 3);
      events.push({ id: `${Date.now()}_swp`, targetUid: 'player', text: '抽 3 张牌', tone: 'buff' });
    }
  }

  nextPotions[slotIndex] = null;
  nextCombat.combatDamageDealt = (nextCombat.combatDamageDealt || 0) + potionDmg;
  nextCombat.log.push(`使用了药水【${potion.name}】`);
  const nextState: RunState = {
    ...state,
    potions: nextPotions,
    stats: {
      ...state.stats,
      totalDamageDealt: state.stats.totalDamageDealt + potionDmg,
      relicDamageDealt: state.stats.relicDamageDealt + potionDmg,
      blockGained: state.stats.blockGained + potionBlock,
    },
  };
  return finalizeCombatIfWon(nextState, nextCombat, events);
}

export function resolveEnemyTurn(state: RunState): CombatActionResult {
  const combat = state.combat;
  if (!combat) return { state, events: [] };

  const events: FloatingText[] = [];
  let nextHp = state.hp;
  let nextCombat: CombatState = {
    ...combat,
    playerStatuses: { ...combat.playerStatuses },
    hand: [...combat.hand],
    discardPile: [...combat.discardPile],
    exhaustPile: [...combat.exhaustPile],
    drawPile: [...combat.drawPile],
    enemies: combat.enemies.map((e) => ({ ...e, statuses: { ...e.statuses } })),
    log: [...combat.log],
  };

  let poisonDmgTurn = 0;
  let relicDmgTurn = 0;
  let blockGainedTurn = 0;
  let damageBlockedTurn = 0;
  let hpLostTurn = 0;

  // 1. End-of-player-turn effects: Burn damage from hand
  const burnCount = nextCombat.hand.filter((c) => CARD_DEFS[c.defId]?.endTurnBurn).length;
  if (burnCount > 0) {
    const burnDmg = burnCount * 2;
    if (nextCombat.playerBlock >= burnDmg) {
      nextCombat.playerBlock -= burnDmg;
      damageBlockedTurn += burnDmg;
    } else {
      damageBlockedTurn += nextCombat.playerBlock;
      const rem = burnDmg - nextCombat.playerBlock;
      nextCombat.playerBlock = 0;
      hpLostTurn += Math.min(nextHp, rem);
      nextHp = Math.max(0, nextHp - rem);
    }
    events.push({ id: `${Date.now()}_burn`, targetUid: 'player', text: `-${burnDmg} 灼伤`, tone: 'damage' });
  }

  // Orichalcum relic & Metallicize power
  if (hasRelic(state.relics, 'orichalcum') && nextCombat.playerBlock === 0) {
    nextCombat.playerBlock += 6;
    blockGainedTurn += 6;
    events.push({ id: `${Date.now()}_ori`, targetUid: 'player', text: '+6 奥利哈刚', tone: 'block' });
  }
  if (nextCombat.playerStatuses.metallicize > 0) {
    nextCombat.playerBlock += nextCombat.playerStatuses.metallicize;
    blockGainedTurn += nextCombat.playerStatuses.metallicize;
    events.push({
      id: `${Date.now()}_met_end`,
      targetUid: 'player',
      text: `+${nextCombat.playerStatuses.metallicize} 格挡`,
      tone: 'block',
    });
  }

  // Discard hand (Ethereal cards exhaust)
  for (const card of nextCombat.hand) {
    if (CARD_DEFS[card.defId]?.ethereal) {
      nextCombat.exhaustPile.push(card);
    } else {
      nextCombat.discardPile.push(card);
    }
  }
  nextCombat.hand = [];
  nextCombat.pendingDiscard = undefined;

  if (nextHp <= 0) {
    return {
      state: {
        ...state,
        hp: 0,
        phase: 'DEFEAT',
        combat: null,
        stats: {
          ...state.stats,
          blockGained: state.stats.blockGained + blockGainedTurn,
          damageBlocked: state.stats.damageBlocked + damageBlockedTurn,
          hpLost: state.stats.hpLost + hpLostTurn,
        },
      },
      events,
      hitPlayer: true,
    };
  }

  // 2. Enemy Turn Execution
  let hitPlayer = false;
  const explodedSet = new Set<string>();

  for (let i = 0; i < nextCombat.enemies.length; i++) {
    let enemy = nextCombat.enemies[i];
    if (enemy.hp <= 0) continue;

    // Poison ticks at start of enemy turn (ignores block!)
    if (enemy.statuses.poison > 0) {
      const pDmg = Math.min(enemy.hp, enemy.statuses.poison);
      poisonDmgTurn += pDmg;
      enemy.hp = Math.max(0, enemy.hp - pDmg);
      enemy.statuses.poison = Math.max(0, enemy.statuses.poison - 1);
      events.push({ id: `${Date.now()}_pt_${i}`, targetUid: enemy.uid, text: `-${pDmg} 毒`, tone: 'poison' });
      if (enemy.hp <= 0) {
        nextCombat.enemies[i] = enemy;
        const ceRes = triggerCorpseExplosionIfNeeded(nextCombat.enemies, explodedSet, events);
        nextCombat.enemies = ceRes.enemies;
        poisonDmgTurn += ceRes.explosionDamage;
        continue;
      }
    }

    // Enemy clears previous block (unless asleep) and applies Metallicize
    if (!enemy.asleep) {
      enemy.block = 0;
    }
    if (enemy.statuses.metallicize > 0) {
      enemy.block += enemy.statuses.metallicize;
    }

    const intent = enemy.intent;

    // Attack
    if (intent.damage !== undefined && intent.damage > 0) {
      const preview = calculateEnemyAttackPreview(enemy, { ...state, combat: nextCombat });
      for (let h = 0; h < preview.hits; h++) {
        if (nextHp <= 0) break;
        const raw = preview.perHit;
        if (nextCombat.playerBlock >= raw) {
          nextCombat.playerBlock -= raw;
          damageBlockedTurn += raw;
          events.push({ id: `${Date.now()}_eb_${i}_${h}`, targetUid: 'player', text: '格挡', tone: 'block' });
        } else {
          damageBlockedTurn += nextCombat.playerBlock;
          const hpDmg = raw - nextCombat.playerBlock;
          nextCombat.playerBlock = 0;
          hpLostTurn += Math.min(nextHp, hpDmg);
          nextHp = Math.max(0, nextHp - hpDmg);
          hitPlayer = true;
          events.push({ id: `${Date.now()}_eh_${i}_${h}`, targetUid: 'player', text: `-${hpDmg}`, tone: 'damage' });
        }
      }
    }

    // Enemy Block
    if (intent.block) {
      enemy.block += intent.block;
      events.push({ id: `${Date.now()}_eblk_${i}`, targetUid: enemy.uid, text: `+${intent.block} 格挡`, tone: 'block' });
    }

    // Enemy Buffs
    if (intent.gainStrength) {
      enemy.statuses.strength += intent.gainStrength;
      events.push({ id: `${Date.now()}_estr_${i}`, targetUid: enemy.uid, text: `力量 +${intent.gainStrength}`, tone: 'buff' });
    }
    if (intent.gainRitual) {
      enemy.statuses.ritual += intent.gainRitual;
      events.push({ id: `${Date.now()}_erit_${i}`, targetUid: enemy.uid, text: `仪式 +${intent.gainRitual}`, tone: 'buff' });
    }
    if (intent.gainMetallicize) {
      enemy.statuses.metallicize += intent.gainMetallicize;
      enemy.block += intent.gainMetallicize;
    }

    // Enemy Debuffs on Player
    if (intent.applyVulnerable) {
      const res = applyDebuffToStatuses(nextCombat.playerStatuses, 'vulnerable', intent.applyVulnerable);
      nextCombat.playerStatuses = res.statuses;
      events.push({
        id: `${Date.now()}_pv_${i}`,
        targetUid: 'player',
        text: res.blockedByArtifact ? '被人工制品抵消' : `易伤 +${intent.applyVulnerable}`,
        tone: 'debuff',
      });
    }
    if (intent.applyWeak) {
      const res = applyDebuffToStatuses(nextCombat.playerStatuses, 'weak', intent.applyWeak);
      nextCombat.playerStatuses = res.statuses;
      events.push({
        id: `${Date.now()}_pw_${i}`,
        targetUid: 'player',
        text: res.blockedByArtifact ? '被人工制品抵消' : `虚弱 +${intent.applyWeak}`,
        tone: 'debuff',
      });
    }
    if (intent.applyFrail) {
      const res = applyDebuffToStatuses(nextCombat.playerStatuses, 'frail', intent.applyFrail);
      nextCombat.playerStatuses = res.statuses;
      events.push({
        id: `${Date.now()}_pf_${i}`,
        targetUid: 'player',
        text: res.blockedByArtifact ? '被人工制品抵消' : `脆弱 +${intent.applyFrail}`,
        tone: 'debuff',
      });
    }
    if (intent.addStatusCardId && intent.addStatusCount) {
      for (let k = 0; k < intent.addStatusCount; k++) {
        nextCombat.discardPile.push(createCardInstance(intent.addStatusCardId, false));
      }
      const cardName = CARD_DEFS[intent.addStatusCardId]?.name || '状态牌';
      events.push({
        id: `${Date.now()}_sc_${i}`,
        targetUid: 'player',
        text: `弃牌堆 +${intent.addStatusCount} ${cardName}`,
        tone: 'debuff',
      });
    }

    // End of enemy turn: Ritual grants Strength, decrement enemy Vulnerable/Weak
    if (enemy.statuses.ritual > 0) {
      enemy.statuses.strength += enemy.statuses.ritual;
    }
    if (enemy.statuses.vulnerable > 0) enemy.statuses.vulnerable -= 1;
    if (enemy.statuses.weak > 0) enemy.statuses.weak -= 1;

    // Advance enemy turn counter & wake up Lagavulin on Turn 3
    enemy.turnCount += 1;
    if (enemy.defId === 'lagavulin' && enemy.turnCount >= 3) {
      enemy.asleep = false;
    }
    enemy.intent = computeEnemyNextIntent(enemy, enemy.turnCount);
    nextCombat.enemies[i] = enemy;
  }

  nextCombat.combatDamageDealt = (nextCombat.combatDamageDealt || 0) + poisonDmgTurn;
  nextCombat.combatDamageBlocked = (nextCombat.combatDamageBlocked || 0) + damageBlockedTurn;
  nextCombat.combatDamageTaken = (nextCombat.combatDamageTaken || 0) + hpLostTurn;

  const midStats = {
    ...state.stats,
    totalDamageDealt: state.stats.totalDamageDealt + poisonDmgTurn,
    poisonDamageDealt: state.stats.poisonDamageDealt + poisonDmgTurn,
    blockGained: state.stats.blockGained + blockGainedTurn,
    damageBlocked: state.stats.damageBlocked + damageBlockedTurn,
    hpLost: state.stats.hpLost + hpLostTurn,
  };

  // Check if enemies died from Poison or Corpse Explosion
  const wonCheck = finalizeCombatIfWon({ ...state, hp: nextHp, stats: midStats }, nextCombat, events);
  if (wonCheck.state.phase !== 'COMBAT') {
    return { ...wonCheck, hitPlayer };
  }

  if (nextHp <= 0) {
    return {
      state: { ...state, hp: 0, phase: 'DEFEAT', combat: null, stats: midStats },
      events,
      hitPlayer: true,
    };
  }

  // 3. Start of Player's Next Turn
  nextCombat = wonCheck.state.combat!;
  nextCombat.turn += 1;
  nextCombat.energy = nextCombat.maxEnergy;
  nextCombat.attacksPlayedThisTurn = 0;
  nextCombat.cardsPlayedThisTurn = 0;
  nextCombat.playerStatuses.noDrawThisTurn = false;

  // Player Block preservation check (Barricade or Blur)
  if (!nextCombat.playerStatuses.barricade) {
    if (nextCombat.playerStatuses.blur > 0) {
      nextCombat.playerStatuses.blur -= 1;
    } else {
      nextCombat.playerBlock = 0;
    }
  }

  let turnStartBlock = 0;
  // Horn Cleat relic on Turn 2
  if (nextCombat.turn === 2 && hasRelic(state.relics, 'horn_cleat')) {
    nextCombat.playerBlock += 14;
    turnStartBlock += 14;
    events.push({ id: `${Date.now()}_hc`, targetUid: 'player', text: '+14 羊角格挡', tone: 'block' });
  }

  // Phantasmal Killer double damage activation
  if (nextCombat.playerStatuses.doubleDamageNextTurn) {
    nextCombat.doubleDamageActive = true;
    nextCombat.playerStatuses.doubleDamageNextTurn = false;
    events.push({ id: `${Date.now()}_pk`, targetUid: 'player', text: '幻影绝杀: 伤害翻倍!', tone: 'buff' });
  } else {
    nextCombat.doubleDamageActive = false;
  }

  // Demon Form & Noxious Fumes & Mercury Hourglass
  if (nextCombat.playerStatuses.demonForm > 0) {
    nextCombat.playerStatuses.strength += nextCombat.playerStatuses.demonForm;
    events.push({
      id: `${Date.now()}_df`,
      targetUid: 'player',
      text: `恶魔化身: 力量+${nextCombat.playerStatuses.demonForm}`,
      tone: 'buff',
    });
  }
  if (nextCombat.playerStatuses.noxiousFumes > 0) {
    const nf = nextCombat.playerStatuses.noxiousFumes;
    nextCombat.enemies = nextCombat.enemies.map((e) => {
      if (e.hp <= 0) return e;
      const res = applyDebuffToStatuses(e.statuses, 'poison', nf);
      events.push({
        id: `${Date.now()}_nf_${e.uid}`,
        targetUid: e.uid,
        text: res.blockedByArtifact ? '人工制品抵消' : `中毒 +${nf}`,
        tone: 'poison',
      });
      return { ...e, statuses: res.statuses };
    });
  }
  if (hasRelic(state.relics, 'mercury_hourglass')) {
    nextCombat.enemies = nextCombat.enemies.map((e) => {
      if (e.hp <= 0) return e;
      const d = Math.min(e.hp, 3);
      relicDmgTurn += d;
      return { ...e, hp: Math.max(0, e.hp - 3) };
    });
    const ceRelic = triggerCorpseExplosionIfNeeded(nextCombat.enemies, explodedSet, events);
    nextCombat.enemies = ceRelic.enemies;
    relicDmgTurn += ceRelic.explosionDamage;
  }

  // Decrement player debuffs
  if (nextCombat.playerStatuses.vulnerable > 0) nextCombat.playerStatuses.vulnerable -= 1;
  if (nextCombat.playerStatuses.weak > 0) nextCombat.playerStatuses.weak -= 1;
  if (nextCombat.playerStatuses.frail > 0) nextCombat.playerStatuses.frail -= 1;

  // Draw 5 cards
  nextCombat = drawCardsIntoHand(nextCombat, 5);
  nextCombat.combatDamageDealt = (nextCombat.combatDamageDealt || 0) + relicDmgTurn;

  const endStats = {
    ...midStats,
    totalDamageDealt: midStats.totalDamageDealt + relicDmgTurn,
    relicDamageDealt: midStats.relicDamageDealt + relicDmgTurn,
    blockGained: midStats.blockGained + turnStartBlock,
  };

  // Check if Mercury Hourglass killed remaining enemies
  const finalCheck = finalizeCombatIfWon({ ...state, hp: nextHp, stats: endStats }, nextCombat, events);
  return {
    ...finalCheck,
    hitPlayer,
  };
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
