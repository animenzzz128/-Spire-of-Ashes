import { CARD_DEFS } from './cards';
import { POTION_DEFS } from './potions';
import { RELIC_DEFS } from './relics';
import { CombatLogEntry, CombatMsg, EnemyIntent, HeroClassId, NodeType } from './types';

export type Locale = 'zh' | 'en';

export const UI_COPY = {
  zh: {
    brandTitle: '烬塔 · SPIRE OF ASHES',
    brandShort: '烬塔',
    brandSub: 'SPIRE OF ASHES',
    splashPrompt: '轻触或按任意键跳过动画',
    // Traditional Game Menu
    menuContinue: '继续游戏',
    menuStartGame: '开始游戏',
    menuTutorial: '新手引导',
    menuManual: '使用说明',
    menuSettings: '游戏设置',
    starterRelic: '初始遗物',
    ascension0: '标准难度',
    ascension1: '进阶 1 · 精英强化',
    ascension2: '进阶 2 · 塔主狂暴',
    winsCount: '通关次数',
    glossary: '图鉴',
    glossaryFull: '使用说明与图鉴',
    // Settings
    settingsTitle: '游戏设置',
    languageLabel: '界面与卡牌语言',
    soundLabel: '战斗音效与提示音',
    soundOn: '开启',
    soundOff: '已静音',
    replayIntro: '重播开屏动画',
    clearSaveLabel: '本地存档管理',
    clearSaveBtn: '清除当前断点存档',
    clearSaveDone: '已清除当前存档',
    noActiveSave: '暂无断点存档',
    // HUD & Combat
    floorPrefix: '第',
    floorSuffix: '层',
    ascensionLabel: '进阶',
    relicsLabel: '遗物',
    mapBtn: '路线图',
    deckBtn: '牌组',
    statsBtn: '伤害统计',
    restartBtn: '返回主菜单',
    confirmAbandon: '确认返回',
    cancel: '取消',
    turnLabel: '回合',
    bossFight: '塔顶首领战',
    eliteFight: '精英守卫战',
    normalFight: '常规遭遇战',
    doubleDmgActive: '幻影绝杀生效中（攻击双倍伤害）',
    combatLog: '战况记录',
    energy: '能量',
    keyHint: '快捷键 1-9 / 拖拽',
    drawPile: '抽牌堆',
    discardPile: '弃牌堆',
    exhaustPile: '消耗',
    endTurn: '结束回合 (E)',
    enemyTurn: '敌人行动中...',
    emptyHand: '当前手牌已打光',
    incomingTotal: '敌方总攻',
    netHpLoss: '预计扣血',
    fullyBlocked: '已完全格挡',
    selectTargetPrompt: '已选中卡牌，请点击目标敌人或直接拖拽至敌人身上',
    selectPotionTarget: '请点击一名敌人作为药水目标',
    discardPrompt: '张手牌进行丢弃',
    chooseDiscardPrefix: '请点击手牌中的',
    killBadge: '斩杀',
    previewDmg: '预计',
    mapTitle: '高塔攀登路线',
    mapReadOnly: '当前路线图预览（返回后继续当前房间）。',
    mapStart: '选择第 1 层的任意起点踏入烬塔。',
    mapNext: '请选择发光节点继续向上推进。',
    backToRoom: '返回界面',
    rewardsTitle: '战斗胜利战利品',
    rewardsSub: '收下战利品或直接返回高塔路线图继续攀登。',
    goldLabel: '金币',
    claimed: '已领取',
    clickClaim: '点击拾取',
    inBag: '已收入囊中',
    inBelt: '已装入腰带',
    beltFull: '药水栏已满',
    cardAdded: '已将新卡牌加入牌组',
    chooseCard: '选择 1 张卡牌加入你的牌组',
    skipCard: '跳过选牌',
    thinDeckTip: '保持牌组精简有时比盲目拿牌更强。',
    continueClimb: '继续攀登',
    campfireTitle: '高塔营火',
    campfireSub: '微弱却温暖的余烬在黑曜石柱间跳动。选择一种方式整备状态：',
    restHeal: '歇息疗伤',
    restHealDesc: '回复 30% 最大生命值',
    forgeUpgrade: '锻造升级',
    forgeDesc: '选择牌组中的 1 张卡牌永久强化为（+）版本。',
    allUpgraded: '牌组中所有卡牌均已升级。',
    shopTitle: '高塔黑市商人',
    shopSub: '“只要金币足够，塔里的秘密都能标价。”',
    leaveShop: '离开商店',
    cardsForSale: '待售卡牌',
    relicsForSale: '珍稀遗物',
    potionsForSale: '炼金药水',
    cardRemoval: '精简牌组服务',
    cardRemovalDesc: '永久从你的牌组中销毁 1 张冗余卡牌，加快核心卡牌轮转。',
    removeBtn: '移除 1 张卡牌',
    removedUsed: '本次已使用移除服务',
    soldOut: '已售罄',
    sold: '已售',
    treasureTitle: '高塔秘宝宝箱',
    treasureDesc: '第 8 层的密室中静静放置着一口包铜黑曜宝箱。',
    openChest: '开启宝箱',
    eventTag: '高塔奇遇',
    victoryTitle: '征服烬塔之巅',
    victoryDesc: '黑曜守望者的熔芯轰然熄灭，你以精妙的牌组掌控了整座高塔。',
    defeatTitle: '陨落于深渊阶梯',
    defeatDesc: '你在深渊阶梯的试炼中力竭倒下，余烬等待下一位攀登者重燃。',
    playAgain: '返回主菜单',
    statsTitle: '局内伤害与战斗统计',
    statsSub: '实时追踪伤害构成、防御格挡效率与核心输出卡牌。',
    damageBreakdown: '伤害来源构成',
    attackDamage: '直接攻击伤害',
    poisonDamage: '剧毒与尸爆伤害',
    relicDamage: '遗物 / 反伤伤害',
    defenseStats: '防御与续航效率',
    totalBlockGained: '累计获得格挡',
    damageBlocked: '成功格挡伤害',
    blockEfficiency: '来袭伤害格挡率',
    hpLost: '累计承受扣血',
    hpHealed: '累计回复生命',
    topCards: '核心输出卡牌榜',
    noCardDamage: '本局尚未造成卡牌攻击伤害。',
    plays: '次打出',
    tempoDist: '出牌类型分布',
    floorLog: '各层战况明细',
    noCombatYet: '尚未完成任何战斗。',
    close: '关闭',
    exhaustTag: '消耗',
    typeLabels: { attack: '攻击', skill: '技能', power: '能力', status: '状态', curse: '诅咒' },
    rarityLabels: { starter: '基础', common: '普通', uncommon: '罕见', rare: '稀有', special: '特殊' },
    nodeLabels: {
      monster: '普通战斗',
      elite: '精英守卫',
      rest: '营火休整',
      event: '神秘事件',
      shop: '高塔商人',
      treasure: '秘宝宝箱',
      boss: '塔顶首领',
    } as Record<NodeType, string>,
  },
  en: {
    brandTitle: 'SPIRE OF ASHES',
    brandShort: 'SPIRE OF ASHES',
    brandSub: 'EMBER DECKBUILDER',
    splashPrompt: 'Click or press any key to skip',
    // Traditional Game Menu
    menuContinue: 'Continue',
    menuStartGame: 'New Game',
    menuTutorial: 'Tutorial',
    menuManual: 'Manual & Compendium',
    menuSettings: 'Settings',
    starterRelic: 'Relic',
    ascension0: 'Standard',
    ascension1: 'Ascension 1 · Elites+',
    ascension2: 'Ascension 2 · Boss+',
    winsCount: 'Victories',
    glossary: 'Manual',
    glossaryFull: 'Game Manual & Compendium',
    // Settings
    settingsTitle: 'Game Settings',
    languageLabel: 'Language / 语言',
    soundLabel: 'Combat Audio & SFX',
    soundOn: 'Enabled',
    soundOff: 'Muted',
    replayIntro: 'Replay Intro Animation',
    clearSaveLabel: 'Run Save Data',
    clearSaveBtn: 'Clear Saved Run',
    clearSaveDone: 'Saved run cleared',
    noActiveSave: 'No active saved run',
    // HUD & Combat
    floorPrefix: 'Floor',
    floorSuffix: '',
    ascensionLabel: 'Ascension',
    relicsLabel: 'Relics',
    mapBtn: 'Map',
    deckBtn: 'Deck',
    statsBtn: 'Stats',
    restartBtn: 'Main Menu',
    confirmAbandon: 'Confirm Exit',
    cancel: 'Cancel',
    turnLabel: 'Turn',
    bossFight: 'Summit Boss',
    eliteFight: 'Elite Encounter',
    normalFight: 'Combat Encounter',
    doubleDmgActive: 'Phantasmal Killer Active (2x Attack Damage)',
    combatLog: 'Combat Log',
    energy: 'Energy',
    keyHint: 'Keys 1-9 / Drag',
    drawPile: 'Draw Pile',
    discardPile: 'Discard',
    exhaustPile: 'Exhaust',
    endTurn: 'End Turn (E)',
    enemyTurn: 'Enemy Turn...',
    emptyHand: 'Hand is empty',
    incomingTotal: 'Incoming',
    netHpLoss: 'Net HP Loss',
    fullyBlocked: 'Fully Blocked',
    selectTargetPrompt: 'Click an enemy target or drag the card directly onto an enemy',
    selectPotionTarget: 'Click an enemy to throw the potion',
    discardPrompt: 'card(s) from hand to discard',
    chooseDiscardPrefix: 'Click',
    killBadge: 'LETHAL',
    previewDmg: 'Est.',
    mapTitle: 'Spire Ascent Map',
    mapReadOnly: 'Map preview (return to room to continue).',
    mapStart: 'Select any Floor 1 entrance to begin your climb.',
    mapNext: 'Choose a highlighted connected node to advance.',
    backToRoom: 'Return',
    rewardsTitle: 'Victory Spoils',
    rewardsSub: 'Claim your loot or continue climbing the Spire.',
    goldLabel: 'Gold',
    claimed: 'Claimed',
    clickClaim: 'Click to claim',
    inBag: 'Collected',
    inBelt: 'Equipped',
    beltFull: 'Potion belt full',
    cardAdded: 'Card added to deck',
    chooseCard: 'Draft 1 Card into Your Deck',
    skipCard: 'Skip Card',
    thinDeckTip: 'A leaner deck draws your best synergies more reliably.',
    continueClimb: 'Continue Climb',
    campfireTitle: 'Spire Campfire',
    campfireSub: 'Faint embers flicker between obsidian pillars. Choose how to prepare:',
    restHeal: 'Rest & Recover',
    restHealDesc: 'Heal 30% of Max HP',
    forgeUpgrade: 'Smith & Upgrade',
    forgeDesc: 'Upgrade 1 card in your deck to its (+) version.',
    allUpgraded: 'All cards in your deck are already upgraded.',
    shopTitle: 'Black Market Merchant',
    shopSub: '"Everything in the Spire has a price, climber."',
    leaveShop: 'Leave Shop',
    cardsForSale: 'Cards for Sale',
    relicsForSale: 'Relics',
    potionsForSale: 'Potions',
    cardRemoval: 'Card Removal Service',
    cardRemovalDesc: 'Permanently purge 1 weak starter card to streamline your draw cycle.',
    removeBtn: 'Remove 1 Card',
    removedUsed: 'Removal already used',
    soldOut: 'Sold Out',
    sold: 'Sold',
    treasureTitle: 'Spire Treasure Vault',
    treasureDesc: 'An ornate obsidian-bound chest rests quietly in the Floor 8 chamber.',
    openChest: 'Open Chest',
    eventTag: 'Spire Event',
    victoryTitle: 'Spire Conquered',
    victoryDesc: 'The Obsidian Warden shatters into ash. Your deck mastered the Spire.',
    defeatTitle: 'Fallen in the Spire',
    defeatDesc: 'Your climb ends here, yet the embers await the next challenger.',
    playAgain: 'Main Menu',
    statsTitle: 'Damage & Combat Statistics',
    statsSub: 'Real-time breakdown of damage sources, block efficiency, and MVP cards.',
    damageBreakdown: 'Damage by Source',
    attackDamage: 'Attack Damage',
    poisonDamage: 'Poison & Corpse Explosion',
    relicDamage: 'Relics & Thorns',
    defenseStats: 'Defense & Sustainment',
    totalBlockGained: 'Total Block Gained',
    damageBlocked: 'Damage Absorbed',
    blockEfficiency: 'Block Mitigation Rate',
    hpLost: 'Unblocked HP Lost',
    hpHealed: 'Total HP Healed',
    topCards: 'Top Damage Cards',
    noCardDamage: 'No card damage recorded yet.',
    plays: 'plays',
    tempoDist: 'Cards Played by Type',
    floorLog: 'Combat History by Floor',
    noCombatYet: 'No combats completed yet.',
    close: 'Close',
    exhaustTag: 'Exhaust',
    typeLabels: { attack: 'Attack', skill: 'Skill', power: 'Power', status: 'Status', curse: 'Curse' },
    rarityLabels: { starter: 'Starter', common: 'Common', uncommon: 'Uncommon', rare: 'Rare', special: 'Special' },
    nodeLabels: {
      monster: 'Monster',
      elite: 'Elite',
      rest: 'Campfire',
      event: 'Event',
      shop: 'Merchant',
      treasure: 'Treasure',
      boss: 'Boss',
    } as Record<NodeType, string>,
  },
};

