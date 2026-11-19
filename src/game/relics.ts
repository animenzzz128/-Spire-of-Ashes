import { rng } from './rng';
import { RelicDef } from './types';

export const RELIC_DEFS: Record<string, RelicDef> = {
  bloodfire_sigil: {
    id: 'bloodfire_sigil',
    name: '血焰徽记',
    rarity: 'starter',
    description: '每场战斗结束时，回复 8 点生命值。',
    iconKey: 'blood_drop',
  },
  nightweave_ring: {
    id: 'nightweave_ring',
    name: '夜织指环',
    rarity: 'starter',
    description: '每场战斗的第 1 回合，额外抽 2 张牌。',
    iconKey: 'ring',
  },
  ashen_fang: {
    id: 'ashen_fang',
    name: '灰烬獠牙',
    rarity: 'common',
    description: '每场战斗开始时，获得 1 点力量。',
    iconKey: 'fang',
  },
  cornerstone: {
    id: 'cornerstone',
    name: '镇塔基石',
    rarity: 'common',
    description: '每场战斗开始时，获得 10 点格挡。',
    iconKey: 'keystone',
  },
  featherstep_charm: {
    id: 'featherstep_charm',
    name: '羽步护符',
    rarity: 'common',
    description: '每场战斗开始时，获得 1 点敏捷。',
    iconKey: 'feather',
  },
  wayfinder_lamp: {
    id: 'wayfinder_lamp',
    name: '引路提灯',
    rarity: 'common',
    description: '每场战斗的第 1 回合，额外获得 1 点能量。',
    iconKey: 'lamp',
  },
  scout_satchel: {
    id: 'scout_satchel',
    name: '斥候行囊',
    rarity: 'common',
    description: '每场战斗的第 1 回合，额外抽 2 张牌。',
    iconKey: 'satchel',
  },
  cinderglass_ward: {
    id: 'cinderglass_ward',
    name: '熔琉璃护符',
    rarity: 'common',
    description: '回合结束时若你没有任何格挡，则获得 6 点格挡。',
    iconKey: 'glass',
  },
  notched_blade: {
    id: 'notched_blade',
    name: '刻痕战刃',
    rarity: 'uncommon',
    description: '同一回合内每打出 3 张攻击牌，获得 1 点力量。',
    iconKey: 'blade',
  },
  fleet_ribbon: {
    id: 'fleet_ribbon',
    name: '疾风缎带',
    rarity: 'uncommon',
    description: '同一回合内每打出 3 张攻击牌，获得 1 点敏捷。',
    iconKey: 'ribbon',
  },
  hunters_jerky: {
    id: 'hunters_jerky',
    name: '猎人肉干',
    rarity: 'uncommon',
    description: '战斗结束时若你的生命值不高于 50%，回复 12 点生命。',
    iconKey: 'jerky',
  },
  cinder_hourglass: {
    id: 'cinder_hourglass',
    name: '余烬沙漏',
    rarity: 'uncommon',
    description: '每回合开始时，对所有敌人造成 3 点伤害。',
    iconKey: 'hourglass',
  },
  watchman_horn: {
    id: 'watchman_horn',
    name: '守夜号角',
    rarity: 'uncommon',
    description: '每场战斗的第 2 回合开始时，获得 14 点格挡。',
    iconKey: 'horn',
  },
  ember_core: {
    id: 'ember_core',
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
    return RELIC_DEFS.ashen_fang;
  }
  return pool[Math.floor(rng('reward') * pool.length)];
}
