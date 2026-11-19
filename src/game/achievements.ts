import { Locale } from './i18n';
import { RunState } from './types';

export type AchievementTier = 'bronze' | 'silver' | 'gold' | 'mythic';

export interface AchievementDef {
  id: string;
  tier: AchievementTier;
  iconKey:
    | 'swords'
    | 'skull'
    | 'crown'
    | 'shield'
    | 'flame'
    | 'droplet'
    | 'zap'
    | 'gem'
    | 'layers'
    | 'flask'
    | 'trophy'
    | 'star';
  name: string;
  nameEn: string;
  description: string;
  descriptionEn: string;
}

export interface MetaProgress {
  unlocked: Record<string, string>; // id -> ISO date string
  discoveredCardIds: string[];
  totalRuns: number;
  totalVictories: number;
  ironwardenVictories: number;
  shadowweaverVictories: number;
  ascension2Victories: number;
  totalEnemiesDefeated: number;
  totalElitesDefeated: number;
  totalDamageDealt: number;
  maxSingleHit: number;
  maxBlockReached: number;
  maxPoisonStacked: number;
}

const META_STORAGE_KEY = 'spire_ashes_meta_v1';

export const ACHIEVEMENTS: AchievementDef[] = [
  {
    id: 'first_blood',
    tier: 'bronze',
    iconKey: 'swords',
    name: '初试锋芒',
    nameEn: 'First Blood',
    description: '在烬塔中击败第 1 名敌人。',
    descriptionEn: 'Defeat your first enemy inside the Spire.',
  },
  {
    id: 'veteran_climber',
    tier: 'silver',
    iconKey: 'skull',
    name: '百战攀登者',
    nameEn: 'Veteran Climber',
    description: '累计在攀塔过程中击败 25 名敌人。',
    descriptionEn: 'Defeat 25 enemies across all climbs.',
  },
  {
    id: 'elite_hunter',
    tier: 'silver',
    iconKey: 'flame',
    name: '精英猎手',
    nameEn: 'Elite Hunter',
    description: '累计击败 3 名高塔精英守卫。',
    descriptionEn: 'Defeat 3 Elite enemies across your runs.',
  },
  {
    id: 'spire_conqueror',
    tier: 'gold',
    iconKey: 'crown',
    name: '烬塔征服者',
    nameEn: 'Spire Conqueror',
    description: '攀登至第 15 层并击败黑曜守望者。',
    descriptionEn: 'Defeat the Obsidian Warden on Floor 15.',
  },
  {
    id: 'iron_champion',
    tier: 'gold',
    iconKey: 'shield',
    name: '赤铁战魂',
    nameEn: 'Iron Champion',
    description: '使用【赤铁卫士】通关烬塔。',
    descriptionEn: 'Win a complete run as the Ironwarden.',
  },
  {
    id: 'shadow_champion',
    tier: 'gold',
    iconKey: 'droplet',
    name: '幽影宗师',
    nameEn: 'Shadow Master',
    description: '使用【暗影织者】通关烬塔。',
    descriptionEn: 'Win a complete run as the Shadowweaver.',
  },
  {
    id: 'ascension_master',
    tier: 'mythic',
    iconKey: 'trophy',
    name: '狂暴试炼者',
    nameEn: 'Ascendant',
    description: '在进阶 2（塔主狂暴）难度下征服烬塔。',
    descriptionEn: 'Conquer the Spire on Ascension 2 difficulty.',
  },
  {
    id: 'untouchable',
    tier: 'silver',
    iconKey: 'shield',
    name: '金钟铁壁',
    nameEn: 'Iron Bastion',
    description: '在战斗中使自身当前格挡达到 40 点或以上。',
    descriptionEn: 'Reach 40 or more active Block during combat.',
  },
  {
    id: 'poison_lord',
    tier: 'silver',
    iconKey: 'droplet',
    name: '万毒之源',
    nameEn: 'Plague Sovereign',
    description: '在单个敌人身上同时叠加 20 层及以上中毒。',
    descriptionEn: 'Stack 20 or more Poison on a single enemy.',
  },
  {
    id: 'heavy_hitter',
    tier: 'silver',
    iconKey: 'zap',
    name: '摧枯拉朽',
    nameEn: 'Crushing Blow',
    description: '单次出牌或效果造成 35 点及以上伤害。',
    descriptionEn: 'Deal 35 or more damage in a single action.',
  },
  {
    id: 'combo_tempo',
    tier: 'bronze',
    iconKey: 'star',
    name: '疾风连打',
    nameEn: 'Flurry Tempo',
    description: '在单个回合内打出 6 张或以上卡牌。',
    descriptionEn: 'Play 6 or more cards in a single turn.',
  },
  {
    id: 'relic_collector',
    tier: 'silver',
    iconKey: 'gem',
    name: '秘宝行者',
    nameEn: 'Relic Collector',
    description: '单局冒险同时持有 5 件及以上遗物。',
    descriptionEn: 'Hold 5 or more Relics simultaneously in one run.',
  },
  {
    id: 'potion_alchemist',
    tier: 'bronze',
    iconKey: 'flask',
    name: '炼金学徒',
    nameEn: 'Alchemist',
    description: '同时将腰带上的 3 个药水栏位全部装满。',
    descriptionEn: 'Fill all 3 Potion slots at the same time.',
  },
  {
    id: 'minimalist_deck',
    tier: 'mythic',
    iconKey: 'layers',
    name: '极简主义',
    nameEn: 'Minimalist',
    description: '在牌组总数不超过 14 张的情况下通关烬塔。',
    descriptionEn: 'Win a run with a lean deck of 14 cards or fewer.',
  },
];

