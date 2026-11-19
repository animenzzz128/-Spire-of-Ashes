import { rng } from './rng';
import { CardDef, CardEffect, CardInstance, HeroClassId } from './types';

export const CARD_DEFS: Record<string, CardDef> = {
  // === IRONWARDEN STARTERS & POOL ===
  iron_strike: {
    id: 'iron_strike',
    name: '铁剑打击',
    pool: 'ironwarden',
    type: 'attack',
    rarity: 'starter',
    target: 'enemy',
    cost: 1,
    damage: 6,
    upgradedDamage: 9,
    description: '造成 6 点伤害。',
    upgradedDescription: '造成 9 点伤害。',
    artKey: 'sword',
  },
  iron_defend: {
    id: 'iron_defend',
    name: '铸铁防御',
    pool: 'ironwarden',
    type: 'skill',
    rarity: 'starter',
    target: 'self',
    cost: 1,
    block: 6,
    upgradedBlock: 9,
    description: '获得 6 点格挡。',
    upgradedDescription: '获得 9 点格挡。',
    artKey: 'shield',
  },
  armor_breaker: {
    id: 'armor_breaker',
    name: '破甲重击',
    pool: 'ironwarden',
    type: 'attack',
    rarity: 'starter',
    target: 'enemy',
    cost: 2,
    damage: 8,
    upgradedDamage: 10,
    applyVulnerable: 2,
    upgradedApplyVulnerable: 3,
    description: '造成 8 点伤害。给予 2 层易伤。',
    upgradedDescription: '造成 10 点伤害。给予 3 层易伤。',
    artKey: 'hammer',
  },
  sweep_the_ranks: {
    id: 'sweep_the_ranks',
    name: '横扫千军',
    pool: 'ironwarden',
    type: 'attack',
    rarity: 'common',
    target: 'all_enemies',
    cost: 1,
    damage: 9,
    upgradedDamage: 12,
    description: '对所有敌人造成 9 点伤害。',
    upgradedDescription: '对所有敌人造成 12 点伤害。',
    artKey: 'broad_arc',
  },
  hilt_jab: {
    id: 'hilt_jab',
    name: '回柄快击',
    pool: 'ironwarden',
    type: 'attack',
    rarity: 'common',
    target: 'enemy',
    cost: 1,
    damage: 9,
    upgradedDamage: 10,
    draw: 1,
    upgradedDraw: 2,
    description: '造成 9 点伤害。抽 1 张牌。',
    upgradedDescription: '造成 10 点伤害。抽 2 张牌。',
    artKey: 'strike_draw',
  },
  double_hew: {
    id: 'double_hew',
    name: '连环劈砍',
    pool: 'ironwarden',
    type: 'attack',
    rarity: 'common',
    target: 'enemy',
    cost: 1,
    damage: 6,
    upgradedDamage: 8,
    hits: 2,
    upgradedHits: 2,
    description: '造成 6 点伤害 2 次。',
    upgradedDescription: '造成 8 点伤害 2 次。',
    artKey: 'twin',
  },
  weather_the_blow: {
    id: 'weather_the_blow',
    name: '咬牙硬抗',
    pool: 'ironwarden',
    type: 'skill',
    rarity: 'common',
    target: 'self',
    cost: 1,
    block: 8,
    upgradedBlock: 11,
    draw: 1,
    upgradedDraw: 1,
    description: '获得 8 点格挡。抽 1 张牌。',
    upgradedDescription: '获得 11 点格挡。抽 1 张牌。',
    artKey: 'shield_draw',
  },
  guarded_blow: {
    id: 'guarded_blow',
    name: '守势反击',
    pool: 'ironwarden',
    type: 'attack',
    rarity: 'common',
    target: 'enemy',
    cost: 1,
    damage: 6,
    upgradedDamage: 8,
    block: 6,
    upgradedBlock: 8,
    description: '获得 6 点格挡。造成 6 点伤害。',
    upgradedDescription: '获得 8 点格挡。造成 8 点伤害。',
    artKey: 'wave',
  },
  shield_ram: {
    id: 'shield_ram',
    name: '铁壁冲撞',
    pool: 'ironwarden',
    type: 'attack',
    rarity: 'common',
    target: 'enemy',
    cost: 1,
    upgradedCost: 0,
    blockAsDamage: true,
    description: '造成等同于你当前格挡值的伤害。',
    upgradedDescription: '造成等同于你当前格挡值的伤害。',
    artKey: 'slam',
  },
  crushing_maul: {
    id: 'crushing_maul',
    name: '重锤绝杀',
    pool: 'ironwarden',
    type: 'attack',
    rarity: 'common',
    target: 'enemy',
    cost: 2,
    damage: 14,
    upgradedDamage: 14,
    strengthMult: 3,
    upgradedStrengthMult: 5,
    description: '造成 14 点伤害。力量在此牌上发挥 3 倍效果。',
    upgradedDescription: '造成 14 点伤害。力量在此牌上发挥 5 倍效果。',
    artKey: 'heavy',
  },
  kindled_fury: {
    id: 'kindled_fury',
    name: '炽焰战意',
    pool: 'ironwarden',
    type: 'power',
    rarity: 'uncommon',
    target: 'self',
    cost: 1,
    gainStrength: 3,
    upgradedGainStrength: 4,
    description: '获得 3 点力量。',
    upgradedDescription: '获得 4 点力量。',
    artKey: 'flame',
  },
  heavy_mail: {
    id: 'heavy_mail',
    name: '身披重铠',
    pool: 'ironwarden',
    type: 'power',
    rarity: 'uncommon',
    target: 'self',
    cost: 1,
    gainIronhide: 3,
    upgradedGainIronhide: 4,
    description: '每回合结束时，获得 3 点格挡。',
    upgradedDescription: '每回合结束时，获得 4 点格挡。',
    artKey: 'armor',
  },
  blood_surge: {
    id: 'blood_surge',
    name: '燃血狂涌',
    pool: 'ironwarden',
    type: 'skill',
    rarity: 'uncommon',
    target: 'self',
    cost: 0,
    loseHp: 3,
    gainEnergy: 2,
    upgradedGainEnergy: 3,
    description: '失去 3 点生命。获得 2 点能量。',
    upgradedDescription: '失去 3 点生命。获得 3 点能量。',
    artKey: 'blood',
  },
  tunnel_vision: {
    id: 'tunnel_vision',
    name: '心无旁骛',
    pool: 'ironwarden',
    type: 'skill',
    rarity: 'uncommon',
    target: 'self',
    cost: 0,
    draw: 3,
    upgradedDraw: 4,
    noMoreDraw: true,
    description: '抽 3 张牌。本回合内你不能再抽牌。',
    upgradedDescription: '抽 4 张牌。本回合内你不能再抽牌。',
    artKey: 'focus',
  },
  daunting_roar: {
    id: 'daunting_roar',
    name: '战吼震慑',
    pool: 'ironwarden',
    type: 'skill',
    rarity: 'uncommon',
    target: 'all_enemies',
    cost: 0,
    applyWeak: 1,
    upgradedApplyWeak: 2,
    exhaust: true,
    description: '给予所有敌人 1 层虚弱。消耗。',
    upgradedDescription: '给予所有敌人 2 层虚弱。消耗。',
    artKey: 'roar',
  },
  blade_cyclone: {
    id: 'blade_cyclone',
    name: '刀刃飓风',
    pool: 'ironwarden',
    type: 'attack',
    rarity: 'uncommon',
    target: 'all_enemies',
    cost: -1, // X cost
    damage: 5,
    upgradedDamage: 8,
    description: '消耗全部能量，对所有敌人造成 5 点伤害 X 次。',
    upgradedDescription: '消耗全部能量，对所有敌人造成 8 点伤害 X 次。',
    artKey: 'whirl',
  },
  jawbreaker: {
    id: 'jawbreaker',
    name: '碎颌重拳',
    pool: 'ironwarden',
    type: 'attack',
    rarity: 'uncommon',
    target: 'enemy',
    cost: 2,
    damage: 13,
    upgradedDamage: 13,
    applyWeak: 1,
    upgradedApplyWeak: 2,
    applyVulnerable: 1,
    upgradedApplyVulnerable: 2,
    description: '造成 13 点伤害。给予 1 层虚弱和 1 层易伤。',
    upgradedDescription: '造成 13 点伤害。给予 2 层虚弱和 2 层易伤。',
    artKey: 'fist',
  },
  mountain_stand: {
    id: 'mountain_stand',
    name: '不动如山',
    pool: 'ironwarden',
    type: 'skill',
    rarity: 'rare',
    target: 'self',
    cost: 2,
    block: 30,
    upgradedBlock: 40,
    exhaust: true,
    description: '获得 30 点格挡。消耗。',
    upgradedDescription: '获得 40 点格挡。消耗。',
    artKey: 'fortress',
  },
  eternal_bastion: {
    id: 'eternal_bastion',
    name: '永恒堡垒',
    pool: 'ironwarden',
    type: 'power',
    rarity: 'rare',
    target: 'self',
    cost: 3,
    upgradedCost: 2,
    bastion: true,
    description: '格挡不再在回合开始时消失。',
    upgradedDescription: '格挡不再在回合开始时消失。',
    artKey: 'bastion',
  },
  blood_covenant: {
    id: 'blood_covenant',
    name: '血祭契约',
    pool: 'ironwarden',
    type: 'skill',
    rarity: 'rare',
    target: 'self',
    cost: 0,
    loseHp: 6,
    gainEnergy: 2,
    draw: 3,
    upgradedDraw: 5,
    exhaust: true,
    description: '失去 6 点生命。获得 2 点能量。抽 3 张牌。消耗。',
    upgradedDescription: '失去 6 点生命。获得 2 点能量。抽 5 张牌。消耗。',
    artKey: 'covenant',
  },
  infernal_avatar: {
    id: 'infernal_avatar',
    name: '炼狱化身',
    pool: 'ironwarden',
    type: 'power',
    rarity: 'rare',
    target: 'self',
    cost: 3,
    infernalAvatar: 2,
    upgradedInfernalAvatar: 3,
    description: '每回合开始时，获得 2 点力量。',
    upgradedDescription: '每回合开始时，获得 3 点力量。',
    artKey: 'infernal',
  },
  soul_harvest: {
    id: 'soul_harvest',
    name: '摄魂镰舞',
    pool: 'ironwarden',
    type: 'attack',
    rarity: 'rare',
    target: 'all_enemies',
    cost: 2,
    damage: 6,
    upgradedDamage: 7,
    lifesteal: true,
    exhaust: true,
    description: '对所有敌人造成 6 点伤害。回复等同于未被格挡伤害值的生命。消耗。',
    upgradedDescription: '对所有敌人造成 7 点伤害。回复等同于未被格挡伤害值的生命。消耗。',
    artKey: 'scythe',
  },

  // --- Ironwarden: Ember cards (P2.1) ---
  kindling_chop: {
    id: 'kindling_chop',
    name: '添柴劈',
    pool: 'ironwarden',
    type: 'attack',
    rarity: 'common',
    target: 'enemy',
    cost: 1,
    effects: [{ op: 'damage', n: 7, up: 10 }, { op: 'gainEmber', n: 1 }],
    description: '造成 7 点伤害。获得 1 点余烬。',
    upgradedDescription: '造成 10 点伤害。获得 1 点余烬。',
    artKey: 'chop',
  },
  anvil_guard: {
    id: 'anvil_guard',
    name: '铁砧护体',
    pool: 'ironwarden',
    type: 'skill',
    rarity: 'common',
    target: 'self',
    cost: 1,
    effects: [{ op: 'block', n: 6, up: 9 }, { op: 'gainEmber', n: 1 }],
    description: '获得 6 点格挡。获得 1 点余烬。',
    upgradedDescription: '获得 9 点格挡。获得 1 点余烬。',
    artKey: 'shield',
  },
  spark_spray: {
    id: 'spark_spray',
    name: '火星四溅',
    pool: 'ironwarden',
    type: 'attack',
    rarity: 'common',
    target: 'all_enemies',
    cost: 1,
    effects: [
      { op: 'damage', n: 4, up: 6 },
      { op: 'gainEmber', n: 1, perEnemyHit: true, max: 2 },
    ],
    description: '对所有敌人造成 4 点伤害。每命中 1 个敌人获得 1 点余烬（最多 2 点）。',
    upgradedDescription: '对所有敌人造成 6 点伤害。每命中 1 个敌人获得 1 点余烬（最多 2 点）。',
    artKey: 'broad_arc',
  },
  aftershock: {
    id: 'aftershock',
    name: '余震',
    pool: 'ironwarden',
    type: 'attack',
    rarity: 'common',
    target: 'enemy',
    cost: 1,
    effects: [
      { op: 'damage', n: 5, up: 7 },
      { op: 'damage', n: 5, up: 7, when: { temperedThisTurn: true } },
    ],
    description: '造成 5 点伤害。本回合用过淬火时，改为攻击 2 次。',
    upgradedDescription: '造成 7 点伤害。本回合用过淬火时，改为攻击 2 次。',
    artKey: 'hammer',
  },
  molten_edge: {
    id: 'molten_edge',
    name: '熔锋斩',
    pool: 'ironwarden',
    type: 'attack',
    rarity: 'uncommon',
    target: 'enemy',
    cost: 2,
    effects: [{ op: 'damage', n: 6, perEmber: 3, upPerEmber: 4 }],
    description: '造成 6 点伤害，你每有 1 点余烬再加 3 点（不消耗余烬）。',
    upgradedDescription: '造成 6 点伤害，你每有 1 点余烬再加 4 点（不消耗余烬）。',
    artKey: 'heavy',
  },
  forge_heart: {
    id: 'forge_heart',
    name: '锻炉之心',
    pool: 'ironwarden',
    type: 'power',
    rarity: 'uncommon',
    target: 'self',
    cost: 1,
    effects: [{ op: 'buff', status: 'forgeHeart', n: 4, up: 6 }],
    description: '每次添薪时，获得 4 点格挡。',
    upgradedDescription: '每次添薪时，获得 6 点格挡。',
    artKey: 'armor',
  },

  // === SHADOWWEAVER STARTERS & POOL ===
  shadow_strike: {
    id: 'shadow_strike',
    name: '影刃突刺',
    pool: 'shadowweaver',
    type: 'attack',
    rarity: 'starter',
    target: 'enemy',
    cost: 1,
    damage: 6,
    upgradedDamage: 9,
    description: '造成 6 点伤害。',
    upgradedDescription: '造成 9 点伤害。',
    artKey: 'dagger',
  },
  shadow_defend: {
    id: 'shadow_defend',
    name: '暗影规避',
    pool: 'shadowweaver',
    type: 'skill',
    rarity: 'starter',
    target: 'self',
    cost: 1,
    block: 5,
    upgradedBlock: 8,
    description: '获得 5 点格挡。',
    upgradedDescription: '获得 8 点格挡。',
    artKey: 'cloak',
  },
  sapping_cut: {
    id: 'sapping_cut',
    name: '卸力刺',
    pool: 'shadowweaver',
    type: 'attack',
    rarity: 'starter',
    target: 'enemy',
    cost: 0,
    damage: 3,
    upgradedDamage: 4,
    applyWeak: 1,
    upgradedApplyWeak: 2,
    description: '造成 3 点伤害。给予 1 层虚弱。',
    upgradedDescription: '造成 4 点伤害。给予 2 层虚弱。',
    artKey: 'sap',
  },
  last_refuge: {
    id: 'last_refuge',
    name: '绝境求生',
    pool: 'shadowweaver',
    type: 'skill',
    rarity: 'starter',
    target: 'self',
    cost: 1,
    block: 8,
    upgradedBlock: 11,
    discardCount: 1,
    description: '获得 8 点格挡。丢弃 1 张手牌。',
    upgradedDescription: '获得 11 点格挡。丢弃 1 张手牌。',
    artKey: 'refuge',
  },
  viper_lunge: {
    id: 'viper_lunge',
    name: '蛇牙突刺',
    pool: 'shadowweaver',
    type: 'attack',
    rarity: 'common',
    target: 'enemy',
    cost: 1,
    damage: 6,
    upgradedDamage: 8,
    applyPoison: 3,
    upgradedApplyPoison: 4,
    description: '造成 6 点伤害。给予 3 层中毒。',
    upgradedDescription: '造成 8 点伤害。给予 4 层中毒。',
    artKey: 'poison_blade',
  },
  black_ichor: {
    id: 'black_ichor',
    name: '黑血毒液',
    pool: 'shadowweaver',
    type: 'skill',
    rarity: 'common',
    target: 'enemy',
    cost: 1,
    applyPoison: 5,
    upgradedApplyPoison: 7,
    description: '给予 5 层中毒。',
    upgradedDescription: '给予 7 层中毒。',
    artKey: 'vial',
  },
  sleeve_knives: {
    id: 'sleeve_knives',
    name: '袖里藏锋',
    pool: 'shadowweaver',
    type: 'skill',
    rarity: 'common',
    target: 'self',
    cost: 1,
    addKnives: 3,
    upgradedAddKnives: 4,
    description: '将 3 张【飞刀】置入你的手牌。',
    upgradedDescription: '将 4 张【飞刀】置入你的手牌。',
    artKey: 'blades',
  },
  nimble_retreat: {
    id: 'nimble_retreat',
    name: '灵巧后跃',
    pool: 'shadowweaver',
    type: 'skill',
    rarity: 'common',
    target: 'self',
    cost: 1,
    block: 5,
    upgradedBlock: 8,
    draw: 2,
    upgradedDraw: 2,
    description: '获得 5 点格挡。抽 2 张牌。',
    upgradedDescription: '获得 8 点格挡。抽 2 张牌。',
    artKey: 'flip',
  },
  sleight_of_hand: {
    id: 'sleight_of_hand',
    name: '妙手腾挪',
    pool: 'shadowweaver',
    type: 'skill',
    rarity: 'common',
    target: 'self',
    cost: 1,
    draw: 3,
    upgradedDraw: 4,
    discardCount: 1,
    description: '抽 3 张牌。丢弃 1 张手牌。',
    upgradedDescription: '抽 4 张牌。丢弃 1 张手牌。',
    artKey: 'sleight',
  },
  knife_volley: {
    id: 'knife_volley',
    name: '飞刀齐射',
    pool: 'shadowweaver',
    type: 'attack',
    rarity: 'common',
    target: 'all_enemies',
    cost: 1,
    damage: 4,
    upgradedDamage: 6,
    hits: 2,
    upgradedHits: 2,
    description: '对所有敌人造成 4 点伤害 2 次。',
    upgradedDescription: '对所有敌人造成 6 点伤害 2 次。',
    artKey: 'spray',
  },
  veil_and_blade: {
    id: 'veil_and_blade',
    name: '夜幕藏刃',
    pool: 'shadowweaver',
    type: 'skill',
    rarity: 'common',
    target: 'self',
    cost: 1,
    block: 6,
    upgradedBlock: 6,
    addKnives: 1,
    upgradedAddKnives: 2,
    description: '获得 6 点格挡。将 1 张【飞刀】置入手牌。',
    upgradedDescription: '获得 6 点格挡。将 2 张【飞刀】置入手牌。',
    artKey: 'cloak_knife',
  },
  gale_rush: {
    id: 'gale_rush',
    name: '疾风突袭',
    pool: 'shadowweaver',
    type: 'attack',
    rarity: 'uncommon',
    target: 'enemy',
    cost: 2,
    block: 10,
    upgradedBlock: 13,
    damage: 10,
    upgradedDamage: 13,
    description: '获得 10 点格挡。造成 10 点伤害。',
    upgradedDescription: '获得 13 点格挡。造成 13 点伤害。',
    artKey: 'rush',
  },
  lingering_shade: {
    id: 'lingering_shade',
    name: '幽影徘徊',
    pool: 'shadowweaver',
    type: 'skill',
    rarity: 'uncommon',
    target: 'self',
    cost: 1,
    block: 5,
    upgradedBlock: 8,
    gainShade: 1,
    description: '获得 5 点格挡。下回合开始时格挡不会消失。',
    upgradedDescription: '获得 8 点格挡。下回合开始时格挡不会消失。',
    artKey: 'shade',
  },
  toxic_bloom: {
    id: 'toxic_bloom',
    name: '毒性迸发',
    pool: 'shadowweaver',
    type: 'skill',
    rarity: 'uncommon',
    target: 'enemy',
    cost: 1,
    doublePoison: 2,
    upgradedDoublePoison: 3,
    exhaust: true,
    description: '使目标的中毒层数翻倍。消耗。',
    upgradedDescription: '使目标的中毒层数变为三倍。消耗。',
    artKey: 'bloom',
  },
  phantom_steps: {
    id: 'phantom_steps',
    name: '幻影步法',
    pool: 'shadowweaver',
    type: 'power',
    rarity: 'uncommon',
    target: 'self',
    cost: 1,
    gainDexterity: 2,
    upgradedGainDexterity: 3,
    description: '获得 2 点敏捷（所有格挡牌+2）。',
    upgradedDescription: '获得 3 点敏捷（所有格挡牌+3）。',
    artKey: 'boots',
  },
  creeping_miasma: {
    id: 'creeping_miasma',
    name: '瘴气蔓延',
    pool: 'shadowweaver',
    type: 'power',
    rarity: 'uncommon',
    target: 'self',
    cost: 1,
    miasma: 2,
    upgradedMiasma: 3,
    description: '每回合开始时，给予所有敌人 2 层中毒。',
    upgradedDescription: '每回合开始时，给予所有敌人 3 层中毒。',
    artKey: 'miasma',
  },
  hobbling_kick: {
    id: 'hobbling_kick',
    name: '跛足重踢',
    pool: 'shadowweaver',
    type: 'skill',
    rarity: 'uncommon',
    target: 'enemy',
    cost: 2,
    applyWeak: 2,
    upgradedApplyWeak: 3,
    block: 11,
    upgradedBlock: 14,
    description: '给予 2 层虚弱。获得 11 点格挡。',
    upgradedDescription: '给予 3 层虚弱。获得 14 点格挡。',
    artKey: 'sweep',
  },
  racing_pulse: {
    id: 'racing_pulse',
    name: '心跳如鼓',
    pool: 'shadowweaver',
    type: 'skill',
    rarity: 'rare',
    target: 'self',
    cost: 0,
    gainEnergy: 1,
    upgradedGainEnergy: 2,
    draw: 2,
    upgradedDraw: 2,
    exhaust: true,
    description: '获得 1 点能量。抽 2 张牌。消耗。',
    upgradedDescription: '获得 2 点能量。抽 2 张牌。消耗。',
    artKey: 'pulse',
  },
  serpents_edge: {
    id: 'serpents_edge',
    name: '蛇毒附刃',
    pool: 'shadowweaver',
    type: 'power',
    rarity: 'rare',
    target: 'self',
    cost: 2,
    upgradedCost: 1,
    venomEdge: 1,
    description: '每当你造成未被格挡的攻击伤害时，给予目标 1 层中毒。',
    upgradedDescription: '每当你造成未被格挡的攻击伤害时，给予目标 1 层中毒。',
    artKey: 'venom_edge',
  },
  night_terror: {
    id: 'night_terror',
    name: '梦魇杀机',
    pool: 'shadowweaver',
    type: 'skill',
    rarity: 'rare',
    target: 'self',
    cost: 1,
    upgradedCost: 0,
    doubleNextTurn: true,
    description: '下回合你的所有攻击造成双倍伤害。',
    upgradedDescription: '下回合你的所有攻击造成双倍伤害。',
    artKey: 'nightmare',
  },
  rotburst: {
    id: 'rotburst',
    name: '腐尸迸裂',
    pool: 'shadowweaver',
    type: 'skill',
    rarity: 'rare',
    target: 'enemy',
    cost: 2,
    applyPoison: 6,
    upgradedApplyPoison: 9,
    rotburst: true,
    description: '给予 6 层中毒。目标死亡时对所有敌人造成等同其最大生命值的伤害。',
    upgradedDescription: '给予 9 层中毒。目标死亡时对所有敌人造成等同其最大生命值的伤害。',
    artKey: 'rot',
  },

  // --- Shadowweaver: Ember & Echo cards (P2.1) ---
  ash_dart: {
    id: 'ash_dart',
    name: '灰烬镖',
    pool: 'shadowweaver',
    type: 'attack',
    rarity: 'common',
    target: 'enemy',
    cost: 0,
    effects: [{ op: 'damage', n: 3, up: 5 }],
    echo: [{ op: 'gainEmber', n: 1 }],
    description: '造成 3 点伤害。余响：获得 1 点余烬。',
    upgradedDescription: '造成 5 点伤害。余响：获得 1 点余烬。',
    artKey: 'knife',
  },
  smoke_step: {
    id: 'smoke_step',
    name: '烟遁',
    pool: 'shadowweaver',
    type: 'skill',
    rarity: 'common',
    target: 'self',
    cost: 1,
    effects: [{ op: 'block', n: 6, up: 9 }, { op: 'discard', n: 1 }],
    description: '获得 6 点格挡。丢弃 1 张手牌。',
    upgradedDescription: '获得 9 点格挡。丢弃 1 张手牌。',
    artKey: 'cloak',
  },
  venom_cinders: {
    id: 'venom_cinders',
    name: '毒烬',
    pool: 'shadowweaver',
    type: 'skill',
    rarity: 'common',
    target: 'all_enemies',
    cost: 1,
    effects: [{ op: 'debuff', status: 'poison', n: 3, up: 4 }],
    description: '给予所有敌人 3 层中毒。',
    upgradedDescription: '给予所有敌人 4 层中毒。',
    artKey: 'miasma',
  },
  echo_blade: {
    id: 'echo_blade',
    name: '回响之刃',
    pool: 'shadowweaver',
    type: 'attack',
    rarity: 'uncommon',
    target: 'enemy',
    cost: 1,
    effects: [{ op: 'damage', n: 8, up: 11 }],
    echo: [{ op: 'addCard', card: 'throwing_knife', n: 1 }],
    description: '造成 8 点伤害。余响：将 1 张【飞刀】置入手牌。',
    upgradedDescription: '造成 11 点伤害。余响：将 1 张【飞刀】置入手牌。',
    artKey: 'dagger',
  },
  blade_rain: {
    id: 'blade_rain',
    name: '刃雨',
    pool: 'shadowweaver',
    type: 'skill',
    rarity: 'uncommon',
    target: 'self',
    cost: 1,
    effects: [
      { op: 'spendEmber', n: 5 },
      { op: 'addCard', card: 'throwing_knife', n: 5, perSpent: true, upgradedCopies: true },
    ],
    description: '花费至多 5 点余烬，每花 1 点将 1 张【飞刀】置入手牌。',
    upgradedDescription: '花费至多 5 点余烬，每花 1 点将 1 张升级的【飞刀】置入手牌。',
    artKey: 'blades',
  },
  smoldering_haze: {
    id: 'smoldering_haze',
    name: '余烬烟霭',
    pool: 'shadowweaver',
    type: 'power',
    rarity: 'uncommon',
    target: 'self',
    cost: 1,
    upgradedCost: 0,
    effects: [{ op: 'buff', status: 'smolderingHaze', n: 1 }],
    description: '每当你花费余烬，给予所有敌人等量的中毒。',
    upgradedDescription: '每当你花费余烬，给予所有敌人等量的中毒。',
    artKey: 'miasma',
  },

  // === SPECIAL / NEUTRAL / STATUS / CURSE ===
  throwing_knife: {
    id: 'throwing_knife',
    name: '飞刀',
    pool: 'neutral',
    type: 'attack',
    rarity: 'special',
    target: 'enemy',
    cost: 0,
    damage: 4,
    upgradedDamage: 6,
    exhaust: true,
    description: '造成 4 点伤害。消耗。',
    upgradedDescription: '造成 6 点伤害。消耗。',
    artKey: 'knife',
  },
  deft_poise: {
    id: 'deft_poise',
    name: '轻灵身姿',
    pool: 'neutral',
    type: 'skill',
    rarity: 'uncommon',
    target: 'self',
    cost: 0,
    block: 2,
    upgradedBlock: 4,
    draw: 1,
    upgradedDraw: 1,
    description: '获得 2 点格挡。抽 1 张牌。',
    upgradedDescription: '获得 4 点格挡。抽 1 张牌。',
    artKey: 'poise',
  },
  cold_glint: {
    id: 'cold_glint',
    name: '寒光一闪',
    pool: 'neutral',
    type: 'attack',
    rarity: 'uncommon',
    target: 'enemy',
    cost: 0,
    damage: 3,
    upgradedDamage: 6,
    draw: 1,
    upgradedDraw: 1,
    description: '造成 3 点伤害。抽 1 张牌。',
    upgradedDescription: '造成 6 点伤害。抽 1 张牌。',
    artKey: 'flash',
  },
  warding_draught: {
    id: 'warding_draught',
    name: '辟邪符水',
    pool: 'neutral',
    type: 'skill',
    rarity: 'uncommon',
    target: 'self',
    cost: 0,
    gainArtifact: 1,
    upgradedGainArtifact: 2,
    exhaust: true,
    description: '获得 1 层人工制品（抵消下次负面状态）。消耗。',
    upgradedDescription: '获得 2 层人工制品。消耗。',
    artKey: 'ward',
  },
  molten_epiphany: {
    id: 'molten_epiphany',
    name: '熔心顿悟',
    pool: 'neutral',
    type: 'skill',
    rarity: 'rare',
    target: 'self',
    cost: 2,
    upgradedCost: 1,
    upgradeAllInCombat: true,
    exhaust: true,
    description: '本场战斗中升级你所有的卡牌。消耗。',
    upgradedDescription: '本场战斗中升级你所有的卡牌。消耗。',
    artKey: 'epiphany',
  },
  burn: {
    id: 'burn',
    name: '灼伤',
    pool: 'status',
    type: 'status',
    rarity: 'special',
    target: 'none',
    cost: -2,
    endTurnBurn: 2,
    description: '无法打出。回合结束时若仍在手牌中，受到 2 点伤害。',
    artKey: 'burn',
  },
  wound: {
    id: 'wound',
    name: '伤口',
    pool: 'status',
    type: 'status',
    rarity: 'special',
    target: 'none',
    cost: -2,
    description: '无法打出。占用手牌空间。',
    artKey: 'wound',
  },
  caustic_residue: {
    id: 'caustic_residue',
    name: '腐蚀残渣',
    pool: 'status',
    type: 'status',
    rarity: 'special',
    target: 'self',
    cost: 1,
    exhaust: true,
    description: '消耗。清理此状态牌。',
    artKey: 'residue',
  },
  marrow_ache: {
    id: 'marrow_ache',
    name: '蚀骨痛楚',
    pool: 'status',
    type: 'curse',
    rarity: 'special',
    target: 'none',
    cost: -2,
    achingCurse: true,
    description: '诅咒 · 无法打出。在手牌中时，每打出一张其他牌失去 1 点生命。',
    artKey: 'ache',
  },
};