export const HERO_EN: Record<
  HeroClassId,
  { name: string; subtitle: string; archetypes: string[]; description: string }
> = {
  ironwarden: {
    name: 'Ironwarden',
    subtitle: 'Strength & Barricade',
    archetypes: ['Strength Scaling', 'Iron Barricade', 'Blood Sacrifice'],
    description:
      'A battle-scarred legionnaire who overwhelms foes with towering Strength and heavy Block.',
  },
  shadowweaver: {
    name: 'Shadowweaver',
    subtitle: 'Poison & Shiv Tempo',
    archetypes: ['Poison Stacking', '0-Cost Shivs', 'Draw & Discard'],
    description:
      'An arcane assassin who dismantles guardians with Weak debuffs, Poison catalysts, and Shivs.',
  },
};

export const CARD_EN: Record<string, { name: string; desc: string; upgDesc?: string }> = {
  iron_strike: { name: 'Iron Strike', desc: 'Deal 6 damage.', upgDesc: 'Deal 9 damage.' },
  iron_defend: { name: 'Iron Defend', desc: 'Gain 5 Block.', upgDesc: 'Gain 8 Block.' },
  bash: { name: 'Bash', desc: 'Deal 8 damage. Apply 2 Vulnerable.', upgDesc: 'Deal 10 damage. Apply 3 Vulnerable.' },
  cleave: { name: 'Cleave', desc: 'Deal 8 damage to ALL enemies.', upgDesc: 'Deal 11 damage to ALL enemies.' },
  pommel_strike: { name: 'Pommel Strike', desc: 'Deal 9 damage. Draw 1 card.', upgDesc: 'Deal 10 damage. Draw 2 cards.' },
  twin_strike: { name: 'Twin Strike', desc: 'Deal 5 damage twice.', upgDesc: 'Deal 7 damage twice.' },
  shrug_it_off: { name: 'Shrug It Off', desc: 'Gain 8 Block. Draw 1 card.', upgDesc: 'Gain 11 Block. Draw 1 card.' },
  iron_wave: { name: 'Iron Wave', desc: 'Gain 5 Block. Deal 5 damage.', upgDesc: 'Gain 7 Block. Deal 7 damage.' },
  body_slam: { name: 'Body Slam', desc: 'Deal damage equal to your Block.', upgDesc: 'Deal damage equal to your Block.' },
  heavy_blade: { name: 'Heavy Blade', desc: 'Deal 14 damage. Strength affects this 3x.', upgDesc: 'Deal 14 damage. Strength affects this 5x.' },
  inflame: { name: 'Inflame', desc: 'Gain 2 Strength.', upgDesc: 'Gain 3 Strength.' },
  metallicize: { name: 'Metallicize', desc: 'Gain 3 Block at the end of each turn.', upgDesc: 'Gain 4 Block at the end of each turn.' },
  bloodletting: { name: 'Bloodletting', desc: 'Lose 3 HP. Gain 2 Energy.', upgDesc: 'Lose 3 HP. Gain 3 Energy.' },
  battle_trance: { name: 'Battle Trance', desc: 'Draw 3 cards. No more draw this turn.', upgDesc: 'Draw 4 cards. No more draw this turn.' },
  intimidate: { name: 'Intimidate', desc: 'Apply 1 Weak to ALL enemies. Exhaust.', upgDesc: 'Apply 2 Weak to ALL enemies. Exhaust.' },
  whirlwind: { name: 'Whirlwind', desc: 'Deal 5 damage to ALL enemies X times.', upgDesc: 'Deal 8 damage to ALL enemies X times.' },
  uppercut: { name: 'Uppercut', desc: 'Deal 13 damage. Apply 1 Weak & 1 Vulnerable.', upgDesc: 'Deal 13 damage. Apply 2 Weak & 2 Vulnerable.' },
  impervious: { name: 'Impervious', desc: 'Gain 30 Block. Exhaust.', upgDesc: 'Gain 40 Block. Exhaust.' },
  barricade: { name: 'Barricade', desc: 'Block is no longer lost at start of turn.' },
  offering: { name: 'Offering', desc: 'Lose 6 HP. Gain 2 Energy. Draw 3 cards. Exhaust.', upgDesc: 'Lose 6 HP. Gain 2 Energy. Draw 5 cards. Exhaust.' },
  demon_form: { name: 'Demon Form', desc: 'Gain 2 Strength at the start of each turn.', upgDesc: 'Gain 3 Strength at the start of each turn.' },
  reaper: { name: 'Reaper', desc: 'Deal 4 damage to ALL. Heal unblocked damage. Exhaust.', upgDesc: 'Deal 5 damage to ALL. Heal unblocked damage. Exhaust.' },
  shadow_strike: { name: 'Shadow Strike', desc: 'Deal 6 damage.', upgDesc: 'Deal 9 damage.' },
  shadow_defend: { name: 'Shadow Defend', desc: 'Gain 5 Block.', upgDesc: 'Gain 8 Block.' },
  neutralize: { name: 'Neutralize', desc: 'Deal 3 damage. Apply 1 Weak.', upgDesc: 'Deal 4 damage. Apply 2 Weak.' },
  survivor: { name: 'Survivor', desc: 'Gain 8 Block. Discard 1 card.', upgDesc: 'Gain 11 Block. Discard 1 card.' },
  poisoned_stab: { name: 'Poisoned Stab', desc: 'Deal 6 damage. Apply 3 Poison.', upgDesc: 'Deal 8 damage. Apply 4 Poison.' },
  deadly_poison: { name: 'Deadly Poison', desc: 'Apply 5 Poison.', upgDesc: 'Apply 7 Poison.' },
  blade_dance: { name: 'Blade Dance', desc: 'Add 3 Shivs to your hand.', upgDesc: 'Add 4 Shivs to your hand.' },
  backflip: { name: 'Backflip', desc: 'Gain 5 Block. Draw 2 cards.', upgDesc: 'Gain 8 Block. Draw 2 cards.' },
  acrobatics: { name: 'Acrobatics', desc: 'Draw 3 cards. Discard 1 card.', upgDesc: 'Draw 4 cards. Discard 1 card.' },
  dagger_spray: { name: 'Dagger Spray', desc: 'Deal 4 damage to ALL enemies twice.', upgDesc: 'Deal 6 damage to ALL enemies twice.' },
  cloak_and_dagger: { name: 'Cloak & Dagger', desc: 'Gain 6 Block. Add 1 Shiv.', upgDesc: 'Gain 6 Block. Add 2 Shivs.' },
  dash: { name: 'Dash', desc: 'Gain 10 Block. Deal 10 damage.', upgDesc: 'Gain 13 Block. Deal 13 damage.' },
  blur: { name: 'Blur', desc: 'Gain 5 Block. Retain Block next turn.', upgDesc: 'Gain 8 Block. Retain Block next turn.' },
  catalyst: { name: 'Catalyst', desc: 'Double target Poison. Exhaust.', upgDesc: 'Triple target Poison. Exhaust.' },
  footwork: { name: 'Footwork', desc: 'Gain 2 Dexterity.', upgDesc: 'Gain 3 Dexterity.' },
  noxious_fumes: { name: 'Noxious Fumes', desc: 'Apply 2 Poison to ALL enemies each turn.', upgDesc: 'Apply 3 Poison to ALL enemies each turn.' },
  leg_sweep: { name: 'Leg Sweep', desc: 'Apply 2 Weak. Gain 11 Block.', upgDesc: 'Apply 3 Weak. Gain 14 Block.' },
  adrenaline: { name: 'Adrenaline', desc: 'Gain 1 Energy. Draw 2 cards. Exhaust.', upgDesc: 'Gain 2 Energy. Draw 2 cards. Exhaust.' },
  envenom: { name: 'Envenom', desc: 'Unblocked attack hits apply 1 Poison.' },
  phantasmal_killer: { name: 'Phantasmal Killer', desc: 'Next turn, your attacks deal 2x damage.' },
  corpse_explosion: { name: 'Corpse Explosion', desc: 'Apply 6 Poison. On death, deal Max HP to ALL.', upgDesc: 'Apply 9 Poison. On death, deal Max HP to ALL.' },
  shiv: { name: 'Shiv', desc: 'Deal 4 damage. Exhaust.', upgDesc: 'Deal 6 damage. Exhaust.' },
  finesse: { name: 'Finesse', desc: 'Gain 2 Block. Draw 1 card.', upgDesc: 'Gain 4 Block. Draw 1 card.' },
  flash_of_steel: { name: 'Flash of Steel', desc: 'Deal 3 damage. Draw 1 card.', upgDesc: 'Deal 6 damage. Draw 1 card.' },
  panacea: { name: 'Panacea', desc: 'Gain 1 Artifact. Exhaust.', upgDesc: 'Gain 2 Artifact. Exhaust.' },
  apotheosis: { name: 'Apotheosis', desc: 'Upgrade ALL your cards for this combat. Exhaust.' },
  burn: { name: 'Burn', desc: 'Unplayable. Take 2 damage at end of turn.' },
  wound: { name: 'Wound', desc: 'Unplayable.' },
  slimed: { name: 'Slimed', desc: 'Exhaust.' },
  pain: { name: 'Pain', desc: 'Curse · Unplayable. Lose 1 HP whenever you play a card.' },
};