export function createEmptyMeta(): MetaProgress {
  return {
    unlocked: {},
    discoveredCardIds: [
      'iron_strike',
      'iron_defend',
      'bash',
      'shadow_strike',
      'shadow_defend',
      'neutralize',
      'survivor',
    ],
    totalRuns: 0,
    totalVictories: 0,
    ironwardenVictories: 0,
    shadowweaverVictories: 0,
    ascension2Victories: 0,
    totalEnemiesDefeated: 0,
    totalElitesDefeated: 0,
    totalDamageDealt: 0,
    maxSingleHit: 0,
    maxBlockReached: 0,
    maxPoisonStacked: 0,
  };
}

export function loadMetaProgress(): MetaProgress {
  const base = createEmptyMeta();
  try {
    const raw = localStorage.getItem(META_STORAGE_KEY);
    if (!raw) return base;
    const parsed = JSON.parse(raw) as Partial<MetaProgress>;
    return {
      ...base,
      ...parsed,
      unlocked: { ...(parsed.unlocked || {}) },
      discoveredCardIds: Array.from(
        new Set([...base.discoveredCardIds, ...(parsed.discoveredCardIds || [])])
      ),
    };
  } catch {
    return base;
  }
}

export function saveMetaProgress(meta: MetaProgress): void {
  try {
    localStorage.setItem(META_STORAGE_KEY, JSON.stringify(meta));
  } catch {
    // ignore storage quota errors
  }
}

export interface AchievementEvalContext {
  actionDamage?: number;
  enemiesDefeatedDelta?: number;
  elitesDefeatedDelta?: number;
  damageDelta?: number;
  isNewVictory?: boolean;
  isNewRunStart?: boolean;
}