let uidCounter = 1;
export function nextUid(prefix = 'c'): string {
  uidCounter += 1;
  return `${prefix}_${Date.now().toString(36)}_${uidCounter}`;
}

export function createCardInstance(defId: string, upgraded = false): CardInstance {
  return {
    uid: nextUid('card'),
    defId,
    upgraded,
  };
}

export function getCardCost(card: CardInstance): number {
  const def = CARD_DEFS[card.defId];
  if (!def) return 1;
  if (card.upgraded && def.upgradedCost !== undefined) return def.upgradedCost;
  return def.cost;
}

export function getStarterDeck(heroId: HeroClassId): CardInstance[] {
  if (heroId === 'ironwarden') {
    return [
      createCardInstance('iron_strike'),
      createCardInstance('iron_strike'),
      createCardInstance('iron_strike'),
      createCardInstance('iron_strike'),
      createCardInstance('kindling_chop'), // shows Ember from the first fight
      createCardInstance('iron_defend'),
      createCardInstance('iron_defend'),
      createCardInstance('iron_defend'),
      createCardInstance('iron_defend'),
      createCardInstance('armor_breaker'),
    ];
  }
  return [
    createCardInstance('shadow_strike'),
    createCardInstance('shadow_strike'),
    createCardInstance('shadow_strike'),
    createCardInstance('shadow_strike'),
    createCardInstance('ash_dart'), // gives Last Refuge's discard a payoff
    createCardInstance('shadow_defend'),
    createCardInstance('shadow_defend'),
    createCardInstance('shadow_defend'),
    createCardInstance('shadow_defend'),
    createCardInstance('sapping_cut'),
    createCardInstance('last_refuge'),
  ];
}

