import { createSeededRng, getTodayDateKey } from './rng';
import { DailyModifierId, HeroClassId } from './types';
import { Locale } from './i18n';

export interface DailyModifierDef {
  id: DailyModifierId;
  name: string;
  nameEn: string;
  desc: string;
  descEn: string;
  tone: 'buff' | 'tradeoff' | 'challenge';
}

export const DAILY_MODIFIERS: Record<DailyModifierId, DailyModifierDef> = {
  golden_blessing: {
    id: 'golden_blessing',
    name: '高塔金库',
    nameEn: 'Gilded Start',
    desc: '初始额外获得 100 金币。',
    descEn: 'Start the climb with +100 Gold.',
    tone: 'buff',
  },
  ember_forge: {
    id: 'ember_forge',
    name: '余烬淬火',
    nameEn: 'Ember Forged',
    desc: '开局随机升级牌组中的 2 张卡牌。',
    descEn: 'Upgrade 2 random starter cards on embark.',
    tone: 'buff',
  },
  iron_vanguard: {
    id: 'iron_vanguard',
    name: '先手铁壁',
    nameEn: 'Iron Vanguard',
    desc: '每场战斗第 1 回合开始时获得 8 点格挡。',
    descEn: 'Gain 8 Block on Turn 1 of every combat.',
    tone: 'buff',
  },
  fragile_fury: {
    id: 'fragile_fury',
    name: '狂热献祭',
    nameEn: 'Glass Fury',
    desc: '战斗开始时获得 2 点力量，但初始最大生命减少 12。',
    descEn: 'Start combat with +2 Strength, but -12 Max HP.',
    tone: 'tradeoff',
  },
  rare_draft: {
    id: 'rare_draft',
    name: '先发秘术',
    nameEn: 'Arcane Draft',
    desc: '开局额外携带 1 张随机罕见职业卡牌。',
    descEn: 'Start with 1 bonus Uncommon class card.',
    tone: 'buff',
  },
  elite_swarm: {
    id: 'elite_swarm',
    name: '险峻试炼',
    nameEn: 'Trial of Elites',
    desc: '精英战斗额外掉落 25 金币，且通关日常评分 +120。',
    descEn: 'Elites drop +25 bonus Gold; victory grants +120 Daily Score.',
    tone: 'challenge',
  },
};

export interface DailyChallengeInfo {
  dateKey: string;
  seed: string;
  heroId: HeroClassId;
  modifiers: DailyModifierId[];
}

export function getDailyChallenge(dateKey = getTodayDateKey()): DailyChallengeInfo {
  const seed = `DAILY-${dateKey}`;
  const rng = createSeededRng(seed);
  const heroId: HeroClassId = rng() < 0.5 ? 'ironwarden' : 'shadowweaver';
  const allIds = Object.keys(DAILY_MODIFIERS) as DailyModifierId[];
  const pool = [...allIds];
  const modifiers: DailyModifierId[] = [];
  while (modifiers.length < 2 && pool.length > 0) {
    const idx = Math.floor(rng() * pool.length);
    modifiers.push(pool.splice(idx, 1)[0]);
  }
  return { dateKey, seed, heroId, modifiers };
}

export function tDailyModifier(id: DailyModifierId, locale: Locale) {
  const def = DAILY_MODIFIERS[id];
  return {
    name: locale === 'zh' ? def.name : def.nameEn,
    desc: locale === 'zh' ? def.desc : def.descEn,
    tone: def.tone,
  };
}