export const RELIC_EN: Record<string, { name: string; desc: string }> = {
  burning_blood: { name: 'Burning Blood', desc: 'Heal 6 HP at the end of combat.' },
  ring_of_snake: { name: 'Ring of the Snake', desc: 'Draw 2 extra cards on Turn 1.' },
  vajra: { name: 'Vajra', desc: 'Start combat with 1 Strength.' },
  anchor: { name: 'Anchor', desc: 'Start combat with 10 Block.' },
  smooth_stone: { name: 'Oddly Smooth Stone', desc: 'Start combat with 1 Dexterity.' },
  lantern: { name: 'Lantern', desc: 'Gain 1 extra Energy on Turn 1.' },
  bag_of_prep: { name: 'Bag of Preparation', desc: 'Draw 2 extra cards on Turn 1.' },
  orichalcum: { name: 'Orichalcum', desc: 'If you end turn with 0 Block, gain 6 Block.' },
  shuriken: { name: 'Shuriken', desc: 'Every 3 Attacks played in a turn grants 1 Strength.' },
  kunai: { name: 'Kunai', desc: 'Every 3 Attacks played in a turn grants 1 Dexterity.' },
  meat_on_bone: { name: 'Meat on the Bone', desc: 'If HP <= 50% after combat, heal 12 HP.' },
  mercury_hourglass: { name: 'Mercury Hourglass', desc: 'Deal 3 damage to ALL enemies each turn.' },
  horn_cleat: { name: 'Horn Cleat', desc: 'Gain 14 Block at start of Turn 2.' },
  runic_capacitor: { name: 'Ember Core', desc: '+1 Max Energy per turn.' },
};

