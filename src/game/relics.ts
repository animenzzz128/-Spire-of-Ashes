import { RelicDef } from './types';

export const RELIC_DEFS: Record<string, RelicDef> = {
  burning_blood: {
    id: 'burning_blood',
    name: '燃血徽记',
    rarity: 'starter',
    description: '每场战斗结束时，回复 8 点生命值。',
    iconKey: 'blood_drop',
  },
  ring_of_snake: {
    id: 'ring_of_snake',
    name: '灵蛇戒环',
    rarity: 'starter',
    description: '每场战斗的第 1 回合，额外抽 2 张牌。',
    iconKey: 'snake_ring',
  },
  vajra: {
    id: 'vajra',
    name: '金刚杵',
    rarity: 'common',
    description: '每场战斗开始时，获得 1 点力量。',
    iconKey: 'vajra',
  },
  anchor: {
    id: 'anchor',
    name: '沉铁船锚',
    rarity: 'common',
    description: '每场战斗开始时，获得 10 点格挡。',
    iconKey: 'anchor',
  },
  smooth_stone: {
    id: 'smooth_stone',
    name: '光滑圆石',
    rarity: 'common',
    description: '每场战斗开始时，获得 1 点敏捷。',
    iconKey: 'stone',
  },
  lantern: {
    id: 'lantern',
    name: '引路提灯',
    rarity: 'common',
    description: '每场战斗的第 1 回合，额外获得 1 点能量。',
    iconKey: 'lantern',
  },
  bag_of_prep: {
    id: 'bag_of_prep',
    name: '行囊秘袋',
    rarity: 'common',
    description: '每场战斗的第 1 回合，额外抽 2 张牌。',
    iconKey: 'bag',
  },
  orichalcum: {
    id: 'orichalcum',
    name: '奥利哈刚',
    rarity: 'common',
    description: '回合结束时若你没有任何格挡，则获得 6 点格挡。',
    iconKey: 'ore',
  },
  shuriken: {
    id: 'shuriken',
    name: '手里剑',
    rarity: 'uncommon',
    description: '同一回合内每打出 3 张攻击牌，获得 1 点力量。',
    iconKey: 'shuriken',
  },
  kunai: {
    id: 'kunai',
    name: '苦无飞镖',
    rarity: 'uncommon',
    description: '同一回合内每打出 3 张攻击牌，获得 1 点敏捷。',
    iconKey: 'kunai',
  },
  meat_on_bone: {
    id: 'meat_on_bone',
    name: '带骨烤肉',
    rarity: 'uncommon',
    description: '战斗结束时若你的生命值不高于 50%，回复 12 点生命。',
    iconKey: 'meat',
  },
  mercury_hourglass: {
    id: 'mercury_hourglass',
    name: '水银沙漏',
    rarity: 'uncommon',
    description: '每回合开始时，对所有敌人造成 3 点伤害。',
    iconKey: 'hourglass',
  },
  horn_cleat: {
    id: 'horn_cleat',
    name: '角质羊角',
    rarity: 'uncommon',
    description: '每场战斗的第 2 回合开始时，获得 14 点格挡。',
    iconKey: 'horn',
  },
  runic_capacitor: {
    id: 'runic_capacitor',
    name: '烬火核心',
    rarity: 'rare',
    description: '每回合基础能量上限 +1。',
    iconKey: 'core',
  },
};

export function rollRelic(ownedIds: string[], includeRare = true): RelicDef {
  const owned = new Set(ownedIds);
  const pool = Object.values(RELIC_DEFS).filter(
    (r) =>
      r.rarity !== 'starter' &&
      !owned.has(r.id) &&
      (includeRare || r.rarity !== 'rare')
  );
  if (pool.length === 0) {
    return RELIC_DEFS.vajra;
  }
  return pool[Math.floor(Math.random() * pool.length)];
}