export function getRewardPool(heroId: HeroClassId): CardDef[] {
  return Object.values(CARD_DEFS).filter(
    (c) =>
      (c.pool === heroId || c.pool === 'neutral') &&
      c.rarity !== 'starter' &&
      c.rarity !== 'special'
  );
}

// Card reward rarity. Rares used to be 12% (normal) / 28% (elite) per card,
// which with ~20-card class pools made every run look alike. `rarePity` is a
// bonus that grows after rewards without a rare and resets when one appears.
export const RARE_CHANCE_NORMAL = 0.07;
export const RARE_CHANCE_ELITE = 0.2;
export const RARE_PITY_STEP = 0.03;
export const RARE_PITY_CAP = 0.1;

export function rollCardChoices(
  heroId: HeroClassId,
  count = 3,
  eliteBonus = false,
  rarePity = 0
): CardInstance[] {
  const pool = getRewardPool(heroId);
  const pickedIds = new Set<string>();
  const result: CardInstance[] = [];
  let guard = 0;
  const rareChance = (eliteBonus ? RARE_CHANCE_ELITE : RARE_CHANCE_NORMAL) + rarePity;
  const uncommonChance = eliteBonus ? 0.4 : 0.36;

  while (result.length < count && guard < 100) {
    guard += 1;
    const roll = rng();
    let targetRarity: 'common' | 'uncommon' | 'rare' = 'common';
    if (roll < rareChance) {
      targetRarity = 'rare';
    } else if (roll < rareChance + uncommonChance) {
      targetRarity = 'uncommon';
    }
    const candidates = pool.filter((c) => c.rarity === targetRarity && !pickedIds.has(c.id));
    const fallback = pool.filter((c) => !pickedIds.has(c.id));
    const list = candidates.length > 0 ? candidates : fallback;
    if (list.length === 0) break;
    const chosen = list[Math.floor(rng() * list.length)];
    pickedIds.add(chosen.id);
    // Small chance of a pre-upgraded card
    const preUpgraded = rng() < (eliteBonus ? 0.12 : 0.05);
    result.push(createCardInstance(chosen.id, preUpgraded));
  }
  return result;
}