export const POTION_EN: Record<string, { name: string; desc: string }> = {
  fire_potion: { name: 'Fire Potion', desc: 'Deal 20 damage to target enemy.' },
  block_potion: { name: 'Block Potion', desc: 'Gain 12 Block.' },
  strength_potion: { name: 'Strength Potion', desc: 'Gain 2 Strength for this combat.' },
  poison_potion: { name: 'Poison Potion', desc: 'Apply 6 Poison to target enemy.' },
  energy_potion: { name: 'Energy Potion', desc: 'Gain 2 Energy.' },
  swift_potion: { name: 'Swift Potion', desc: 'Draw 3 cards.' },
  heal_potion: { name: 'Blood Potion', desc: 'Heal 15 HP immediately.' },
};

export const ENEMY_EN: Record<string, { name: string; title: string }> = {
  cultist: { name: 'Spire Cultist', title: 'Ritual Apprentice' },
  jaw_worm: { name: 'Jaw Worm', title: 'Armored Predator' },
  acid_slime: { name: 'Acid Slime', title: 'Corrosive Ooze' },
  looter: { name: 'Spire Looter', title: 'Shadow Cutthroat' },
  bone_knight: { name: 'Bone Knight', title: 'Undead Sentinel' },
  gremlin_nob: { name: 'Gremlin Nob', title: 'Elite · Enraged by Skills' },
  lagavulin: { name: 'Lagavulin', title: 'Elite · Slumbering Shell' },
  sentry: { name: 'Ancient Sentry', title: 'Elite · Arcane Twin' },
  obsidian_warden: { name: 'Obsidian Warden', title: 'Summit Colossus Boss' },
};

