import { rng } from './rng';
import { PotionDef } from './types';

export const POTION_DEFS: Record<string, PotionDef> = {
  wildfire_flask: {
    id: 'wildfire_flask',
    name: '野火烧瓶',
    rarity: 'common',
    target: 'enemy',
    description: '对目标敌人造成 20 点伤害。',
    color: '#ef4444',
  },
  stoneskin_tonic: {
    id: 'stoneskin_tonic',
    name: '石肤药剂',
    rarity: 'common',
    target: 'self',
    description: '获得 12 点格挡。',
    color: '#3b82f6',
  },
  berserker_draught: {
    id: 'berserker_draught',
    name: '狂战药剂',
    rarity: 'common',
    target: 'self',
    description: '本场战斗获得 2 点力量。',
    color: '#f97316',
  },
  nightshade_vial: {
    id: 'nightshade_vial',
    name: '颠茄毒瓶',
    rarity: 'common',
    target: 'enemy',
    description: '给予目标敌人 6 层中毒。',
    color: '#10b981',
  },
  kindling_elixir: {
    id: 'kindling_elixir',
    name: '引火灵药',
    rarity: 'common',
    target: 'self',
    description: '本回合获得 2 点能量。',
    color: '#eab308',
  },
  haste_tincture: {
    id: 'haste_tincture',
    name: '迅捷酊剂',
    rarity: 'common',
    target: 'self',
    description: '立即抽 3 张牌。',
    color: '#06b6d4',
  },
  heartblood_elixir: {
    id: 'heartblood_elixir',
    name: '心血灵药',
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
  let r = rng() * total;
  for (const p of all) {
    r -= POTION_WEIGHT[p.rarity];
    if (r < 0) return p;
  }
  return all[all.length - 1];
}
