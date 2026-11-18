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

export function rollPotion(): PotionDef {
  const all = Object.values(POTION_DEFS);
  return all[Math.floor(Math.random() * all.length)];
}