export const EVENT_EN: Record<
  string,
  {
    title: string;
    body: string;
    options: Record<string, { label: string; hint: string }>;
  }
> = {
  golden_idol: {
    title: 'Ember Shrine',
    body: 'A molten gold idol rests inside an obsidian alcove, faint clockwork gears clicking beneath its pedestal. Snatch the treasure or offer blood at the shrine?',
    options: {
      take_gold: { label: 'Take the Molten Idol', hint: 'Gain 120 Gold, but trigger a trap for 10 HP.' },
      pray_blood: { label: 'Offer Blood in Prayer', hint: 'Lose 7 HP, upgrade 1 random card.' },
      leave: { label: 'Walk Away Quietly', hint: 'Heal 5 HP and leave safely.' },
    },
  },
  wandering_smith: {
    title: 'Wandering Smithy',
    body: 'A blindfolded dwarf smith tends a lingering forge beside the stairwell. "Traveler, shall we hone your edge or smelt away the dead weight?"',
    options: {
      forge_random: { label: 'Temper the Deck', hint: 'Spend 45 Gold to upgrade 2 random cards.' },
      remove_weak: { label: 'Smelt Starter Card', hint: 'Permanently remove 1 basic Strike or Defend for free.' },
      buy_relic: { label: 'Commission a Relic', hint: 'Spend 90 Gold to gain 1 random Relic.' },
    },
  },
  whispering_fountain: {
    title: 'Whispering Fountain',
    body: 'Silver springwater seeps through ancient stone, rippling with echoes of past climbs. Drinking may mend your body, or test your fortune.',
    options: {
      drink_deep: { label: 'Drink Deeply', hint: 'Heal 22 HP and gain 1 random Rare card.' },
      wash_blades: { label: 'Quench Weapons', hint: 'Gain +6 Max HP permanently.' },
      toss_coin: { label: 'Toss 25 Gold', hint: 'Gain a Relic, or 50% chance to lose 6 HP & gain 85 Gold.' },
    },
  },
  abyssal_altar: {
    title: 'Abyssal Pact Altar',
    body: 'Ancient runes smolder across a basalt altar: "Trade flesh for forbidden might, and torment for relics."',
    options: {
      claim_relic: { label: 'Seal the Blood Pact', hint: 'Lose 12 HP and gain 1 powerful Relic.' },
      claim_apotheosis: { label: 'Copy Apotheosis Scroll', hint: 'Lose 10 HP & 30 Gold. Gain Rare colorless [Apotheosis].' },
      walk_away: { label: 'Shatter the Runes', hint: 'Leave unscathed.' },
    },
  },
};