// ---------------------------------------------------------------------------
// Effect lists
// ---------------------------------------------------------------------------

/** Amount of an effect for a base or upgraded card. */
export function effVal(e: { n: number; up?: number }, upgraded: boolean): number {
  return upgraded && e.up !== undefined ? e.up : e.n;
}

// Cards written before effect lists use flat fields. Compile them into the
// equivalent effect list, in the order the old hand-written resolver used, so
// every card runs through the same interpreter.
function compileLegacyEffects(def: CardDef): CardEffect[] {
  const fx: CardEffect[] = [];
  const pair = (n: number | undefined, up: number | undefined) =>
    up !== undefined ? { n: n || 0, up } : { n: n || 0 };
  const has = (n: number | undefined, up: number | undefined) => (n || 0) > 0 || (up || 0) > 0;

  if (def.loseHp) fx.push({ op: 'loseHp', n: def.loseHp });
  if (has(def.gainEnergy, def.upgradedGainEnergy)) fx.push({ op: 'gainEnergy', ...pair(def.gainEnergy, def.upgradedGainEnergy) });
  if (has(def.block, def.upgradedBlock)) fx.push({ op: 'block', ...pair(def.block, def.upgradedBlock) });
  if (has(def.gainStrength, def.upgradedGainStrength)) fx.push({ op: 'buff', status: 'strength', ...pair(def.gainStrength, def.upgradedGainStrength) });
  if (has(def.gainDexterity, def.upgradedGainDexterity)) fx.push({ op: 'buff', status: 'dexterity', ...pair(def.gainDexterity, def.upgradedGainDexterity) });
  if (has(def.gainIronhide, def.upgradedGainIronhide)) fx.push({ op: 'buff', status: 'ironhide', ...pair(def.gainIronhide, def.upgradedGainIronhide) });
  if (has(def.gainArtifact, def.upgradedGainArtifact)) fx.push({ op: 'buff', status: 'artifact', ...pair(def.gainArtifact, def.upgradedGainArtifact) });
  if (def.gainShade) fx.push({ op: 'buff', status: 'shade', n: def.gainShade });
  if (def.bastion) fx.push({ op: 'flag', flag: 'bastion' });
  if (def.doubleNextTurn) fx.push({ op: 'flag', flag: 'doubleDamageNextTurn' });
  if (has(def.infernalAvatar, def.upgradedInfernalAvatar)) fx.push({ op: 'buff', status: 'infernalAvatar', ...pair(def.infernalAvatar, def.upgradedInfernalAvatar) });
  if (has(def.miasma, def.upgradedMiasma)) fx.push({ op: 'buff', status: 'miasma', ...pair(def.miasma, def.upgradedMiasma) });
  if (def.venomEdge) fx.push({ op: 'buff', status: 'venomEdge', n: def.venomEdge });

  if (def.damage !== undefined || def.blockAsDamage) {
    fx.push({
      op: 'damage',
      ...pair(def.damage, def.upgradedDamage),
      ...(def.hits !== undefined ? { hits: def.hits } : {}),
      ...(def.upgradedHits !== undefined ? { upHits: def.upgradedHits } : {}),
      ...(def.strengthMult !== undefined ? { strMult: def.strengthMult } : {}),
      ...(def.upgradedStrengthMult !== undefined ? { upStrMult: def.upgradedStrengthMult } : {}),
      ...(def.blockAsDamage ? { fromBlock: true } : {}),
      ...(def.cost === -1 ? { xHits: true } : {}),
      ...(def.lifesteal ? { lifesteal: true } : {}),
    });
  }
  if (has(def.applyVulnerable, def.upgradedApplyVulnerable)) fx.push({ op: 'debuff', status: 'vulnerable', ...pair(def.applyVulnerable, def.upgradedApplyVulnerable) });
  if (has(def.applyWeak, def.upgradedApplyWeak)) fx.push({ op: 'debuff', status: 'weak', ...pair(def.applyWeak, def.upgradedApplyWeak) });
  if (has(def.applyPoison, def.upgradedApplyPoison)) fx.push({ op: 'debuff', status: 'poison', ...pair(def.applyPoison, def.upgradedApplyPoison) });
  if (has(def.doublePoison, def.upgradedDoublePoison)) fx.push({ op: 'multiplyPoison', ...pair(def.doublePoison, def.upgradedDoublePoison) });
  if (def.rotburst) fx.push({ op: 'markRotburst' });

  if (has(def.draw, def.upgradedDraw)) fx.push({ op: 'draw', ...pair(def.draw, def.upgradedDraw) });
  if (def.noMoreDraw) fx.push({ op: 'lockDraw' });
  if (has(def.addKnives, def.upgradedAddKnives)) fx.push({ op: 'addCard', card: 'throwing_knife', ...pair(def.addKnives, def.upgradedAddKnives) });
  if (def.upgradeAllInCombat) fx.push({ op: 'upgradeAllInCombat' });
  if (def.discardCount) fx.push({ op: 'discard', n: def.discardCount });
  return fx;
}

const effectCache = new Map<string, CardEffect[]>();

/** The card's effect list (its own, or compiled from its flat fields). */
export function getCardEffects(def: CardDef): CardEffect[] {
  if (def.effects) return def.effects;
  let fx = effectCache.get(def.id);
  if (!fx) {
    fx = compileLegacyEffects(def);
    effectCache.set(def.id, fx);
  }
  return fx;
}

/** First damage effect of a card, if any (used for previews and text highlighting). */
export function getPrimaryDamageEffect(def: CardDef): Extract<CardEffect, { op: 'damage' }> | undefined {
  return getCardEffects(def).find((e): e is Extract<CardEffect, { op: 'damage' }> => e.op === 'damage');
}

/** First block effect of a card, if any. */
export function getPrimaryBlockEffect(def: CardDef): Extract<CardEffect, { op: 'block' }> | undefined {
  return getCardEffects(def).find((e): e is Extract<CardEffect, { op: 'block' }> => e.op === 'block');
}
