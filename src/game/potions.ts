import { PotionDef } from './types';

export const POTION_DEFS: Record<string, PotionDef> = {
  fire_potion: {
    id: 'fire_potion',
    name: '烈焰药水',
    rarity: 'common',
    target: 'enemy',
    description: '对目标敌人造成 20 点伤害。',
    color: '#ef4444',
  },
  block_potion: {
    id: 'block_potion',
    name: '铁壁药水',
    rarity: 'common',
    target: 'self',
    description: '获得 12 点格挡。',
    color: '#3b82f6',
  },
  strength_potion: {
    id: 'strength_potion',
    name: '力量药水',
    rarity: 'common',
    target: 'self',
    description: '本场战斗获得 2 点力量。',
    color: '#f97316',
  },
  poison_potion: {
    id: 'poison_potion',
    name: '剧毒药水',
    rarity: 'common',
    target: 'enemy',
    description: '给予目标敌人 6 层中毒。',
    color: '#10b981',
  },
  energy_potion: {
    id: 'energy_potion',
    name: '充能药水',
    rarity: 'common',
    target: 'self',
    description: '本回合获得 2 点能量。',
    color: '#eab308',
  },
  swift_potion: {
    id: 'swift_potion',
    name: '疾风药水',
    rarity: 'common',
    target: 'self',
    description: '立即抽 3 张牌。',
    color: '#06b6d4',
  },
  heal_potion: {
    id: 'heal_potion',
    name: '血精药水',
    rarity: 'rare',
    target: 'self',
    description: '立即回复 15 点生命值。',
    color: '#e11d48',
  },
};

// Weighted by rarity (it used to be uniform, so the "rare" heal potion was as
// common as any other).
const POTION_WEIGHT: Record<PotionDef['rarity'], number> = { common: 1, uncommon: 0.6, rare: 0.4 };

export function rollPotion(): PotionDef {
  const all = Object.values(POTION_DEFS);
  const total = all.reduce((sum, p) => sum + POTION_WEIGHT[p.rarity], 0);
  let r = Math.random() * total;
  for (const p of all) {
    r -= POTION_WEIGHT[p.rarity];
    if (r < 0) return p;
  }
  return all[all.length - 1];
}