export function evaluateAchievements(
  meta: MetaProgress,
  run: RunState | null,
  ctx: AchievementEvalContext = {}
): { nextMeta: MetaProgress; newlyUnlocked: AchievementDef[] } {
  const nextMeta: MetaProgress = {
    ...meta,
    unlocked: { ...meta.unlocked },
    discoveredCardIds: [...meta.discoveredCardIds],
  };

  if (ctx.isNewRunStart) {
    nextMeta.totalRuns += 1;
  }
  if (ctx.enemiesDefeatedDelta && ctx.enemiesDefeatedDelta > 0) {
    nextMeta.totalEnemiesDefeated += ctx.enemiesDefeatedDelta;
  }
  if (ctx.elitesDefeatedDelta && ctx.elitesDefeatedDelta > 0) {
    nextMeta.totalElitesDefeated += ctx.elitesDefeatedDelta;
  }
  if (ctx.damageDelta && ctx.damageDelta > 0) {
    nextMeta.totalDamageDealt += ctx.damageDelta;
  }
  if (ctx.actionDamage && ctx.actionDamage > nextMeta.maxSingleHit) {
    nextMeta.maxSingleHit = ctx.actionDamage;
  }

  if (run) {
    // Discover all cards currently in deck, hand, reward choices, or shop
    const seenSet = new Set(nextMeta.discoveredCardIds);
    run.deck.forEach((c) => seenSet.add(c.defId));
    run.combat?.hand.forEach((c) => seenSet.add(c.defId));
    run.combat?.drawPile.forEach((c) => seenSet.add(c.defId));
    run.combat?.discardPile.forEach((c) => seenSet.add(c.defId));
    run.reward?.cardChoices.forEach((c) => seenSet.add(c.defId));
    run.shop?.cards.forEach((c) => seenSet.add(c.card.defId));
    nextMeta.discoveredCardIds = Array.from(seenSet);

    if (run.combat) {
      if (run.combat.playerBlock > nextMeta.maxBlockReached) {
        nextMeta.maxBlockReached = run.combat.playerBlock;
      }
      for (const e of run.combat.enemies) {
        if (e.statuses.poison > nextMeta.maxPoisonStacked) {
          nextMeta.maxPoisonStacked = e.statuses.poison;
        }
      }
    }

    if (ctx.isNewVictory && run.phase === 'VICTORY') {
      nextMeta.totalVictories += 1;
      if (run.heroId === 'ironwarden') nextMeta.ironwardenVictories += 1;
      if (run.heroId === 'shadowweaver') nextMeta.shadowweaverVictories += 1;
      if (run.ascension >= 2) nextMeta.ascension2Victories += 1;
    }
  }

  const nowIso = new Date().toISOString();
  const newlyUnlocked: AchievementDef[] = [];

  const grant = (id: string, condition: boolean) => {
    if (!condition || nextMeta.unlocked[id]) return;
    const def = ACHIEVEMENTS.find((a) => a.id === id);
    if (def) {
      nextMeta.unlocked[id] = nowIso;
      newlyUnlocked.push(def);
    }
  };

  grant('first_blood', nextMeta.totalEnemiesDefeated >= 1 || (run?.stats.enemiesDefeated || 0) >= 1);
  grant('veteran_climber', nextMeta.totalEnemiesDefeated >= 25);
  grant('elite_hunter', nextMeta.totalElitesDefeated >= 3 || (run?.stats.elitesDefeated || 0) >= 3);
  grant('spire_conqueror', nextMeta.totalVictories >= 1 || run?.phase === 'VICTORY');
  grant(
    'iron_champion',
    nextMeta.ironwardenVictories >= 1 || (run?.phase === 'VICTORY' && run.heroId === 'ironwarden')
  );
  grant(
    'shadow_champion',
    nextMeta.shadowweaverVictories >= 1 ||
      (run?.phase === 'VICTORY' && run.heroId === 'shadowweaver')
  );
  grant(
    'ascension_master',
    nextMeta.ascension2Victories >= 1 || (run?.phase === 'VICTORY' && run.ascension >= 2)
  );
  grant('untouchable', (run?.combat?.playerBlock || 0) >= 40 || nextMeta.maxBlockReached >= 40);
  grant(
    'poison_lord',
    Boolean(run?.combat?.enemies.some((e) => e.statuses.poison >= 20)) ||
      nextMeta.maxPoisonStacked >= 20
  );
  grant('heavy_hitter', (ctx.actionDamage || 0) >= 35 || nextMeta.maxSingleHit >= 35);
  grant('combo_tempo', (run?.combat?.cardsPlayedThisTurn || 0) >= 6);
  grant('relic_collector', (run?.relics.length || 0) >= 5);
  grant('potion_alchemist', Boolean(run && run.potions.every((p) => p !== null)));
  grant('minimalist_deck', Boolean(run?.phase === 'VICTORY' && run.deck.length <= 14));

  return { nextMeta, newlyUnlocked };
}

export function tAchievement(def: AchievementDef, locale: Locale) {
  return {
    name: locale === 'zh' ? def.name : def.nameEn,
    description: locale === 'zh' ? def.description : def.descriptionEn,
  };
}