export function tHeroSubtitle(id: HeroClassId, fallback: string, locale: Locale): string {
  if (locale === 'zh') return fallback;
  return HERO_EN[id]?.subtitle || fallback;
}

export function tIntentLabel(intent: EnemyIntent, locale: Locale): string {
  if (locale === 'zh') return intent.label;
  if (intent.type === 'sleep') return 'Asleep · Wakes if hit';
  const parts: string[] = [];
  if (intent.damage) {
    parts.push(`Attack ${intent.damage}${intent.hits && intent.hits > 1 ? `x${intent.hits}` : ''}`);
  }
  if (intent.block) parts.push(`Block +${intent.block}`);
  if (intent.gainStrength) parts.push(`Strength +${intent.gainStrength}`);
  if (intent.gainRitual) parts.push(`Ritual +${intent.gainRitual}`);
  if (intent.applyVulnerable) parts.push(`Vulnerable ${intent.applyVulnerable}`);
  if (intent.applyWeak) parts.push(`Weak ${intent.applyWeak}`);
  if (intent.applyFrail) parts.push(`Frail ${intent.applyFrail}`);
  if (intent.addStatusCardId && intent.addStatusCount) {
    const statusEn = CARD_EN[intent.addStatusCardId]?.name || intent.addStatusCardId;
    parts.push(`+${intent.addStatusCount} ${statusEn}`);
  }
  return parts.join(' · ') || intent.label;
}

