import { HeroClassDef, HeroClassId } from './types';

export const HERO_CLASSES: Record<HeroClassId, HeroClassDef> = {
  ironwarden: {
    id: 'ironwarden',
    name: '赤铁卫士',
    englishName: 'Ironwarden',
    subtitle: '炽血重甲 · 力量与堡垒',
    maxHp: 80,
    startingGold: 99,
    starterRelicId: 'bloodfire_sigil',
    portraitUrl: '/src/assets/images/hero_ironwarden_portrait_1795024242240.jpg',
    standeeUrl: '/src/assets/images/standee_ironwarden_full_1795028066506.jpg',
    accentColor: '#dc2626',
    archetypes: ['力量爆发', '厚重堡垒', '自伤换能'],
    description:
      '烬塔的堕落军团老兵。凭借强韧的护甲与燃烧生命换取的狂暴力量碾碎强敌，每次胜利皆可重燃余烬回复生命。',
  },
  shadowweaver: {
    id: 'shadowweaver',
    name: '暗影织者',
    englishName: 'Shadowweaver',
    subtitle: '淬毒诡刃 · 剧毒与连击',
    maxHp: 70,
    startingGold: 99,
    starterRelicId: 'nightweave_ring',
    portraitUrl: '/src/assets/images/hero_shadowweaver_portrait_1795024247728.jpg',
    standeeUrl: '/src/assets/images/standee_shadowweaver_full_1795028063521.jpg',
    accentColor: '#10b981',
    archetypes: ['剧毒叠层', '零费飞刀', '过牌弃牌'],
    description:
      '穿梭于石柱阴影间的秘术刺客。以精准的弱化、致命毒素与暴雨般的零费飞刀消耗并瓦解高塔守卫。',
  },
};