export function tCard(defId: string, locale: Locale) {
  const def = CARD_DEFS[defId];
  if (locale === 'zh' || !def) {
    return {
      name: def?.name || defId,
      desc: def?.description || '',
      upgDesc: def?.upgradedDescription || def?.description || '',
    };
  }
  const en = CARD_EN[defId];
  return {
    name: en?.name || def.name,
    desc: en?.desc || def.description,
    upgDesc: en?.upgDesc || en?.desc || def.description,
  };
}

export function tRelic(id: string, locale: Locale) {
  const r = RELIC_DEFS[id];
  if (locale === 'zh' || !r) return { name: r?.name || id, desc: r?.description || '' };
  const en = RELIC_EN[id];
  return { name: en?.name || r.name, desc: en?.desc || r.description };
}

export function tPotion(id: string, locale: Locale) {
  const p = POTION_DEFS[id];
  if (locale === 'zh' || !p) return { name: p?.name || id, desc: p?.description || '' };
  const en = POTION_EN[id];
  return { name: en?.name || p.name, desc: en?.desc || p.description };
}

export function tEnemyName(defId: string, fallbackName: string, locale: Locale): string {
  if (locale === 'zh') return fallbackName;
  return ENEMY_EN[defId]?.name || fallbackName;
}

// Translates engine combat messages (floating text + combat log).
export function tCombatMsg(msg: CombatMsg, locale: Locale): string {
  const zh = locale === 'zh';
  const n = msg.n ?? 0;
  switch (msg.key) {
    case 'damage':
      return `-${n}`;
    case 'blocked':
      return zh ? '格挡' : 'Blocked';
    case 'gainBlock':
      return zh ? `+${n} 格挡` : `+${n} Block`;
    case 'gainStrength':
      return zh ? `力量 +${n}` : `Strength +${n}`;
    case 'gainDexterity':
      return zh ? `敏捷 +${n}` : `Dexterity +${n}`;
    case 'gainMetallicize':
      return zh ? `金属化 +${n}` : `Metallicize +${n}`;
    case 'gainArtifact':
      return zh ? `人工制品 +${n}` : `Artifact +${n}`;
    case 'gainEnergy':
      return zh ? `+${n} 能量` : `+${n} Energy`;
    case 'gainRitual':
      return zh ? `仪式 +${n}` : `Ritual +${n}`;
    case 'pain':
      return zh ? `-${n} 痛楚` : `-${n} Pain`;
    case 'thorns':
      return zh ? `-${n} 荆棘` : `-${n} Thorns`;
    case 'burn':
      return zh ? `-${n} 灼伤` : `-${n} Burn`;
    case 'poisonTick':
      return zh ? `-${n} 毒` : `-${n} Poison`;
    case 'heal':
      return zh ? `+${n} 生命` : `+${n} HP`;
    case 'draw':
      return zh ? `抽 ${n} 张牌` : `Draw ${n}`;
    case 'enrage':
      return zh ? `狂怒: 力量+${n}` : `Enrage: Strength +${n}`;
    case 'artifactBlocked':
      return zh ? '被人工制品抵消' : 'Negated by Artifact';
    case 'applyVulnerable':
      return zh ? `易伤 +${n}` : `Vulnerable +${n}`;
    case 'applyWeak':
      return zh ? `虚弱 +${n}` : `Weak +${n}`;
    case 'applyFrail':
      return zh ? `脆弱 +${n}` : `Frail +${n}`;
    case 'applyPoison':
      return zh ? `中毒 +${n}` : `Poison +${n}`;
    case 'corpseMark':
      return zh ? '尸爆标记' : 'Corpse Explosion';
    case 'shuriken':
      return zh ? `手里剑: 力量+${n}` : `Shuriken: Strength +${n}`;
    case 'kunai':
      return zh ? `苦无: 敏捷+${n}` : `Kunai: Dexterity +${n}`;
    case 'orichalcum':
      return zh ? `+${n} 奥利哈刚` : `+${n} Orichalcum`;
    case 'hornCleat':
      return zh ? `+${n} 羊角格挡` : `+${n} Horn Cleat Block`;
    case 'phantasmal':
      return zh ? '幻影绝杀: 伤害翻倍!' : 'Phantasmal: Double damage!';
    case 'demonForm':
      return zh ? `恶魔化身: 力量+${n}` : `Demon Form: Strength +${n}`;
    case 'apotheosis':
      return zh ? '全牌升华 (+)' : 'All cards upgraded (+)';
    case 'bossPhase2':
      return zh ? '二阶段觉醒!' : 'Phase 2 awakens!';
    case 'statusCards': {
      const cardName = msg.ref ? tCard(msg.ref, locale).name : '';
      return zh ? `弃牌堆 +${n} ${cardName}` : `+${n} ${cardName} to discard`;
    }
    case 'logEnterCombat':
      return zh ? `进入第 ${n} 层战斗` : `Entered combat on floor ${n}`;
    case 'logMercury':
      return zh
        ? `水银沙漏：对所有敌人造成 ${n} 点伤害。`
        : `Mercury Hourglass: dealt ${n} damage to all enemies.`;
    case 'logPlayCard': {
      const cardName = msg.ref ? tCard(msg.ref, locale).name : '';
      const plus = msg.upgraded ? '+' : '';
      return zh ? `打出【${cardName}${plus}】` : `Played [${cardName}${plus}]`;
    }
    case 'logUsePotion': {
      const potionName = msg.ref ? tPotion(msg.ref, locale).name : '';
      return zh ? `使用了药水【${potionName}】` : `Used potion [${potionName}]`;
    }
    case 'logBossPhase2': {
      const name = tEnemyName(msg.ref || '', msg.name || '', locale);
      return zh
        ? `${name}：熔炉核心超频觉醒！（力量+2、荆棘+2、格挡+16）`
        : `${name}: forge core overcharged! (Strength +2, Thorns +2, Block +16)`;
    }
    default:
      return '';
  }
}

export function tCombatLogEntry(entry: CombatLogEntry, locale: Locale): string {
  return typeof entry === 'string' ? entry : tCombatMsg(entry, locale);
}
